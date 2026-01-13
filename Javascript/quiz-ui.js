import { getCurrentUser, getCurrentRole } from "./state.js";
import {
  fetchQuizzes,
  fetchQuizWithQuestions,
  createQuiz,
  submitAnswers,
  fetchAllAnswers,
  fetchMyAnswers,
} from "./quizzes.js";

let currentQuizId = null;
let currentQuizParticipantName = null;

const AREAS = [
  "app-area",
  "quiz-list-area",
  "quiz-create-area",
  "quiz-take-area",
  "admin-results-area",
  "results-area",
];

function toggleAreas(showIds = []) {
  AREAS.forEach((id) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.classList.toggle("d-none", !showIds.includes(id));
  });
}

export function updateQuizNav() {
  const currentUser = getCurrentUser();
  const currentRole = getCurrentRole();
  const navUserBadge = document.getElementById("nav-user-badge");
  const createQuizBtn = document.getElementById("create-quiz-btn");
  const navAdminLink = document.getElementById("nav-admin");
  const logoutNavBtn = document.getElementById("logout-nav-btn");

  if (navUserBadge) navUserBadge.textContent = currentUser?.email || "Gjest";
  logoutNavBtn?.classList.toggle("d-none", !currentUser);

  if (currentRole === "admin") {
    createQuizBtn?.classList.remove("d-none");
    navAdminLink?.classList.remove("d-none");
  } else {
    createQuizBtn?.classList.add("d-none");
    navAdminLink?.classList.add("d-none");
  }
}

export async function showQuizList() {
  toggleAreas(["app-area", "quiz-list-area"]);
  await loadQuizzes();
}

async function loadQuizzes() {
  const quizList = document.getElementById("quiz-list");
  if (!quizList) return;

  quizList.innerHTML =
    '<div class="col-12"><p class="text-muted">Laster...</p></div>';
  const quizzes = await fetchQuizzes();

  quizList.innerHTML =
    quizzes.length === 0
      ? '<div class="col-12"><p class="text-muted">Ingen quiz tilgjengelig ennå.</p></div>'
      : quizzes
          .map(
            (q) => `
      <div class="col-md-6 col-lg-4">
        <div class="card card-elev card-click h-100" data-quiz-id="${q.id}">
          <div class="card-body">
            <h5 class="card-title">${escapeHtml(q.title)}</h5>
            <p class="card-text text-muted small">${escapeHtml(
              q.description || ""
            )}</p>
            <small class="text-muted">Opprettet: ${new Date(
              q.created_at
            ).toLocaleDateString("no-NO")}</small>
          </div>
        </div>
      </div>
    `
          )
          .join("");

  document.querySelectorAll(".card-click").forEach((card) => {
    card.addEventListener("click", () => showQuizTake(+card.dataset.quizId));
  });
}

export function showQuizCreate() {
  toggleAreas(["app-area", "quiz-create-area"]);
  initQuestionFields();
}

function initQuestionFields() {
  const container = document.getElementById("questions-container");
  if (!container) return;
  if (!container.children.length) addQuestionField();
}

function addQuestionField() {
  const container = document.getElementById("questions-container");
  if (!container) return;

  const index = container.children.length;
  const div = document.createElement("div");
  div.className = "mb-3";
  div.innerHTML = `
    <label class="form-label">Spørsmål ${index + 1}</label>
    <div class="input-group">
      <input type="text" class="form-control question-input" placeholder="Skriv spørsmål..." required />
      <button type="button" class="btn btn-outline-danger remove-question-btn">Fjern</button>
    </div>
  `;

  div.querySelector(".remove-question-btn").addEventListener("click", () => {
    div.remove();
    updateQuestionLabels();
  });

  container.appendChild(div);
}

function updateQuestionLabels() {
  const container = document.getElementById("questions-container");
  if (!container) return;
  Array.from(container.children).forEach((div, i) => {
    const label = div.querySelector("label");
    if (label) label.textContent = `Spørsmål ${i + 1}`;
  });
}

async function showQuizTake(quizId) {
  currentQuizId = quizId;
  currentQuizParticipantName = localStorage.getItem(`quiz_${quizId}_name`);
  toggleAreas(["app-area", "quiz-take-area"]);
  await loadQuizForTaking(quizId, !currentQuizParticipantName);
}

async function loadQuizForTaking(quizId, needsName = false) {
  const quizData = await fetchQuizWithQuestions(quizId);
  if (!quizData) return alert("Kunne ikke laste quiz.");

  document.getElementById("quiz-take-title").textContent = escapeHtml(
    quizData.title
  );
  document.getElementById("quiz-take-description").textContent = escapeHtml(
    quizData.description || ""
  );

  document
    .getElementById("quiz-name-section")
    .classList.toggle("d-none", !needsName);
  document
    .getElementById("quiz-take-form")
    .classList.toggle("d-none", needsName);

  const container = document.getElementById("quiz-questions-container");
  if (container) {
    container.innerHTML = (quizData.questions || [])
      .map(
        (q) => `
      <div class="mb-3">
        <label class="form-label">${escapeHtml(q.question_text)}</label>
        <input type="text" class="form-control quiz-answer-input" data-question-id="${
          q.id
        }" placeholder="Ditt svar..." required />
      </div>`
      )
      .join("");
  }
}

function renderAnswers(containerId, answers, includeName = false) {
  const container = document.getElementById(containerId);
  if (!container) return;

  if (!answers.length) {
    container.innerHTML = '<p class="text-muted">Ingen svar ennå.</p>';
    return;
  }

  const grouped = {};
  answers.forEach((ans) => {
    const title = ans.questions?.quizzes?.title || "Ukjent quiz";
    const questionText = ans.questions?.question_text || "Ukjent spørsmål";
    if (!grouped[title]) grouped[title] = [];
    grouped[title].push({
      ...ans,
      questionText,
      participantName: ans.participant_name,
    });
  });

  container.innerHTML = Object.entries(grouped)
    .map(
      ([title, quizAnswers]) => `
      <div class="mb-3">
        <h6 class="fw-semibold">${escapeHtml(title)}</h6>
        <div class="table-responsive">
          <table class="table table-sm">
            <thead>
              <tr>
                ${includeName ? "<th>Navn</th>" : ""}
                <th>Spørsmål</th>
                <th>Svar</th>
                <th>Sendt</th>
              </tr>
            </thead>
            <tbody>
              ${quizAnswers
                .map(
                  (ans) => `
                <tr>
                  ${
                    includeName
                      ? `<td><small>${escapeHtml(
                          ans.participantName || ans.user_id?.substring(0, 8)
                        )}</small></td>`
                      : ""
                  }
                  <td><small>${escapeHtml(ans.questionText)}</small></td>
                  <td><small>${escapeHtml(ans.answer_text)}</small></td>
                  <td><small>${new Date(ans.submitted_at).toLocaleString(
                    "no-NO"
                  )}</small></td>
                </tr>
              `
                )
                .join("")}
            </tbody>
          </table>
        </div>
      </div>
    `
    )
    .join("");
}

export async function showResults() {
  toggleAreas(["app-area", "results-area"]);
  const currentUser = getCurrentUser();

  // My answers
  const myAnswersResult = await fetchMyAnswers();
  renderAnswers("my-results-container", myAnswersResult.answers || []);

  // Answers to my quizzes
  const myQuizResultsCard = document.getElementById("my-quiz-results-card");
  const myQuizResultsContainer = document.getElementById(
    "my-quiz-results-container"
  );

  const allAnswersResult = await fetchAllAnswers();
  const myQuizAnswers = (allAnswersResult.answers || []).filter(
    (ans) => ans.questions?.quizzes?.created_by === currentUser?.id
  );

  if (myQuizAnswers.length > 0) {
    myQuizResultsCard?.classList.remove("d-none");
    renderAnswers("my-quiz-results-container", myQuizAnswers, true);
  } else {
    myQuizResultsCard?.classList.add("d-none");
  }
}


export async function showAdminResults() {
  toggleAreas(["app-area", "admin-results-area"]);
  const allAnswersResult = await fetchAllAnswers();
  renderAnswers(
    "admin-results-container",
    allAnswersResult.answers || [],
    true
  );
}

export function setupQuizEventListeners() {
  const clickHandler = (id, fn) =>
    document.getElementById(id)?.addEventListener("click", fn);

  clickHandler("nav-home", (e) => {
    e.preventDefault();
    showQuizList();
  });
  clickHandler("nav-quizzes", (e) => {
    e.preventDefault();
    showQuizList();
  });
  clickHandler("nav-user-badge", (e) => {
    if (getCurrentUser()) {
      e.preventDefault();
      showResults();
    }
  });
  clickHandler("nav-admin", (e) => {
    e.preventDefault();
    showAdminResults();
  });
  [
    "results-back-btn",
    "back-to-quizzes-btn",
    "back-to-quizzes-btn2",
    "cancel-create-btn",
    "cancel-take-btn",
  ].forEach((id) =>
    clickHandler(id, (e) => {
      e.preventDefault();
      showQuizList();
    })
  );
  clickHandler("create-quiz-btn", () => showQuizCreate());
  clickHandler("add-question-btn", () => {
    addQuestionField();
    updateQuestionLabels();
  });

  clickHandler("quiz-name-confirm-btn", () => {
    const name = document.getElementById("quiz-participant-name")?.value.trim();
    if (!name) return alert("Vennligst skriv inn ditt navn.");
    localStorage.setItem(`quiz_${currentQuizId}_name`, name);
    currentQuizParticipantName = name;
    document.getElementById("quiz-name-section")?.classList.add("d-none");
    document.getElementById("quiz-take-form")?.classList.remove("d-none");
  });

  document
    .getElementById("quiz-create-form")
    ?.addEventListener("submit", async (e) => {
      e.preventDefault();
      const title = document.getElementById("quiz-title")?.value.trim();
      const description = document
        .getElementById("quiz-description")
        ?.value.trim();
      const questions = Array.from(document.querySelectorAll(".question-input"))
        .map((i) => i.value.trim())
        .filter(Boolean);
      const statusEl = document.getElementById("quiz-create-status");
      if (!title)
        return statusEl && (statusEl.textContent = "Tittel er påkrevd.");
      if (!questions.length)
        return (
          statusEl && (statusEl.textContent = "Minst ett spørsmål er påkrevd.")
        );
      statusEl && (statusEl.textContent = "Opprettet quiz...");
      const quiz = await createQuiz(title, description, questions);
      statusEl &&
        (statusEl.textContent = quiz
          ? "Quiz opprettet!"
          : "Feil ved opprettelse.");
      if (quiz) setTimeout(showQuizList, 1500);
    });

  document
    .getElementById("quiz-take-form")
    ?.addEventListener("submit", async (e) => {
      e.preventDefault();
      const answers = {};
      document.querySelectorAll(".quiz-answer-input").forEach((i) => {
        const qid = i.dataset.questionId;
        const val = i.value.trim();
        if (val) answers[qid] = val;
      });
      const statusEl = document.getElementById("quiz-take-status");
      if (!Object.keys(answers).length)
        return (
          statusEl &&
          (statusEl.textContent = "Vennligst svar på minst ett spørsmål.")
        );
      statusEl && (statusEl.textContent = "Sender svar...");
      const success = await submitAnswers(
        currentQuizId,
        answers,
        currentQuizParticipantName
      );
      statusEl &&
        (statusEl.textContent = success
          ? "Svar sendt!"
          : "Feil ved sending av svar.");
      if (success) setTimeout(showQuizList, 1500);
    });
}

function escapeHtml(text) {
  const map = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  };
  return text.replace(/[&<>"']/g, (m) => map[m]);
}
