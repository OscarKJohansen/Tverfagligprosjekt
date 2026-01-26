import {
  supabase,
  ensureAuthOnLoad,
  loadProfileRole,
  handleLogout,
} from "./auth.js";
import { getCurrentUser, setCurrentUser } from "./state.js";

const loginForm = document.getElementById("login-form");
const loginStatusEl = document.getElementById("login-status");

// Håndterer innsending av innloggingsskjema
loginForm?.addEventListener("submit", async (e) => {
  e.preventDefault();

  const email = document
    .getElementById("login-email")
    ?.value.trim()
    .toLowerCase();
  const password = document.getElementById("login-password")?.value;

  // Sjekker at e-post og passord er fylt inn
  if (!email || !password) {
    if (loginStatusEl) {
      loginStatusEl.textContent = "Skriv inn både e-post og passord.";
      loginStatusEl.className = "mt-3 small error-message";
    }
    return;
  }

  // Viser statusmelding under innlogging
  if (loginStatusEl) {
    loginStatusEl.textContent = "Logger inn...";
    loginStatusEl.className = "mt-3 text-muted small";
  }

  // Forsøker å logge inn brukeren
  const { data: signInData, error: signInError } =
    await supabase.auth.signInWithPassword({
      email,
      password,
    });

  // Hvis innlogging feiler
  if (signInError) {
    // Hvis brukeren ikke finnes eller passord er feil
    if (signInError.message.includes("Invalid login credentials")) {
      if (loginStatusEl) loginStatusEl.textContent = "Sjekker bruker...";

      // Forsøker å opprette ny bruker
      const { data: signUpData, error: signUpError } =
        await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.href },
        });

      // Feil ved oppretting av bruker
      if (signUpError) {
        if (loginStatusEl) {
          loginStatusEl.textContent =
            "Feil ved oppretting: " + signUpError.message;
          loginStatusEl.className = "mt-3 small error-message";
        }
        return;
      }

      // Bruker finnes allerede → feil passord
      if (
        signUpData?.user &&
        signUpData.user.identities &&
        signUpData.user.identities.length === 0
      ) {
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

      // Ny bruker er opprettet
      if (loginStatusEl) {
        loginStatusEl.textContent =
          "Bruker opprettet! Sjekk e-posten din for en bekreftelseslenke.";
      }
      return;
    }

    // Generell innloggingsfeil
    if (loginStatusEl) {
      loginStatusEl.textContent = "Innlogging feilet: " + signInError.message;
      loginStatusEl.className = "mt-3 small error-message";
    }
    return;
  }

  // Sjekker om e-post er bekreftet
  if (!signInData.user.confirmed_at) {
    if (loginStatusEl) {
      loginStatusEl.textContent =
        "E-posten er ikke bekreftet ennå. Sjekk innboksen din.";
    }
    await supabase.auth.signOut();
    return;
  }

  // Lagrer bruker og rolle
  setCurrentUser(signInData.user);
  await loadProfileRole();

  if (loginStatusEl) loginStatusEl.textContent = "Innlogging vellykket.";

  // Sender brukeren videre til quiz-siden
  setTimeout(() => {
    window.location.href = "./quiz.html";
  }, 1000);
});

// Sjekker innlogging når siden lastes
ensureAuthOnLoad().then(() => {
  const currentUser = getCurrentUser();
  if (currentUser) {
    window.location.href = "./quiz.html";
  }
  if (loginStatusEl) loginStatusEl.textContent = "";
});

// Lytter på endringer i innloggingsstatus
supabase.auth.onAuthStateChange((_event, session) => {
  setCurrentUser(session?.user ?? null);
  if (session?.user) {
    window.location.href = "./quiz.html";
  }
});
