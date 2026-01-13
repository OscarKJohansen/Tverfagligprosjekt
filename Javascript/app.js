import {
  supabase,
  ensureAuthOnLoad,
  loadProfileRole,
  handleLogout,
} from "./auth.js";
import { getCurrentUser, setCurrentUser } from "./state.js";

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
  if (loginStatusEl) loginStatusEl.textContent = "Innlogging vellykket.";

  // Redirect to quiz page
  setTimeout(() => {
    window.location.href = "./quiz.html";
  }, 1000);
});

// Initialize on page load
ensureAuthOnLoad().then(() => {
  const currentUser = getCurrentUser();
  if (currentUser) {
    // Already logged in, redirect to quiz
    window.location.href = "./quiz.html";
  }
  if (loginStatusEl) loginStatusEl.textContent = "";
});

// Listen for auth changes
supabase.auth.onAuthStateChange((_event, session) => {
  setCurrentUser(session?.user ?? null);
  if (session?.user) {
    window.location.href = "./quiz.html";
  }
});
