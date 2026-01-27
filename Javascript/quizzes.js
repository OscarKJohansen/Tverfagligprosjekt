import { supabase } from "./auth.js";
import { getCurrentUser, getCurrentRole } from "./state.js";

/*
  Henter alle quizer fra databasen.
  Kan sorteres enten etter nyeste eller etter mest populære (flest svar).
*/
export async function fetchQuizzesByCategory(category = "newest") {
  let query = supabase.from("quizzes").select("*");

  if (category === "top") {
    query = query
      .order("answers_count", { ascending: false })
      .order("created_at", { ascending: false });
  } else {
    query = query.order("created_at", { ascending: false });
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching quizzes:", error);
    return [];
  }

  return data || [];
}

/*
  Henter en quiz med alle tilhørende spørsmål.
  Kobler også svaralternativer (choices) til riktige spørsmål.
*/
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

  const allQuestionIds = (questions || []).map((q) => q.id);

  let choicesMap = {};

  if (allQuestionIds.length > 0) {
    const { data: choices, error: choicesError } = await supabase
      .from("question_choices")
      .select("*")
      .in("question_id", allQuestionIds)
      .order("id", { ascending: true });

    if (!choicesError) {
      (choices || []).forEach((choice) => {
        if (!choicesMap[choice.question_id]) {
          choicesMap[choice.question_id] = [];
        }
        choicesMap[choice.question_id].push(choice);
      });
    }
  }

  const questionsWithChoices = (questions || []).map((q) => ({
    ...q,
    choices: choicesMap[q.id] || [],
  }));

  return {
    ...quiz,
    questions: questionsWithChoices,
  };
}

/*
  Oppretter en ny quiz med spørsmål.
  Kun brukere med admin-rolle har lov til å gjøre dette.
*/
export async function createQuiz(
  title,
  description,
  questions,
  thumbnailUrl = null,
) {
  const currentUser = getCurrentUser();
  const currentRole = getCurrentRole();

  if (!currentUser) return null;
  if (currentRole !== "admin") return null;

  const quizInsertData = {
    title,
    description,
    created_by: currentUser.id,
    created_at: new Date().toISOString(),
  };

  // Only add thumbnail_url if provided (in case the column doesn't exist yet)
  if (thumbnailUrl) {
    quizInsertData.thumbnail_url = thumbnailUrl;
  }

  const { data: quiz, error: quizError } = await supabase
    .from("quizzes")
    .insert([quizInsertData])
    .select()
    .single();

  if (quizError) {
    console.error("Error creating quiz:", quizError);
    return null;
  }

  if (questions && questions.length > 0) {
    for (const q of questions) {
      const questionData = {
        quiz_id: quiz.id,
        question_text: typeof q === "string" ? q : q.text,
        question_type: typeof q === "string" ? "text" : q.type || "text",
        created_at: new Date().toISOString(),
      };

      // Only add image fields if they exist (in case the columns don't exist yet)
      if (q.imageUrl) {
        questionData.image_url = q.imageUrl;
      }
      if (q.imageAttribution) {
        questionData.image_attribution = q.imageAttribution;
      }

      const { data: insertedQuestion, error: questionError } = await supabase
        .from("questions")
        .insert([questionData])
        .select()
        .single();

      if (questionError) continue;

      if (q.type === "multiple_choice" && q.choices?.length > 0) {
        const choicesToInsert = q.choices.map((choice) => ({
          question_id: insertedQuestion.id,
          choice_text: choice.text,
          is_correct: choice.isCorrect || false,
        }));

        await supabase.from("question_choices").insert(choicesToInsert);
      }

      if (q.type === "text" && q.correctAnswer) {
        await supabase.from("text_answers").insert([
          {
            question_id: insertedQuestion.id,
            correct_answer: q.correctAnswer.trim(),
          },
        ]);
      }
    }
  }

  return quiz;
}

/*
  Sends inn svar på en quiz.
  Tekstsvar sjekkes automatisk mot fasit hvis den finnes.
  Filmrating-tekstsvar sjekkes med toleranse (±0.2).
*/
export async function submitAnswers(quizId, answers, participantName = null) {
  const currentUser = getCurrentUser();
  if (!currentUser) return false;

  const { data: questions, error: questionsError } = await supabase
    .from("questions")
    .select("id, question_type, question_text")
    .eq("quiz_id", quizId);

  if (questionsError) return false;

  const questionMap = {};
  questions.forEach((q) => (questionMap[q.id] = q.question_type));

  const textQuestionIds = Object.keys(questionMap)
    .filter((id) => questionMap[id] === "text")
    .map(Number);

  let correctAnswersMap = {};
  let movieRatingQuestions = new Set(); // Track movie rating questions

  if (textQuestionIds.length > 0) {
    const { data: textAnswers } = await supabase
      .from("text_answers")
      .select("question_id, correct_answer")
      .in("question_id", textQuestionIds);

    (textAnswers || []).forEach((ta) => {
      correctAnswersMap[ta.question_id] = ta.correct_answer;
      // Check if this is a movie rating question (correct_answer looks like a rating)
      const rating = parseFloat(ta.correct_answer);
      if (!isNaN(rating) && rating >= 1.0 && rating <= 10.0) {
        movieRatingQuestions.add(ta.question_id);
      }
    });
  }

  const answersToInsert = Object.entries(answers).map(
    ([questionId, answerText]) => {
      const qId = Number(questionId);
      let isCorrect = null;

      if (questionMap[qId] === "text" && correctAnswersMap[qId]) {
        const correctAnswer = correctAnswersMap[qId];

        if (movieRatingQuestions.has(qId)) {
          // Movie rating: check with ±0.2 tolerance
          const userRating = parseFloat(answerText);
          const correctRating = parseFloat(correctAnswer);

          if (!isNaN(userRating) && !isNaN(correctRating)) {
            const difference = Math.abs(userRating - correctRating);
            isCorrect = difference <= 0.2;
          }
        } else {
          // Regular text answer: exact match (case-insensitive)
          isCorrect =
            answerText.trim().toLowerCase() === correctAnswer.toLowerCase();
        }
      }

      return {
        question_id: qId,
        user_id: currentUser.id,
        answer_text: answerText,
        is_correct: isCorrect,
        participant_name: participantName,
        submitted_at: new Date().toISOString(),
      };
    },
  );

  const { error } = await supabase.from("answers").insert(answersToInsert);
  if (error) return false;

  try {
    const { data: quizRow } = await supabase
      .from("quizzes")
      .select("answers_count")
      .eq("id", quizId)
      .single();

    if (quizRow) {
      await supabase
        .from("quizzes")
        .update({ answers_count: (quizRow.answers_count || 0) + 1 })
        .eq("id", quizId);
    }
  } catch {}

  return true;
}

/*
  Henter alle svar brukeren har tilgang til.
  Hva som vises styres av Supabase RLS-regler.
*/
export async function fetchAllAnswers() {
  const currentUser = getCurrentUser();
  if (!currentUser) return { answers: [], error: "Ikke innlogget." };

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
    `,
    )
    .order("submitted_at", { ascending: false });

  if (error) return { answers: [], error: error.message };

  return { answers: data || [], error: null };
}

/*
  Henter kun svarene til den innloggede brukeren.
*/
export async function fetchMyAnswers() {
  const currentUser = getCurrentUser();
  if (!currentUser) return { answers: [], error: "Ikke innlogget." };

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
    `,
    )
    .eq("user_id", currentUser.id)
    .order("submitted_at", { ascending: false });

  if (error) return { answers: [], error: error.message };

  return { answers: data || [], error: null };
}

/*
  Henter alle svar for én spesifikk quiz.
  Kun tilgjengelig for admin-brukere.
*/
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
    `,
    )
    .eq("questions.quiz_id", quizId)
    .order("submitted_at", { ascending: false });

  if (error) return [];

  return data || [];
}
