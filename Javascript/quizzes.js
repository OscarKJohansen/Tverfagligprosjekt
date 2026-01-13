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

  return {
    ...quiz,
    questions: questions || [],
  };
}

// Create new quiz with questions
export async function createQuiz(title, description, questions) {
  const currentUser = getCurrentUser();
  if (!currentUser) return null;

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
    const questionsToInsert = questions.map((q, index) => ({
      quiz_id: quiz.id,
      question_text: q,
      created_at: new Date().toISOString(),
    }));

    const { error: questionsError } = await supabase
      .from("questions")
      .insert(questionsToInsert);

    if (questionsError) {
      console.error("Error creating questions:", questionsError);
    }
  }

  return quiz;
}

// Submit answers to a quiz
export async function submitAnswers(quizId, answers, participantName = null) {
  const currentUser = getCurrentUser();
  if (!currentUser) return false;

  // answers is an object: { questionId: answerText, ... }
  const answersToInsert = Object.entries(answers).map(
    ([questionId, answerText]) => ({
      question_id: parseInt(questionId),
      user_id: currentUser.id,
      answer_text: answerText,
      participant_name: participantName || null,
      submitted_at: new Date().toISOString(),
    })
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
