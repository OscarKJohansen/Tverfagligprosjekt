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

const loginForm = document.getElementById("login-form");
const loginStatusEl = document.getElementById("login-status");

loginForm?.addEventListener("submit", async (e) => {
  e.preventDefault();

  const email = document
    .getElementById("login-email")
    ?.value.trim()
    .toLowerCase();
  const password = document.getElementById("login-password")?.value;

  if (!email || !password) {
    if (loginStatusEl)
      loginStatusEl.textContent = "Skriv inn både e-post og passord.";
    return;
  }

  if (loginStatusEl) loginStatusEl.textContent = "Logger inn...";

  const { data: signInData, error: signInError } =
    await supabase.auth.signInWithPassword({
      email,
      password,
    });

  if (signInError) {
    if (signInError.message.includes("Invalid login credentials")) {
      if (loginStatusEl)
        loginStatusEl.textContent =
          "Bruker finnes ikke – oppretter ny og sender verifisering...";

      const { error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: window.location.href },
      });

      if (signUpError) {
        if (loginStatusEl)
          loginStatusEl.textContent =
            "Feil ved oppretting: " + signUpError.message;
        return;
      }

      if (loginStatusEl)
        loginStatusEl.textContent =
          "Bruker opprettet! Sjekk e-posten din for en bekreftelseslenke.";
      return;
    }

    if (loginStatusEl)
      loginStatusEl.textContent = "Innlogging feilet: " + signInError.message;
    return;
  }

  if (!signInData.user.confirmed_at) {
    if (loginStatusEl)
      loginStatusEl.textContent =
        "E-posten er ikke bekreftet ennå. Sjekk innboksen din.";
    await supabase.auth.signOut();
    return;
  }

  setCurrentUser(signInData.user);
  await loadProfileRole();
  updateUI();
  if (loginStatusEl) loginStatusEl.textContent = "Innlogging vellykket.";
});

// Logout handler
document
  .getElementById("logout-nav-btn")
  ?.addEventListener("click", async () => {
    await handleLogout();
    updateUI();
  });

// Update UI based on auth state
function updateUI() {
  const authArea = document.getElementById("auth-area");
  const appArea = document.getElementById("app-area");
  const currentUser = getCurrentUser();

  updateQuizNav();

  if (currentUser) {
    authArea.classList.add("d-none");
    appArea.classList.remove("d-none");
    showQuizList();
  } else {
    authArea.classList.remove("d-none");
    appArea.classList.add("d-none");
  }
}

// Initialize on page load
ensureAuthOnLoad().then(() => {
  updateUI();
  setupQuizEventListeners();

  if (getCurrentUser()) {
    if (loginStatusEl) loginStatusEl.textContent = "Innlogget.";
  }
});

// Listen for auth changes
supabase.auth.onAuthStateChange((_event, session) => {
  setCurrentUser(session?.user ?? null);
  updateUI();
});
