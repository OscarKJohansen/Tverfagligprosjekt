import { supabase } from "./auth.js";
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

  // Remove old quiz cards but keep the create-quiz-card
  const oldCards = quizList.querySelectorAll(".card-click");
  oldCards.forEach((card) => card.parentElement.remove());

  const quizzes = await fetchQuizzes();

  if (quizzes.length === 0) {
    const noQuizzesDiv = document.createElement("div");
    noQuizzesDiv.className = "col-12";
    noQuizzesDiv.innerHTML =
      '<p class="text-muted">Ingen quiz tilgjengelig ennå.</p>';
    quizList.appendChild(noQuizzesDiv);
  } else {
    quizzes.forEach((q) => {
      const col = document.createElement("div");
      col.className = "col-md-6 col-lg-4";
      col.innerHTML = `
        <div class="card card-elev card-click h-100" data-quiz-id="${
          q.id
        }" style="height: 200px">
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
      `;
      quizList.appendChild(col);
    });
  }

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
  div.className = "mb-3 p-3 border rounded question-field";
  div.innerHTML = `
    <label class="form-label fw-semibold">Spørsmål ${index + 1}</label>
    <div class="mb-2">
      <input type="text" class="form-control question-input" placeholder="Skriv spørsmål..." required />
    </div>
    <div class="mb-2">
      <label class="form-label small">Type spørsmål</label>
      <select class="form-select form-select-sm question-type-select">
        <option value="text">Tekstsvar</option>
        <option value="multiple_choice">Flervalg</option>
      </select>
    </div>
    <div class="text-answer-container">
      <label class="form-label small">Riktig svar</label>
      <input type="text" class="form-control form-control-sm correct-text-answer" placeholder="Riktig svar (ikke sensitivt for stor/små bokstaver)..." required />
    </div>
    <div class="choices-container d-none">
      <label class="form-label small">Svaralternativer</label>
      <div class="choices-list"></div>
      <button type="button" class="btn btn-sm btn-outline-secondary add-choice-btn mt-2">+ Legg til alternativ</button>
    </div>
    <button type="button" class="btn btn-sm btn-outline-danger remove-question-btn mt-2">Fjern spørsmål</button>
  `;

  // Toggle visibility based on question type
  const typeSelect = div.querySelector(".question-type-select");
  const choicesContainer = div.querySelector(".choices-container");
  const textAnswerContainer = div.querySelector(".text-answer-container");

  const toggleQuestionType = () => {
    const isMultipleChoice = typeSelect.value === "multiple_choice";
    const isText = typeSelect.value === "text";

    choicesContainer.classList.toggle("d-none", !isMultipleChoice);
    textAnswerContainer.classList.toggle("d-none", !isText);

    if (isMultipleChoice && !div.querySelector(".choice-item")) {
      addChoiceField(div);
      addChoiceField(div);
    }
  };

  typeSelect.addEventListener("change", toggleQuestionType);
  // Initialize visibility on load
  toggleQuestionType();

  // Add choice button
  div.querySelector(".add-choice-btn").addEventListener("click", () => {
    addChoiceField(div);
  });

  div.querySelector(".remove-question-btn").addEventListener("click", () => {
    div.remove();
    updateQuestionLabels();
  });

  container.appendChild(div);
}

function addChoiceField(questionDiv) {
  const choicesList = questionDiv.querySelector(".choices-list");
  if (!choicesList) return;

  const choiceIndex = choicesList.children.length;
  const choiceDiv = document.createElement("div");
  choiceDiv.className = "input-group input-group-sm mb-2 choice-item";
  choiceDiv.innerHTML = `
    <input type="text" class="form-control choice-input" placeholder="Alternativ ${
      choiceIndex + 1
    }..." required />
    <div class="input-group-text">
      <input type="radio" class="form-check-input mt-0 correct-choice-radio" name="correct_${Date.now()}_${choiceIndex}" title="Marker som riktig svar" />
      <label class="ms-1 small">Riktig</label>
    </div>
    <button type="button" class="btn btn-outline-danger remove-choice-btn">×</button>
  `;

  // Update radio name to be unique per question
  const questionIndex = Array.from(
    document.querySelectorAll(".question-field")
  ).indexOf(questionDiv);
  choiceDiv.querySelectorAll(".correct-choice-radio").forEach((radio) => {
    radio.name = `correct_q${questionIndex}`;
  });

  choiceDiv
    .querySelector(".remove-choice-btn")
    .addEventListener("click", () => {
      choiceDiv.remove();
    });

  choicesList.appendChild(choiceDiv);

  // Update all radio names in this question to match
  updateChoiceRadioNames(questionDiv);
}

function updateChoiceRadioNames(questionDiv) {
  const questionIndex = Array.from(
    document.querySelectorAll(".question-field")
  ).indexOf(questionDiv);
  questionDiv.querySelectorAll(".correct-choice-radio").forEach((radio) => {
    radio.name = `correct_q${questionIndex}`;
  });
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

// Store current quiz data for answer checking
let currentQuizData = null;

async function loadQuizForTaking(quizId, needsName = false) {
  const quizData = await fetchQuizWithQuestions(quizId);
  if (!quizData) return alert("Kunne ikke laste quiz.");

  currentQuizData = quizData;

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
      .map((q) => {
        // Check for multiple choice: either by question_type OR by having choices
        const isMultipleChoice =
          q.question_type === "multiple_choice" ||
          (q.choices && q.choices.length > 0);

        if (isMultipleChoice && q.choices && q.choices.length > 0) {
          // Render radio buttons for multiple-choice questions
          const choicesHtml = q.choices
            .map(
              (choice, index) => `
              <div class="form-check">
                <input class="form-check-input quiz-answer-radio" type="radio" 
                  name="question_${q.id}" 
                  id="choice_${choice.id}" 
                  value="${escapeHtml(choice.choice_text)}" 
                  data-option-number="${index + 1}"
                  data-choice-text="${escapeHtml(choice.choice_text)}"
                  data-question-id="${q.id}"
                  data-is-correct="${choice.is_correct || false}" />
                <label class="form-check-label" for="choice_${choice.id}">
                  ${escapeHtml(choice.choice_text)}
                </label>
              </div>`
            )
            .join("");
          return `
            <div class="mb-3 question-container" data-question-id="${
              q.id
            }" data-question-type="multiple_choice">
              <label class="form-label fw-semibold">${escapeHtml(
                q.question_text
              )}</label>
              ${choicesHtml}
              <div class="answer-feedback mt-2" style="display: none;"></div>
            </div>`;
        } else {
          // Render text input for text questions
          return `
            <div class="mb-3 question-container" data-question-id="${
              q.id
            }" data-question-type="text">
              <label class="form-label">${escapeHtml(q.question_text)}</label>
              <input type="text" class="form-control quiz-answer-input" data-question-id="${
                q.id
              }" placeholder="Ditt svar..." required />
              <div class="answer-feedback mt-2" style="display: none;"></div>
            </div>`;
        }
      })
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

  // Group by quiz, then by question
  const grouped = {};
  answers.forEach((ans) => {
    const title = ans.questions?.quizzes?.title || "Ukjent quiz";
    const questionText = ans.questions?.question_text || "Ukjent spørsmål";
    const questionId = ans.questions?.id || ans.question_id;

    if (!grouped[title]) grouped[title] = {};
    if (!grouped[title][questionId]) {
      grouped[title][questionId] = {
        questionText,
        answers: [],
      };
    }
    grouped[title][questionId].answers.push({
      ...ans,
      questionText,
      participantName: ans.participant_name,
    });
  });

  container.innerHTML = Object.entries(grouped)
    .map(([title, questions]) => {
      const quizAnswers = Object.values(questions).flatMap((q) => q.answers);
      const totalAnswers = quizAnswers.length;
      const correctAnswers = quizAnswers.filter(
        (a) => a.is_correct === true
      ).length;

      return `
      <div class="card card-elev mb-4">
        <div class="card-body">
          <div class="d-flex justify-content-between align-items-center mb-3">
            <div>
              <h5 class="card-title mb-1">${escapeHtml(title)}</h5>
              <p class="card-text text-muted small mb-0">
                <strong>${totalAnswers}</strong> svar
                ${
                  correctAnswers > 0
                    ? `• <strong>${correctAnswers}</strong> korrekte`
                    : ""
                }
              </p>
            </div>
            ${
              includeName
                ? `<button class="btn btn-sm btn-outline-primary download-quiz-csv-btn" data-quiz-title="${escapeHtml(
                    title
                  ).replace(/"/g, "&quot;")}">Last ned CSV</button>`
                : ""
            }
          </div>
          
          <div class="accordion" id="accordion_${containerId}_${title.replace(
        /\s+/g,
        "_"
      )}">
            ${Object.entries(questions)
              .map(([qId, qData], qIndex) => {
                const questionAnswers = qData.answers;
                const correctCount = questionAnswers.filter(
                  (a) => a.is_correct === true
                ).length;
                const correctBadge =
                  correctCount > 0
                    ? `<span class="badge bg-success ms-2">${correctCount}/${questionAnswers.length} korrekte</span>`
                    : "";

                return `
                <div class="accordion-item">
                  <h2 class="accordion-header">
                    <button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#collapse_${containerId}_${qId}" aria-expanded="false">
                      <span class="fw-semibold">${escapeHtml(
                        qData.questionText
                      )}</span>
                      ${correctBadge}
                    </button>
                  </h2>
                  <div id="collapse_${containerId}_${qId}" class="accordion-collapse collapse" data-bs-parent="#accordion_${containerId}_${title.replace(
                  /\s+/g,
                  "_"
                )}">
                    <div class="accordion-body p-0">
                      <div class="table-responsive">
                        <table class="table table-sm mb-0">
                          <thead class="table-light">
                            <tr>
                              ${
                                includeName
                                  ? '<th class="px-3 py-2">Navn</th>'
                                  : ""
                              }
                              <th class="px-3 py-2">Svar</th>
                              ${
                                questionAnswers.some(
                                  (a) => a.is_correct !== null
                                )
                                  ? '<th class="px-3 py-2 text-center" style="width: 80px;">Status</th>'
                                  : ""
                              }
                              <th class="px-3 py-2 text-muted" style="width: 150px;">Sendt</th>
                            </tr>
                          </thead>
                          <tbody>
                            ${questionAnswers
                              .map((ans) => {
                                let statusBadge = "";
                                if (ans.is_correct === true) {
                                  statusBadge =
                                    '<span class="badge bg-success">✓</span>';
                                } else if (ans.is_correct === false) {
                                  statusBadge =
                                    '<span class="badge bg-danger">✗</span>';
                                }

                                return `
                                  <tr>
                                    ${
                                      includeName
                                        ? `<td class="px-3 py-2"><small>${escapeHtml(
                                            ans.participantName ||
                                              ans.user_id?.substring(0, 8)
                                          )}</small></td>`
                                        : ""
                                    }
                                    <td class="px-3 py-2"><small>${escapeHtml(
                                      ans.answer_text
                                    )}</small></td>
                                    ${
                                      ans.is_correct !== null
                                        ? `<td class="px-3 py-2 text-center">${statusBadge}</td>`
                                        : ""
                                    }
                                    <td class="px-3 py-2 text-muted"><small>${new Date(
                                      ans.submitted_at
                                    ).toLocaleString("no-NO")}</small></td>
                                  </tr>
                                `;
                              })
                              .join("")}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                </div>
              `;
              })
              .join("")}
          </div>
        </div>
      </div>
    `;
    })
    .join("");

  // Add CSV download event listeners
  if (includeName) {
    document.querySelectorAll(".download-quiz-csv-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const quizTitle = btn.dataset.quizTitle;
        const quizAnswers = Object.entries(grouped).find(
          ([title]) => title === quizTitle
        )?.[1];

        if (quizAnswers) {
          const flatAnswers = Object.values(quizAnswers).flatMap(
            (q) => q.answers
          );
          const csvContent = answersToCSV(quizTitle, flatAnswers);
          const filename = `${quizTitle.replace(
            /[^a-z0-9æøå]/gi,
            "_"
          )}_svar.csv`;
          downloadCSV(filename, csvContent);
        }
      });
    });
  }
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
    "admin-results-back-btn",
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
  clickHandler("create-quiz-card", () => showQuizCreate());
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

      // Collect questions with their type and choices
      const questions = [];
      document.querySelectorAll(".question-field").forEach((questionDiv) => {
        const questionText = questionDiv
          .querySelector(".question-input")
          ?.value.trim();
        const questionType =
          questionDiv.querySelector(".question-type-select")?.value || "text";

        if (!questionText) return;

        const questionData = {
          text: questionText,
          type: questionType,
          choices: [],
        };

        if (questionType === "multiple_choice") {
          questionDiv.querySelectorAll(".choice-item").forEach((choiceDiv) => {
            const choiceText = choiceDiv
              .querySelector(".choice-input")
              ?.value.trim();
            const isCorrect =
              choiceDiv.querySelector(".correct-choice-radio")?.checked ||
              false;
            if (choiceText) {
              questionData.choices.push({ text: choiceText, isCorrect });
            }
          });
        } else if (questionType === "text") {
          const correctAnswer = questionDiv
            .querySelector(".correct-text-answer")
            ?.value.trim();
          questionData.correctAnswer = correctAnswer;
        }

        questions.push(questionData);
      });

      const statusEl = document.getElementById("quiz-create-status");
      if (!title)
        return statusEl && (statusEl.textContent = "Tittel er påkrevd.");
      if (!questions.length)
        return (
          statusEl && (statusEl.textContent = "Minst ett spørsmål er påkrevd.")
        );

      // Validate questions
      for (const q of questions) {
        if (q.type === "multiple_choice") {
          if (q.choices.length < 2) {
            return (
              statusEl &&
              (statusEl.textContent =
                "Flervalgsspørsmål må ha minst 2 alternativer.")
            );
          }
          if (!q.choices.some((c) => c.isCorrect)) {
            return (
              statusEl &&
              (statusEl.textContent =
                "Flervalgsspørsmål må ha ett riktig svar.")
            );
          }
        } else if (q.type === "text") {
          if (!q.correctAnswer) {
            return (
              statusEl &&
              (statusEl.textContent =
                "Alle tekstspørsmål må ha ett riktig svar.")
            );
          }
        }
      }

      statusEl && (statusEl.textContent = "Oppretter quiz...");
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
      const answerDetails = {}; // Track details for feedback

      // Collect text answers
      document.querySelectorAll(".quiz-answer-input").forEach((i) => {
        const qid = i.dataset.questionId;
        const val = i.value.trim();
        if (val) {
          answers[qid] = val;
          answerDetails[qid] = { type: "text", value: val };
        }
      });

      // Collect multiple-choice answers
      document
        .querySelectorAll(".quiz-answer-radio:checked")
        .forEach((radio) => {
          const qid = radio.dataset.questionId;
          const choiceText = radio.value; // Now contains the choice text
          const optionNumber = radio.dataset.optionNumber;
          const isCorrect = radio.dataset.isCorrect === "true";
          // Store the choice text (or "Option 2" format for clarity)
          answers[qid] = `Option ${optionNumber}: ${choiceText}`;
          answerDetails[qid] = {
            type: "multiple_choice",
            choiceText,
            optionNumber,
            isCorrect,
          };
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

      if (success) {
        // Fetch the submitted answers to get correctness feedback
        const questionIds = Object.keys(answers).map((q) => parseInt(q));
        const { data: submittedAnswers, error } = await supabase
          .from("answers")
          .select("*")
          .in("question_id", questionIds)
          .eq("user_id", getCurrentUser().id)
          .order("id", { ascending: false })
          .limit(questionIds.length);

        // Create a map of latest answers by question_id
        const answersByQuestion = {};
        (submittedAnswers || []).forEach((ans) => {
          if (!answersByQuestion[ans.question_id]) {
            answersByQuestion[ans.question_id] = ans;
          }
        });

        // Show feedback for each answered question
        Object.entries(answerDetails).forEach(([qid, detail]) => {
          const container = document.querySelector(
            `.question-container[data-question-id="${qid}"]`
          );
          const feedbackEl = container?.querySelector(".answer-feedback");
          if (feedbackEl) {
            feedbackEl.style.display = "block";
            const submittedAns = answersByQuestion[parseInt(qid)];
            if (detail.type === "multiple_choice") {
              if (detail.isCorrect) {
                feedbackEl.innerHTML =
                  '<span class="text-success fw-semibold">✓ Riktig!</span>';
              } else {
                feedbackEl.innerHTML =
                  '<span class="text-danger fw-semibold">✗ Feil</span>';
              }
            } else if (detail.type === "text" && submittedAns) {
              if (submittedAns.is_correct === true) {
                feedbackEl.innerHTML =
                  '<span class="text-success fw-semibold">✓ Riktig!</span>';
              } else if (submittedAns.is_correct === false) {
                feedbackEl.innerHTML =
                  '<span class="text-danger fw-semibold">✗ Feil</span>';
              }
            }
          }
        });

        // Disable inputs after submission
        document
          .querySelectorAll(".quiz-answer-input, .quiz-answer-radio")
          .forEach((el) => {
            el.disabled = true;
          });

        statusEl && (statusEl.textContent = "Svar sendt!");
        setTimeout(showQuizList, 2500); // Longer delay to see feedback
      } else {
        statusEl && (statusEl.textContent = "Feil ved sending av svar.");
      }
    });
}

// Convert answers to CSV format
function answersToCSV(quizTitle, answers) {
  // CSV header
  const headers = ["Navn", "Spørsmål", "Svar", "Sendt"];
  const csvRows = [headers.join(",")];

  // Add each answer as a row
  answers.forEach((ans) => {
    const row = [
      `"${(ans.participantName || "").replace(/"/g, '""')}"`,
      `"${(ans.questionText || "").replace(/"/g, '""')}"`,
      `"${(ans.answer_text || "").replace(/"/g, '""')}"`,
      `"${new Date(ans.submitted_at).toLocaleString("no-NO")}"`,
    ];
    csvRows.push(row.join(","));
  });

  return csvRows.join("\n");
}

// Download CSV file
function downloadCSV(filename, csvContent) {
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);

  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  link.style.visibility = "hidden";

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
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
