import { supabase } from "./auth.js";
import { getCurrentUser, getCurrentRole } from "./state.js";

// Fetch all quizzes
export async function fetchQuizzes() {
  const { data, error } = await supabase
    .from("quizzes")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching quizzes:", error);
    return [];
  }

  return data || [];
}

// Fetch single quiz with questions
export async function fetchQuizWithQuestions(quizId) {
  const { data: quiz, error: quizError } = await supabase
    .from("quizzes")
    .select("*")
    .eq("id", quizId)
    .single();

  if (quizError) {
    console.error("Error fetching quiz:", quizError);
    return null;
  }

  const { data: questions, error: questionsError } = await supabase
    .from("questions")
    .select("*")
    .eq("quiz_id", quizId)
    .order("created_at", { ascending: true });

  if (questionsError) {
    console.error("Error fetching questions:", questionsError);
    return quiz;
  }

  // Fetch choices for all questions (in case question_type wasn't set properly)
  // We'll check for choices for any question and use that to determine the type
  const allQuestionIds = (questions || []).map((q) => q.id);
  console.log("All question IDs:", allQuestionIds);
  console.log("Questions from DB:", questions);

  let choicesMap = {};
  if (allQuestionIds.length > 0) {
    const { data: choices, error: choicesError } = await supabase
      .from("question_choices")
      .select("*")
      .in("question_id", allQuestionIds)
      .order("id", { ascending: true });

    console.log("Choices from DB:", choices);
    console.log("Choices error:", choicesError);

    if (choicesError) {
      console.error("Error fetching choices:", choicesError);
    } else {
      // Group choices by question_id
      (choices || []).forEach((choice) => {
        if (!choicesMap[choice.question_id]) {
          choicesMap[choice.question_id] = [];
        }
        choicesMap[choice.question_id].push(choice);
      });
    }
  }

  console.log("Choices map:", choicesMap);

  // Attach choices to their respective questions
  const questionsWithChoices = (questions || []).map((q) => ({
    ...q,
    choices: choicesMap[q.id] || [],
  }));

  console.log("Questions with choices:", questionsWithChoices);

  return {
    ...quiz,
    questions: questionsWithChoices,
  };
}

// Create new quiz with questions
export async function createQuiz(title, description, questions) {
  const currentUser = getCurrentUser();
  const currentRole = getCurrentRole();
  if (!currentUser) return null;
  // Only admin can create quizzes
  if (currentRole !== "admin") {
    console.warn("createQuiz blocked: only admin can create quizzes");
    return null;
  }

  // Create quiz
  const { data: quiz, error: quizError } = await supabase
    .from("quizzes")
    .insert([
      {
        title,
        description,
        created_by: currentUser.id,
        created_at: new Date().toISOString(),
      },
    ])
    .select()
    .single();

  if (quizError) {
    console.error("Error creating quiz:", quizError);
    return null;
  }

  // Create questions
  if (questions && questions.length > 0) {
    // questions is now an array of objects: { text, type, choices: [{text, isCorrect}] }
    console.log("Creating questions:", questions);

    for (const q of questions) {
      console.log("Processing question:", q);

      const questionData = {
        quiz_id: quiz.id,
        question_text: typeof q === "string" ? q : q.text,
        question_type: typeof q === "string" ? "text" : q.type || "text",
        created_at: new Date().toISOString(),
      };

      console.log("Question data to insert:", questionData);

      const { data: insertedQuestion, error: questionError } = await supabase
        .from("questions")
        .insert([questionData])
        .select()
        .single();

      if (questionError) {
        console.error("Error creating question:", questionError);
        continue;
      }

      console.log("Inserted question:", insertedQuestion);

      // If multiple-choice, insert the choices
      console.log("Checking if multiple choice:", q.type, q.choices);
      if (q.type === "multiple_choice" && q.choices && q.choices.length > 0) {
        const choicesToInsert = q.choices.map((choice) => ({
          question_id: insertedQuestion.id,
          choice_text: choice.text,
          is_correct: choice.isCorrect || false,
        }));

        console.log("Choices to insert:", choicesToInsert);

        try {
          const result = await supabase
            .from("question_choices")
            .insert(choicesToInsert)
            .select();

          console.log("Full insert result:", result);
          console.log("Inserted choices:", result.data);
          if (result.error) {
            console.error("Error creating choices:", result.error);
          }
        } catch (err) {
          console.error("Exception when inserting choices:", err);
        }
      }

      // If text-type, insert the correct answer
      if (q.type === "text" && q.correctAnswer) {
        console.log(
          "Inserting correct answer for text question:",
          q.correctAnswer
        );
        const { error: textAnswerError } = await supabase
          .from("text_answers")
          .insert([
            {
              question_id: insertedQuestion.id,
              correct_answer: q.correctAnswer.trim(),
            },
          ]);

        if (textAnswerError) {
          console.error("Error creating text answer:", textAnswerError);
        }
      }
    }
  }

  return quiz;
}

// Submit answers to a quiz
export async function submitAnswers(quizId, answers, participantName = null) {
  const currentUser = getCurrentUser();
  if (!currentUser) return false;

  // Fetch all questions for this quiz to check their types
  const { data: questions, error: questionsError } = await supabase
    .from("questions")
    .select("id, question_type")
    .eq("quiz_id", quizId);

  if (questionsError) {
    console.error("Error fetching questions for validation:", questionsError);
    return false;
  }

  const questionMap = {};
  questions.forEach((q) => {
    questionMap[q.id] = q.question_type;
  });

  // Get correct answers for text questions
  const textQuestionIds = Object.keys(questionMap)
    .filter((qId) => questionMap[qId] === "text")
    .map((qId) => parseInt(qId));

  let correctAnswersMap = {};
  if (textQuestionIds.length > 0) {
    const { data: textAnswers, error: textAnswersError } = await supabase
      .from("text_answers")
      .select("question_id, correct_answer")
      .in("question_id", textQuestionIds);

    if (!textAnswersError && textAnswers) {
      textAnswers.forEach((ta) => {
        correctAnswersMap[ta.question_id] = ta.correct_answer;
      });
    }
  }

  // Prepare answers with correctness validation
  const answersToInsert = Object.entries(answers).map(
    ([questionId, answerText]) => {
      const qId = parseInt(questionId);
      const questionType = questionMap[qId];
      let isCorrect = null;

      // Validate text answers (case-insensitive)
      if (questionType === "text" && correctAnswersMap[qId]) {
        isCorrect =
          answerText.trim().toLowerCase() ===
          correctAnswersMap[qId].toLowerCase();
      }

      return {
        question_id: qId,
        user_id: currentUser.id,
        answer_text: answerText,
        is_correct: isCorrect,
        participant_name: participantName || null,
        submitted_at: new Date().toISOString(),
      };
    }
  );

  const { error } = await supabase.from("answers").insert(answersToInsert);

  if (error) {
    console.error("Error submitting answers:", error);
    return false;
  }

  return true;
}

// Fetch all answers (admin only)
export async function fetchAllAnswers() {
  const currentUser = getCurrentUser();
  if (!currentUser) {
    return { answers: [], error: "Ikke innlogget." };
  }

  // Note: RLS decides what the user is allowed to see.
  // With the policies in QUIZ_SETUP.md this returns:
  // - the user's own answers
  // - answers to quizzes they created
  const { data, error } = await supabase
    .from("answers")
    .select(
      `
      id,
      question_id,
      user_id,
      answer_text,
      participant_name,
      submitted_at,
      questions (id, question_text, quiz_id, quizzes (id, title, created_by))
    `
    )
    .order("submitted_at", { ascending: false });

  if (error) {
    console.error("Error fetching answers:", error);
    return { answers: [], error: error.message || "Ukjent feil." };
  }

  return { answers: data || [], error: null };
}

// Fetch only the current user's own answers
export async function fetchMyAnswers() {
  const currentUser = getCurrentUser();
  if (!currentUser) {
    return { answers: [], error: "Ikke innlogget." };
  }

  const { data, error } = await supabase
    .from("answers")
    .select(
      `
      id,
      question_id,
      user_id,
      answer_text,
      participant_name,
      submitted_at,
      questions (id, question_text, quiz_id, quizzes (id, title, created_by))
    `
    )
    .eq("user_id", currentUser.id)
    .order("submitted_at", { ascending: false });

  if (error) {
    console.error("Error fetching my answers:", error);
    return { answers: [], error: error.message || "Ukjent feil." };
  }

  return { answers: data || [], error: null };
}

// Fetch answers for a specific quiz (admin only)
export async function fetchQuizAnswers(quizId) {
  const currentRole = getCurrentRole();
  if (currentRole !== "admin") return [];

  const { data, error } = await supabase
    .from("answers")
    .select(
      `
      id,
      question_id,
      user_id,
      answer_text,
      submitted_at,
      questions (id, question_text)
    `
    )
    .eq("questions.quiz_id", quizId)
    .order("submitted_at", { ascending: false });

  if (error) {
    console.error("Error fetching quiz answers:", error);
    return [];
  }

  return data || [];
}
