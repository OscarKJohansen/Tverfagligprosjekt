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
    if (loginStatusEl) {
      loginStatusEl.textContent = "Skriv inn både e-post og passord.";
      loginStatusEl.className = "mt-3 small error-message";
    }
    return;
  }

  if (loginStatusEl) {
    loginStatusEl.textContent = "Logger inn...";
    loginStatusEl.className = "mt-3 text-muted small";
  }

  const { data: signInData, error: signInError } =
    await supabase.auth.signInWithPassword({
      email,
      password,
    });

  if (signInError) {
    if (signInError.message.includes("Invalid login credentials")) {
      // Try to sign up - if email already exists, Supabase will return an error
      if (loginStatusEl) loginStatusEl.textContent = "Sjekker bruker...";

      const { data: signUpData, error: signUpError } =
        await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.href },
        });

      // Check if signup failed because user already exists
      if (signUpError) {
        if (loginStatusEl) {
          loginStatusEl.textContent =
            "Feil ved oppretting: " + signUpError.message;
          loginStatusEl.className = "mt-3 small error-message";
        }
        return;
      }

      // Check if signUpData indicates user already exists (Supabase returns existing user)
      // When email is already registered, Supabase may return identities as empty array
      if (
        signUpData?.user &&
        signUpData.user.identities &&
        signUpData.user.identities.length === 0
      ) {
        // User already exists, so it was wrong password
        // Show Dark Souls death screen
        const deathScreen = document.getElementById("death-screen");
        if (deathScreen) {
          deathScreen.classList.add("show");
          setTimeout(() => {
            deathScreen.classList.remove("show");
          }, 3000);
        }

        if (loginStatusEl) {
          loginStatusEl.textContent = "Feil passord. Prøv igjen.";
          loginStatusEl.className = "mt-3 small error-message";
        }
        return;
      }

      // New user created successfully
      if (loginStatusEl)
        loginStatusEl.textContent =
          "Bruker opprettet! Sjekk e-posten din for en bekreftelseslenke.";
      return;
    }

    if (loginStatusEl) {
      loginStatusEl.textContent = "Innlogging feilet: " + signInError.message;
      loginStatusEl.className = "mt-3 small error-message";
    }
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
