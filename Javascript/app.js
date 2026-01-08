import {
  supabase,
  ensureAuthOnLoad,
  loadProfileRole,
  handleLogout,
} from "./auth.js";
import { getCurrentUser, setCurrentUser } from "./state.js";
import { updateAuthUI } from "./ui.js";

const loginForm = document.getElementById("login-form");
const loginStatusEl = document.getElementById("login-status");
const accountStatusEl = document.getElementById("account-status");

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
  updateAuthUI();
  if (loginStatusEl) loginStatusEl.textContent = "Innlogging vellykket.";
});

document.getElementById("logout-btn")?.addEventListener("click", async () => {
  await handleLogout();
  updateAuthUI();
  if (accountStatusEl) accountStatusEl.textContent = "Du er logget ut.";
  if (loginStatusEl) loginStatusEl.textContent = "Ikke innlogget.";
});

document
  .getElementById("refresh-session-btn")
  ?.addEventListener("click", async () => {
    if (accountStatusEl) accountStatusEl.textContent = "Oppdaterer status...";
    const { data, error } = await supabase.auth.getUser();
    if (error) {
      if (accountStatusEl)
        accountStatusEl.textContent = "Kunne ikke hente status.";
      return;
    }

    setCurrentUser(data?.user ?? null);
    if (data?.user) {
      await loadProfileRole();
      if (accountStatusEl) accountStatusEl.textContent = "Status oppdatert.";
    } else if (accountStatusEl) {
      accountStatusEl.textContent = "Ikke innlogget.";
    }

    updateAuthUI();
  });

ensureAuthOnLoad().then(() => {
  updateAuthUI();
  if (getCurrentUser()) {
    if (loginStatusEl) loginStatusEl.textContent = "Innlogget.";
  }
});

// Håndterer innlogging ved å ta e-post og passord fra skjemaet og logge inn med Supabase. Hvis brukeren ikke finnes, blir den opprettet. Viser meldinger om hva som skjer.
// Sjekker om e-posten er bekreftet, og logger brukeren ut hvis den ikke er det.
// Lagrer den innloggede brukeren lokalt, henter brukerrollen og oppdaterer grensesnittet.
// Knapper:
// Logg ut: Logger ut brukeren og skjuler kontodelen.
// Oppdater status: Sjekker om brukeren er innlogget, oppdaterer rollen og viser enkel status (innlogget, ikke innlogget eller feil).