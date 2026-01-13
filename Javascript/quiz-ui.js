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

// Update navigation based on auth state
export function updateQuizNav() {
  const currentUser = getCurrentUser();
  const currentRole = getCurrentRole();

  const navUserBadge = document.getElementById("nav-user-badge");
  const createQuizBtn = document.getElementById("create-quiz-btn");
  const navAdminLink = document.getElementById("nav-admin");
  const logoutNavBtn = document.getElementById("logout-nav-btn");

  if (currentUser) {
    navUserBadge.textContent = currentUser.email;
    logoutNavBtn.classList.remove("d-none");
  } else {
    navUserBadge.textContent = "Gjest";
    logoutNavBtn.classList.add("d-none");
  }

  if (currentRole === "admin" && createQuizBtn) {
    createQuizBtn.classList.remove("d-none");
    navAdminLink.classList.remove("d-none");
  } else {
    if (createQuizBtn) createQuizBtn.classList.add("d-none");
    navAdminLink.classList.add("d-none");
  }
}

// Show quiz list
export async function showQuizList() {
  const appArea = document.getElementById("app-area");
  const quizListArea = document.getElementById("quiz-list-area");
  const quizCreateArea = document.getElementById("quiz-create-area");
  const quizTakeArea = document.getElementById("quiz-take-area");
  const adminResultsArea = document.getElementById("admin-results-area");
  const resultsArea = document.getElementById("results-area");

  if (appArea) appArea.classList.remove("d-none");
  if (quizListArea) quizListArea.classList.remove("d-none");
  if (quizCreateArea) quizCreateArea.classList.add("d-none");
  if (quizTakeArea) quizTakeArea.classList.add("d-none");
  if (adminResultsArea) adminResultsArea.classList.add("d-none");
  if (resultsArea) resultsArea.classList.add("d-none");

  await loadQuizzes();
}

// Load and display all quizzes
async function loadQuizzes() {
  const quizList = document.getElementById("quiz-list");
  if (!quizList) return;

  quizList.innerHTML =
    '<div class="col-12"><p class="text-muted">Laster...</p></div>';

  const quizzes = await fetchQuizzes();

  if (quizzes.length === 0) {
    quizList.innerHTML =
      '<div class="col-12"><p class="text-muted">Ingen quiz tilgjengelig ennå.</p></div>';
    return;
  }

  quizList.innerHTML = quizzes
    .map(
      (quiz) => `
    <div class="col-md-6 col-lg-4">
      <div class="card card-elev card-click h-100" data-quiz-id="${quiz.id}">
        <div class="card-body">
          <h5 class="card-title">${escapeHtml(quiz.title)}</h5>
          <p class="card-text text-muted small">
            ${escapeHtml(quiz.description || "")}
          </p>
          <small class="text-muted">
            Opprettet: ${new Date(quiz.created_at).toLocaleDateString("no-NO")}
          </small>
        </div>
      </div>
    </div>
  `
    )
    .join("");

  // Add click handlers
  document.querySelectorAll(".card-click").forEach((card) => {
    card.addEventListener("click", () => {
      const quizId = card.dataset.quizId;
      showQuizTake(parseInt(quizId));
    });
  });
}

// Show quiz creation form
export function showQuizCreate() {
  const appArea = document.getElementById("app-area");
  const quizListArea = document.getElementById("quiz-list-area");
  const quizCreateArea = document.getElementById("quiz-create-area");
  const quizTakeArea = document.getElementById("quiz-take-area");
  const adminResultsArea = document.getElementById("admin-results-area");
  const resultsArea = document.getElementById("results-area");

  if (appArea) appArea.classList.remove("d-none");
  if (quizListArea) quizListArea.classList.add("d-none");
  if (quizCreateArea) quizCreateArea.classList.remove("d-none");
  if (quizTakeArea) quizTakeArea.classList.add("d-none");
  if (adminResultsArea) adminResultsArea.classList.add("d-none");
  if (resultsArea) resultsArea.classList.add("d-none");

  initQuestionFields();
}

// Initialize question fields
function initQuestionFields() {
  const container = document.getElementById("questions-container");
  if (!container) return;

  if (container.children.length === 0) {
    addQuestionField();
  }
}

// Add a question input field
function addQuestionField() {
  const container = document.getElementById("questions-container");
  if (!container) return;

  const index = container.children.length;
  const questionDiv = document.createElement("div");
  questionDiv.className = "mb-3";
  questionDiv.innerHTML = `
    <label class="form-label">Spørsmål ${index + 1}</label>
    <div class="input-group">
      <input
        type="text"
        class="form-control question-input"
        placeholder="Skriv spørsmål..."
        required
      />
      <button type="button" class="btn btn-outline-danger remove-question-btn">
        Fjern
      </button>
    </div>
  `;

  const removeBtn = questionDiv.querySelector(".remove-question-btn");
  removeBtn.addEventListener("click", () => {
    questionDiv.remove();
    updateQuestionLabels();
  });

  container.appendChild(questionDiv);
}

// Update question labels
function updateQuestionLabels() {
  const container = document.getElementById("questions-container");
  if (!container) return;

  Array.from(container.children).forEach((div, index) => {
    const label = div.querySelector("label");
    if (label) label.textContent = `Spørsmål ${index + 1}`;
  });
}

// Show quiz taking interface
async function showQuizTake(quizId) {
  currentQuizId = quizId;

  // Check if name is already stored for this quiz
  const storedName = localStorage.getItem(`quiz_${quizId}_name`);
  currentQuizParticipantName = storedName;

  const appArea = document.getElementById("app-area");
  const quizListArea = document.getElementById("quiz-list-area");
  const quizCreateArea = document.getElementById("quiz-create-area");
  const quizTakeArea = document.getElementById("quiz-take-area");
  const adminResultsArea = document.getElementById("admin-results-area");
  const resultsArea = document.getElementById("results-area");

  if (appArea) appArea.classList.remove("d-none");
  if (quizListArea) quizListArea.classList.add("d-none");
  if (quizCreateArea) quizCreateArea.classList.add("d-none");
  if (quizTakeArea) quizTakeArea.classList.remove("d-none");
  if (adminResultsArea) adminResultsArea.classList.add("d-none");
  if (resultsArea) resultsArea.classList.add("d-none");

  await loadQuizForTaking(quizId, !storedName); // Pass true if name needs to be entered
}

// Load quiz for taking
async function loadQuizForTaking(quizId, needsName = false) {
  const quizData = await fetchQuizWithQuestions(quizId);
  if (!quizData) {
    alert("Kunne ikke laste quiz.");
    return;
  }

  const titleEl = document.getElementById("quiz-take-title");
  const descEl = document.getElementById("quiz-take-description");
  const nameSection = document.getElementById("quiz-name-section");
  const quizForm = document.getElementById("quiz-take-form");
  const container = document.getElementById("quiz-questions-container");
  const nameInput = document.getElementById("quiz-participant-name");

  if (titleEl) titleEl.textContent = escapeHtml(quizData.title);
  if (descEl) descEl.textContent = escapeHtml(quizData.description || "");

  if (needsName) {
    // Show name input, hide form
    if (nameSection) nameSection.classList.remove("d-none");
    if (quizForm) quizForm.classList.add("d-none");
    if (nameInput) nameInput.focus();
  } else {
    // Hide name input, show form
    if (nameSection) nameSection.classList.add("d-none");
    if (quizForm) quizForm.classList.remove("d-none");
  }

  if (container) {
    container.innerHTML = (quizData.questions || [])
      .map(
        (q) => `
      <div class="mb-3">
        <label class="form-label">${escapeHtml(q.question_text)}</label>
        <input
          type="text"
          class="form-control quiz-answer-input"
          data-question-id="${q.id}"
          placeholder="Ditt svar..."
          required
        />
      </div>
    `
      )
      .join("");
  }
}

// Show user results (my answers + answers to my quizzes)
export async function showResults() {
  const appArea = document.getElementById("app-area");
  const quizListArea = document.getElementById("quiz-list-area");
  const quizCreateArea = document.getElementById("quiz-create-area");
  const quizTakeArea = document.getElementById("quiz-take-area");
  const adminResultsArea = document.getElementById("admin-results-area");
  const resultsArea = document.getElementById("results-area");

  if (appArea) appArea.classList.remove("d-none");
  if (quizListArea) quizListArea.classList.add("d-none");
  if (quizCreateArea) quizCreateArea.classList.add("d-none");
  if (quizTakeArea) quizTakeArea.classList.add("d-none");
  if (adminResultsArea) adminResultsArea.classList.add("d-none");
  if (resultsArea) resultsArea.classList.remove("d-none");

  await loadMyResults();
}

// Load and display user's answers
async function loadMyResults() {
  const currentUser = getCurrentUser();
  const myResultsContainer = document.getElementById("my-results-container");
  const myQuizResultsCard = document.getElementById("my-quiz-results-card");
  const myQuizResultsContainer = document.getElementById(
    "my-quiz-results-container"
  );

  if (!myResultsContainer || !myQuizResultsContainer) return;

  myResultsContainer.innerHTML = '<p class="text-muted">Laster...</p>';

  // Fetch user's own answers
  const result = await fetchMyAnswers();
  if (result.error) {
    myResultsContainer.innerHTML = `<p class="text-muted">Feil: ${escapeHtml(
      result.error
    )}</p>`;
    if (myQuizResultsCard) myQuizResultsCard.classList.add("d-none");
    return;
  }

  const answers = result.answers;

  if (answers.length === 0) {
    myResultsContainer.innerHTML =
      '<p class="text-muted">Du har ikke besvart noen quiz ennå.</p>';
  } else {
    // Group by quiz
    const byQuiz = {};
    answers.forEach((ans) => {
      const quizTitle = ans.questions?.quizzes?.title || "Ukjent quiz";
      const questionText = ans.questions?.question_text || "Ukjent spørsmål";
      if (!byQuiz[quizTitle]) byQuiz[quizTitle] = [];
      byQuiz[quizTitle].push({ ...ans, questionText });
    });

    const html = Object.entries(byQuiz)
      .map(
        ([quizTitle, quizAnswers]) => `
      <div class="mb-3">
        <h6 class="fw-semibold">${escapeHtml(quizTitle)}</h6>
        <div class="table-responsive">
          <table class="table table-sm">
            <thead>
              <tr>
                <th>Spørsmål</th>
                <th>Ditt svar</th>
                <th>Sendt</th>
              </tr>
            </thead>
            <tbody>
              ${quizAnswers
                .map(
                  (ans) => `
                <tr>
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

    myResultsContainer.innerHTML = html;
  }

  // Fetch answers to user's quizzes (only shown if user created quizzes)
  const allAnswersResult = await fetchAllAnswers();
  if (!allAnswersResult.error && allAnswersResult.answers.length > 0) {
    // Filter to only answers for quizzes created by this user
    const myQuizAnswers = allAnswersResult.answers.filter(
      (ans) => ans.questions?.quizzes?.created_by === currentUser?.id
    );

    if (myQuizAnswers.length > 0) {
      if (myQuizResultsCard) myQuizResultsCard.classList.remove("d-none");

      // Group by quiz
      const byQuiz = {};
      myQuizAnswers.forEach((ans) => {
        const quizTitle = ans.questions?.quizzes?.title || "Ukjent quiz";
        const questionText = ans.questions?.question_text || "Ukjent spørsmål";
        const participantName =
          ans.participant_name || ans.user_id.substring(0, 8);
        if (!byQuiz[quizTitle]) byQuiz[quizTitle] = [];
        byQuiz[quizTitle].push({ ...ans, questionText, participantName });
      });

      const html = Object.entries(byQuiz)
        .map(
          ([quizTitle, quizAnswers]) => `
        <div class="mb-3">
          <h6 class="fw-semibold">${escapeHtml(quizTitle)}</h6>
          <div class="table-responsive">
            <table class="table table-sm">
              <thead>
                <tr>
                  <th>Navn</th>
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
                    <td><small>${escapeHtml(ans.participantName)}</small></td>
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

      myQuizResultsContainer.innerHTML = html;
    } else {
      if (myQuizResultsCard) myQuizResultsCard.classList.add("d-none");
    }
  } else {
    if (myQuizResultsCard) myQuizResultsCard.classList.add("d-none");
  }
}

// Show admin results
export async function showAdminResults() {
  const appArea = document.getElementById("app-area");
  const quizListArea = document.getElementById("quiz-list-area");
  const quizCreateArea = document.getElementById("quiz-create-area");
  const quizTakeArea = document.getElementById("quiz-take-area");
  const resultsArea = document.getElementById("results-area");
  const adminResultsArea = document.getElementById("admin-results-area");

  if (appArea) appArea.classList.remove("d-none");
  if (quizListArea) quizListArea.classList.add("d-none");
  if (quizCreateArea) quizCreateArea.classList.add("d-none");
  if (quizTakeArea) quizTakeArea.classList.add("d-none");
  if (resultsArea) resultsArea.classList.add("d-none");
  if (adminResultsArea) adminResultsArea.classList.remove("d-none");

  await loadAdminResults();
}

// Load and display admin results
async function loadAdminResults() {
  const container = document.getElementById("admin-results-container");
  if (!container) return;

  container.innerHTML = '<p class="text-muted">Laster...</p>';

  const result = await fetchAllAnswers();
  const answers = result.answers || [];

  if (answers.length === 0) {
    container.innerHTML = '<p class="text-muted">Ingen svar ennå.</p>';
    return;
  }

  // Group answers by quiz
  const byQuiz = {};
  answers.forEach((ans) => {
    const quizTitle = ans.questions?.quizzes?.title || "Ukjent quiz";
    const questionText = ans.questions?.question_text || "Ukjent spørsmål";
    if (!byQuiz[quizTitle]) byQuiz[quizTitle] = [];
    byQuiz[quizTitle].push({ ...ans, questionText });
  });

  const html = Object.entries(byQuiz)
    .map(
      ([quizTitle, quizAnswers]) => `
    <div class="mb-4">
      <h5 class="fw-semibold">${escapeHtml(quizTitle)}</h5>
      <div class="table-responsive">
        <table class="table table-sm">
          <thead>
            <tr>
              <th>Navn</th>
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
                <td><small>${escapeHtml(
                  ans.participant_name || ans.user_id.substring(0, 8)
                )}</small></td>
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

  container.innerHTML = html;
}

// Setup event listeners
export function setupQuizEventListeners() {
  // Navigation
  document.getElementById("nav-home")?.addEventListener("click", (e) => {
    e.preventDefault();
    showQuizList();
  });

  document.getElementById("nav-quizzes")?.addEventListener("click", (e) => {
    e.preventDefault();
    showQuizList();
  });

  // Nav email badge click - show results
  const navUserBadge = document.getElementById("nav-user-badge");
  navUserBadge?.addEventListener("click", (e) => {
    const currentUser = getCurrentUser();
    if (currentUser) {
      e.preventDefault();
      showResults();
    }
  });

  // Admin link
  document.getElementById("nav-admin")?.addEventListener("click", (e) => {
    e.preventDefault();
    showAdminResults();
  });

  // Results back button
  document
    .getElementById("results-back-btn")
    ?.addEventListener("click", (e) => {
      e.preventDefault();
      showQuizList();
    });

  document
    .getElementById("logout-nav-btn")
    ?.addEventListener("click", async (e) => {
      e.preventDefault();
      // Handled by auth module
    });

  // Quiz creation
  document
    .getElementById("create-quiz-btn")
    ?.addEventListener("click", () => showQuizCreate());

  document.getElementById("add-question-btn")?.addEventListener("click", () => {
    addQuestionField();
    updateQuestionLabels();
  });

  document
    .getElementById("back-to-quizzes-btn")
    ?.addEventListener("click", (e) => {
      e.preventDefault();
      showQuizList();
    });

  document
    .getElementById("back-to-quizzes-btn2")
    ?.addEventListener("click", (e) => {
      e.preventDefault();
      showQuizList();
    });

  document
    .getElementById("cancel-create-btn")
    ?.addEventListener("click", (e) => {
      e.preventDefault();
      showQuizList();
    });

  document.getElementById("cancel-take-btn")?.addEventListener("click", (e) => {
    e.preventDefault();
    showQuizList();
  });
  // Quiz participant name confirmation
  document
    .getElementById("quiz-name-confirm-btn")
    ?.addEventListener("click", async (e) => {
      e.preventDefault();
      const nameInput = document.getElementById("quiz-participant-name");
      const name = nameInput?.value.trim();

      if (!name) {
        alert("Vennligst skriv inn ditt navn.");
        return;
      }

      // Store name in localStorage
      localStorage.setItem(`quiz_${currentQuizId}_name`, name);
      currentQuizParticipantName = name;

      // Show quiz form
      const nameSection = document.getElementById("quiz-name-section");
      const quizForm = document.getElementById("quiz-take-form");
      if (nameSection) nameSection.classList.add("d-none");
      if (quizForm) quizForm.classList.remove("d-none");
    });
  // Quiz creation form
  document
    .getElementById("quiz-create-form")
    ?.addEventListener("submit", async (e) => {
      e.preventDefault();

      const title = document.getElementById("quiz-title")?.value.trim();
      const description = document
        .getElementById("quiz-description")
        ?.value.trim();
      const questions = Array.from(document.querySelectorAll(".question-input"))
        .map((input) => input.value.trim())
        .filter((q) => q);

      const statusEl = document.getElementById("quiz-create-status");

      if (!title) {
        if (statusEl) statusEl.textContent = "Tittel er påkrevd.";
        return;
      }

      if (questions.length === 0) {
        if (statusEl) statusEl.textContent = "Minst ett spørsmål er påkrevd.";
        return;
      }

      if (statusEl) statusEl.textContent = "Opprettet quiz...";

      const quiz = await createQuiz(title, description, questions);
      if (quiz) {
        if (statusEl) statusEl.textContent = "Quiz opprettet!";
        setTimeout(() => showQuizList(), 1500);
      } else {
        if (statusEl) statusEl.textContent = "Feil ved opprettelse.";
      }
    });

  // Quiz taking form
  document
    .getElementById("quiz-take-form")
    ?.addEventListener("submit", async (e) => {
      e.preventDefault();

      const answers = {};
      document.querySelectorAll(".quiz-answer-input").forEach((input) => {
        const questionId = input.dataset.questionId;
        const answerText = input.value.trim();
        if (answerText) {
          answers[questionId] = answerText;
        }
      });

      const statusEl = document.getElementById("quiz-take-status");

      if (Object.keys(answers).length === 0) {
        if (statusEl)
          statusEl.textContent = "Vennligst svar på minst ett spørsmål.";
        return;
      }

      if (statusEl) statusEl.textContent = "Sender svar...";

      const success = await submitAnswers(
        currentQuizId,
        answers,
        currentQuizParticipantName
      );
      if (success) {
        if (statusEl) statusEl.textContent = "Svar sendt!";
        setTimeout(() => showQuizList(), 1500);
      } else {
        if (statusEl) statusEl.textContent = "Feil ved sending av svar.";
      }
    });
}

// Escape HTML
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
