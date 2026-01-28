import {
  supabase,
  ensureAuthOnLoad,
  loadProfileRole,
  handleLogout,
} from "./auth.js";
import { getCurrentUser, setCurrentUser } from "./state.js";
import {
  updateQuizNav,
  showQuizList,
  setupQuizEventListeners,
} from "./quiz-ui.js";
import { initRankings } from "./rankings.js";

/*
  Sjekker om brukeren er innlogget og har bekreftet e-post.
  Hvis ikke, blir brukeren sendt tilbake til innloggingssiden.
*/
async function checkAuth() {
  const { data, error } = await supabase.auth.getUser();

  if (error || !data?.user || !data.user.confirmed_at) {
    window.location.href = "./index.html";
    return false;
  }

  return true;
}

/*
  Setter opp visningskontroller (kort/liste)
*/
function setupViewToggle() {
  const viewCardsBtn = document.getElementById("view-cards");
  const viewListBtn = document.getElementById("view-list");
  const quizList = document.getElementById("quiz-list");

  if (!viewCardsBtn || !viewListBtn || !quizList) return;

  viewCardsBtn.addEventListener("click", () => {
    quizList.classList.remove("list-view");
    viewCardsBtn.classList.add("active");
    viewListBtn.classList.remove("active");
    showQuizList(); // Reload to show card view
  });

  viewListBtn.addEventListener("click", () => {
    quizList.classList.add("list-view");
    viewListBtn.classList.add("active");
    viewCardsBtn.classList.remove("active");
    showQuizList(); // Reload to show list view
  });
}

/*
  Starter quiz-siden.
  Sørger for at brukeren er autentisert før
  navigasjon, hendelser og quizliste lastes inn.
*/
async function initQuizPage() {
  const isLoggedIn = await checkAuth();
  if (!isLoggedIn) return;

  await ensureAuthOnLoad();
  updateQuizNav();
  setupQuizEventListeners();
  setupViewToggle();
  initRankings();
  showQuizList();
}

/*
  Håndterer utlogging via navigasjonsknappen.
  Logger brukeren ut og sender dem til innloggingssiden.
*/
document
  .getElementById("logout-nav-btn")
  ?.addEventListener("click", async () => {
    await handleLogout();
    window.location.href = "./index.html";
  });

/*
  Initialiserer quiz-siden når siden lastes.
*/
initQuizPage();

/*
  Lytter etter endringer i autentisering.
  Oppdaterer brukerstatus og sender brukeren
  til innlogging hvis økten avsluttes.
*/
supabase.auth.onAuthStateChange((_event, session) => {
  setCurrentUser(session?.user ?? null);

  if (!session?.user) {
    window.location.href = "./index.html";
  }
});
