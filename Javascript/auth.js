import { setCurrentUser, setCurrentRole, getCurrentUser } from "./state.js";

export const SUPABASE_URL = "https://aiseafkfjhixolxezjjq.supabase.co";
export const SUPABASE_ANON_KEY =
  "sb_publishable_mdoTv5Opu_0idPCaV64_6A_nIegPRg1";
export const supabase = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY
);

export async function ensureAuthOnLoad() {
  const loginStatusEl = document.getElementById("login-status");
  if (loginStatusEl) loginStatusEl.textContent = "Sjekker innlogging...";

  const { data, error } = await supabase.auth.getUser();

  if (error) {
    setCurrentUser(null);
    setCurrentRole("user");
    if (loginStatusEl)
      loginStatusEl.textContent = "Kunne ikke sjekke innlogging.";
    return;
  }

  if (data?.user) {
    if (!data.user.confirmed_at) {
      if (loginStatusEl)
        loginStatusEl.textContent =
          "E-posten er ikke bekreftet ennå. Sjekk innboksen din.";
      await supabase.auth.signOut();
      setCurrentUser(null);
      setCurrentRole("user");
      return;
    }

    setCurrentUser(data.user);
    await loadProfileRole();
  } else {
    setCurrentUser(null);
    setCurrentRole("user");
    await supabase.auth.signOut();
  }

  if (loginStatusEl)
    loginStatusEl.textContent = data?.user ? "Innlogget." : "Ikke innlogget.";
}

export async function loadProfileRole() {
  const currentUser = getCurrentUser();
  if (!currentUser) return;

  if (currentUser.id === "81e519d0-8b8c-4190-bdd7-a96bfe09235c") {
    setCurrentRole("admin");
    return;
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", currentUser.id)
    .single();
  if (error) {
    console.warn("Kunne ikke hente profilrolle:", error.message);
    setCurrentRole("user");
    return;
  }
  setCurrentRole(data?.role || "user");
}

export async function handleLogout() {
  await supabase.auth.signOut();
  setCurrentUser(null);
  setCurrentRole("user");
}

supabase.auth.onAuthStateChange((_event, session) => {
  setCurrentUser(session?.user ?? null);
});

// Oppretter Supabase-klienten med riktig URL og nøkkel.
// ensureAuthOnLoad(): Sjekker om brukeren er innlogget når siden lastes. Logger ut hvis e-posten ikke er bekreftet, lagrer bruker og rolle, og oppdaterer statusmeldingen.
// loadProfileRole(): Henter brukerrollen fra profiles-tabellen. En bestemt ID gir admin-rolle, ellers settes rollen til vanlig bruker.
// handleLogout(): Logger ut brukeren og nullstiller lagret bruker og rolle.
// Lytter på endringer i innloggingstilstanden fra Supabase og oppdaterer brukeren automatisk.