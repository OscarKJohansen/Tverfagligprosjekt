import { supabase } from "./auth.js";
import {
  getCurrentUser,
  getCurrentRole,
  getCurrentDisplayName,
} from "./state.js";
import {
  fetchQuizzesByCategory,
  fetchQuizWithQuestions,
  createQuiz,
  submitAnswers,
  fetchAllAnswers,
  fetchMyAnswers,
} from "./quizzes.js";
import { searchUnsplashImages, getAttributionHtml } from "./unsplash.js";
import {
  generateMovieRatingMultipleChoice,
  generateMovieRatingTextAnswer,
  searchMovies,
} from "./movie-rating.js";

let currentQuizId = null;
let currentQuizParticipantName = null;
let currentMovieRatingData = null; // Lagrer nåværende filmrating for redigering

const AREAS = [
  "app-area",
  "quiz-list-area",
  "quiz-create-area",
  "quiz-take-area",
  "admin-results-area",
  "results-area",
  "rankings-area",
];

let currentCategory = "newest"; // standard kategori

export function toggleAreas(showIds = []) {
  AREAS.forEach((id) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.classList.toggle("d-none", !showIds.includes(id));
  });
  // Scroll til toppen når du bytter seksjoner
  window.scrollTo(0, 0);
}

export function updateQuizNav() {
  const currentUser = getCurrentUser();
  const currentRole = getCurrentRole();
  const currentDisplayName = getCurrentDisplayName();
  const navUserBadge = document.getElementById("nav-user-badge");
  const createQuizBtn = document.getElementById("create-quiz-btn");
  const createQuizCard = document.getElementById("create-quiz-card");
  const navAdminLink = document.getElementById("nav-admin");
  const logoutNavBtn = document.getElementById("logout-nav-btn");

  if (navUserBadge)
    navUserBadge.textContent =
      currentDisplayName || currentUser?.email || "Gjest";
  logoutNavBtn?.classList.toggle("d-none", !currentUser);

  if (currentRole === "admin") {
    createQuizBtn?.classList.remove("d-none");
    createQuizCard?.classList.remove("d-none");
    navAdminLink?.classList.remove("d-none");
  } else {
    createQuizBtn?.classList.add("d-none");
    createQuizCard?.classList.add("d-none");
    navAdminLink?.classList.add("d-none");
  }
}

export async function showQuizList() {
  toggleAreas(["app-area", "quiz-list-area"]);
  await loadQuizzes(currentCategory);
  setupQuizSearch();
}

// Lagrer alle quizer globalt for søkfiltrering
let allQuizzes = [];

function setupQuizSearch() {
  const searchInput = document.querySelector(
    'input[placeholder="🔍 Søk etter quiz..."]',
  );
  if (!searchInput) return;

  searchInput.addEventListener("input", (e) => {
    const query = e.target.value.toLowerCase().trim();
    filterQuizzes(query);
  });
}

function filterQuizzes(searchQuery) {
  const quizList = document.getElementById("quiz-list");
  if (!quizList) return;

  // Hent alle quiz-kort
  const allCards = quizList.querySelectorAll(".card-click");

  allCards.forEach((card) => {
    const title =
      card
        .querySelector(".card-title, .quiz-list-title")
        ?.textContent.toLowerCase() || "";
    const description =
      card
        .querySelector(".card-text, .quiz-list-description")
        ?.textContent.toLowerCase() || "";

    const matches =
      title.includes(searchQuery) || description.includes(searchQuery);
    card.parentElement.style.display = matches ? "" : "none";
  });

  // Vis "ingen resultater"-melding hvis ingen kort samsvarer
  const visibleCards = Array.from(allCards).some(
    (card) => card.parentElement.style.display !== "none",
  );
  if (!visibleCards && searchQuery.length > 0) {
    const existingMessage = quizList.querySelector(".no-search-results");
    if (!existingMessage) {
      const noResultsDiv = document.createElement("div");
      noResultsDiv.className = "col-12 no-search-results";
      noResultsDiv.innerHTML = `<p class="text-muted">Ingen quiz funnet for "${searchQuery}"</p>`;
      quizList.appendChild(noResultsDiv);
    }
  } else {
    const noResultsDiv = quizList.querySelector(".no-search-results");
    if (noResultsDiv) noResultsDiv.remove();
  }
}

async function loadQuizzes(category = "newest") {
  const quizList = document.getElementById("quiz-list");
  if (!quizList) return;

  // Fjern gamle quiz-kort men behold create-quiz-card
  const oldCards = quizList.querySelectorAll(".card-click");
  oldCards.forEach((card) => card.parentElement.remove());

  const quizzes = await fetchQuizzesByCategory(category);

  if (quizzes.length === 0) {
    const noQuizzesDiv = document.createElement("div");
    noQuizzesDiv.className = "col-12";
    noQuizzesDiv.innerHTML =
      '<p class="text-muted">Ingen quiz tilgjengelig ennå.</p>';
    quizList.appendChild(noQuizzesDiv);
  } else {
    const isListView = quizList.classList.contains("list-view");

    quizzes.forEach((q) => {
      const col = document.createElement("div");
      col.className = isListView ? "col-12" : "col-md-6 col-lg-4";

      if (isListView) {
        // Listevisning-oppsett
        col.innerHTML = `
          <div class="card card-elev card-click" data-quiz-id="${q.id}" style="cursor: pointer;">
            <div class="card-body quiz-list-item-content">
              <div class="quiz-list-info">
                <div class="quiz-list-title">${escapeHtml(q.title)}</div>
                <div class="quiz-list-description">${escapeHtml(q.description || "Ingen beskrivelse")}</div>
                <div class="quiz-list-meta">
                  <span>${new Date(q.created_at).toLocaleDateString("no-NO")}</span>
                  <span>${typeof q.answers_count === "number" ? q.answers_count : 0} svar</span>
                </div>
              </div>
              <div class="quiz-list-actions">
                <button class="btn btn-primary">Spill Quiz</button>
              </div>
            </div>
          </div>
        `;
      } else {
        // Kortvisning-oppsett (original)
        col.innerHTML = `
          <div class="card card-elev card-click h-100" data-quiz-id="${
            q.id
          }" style="height: 200px; cursor: pointer; position: relative; overflow: hidden;">
            ${
              q.thumbnail_url
                ? `
              <img src="${escapeHtml(q.thumbnail_url)}&w=400&h=225&fit=crop" 
                   alt="${escapeHtml(q.title)}" 
                   style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; object-fit: cover;" />
              <div style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.4);"></div>
            `
                : ""
            }
            <div class="card-body" style="${q.thumbnail_url ? "position: relative; z-index: 1; color: white; text-shadow: 0 1px 3px rgba(0,0,0,0.5);" : ""}">
              <h5 class="card-title">${escapeHtml(q.title)}</h5>
              <p class="card-text ${q.thumbnail_url ? "text-white-50" : "text-muted"} small">${escapeHtml(
                q.description || "",
              )}</p>
              <small class="${q.thumbnail_url ? "text-white-50" : "text-muted"} d-block">Opprettet: ${new Date(
                q.created_at,
              ).toLocaleDateString("no-NO")}</small>
              ${
                typeof q.answers_count === "number"
                  ? `<small class="${q.thumbnail_url ? "text-white-50" : "text-muted"}">Svar: ${q.answers_count}</small>`
                  : ""
              }
            </div>
          </div>
        `;
      }
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
  setupMovieSearch();
}

function initQuestionFields() {
  const container = document.getElementById("questions-container");
  if (!container) return;
  // Ikke legg til et standardspørsmål - la brukere klikke "Legg til spørsmål" for å legge til sitt første
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
    
    <!-- Image Search Section -->
    <div class="image-search-section mb-2 p-2 bg-light rounded">
      <label class="form-label small fw-semibold">Legg til bilde fra Unsplash (valgfritt)</label>
      <div class="input-group input-group-sm mb-2">
        <input type="text" class="form-control image-search-input" placeholder="Søk etter bilde (f.eks. 'katt', 'rom', etc.)..." />
        <button type="button" class="btn btn-outline-primary search-image-btn" title="Søk etter bilder">
          🔍 Søk
        </button>
      </div>
      <div class="image-search-status small text-muted"></div>
      <div class="image-search-results-container d-none mt-2">
        <div class="image-grid"></div>
        <div class="image-attribution small text-muted mt-2"></div>
      </div>
      <div class="selected-image-display d-none mt-2">
        <div class="alert alert-info py-2 px-3 mb-0">
          <small><strong>Valgt bilde:</strong></small>
          <div class="selected-image-preview mt-2" style="max-width: 150px; max-height: 100px; border-radius: 0.25rem; overflow: hidden;">
            <img style="width: 100%; height: 100%; object-fit: cover;" />
          </div>
          <div class="selected-image-attribution mt-2"></div>
          <button type="button" class="btn btn-sm btn-outline-danger remove-image-btn mt-2">Fjern bilde</button>
        </div>
      </div>
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

  // Veksle synlighet basert på spørsmålstype
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
  // Initialisér synlighet ved lasting
  toggleQuestionType();

  // Legg til valg-knapp
  div.querySelector(".add-choice-btn").addEventListener("click", () => {
    addChoiceField(div);
  });

  div.querySelector(".remove-question-btn").addEventListener("click", () => {
    div.remove();
    updateQuestionLabels();
  });

  // Sett opp bildesøk
  setupImageSearch(div);

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
    <button type="button" class="btn btn-outline-danger remove-choice-btn">Fjern</button>
  `;

  // Oppdater radionavn for å være unikt per spørsmål
  const questionIndex = Array.from(
    document.querySelectorAll(".question-field"),
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

  // Oppdater alle radionavn i dette spørsmålet for å samsvare
  updateChoiceRadioNames(questionDiv);
}

function updateChoiceRadioNames(questionDiv) {
  const questionIndex = Array.from(
    document.querySelectorAll(".question-field"),
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

/**
 * Handle Movie Rating question generation
 */
async function handleMovieRatingGeneration() {
  const movieTitle = document.getElementById("movie-title-input")?.value.trim();
  const questionType = document.querySelector(
    'input[name="movie-question-type"]:checked',
  )?.value;
  const statusEl = document.getElementById("movie-rating-status");

  if (!movieTitle) {
    statusEl.textContent = "Vennligst skriv inn en filmtittel.";
    statusEl.className = "text-danger small mb-2";
    return;
  }

  statusEl.textContent = "Genererer spørsmål...";
  statusEl.className = "text-muted small mb-2";

  try {
    let questionData;
    if (questionType === "multiple_choice") {
      questionData = await generateMovieRatingMultipleChoice(movieTitle);
      // Lagre for redigering og vis redigeringsmodal
      currentMovieRatingData = questionData;
      showMovieRatingEditModal(questionData);
      statusEl.textContent = "";
    } else {
      questionData = await generateMovieRatingTextAnswer(movieTitle);
      // For tekstsvar, legg til direkte uten redigering
      addMovieRatingQuestionField(questionData);
      statusEl.textContent = "Spørsmål lagt til!";
      statusEl.className = "text-success small mb-2";

      // Tilbakestill skjema og lukk modal
      setTimeout(() => {
        document.getElementById("movie-rating-form").reset();
        const modal = bootstrap.Modal.getInstance(
          document.getElementById("movieRatingModal"),
        );
        modal?.hide();
      }, 500);
    }
  } catch (error) {
    console.error("Movie rating generation error:", error);
    statusEl.textContent =
      error.message || "Feil ved generering av spørsmål. Prøv igjen.";
    statusEl.className = "text-danger small mb-2";
  }
}

/**
 * Show the edit modal for movie rating answers
 */
function showMovieRatingEditModal(questionData) {
  const questionText = document.getElementById("movie-question-text");
  const answersContainer = document.getElementById(
    "movie-rating-answers-container",
  );

  questionText.textContent = questionData.question;

  // Finn indeksen for riktig svar
  const answers = questionData.answers.map((ans) => ans);
  const correctIndex = answers.indexOf(questionData.correctAnswer);

  // Opprett redigerbare felt
  answersContainer.innerHTML = answers
    .map(
      (answer, index) => `
    <div class="mb-2">
      <div class="d-flex gap-2 align-items-center">
        <span class="badge ${index === correctIndex ? "bg-success" : "bg-light text-dark"}" style="min-width: 50px;">
          ${index === correctIndex ? "Riktig" : "Feil"}
        </span>
        <input type="text" 
               class="form-control form-control-sm movie-answer-input" 
               value="${answer}" 
               data-index="${index}"
               ${index === correctIndex ? "disabled" : ""}
               style="${index === correctIndex ? "background-color: #e8f5e9;" : ""}" />
      </div>
    </div>
  `,
    )
    .join("");

  // Lukk genereringsmodal og åpne redigeringsmodal
  const generationModal = bootstrap.Modal.getInstance(
    document.getElementById("movieRatingModal"),
  );
  generationModal?.hide();

  const editModal = new bootstrap.Modal(
    document.getElementById("movieRatingEditModal"),
  );
  editModal.show();
}

/**
 * Handle confirmation of edited movie rating answers
 */
function handleMovieRatingConfirm() {
  if (!currentMovieRatingData) return;

  const inputs = document.querySelectorAll(".movie-answer-input");
  const updatedAnswers = [];

  inputs.forEach((input) => {
    const value = input.value.trim();
    if (value) {
      updatedAnswers.push(value);
    }
  });

  if (updatedAnswers.length !== 4) {
    alert("Alle fire alternativer må fylles ut.");
    return;
  }

  // Oppdater spørsmålsdataene med redigerte svar
  const updatedQuestionData = {
    ...currentMovieRatingData,
    answers: updatedAnswers,
  };

  addMovieRatingQuestionField(updatedQuestionData);

  // Lukk redigeringsmodal
  const editModal = bootstrap.Modal.getInstance(
    document.getElementById("movieRatingEditModal"),
  );
  editModal?.hide();

  // Tilbakestill og lukk genereringsmodal
  setTimeout(() => {
    document.getElementById("movie-rating-form").reset();
    document.getElementById("movie-rating-status").textContent =
      "Spørsmål lagt til!";
    document.getElementById("movie-rating-status").className =
      "text-success small mb-2";
    currentMovieRatingData = null;
  }, 300);
}

/**
 * Add a movie rating question to the questions container
 * @param {Object} questionData - Data returned from movie-rating module
 */
function addMovieRatingQuestionField(questionData) {
  const container = document.getElementById("questions-container");
  if (!container) return;

  const index = container.children.length;
  const div = document.createElement("div");
  div.className = "mb-3 p-3 border rounded question-field";
  div.dataset.isMovieRating = "true";
  div.dataset.questionType = questionData.type;
  div.dataset.questionText = questionData.question;

  if (questionData.type === "multiple_choice") {
    div.dataset.answers = JSON.stringify(questionData.answers);
    div.dataset.correctAnswer = questionData.correctAnswer;

    div.innerHTML = `
      <label class="form-label fw-semibold">Spørsmål ${index + 1} (Filmrating)</label>
      <div class="mb-2 p-2 bg-light rounded">
        <small class="text-muted"><strong>Spørsmål:</strong> ${escapeHtml(questionData.question)}</small>
      </div>
      <div class="mb-2">
        <small><strong>Alternativer:</strong></small>
        <div class="choices-display">
          ${questionData.answers.map((ans, i) => `<div class="form-check"><label class="form-check-label"><small>${ans}${ans === questionData.correctAnswer ? " (korrekt)" : ""}</small></label></div>`).join("")}
        </div>
      </div>
      <button type="button" class="btn btn-sm btn-outline-danger remove-question-btn">Fjern spørsmål</button>
    `;
  } else {
    div.dataset.correctAnswer = questionData.correctAnswer;
    div.dataset.acceptedRange = questionData.acceptedRange;

    div.innerHTML = `
      <label class="form-label fw-semibold">Spørsmål ${index + 1} (Filmrating)</label>
      <div class="mb-2 p-2 bg-light rounded">
        <small class="text-muted"><strong>Spørsmål:</strong> ${escapeHtml(questionData.question)}</small>
      </div>
      <div class="mb-2">
        <small><strong>Korrekt svar:</strong> ${questionData.correctAnswer} (toleranse: ±${questionData.acceptedRange})</small>
      </div>
      <button type="button" class="btn btn-sm btn-outline-danger remove-question-btn">Fjern spørsmål</button>
    `;
  }

  div.querySelector(".remove-question-btn").addEventListener("click", () => {
    div.remove();
    updateQuestionLabels();
  });

  container.appendChild(div);
  updateQuestionLabels();
}

/**
 * Setup image search functionality for a question field
 */
function setupImageSearch(questionDiv) {
  const searchBtn = questionDiv.querySelector(".search-image-btn");
  const searchInput = questionDiv.querySelector(".image-search-input");
  const statusEl = questionDiv.querySelector(".image-search-status");
  const resultsContainer = questionDiv.querySelector(
    ".image-search-results-container",
  );
  const imageGrid = questionDiv.querySelector(".image-grid");
  const selectedImageDisplay = questionDiv.querySelector(
    ".selected-image-display",
  );
  const removeImageBtn = questionDiv.querySelector(".remove-image-btn");

  // Lagre valgt bildedata
  let selectedImage = null;

  // Search button click handler
  searchBtn.addEventListener("click", async () => {
    const query = searchInput.value.trim();
    if (!query) {
      statusEl.textContent = "Vennligst skriv et søkeord.";
      return;
    }

    statusEl.textContent = "Søker bilder...";
    imageGrid.innerHTML = "";
    resultsContainer.classList.add("d-none");

    try {
      const images = await searchUnsplashImages(query, 12);

      if (images.length === 0) {
        statusEl.textContent = "Ingen bilder funnet.";
        return;
      }

      statusEl.textContent = `Fant ${images.length} bilder.`;
      renderImageGrid(imageGrid, images, (image) => {
        selectImage(image, questionDiv);
        selectedImage = image;
      });
      resultsContainer.classList.remove("d-none");
    } catch (error) {
      console.error("Image search error:", error);
      statusEl.textContent = "Feil ved søking etter bilder.";
    }
  });

  // Allow Enter key to search
  searchInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
      searchBtn.click();
    }
  });

  // Fjern bildeknapp
  removeImageBtn.addEventListener("click", () => {
    selectedImage = null;
    selectedImageDisplay.classList.add("d-none");
    questionDiv.dataset.selectedImageUrl = "";
    questionDiv.dataset.selectedImageAttribution = "";
  });
}

/**
 * Render image grid in the results container
 */
function renderImageGrid(container, images, onSelectCallback) {
  container.innerHTML = "";
  container.className = "image-grid";

  const gridHtml = images
    .map(
      (img, index) => `
    <div class="image-grid-item" data-image-index="${index}" style="cursor: pointer; position: relative; overflow: hidden; border-radius: 0.25rem; background: #f0f0f0;">
      <img src="${escapeHtml(img.url)}" 
           alt="${escapeHtml(img.alt)}" 
           style="width: 100%; height: 100%; object-fit: cover; transition: transform 0.2s ease;"
           loading="lazy" />
      <div style="position: absolute; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0); transition: background 0.2s ease;" class="image-overlay"></div>
    </div>
  `,
    )
    .join("");

  container.innerHTML = gridHtml;

  // Legg til klikkhåndtakere til bildeelementer
  container.querySelectorAll(".image-grid-item").forEach((item) => {
    item.addEventListener("click", () => {
      const index = parseInt(item.dataset.imageIndex);
      onSelectCallback(images[index]);
    });
    item.addEventListener("mouseenter", () => {
      const overlay = item.querySelector(".image-overlay");
      overlay.style.background = "rgba(0,0,0,0.3)";
    });
    item.addEventListener("mouseleave", () => {
      const overlay = item.querySelector(".image-overlay");
      overlay.style.background = "rgba(0,0,0,0)";
    });
  });
}

/**
 * Handle image selection
 */
function selectImage(image, questionDiv) {
  const selectedImageDisplay = questionDiv.querySelector(
    ".selected-image-display",
  );
  const previewImg = selectedImageDisplay.querySelector(
    ".selected-image-preview img",
  );
  const attributionEl = selectedImageDisplay.querySelector(
    ".selected-image-attribution",
  );

  previewImg.src = image.url;
  previewImg.alt = image.alt;
  attributionEl.innerHTML = getAttributionHtml(image);

  selectedImageDisplay.classList.remove("d-none");

  // Lagre bildedata i spørsmål-diven
  questionDiv.dataset.selectedImageUrl = image.rawUrl;
  questionDiv.dataset.selectedImageAttribution = getAttributionHtml(image);
}

/**
 * Setup thumbnail image search for quiz
 */
function setupThumbnailSearch() {
  const searchBtn = document.getElementById("quiz-thumbnail-search-btn");
  const searchInput = document.getElementById("quiz-thumbnail-search");
  const statusEl = document.querySelector(".thumbnail-search-status");
  const resultsContainer = document.querySelector(
    ".thumbnail-search-results-container",
  );
  const imageGrid = document.querySelector(".thumbnail-grid");
  const selectedDisplay = document.querySelector(".selected-thumbnail-display");
  const previewImg = selectedDisplay.querySelector(
    ".selected-thumbnail-preview img",
  );
  const removeBtn = document.querySelector(".remove-thumbnail-btn");

  searchBtn.addEventListener("click", async () => {
    const query = searchInput.value.trim();
    if (!query) {
      statusEl.textContent = "Vennligst skriv et søkeord.";
      return;
    }

    statusEl.textContent = "Søker bilder...";
    imageGrid.innerHTML = "";
    resultsContainer.classList.add("d-none");

    try {
      const images = await searchUnsplashImages(query, 12);

      if (images.length === 0) {
        statusEl.textContent = "Ingen bilder funnet.";
        return;
      }

      statusEl.textContent = `Fant ${images.length} bilder.`;
      renderImageGrid(imageGrid, images, (image) => {
        previewImg.src = image.url;
        previewImg.alt = image.alt;
        selectedDisplay.classList.remove("d-none");
        document.getElementById("quiz-thumbnail-url").value = image.rawUrl;
      });
      resultsContainer.classList.remove("d-none");
    } catch (error) {
      console.error("Thumbnail search error:", error);
      statusEl.textContent = "Feil ved søking etter bilder.";
    }
  });

  searchInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
      searchBtn.click();
    }
  });

  removeBtn.addEventListener("click", () => {
    selectedDisplay.classList.add("d-none");
    document.getElementById("quiz-thumbnail-url").value = "";
  });
}

async function showQuizTake(quizId) {
  currentQuizId = quizId;
  currentQuizParticipantName = localStorage.getItem(`quiz_${quizId}_name`);
  toggleAreas(["app-area", "quiz-take-area"]);
  await loadQuizForTaking(quizId, !currentQuizParticipantName);
}

// Lagrer gjeldende quiz-data for svarsjekking
let currentQuizData = null;

async function loadQuizForTaking(quizId, needsName = false) {
  const quizData = await fetchQuizWithQuestions(quizId);
  if (!quizData) return alert("Kunne ikke laste quiz.");

  currentQuizData = quizData;

  document.getElementById("quiz-take-title").textContent = escapeHtml(
    quizData.title,
  );
  document.getElementById("quiz-take-description").textContent = escapeHtml(
    quizData.description || "",
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

        // Image section if available
        const imageSection = q.image_url
          ? `
          <div class="mb-3">
            <img src="${q.image_url}&w=600&h=337&fit=crop" alt="${escapeHtml(q.question_text)}" style="max-width: 100%; height: auto; border-radius: 0.5rem;" />
            ${q.image_attribution ? `<small class="text-muted d-block mt-1">${q.image_attribution}</small>` : ""}
          </div>
        `
          : "";

        if (isMultipleChoice && q.choices && q.choices.length > 0) {
          // Render radio buttons for multiple-choice questions
          const choicesHtml = q.choices
            .map(
              (choice, index) => `
              <div class="form-check">
                <input class="form-check-input quiz-answer-radio" type="radio" 
                  name="question_${q.id}" 
                  id="choice_${choice.id}" 
                  value="${choice.id}" 
                  data-option-number="${index + 1}"
                  data-choice-id="${choice.id}"
                  data-choice-text="${escapeHtml(choice.choice_text)}"
                  data-question-id="${q.id}"
                  data-is-correct="${choice.is_correct || false}" />
                <label class="form-check-label" for="choice_${choice.id}">
                  ${escapeHtml(choice.choice_text)}
                </label>
              </div>`,
            )
            .join("");
          return `
            <div class="mb-3 question-container" data-question-id="${
              q.id
            }" data-question-type="multiple_choice">
              <label class="form-label fw-semibold">${escapeHtml(
                q.question_text,
              )}</label>
              ${imageSection}
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
              ${imageSection}
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
        (a) => a.is_correct === true,
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
                    title,
                  ).replace(/"/g, "&quot;")}">Last ned CSV</button>`
                : ""
            }
          </div>
          
          <div class="accordion" id="accordion_${containerId}_${title.replace(
            /\s+/g,
            "_",
          )}">
            ${Object.entries(questions)
              .map(([qId, qData], qIndex) => {
                const questionAnswers = qData.answers;
                const correctCount = questionAnswers.filter(
                  (a) => a.is_correct === true,
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
                        qData.questionText,
                      )}</span>
                      ${correctBadge}
                    </button>
                  </h2>
                  <div id="collapse_${containerId}_${qId}" class="accordion-collapse collapse" data-bs-parent="#accordion_${containerId}_${title.replace(
                    /\s+/g,
                    "_",
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
                                  (a) => a.is_correct !== null,
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
                                              ans.user_id?.substring(0, 8),
                                          )}</small></td>`
                                        : ""
                                    }
                                    <td class="px-3 py-2"><small>${escapeHtml(
                                      ans.answer_text,
                                    )}</small></td>
                                    ${
                                      ans.is_correct !== null
                                        ? `<td class="px-3 py-2 text-center">${statusBadge}</td>`
                                        : ""
                                    }
                                    <td class="px-3 py-2 text-muted"><small>${new Date(
                                      ans.submitted_at,
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

  // Legg til CSV-nedlastingshåndtakere
  if (includeName) {
    document.querySelectorAll(".download-quiz-csv-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const quizTitle = btn.dataset.quizTitle;
        const quizAnswers = Object.entries(grouped).find(
          ([title]) => title === quizTitle,
        )?.[1];

        if (quizAnswers) {
          const flatAnswers = Object.values(quizAnswers).flatMap(
            (q) => q.answers,
          );
          const csvContent = answersToCSV(quizTitle, flatAnswers);
          const filename = `${quizTitle.replace(
            /[^a-z0-9æøå]/gi,
            "_",
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
    "my-quiz-results-container",
  );

  const allAnswersResult = await fetchAllAnswers();
  const myQuizAnswers = (allAnswersResult.answers || []).filter(
    (ans) => ans.questions?.quizzes?.created_by === currentUser?.id,
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
    true,
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
  clickHandler("filter-newest", async (e) => {
    e.preventDefault();
    currentCategory = "newest";
    document.getElementById("filter-newest")?.classList.add("active");
    document.getElementById("filter-top")?.classList.remove("active");
    await loadQuizzes(currentCategory);
  });
  clickHandler("filter-top", async (e) => {
    e.preventDefault();
    currentCategory = "top";
    document.getElementById("filter-top")?.classList.add("active");
    document.getElementById("filter-newest")?.classList.remove("active");
    await loadQuizzes(currentCategory);
  });
  [
    "results-back-btn",
    "admin-results-back-btn",
    "back-to-quizzes-btn",
    "back-to-quizzes-btn2",
    "cancel-take-btn",
  ].forEach((id) =>
    clickHandler(id, (e) => {
      e.preventDefault();
      showQuizList();
    }),
  );
  clickHandler("create-quiz-btn", () => showQuizCreate());
  clickHandler("create-quiz-card", () => {
    if (getCurrentRole() !== "admin") {
      alert("Bare admin kan opprette quiz.");
      return;
    }
    showQuizCreate();
  });
  clickHandler("add-question-btn", () => {
    addQuestionField();
    updateQuestionLabels();
  });

  // Movie Rating button handler
  clickHandler("movie-rating-submit-btn", async () => {
    await handleMovieRatingGeneration();
  });

  // Movie Rating confirm button
  clickHandler("movie-rating-confirm-btn", () => {
    handleMovieRatingConfirm();
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
        // Handle movie rating questions
        if (questionDiv.dataset.isMovieRating === "true") {
          const movieType = questionDiv.dataset.questionType;
          const questionText = questionDiv.dataset.questionText;

          if (movieType === "multiple_choice") {
            const answers = JSON.parse(questionDiv.dataset.answers);
            const correctAnswer = questionDiv.dataset.correctAnswer;

            const questionData = {
              text: questionText,
              type: "multiple_choice",
              choices: answers.map((ans) => ({
                text: ans,
                isCorrect: ans === correctAnswer,
              })),
            };
            questions.push(questionData);
          } else {
            const correctAnswer = questionDiv.dataset.correctAnswer;
            const questionData = {
              text: questionText,
              type: "text",
              correctAnswer: correctAnswer,
            };
            questions.push(questionData);
          }
          return;
        }

        // Handle regular questions
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
          imageUrl: questionDiv.dataset.selectedImageUrl || null,
          imageAttribution:
            questionDiv.dataset.selectedImageAttribution || null,
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
      const thumbnailUrl =
        document.getElementById("quiz-thumbnail-url")?.value || null;
      const quiz = await createQuiz(
        title,
        description,
        questions,
        thumbnailUrl,
      );
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
          const choiceId = radio.value; // Now contains the choice ID
          const choiceText = radio.dataset.choiceText;
          const optionNumber = radio.dataset.optionNumber;
          const isCorrect = radio.dataset.isCorrect === "true";
          // Lagre valg-ID (databasen bruker ID for validering)
          answers[qid] = choiceId;
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
        currentQuizParticipantName,
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

        // Opprett et kart over nyeste svar etter question_id
        const answersByQuestion = {};
        (submittedAnswers || []).forEach((ans) => {
          if (!answersByQuestion[ans.question_id]) {
            answersByQuestion[ans.question_id] = ans;
          }
        });

        // Vis tilbakemelding for hvert besvarte spørsmål
        Object.entries(answerDetails).forEach(([qid, detail]) => {
          const container = document.querySelector(
            `.question-container[data-question-id="${qid}"]`,
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
        setTimeout(showQuizList, 2500); // Lengre forsinkelse for å se tilbakemelding
      } else {
        statusEl && (statusEl.textContent = "Feil ved sending av svar.");
      }
    });

  // Sett opp miniatyrbildesøk
  setupThumbnailSearch();
}

/**
 * Setup movie title autocomplete search
 */
function setupMovieSearch() {
  const movieTitleInput = document.getElementById("movie-title-input");
  const suggestionsDropdown = document.getElementById(
    "movie-suggestions-dropdown",
  );
  let searchTimeout;

  if (!movieTitleInput) return;

  movieTitleInput.addEventListener("input", async (e) => {
    const query = e.target.value.trim();

    // Clear previous timeout
    clearTimeout(searchTimeout);

    if (!query || query.length < 2) {
      suggestionsDropdown.classList.add("d-none");
      return;
    }

    // Debounce search
    searchTimeout = setTimeout(async () => {
      try {
        const results = await searchMovies(query);

        if (results.length === 0) {
          suggestionsDropdown.innerHTML =
            '<div class="p-2 text-muted small">Ingen filmer funnet</div>';
          suggestionsDropdown.classList.remove("d-none");
          return;
        }

        suggestionsDropdown.innerHTML = results
          .map(
            (movie) => `
          <div class="movie-suggestion p-2 cursor-pointer" 
               data-title="${escapeHtml(movie.title)}"
               style="cursor: pointer; border-bottom: 1px solid #e6eef8; transition: background 0.15s;">
            <div class="fw-semibold small">${escapeHtml(movie.title)}</div>
            <small class="text-muted">${movie.year || "N/A"}</small>
          </div>
        `,
          )
          .join("");

        suggestionsDropdown.classList.remove("d-none");

        // Legg til klikkhåndtakere til forslagselementer
        suggestionsDropdown
          .querySelectorAll(".movie-suggestion")
          .forEach((item) => {
            item.addEventListener("click", () => {
              movieTitleInput.value = item.dataset.title;
              suggestionsDropdown.classList.add("d-none");
            });
            item.addEventListener("mouseenter", () => {
              item.style.background = "#f0f4f8";
            });
            item.addEventListener("mouseleave", () => {
              item.style.background = "";
            });
          });
      } catch (error) {
        console.error("Movie search error:", error);
      }
    }, 300);
  });

  // Lukk rullegardin når du klikker utenfor
  document.addEventListener("click", (e) => {
    if (!e.target.closest("#movie-title-input")) {
      suggestionsDropdown.classList.add("d-none");
    }
  });
}

// Convert answers to CSV format
function answersToCSV(quizTitle, answers) {
  // CSV header
  const headers = ["Navn", "Spørsmål", "Svar", "Sendt"];
  const csvRows = [headers.join(",")];

  // Legg til hvert svar som en rad
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
