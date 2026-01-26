import { setCurrentUser, setCurrentRole, getCurrentUser } from "./state.js";

export const SUPABASE_URL = "https://aiseafkfjhixolxezjjq.supabase.co";
export const SUPABASE_ANON_KEY =
  "sb_publishable_mdoTv5Opu_0idPCaV64_6A_nIegPRg1";

export const supabase = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
);

/*
  Sjekker innloggingsstatus når siden lastes.
  Oppdaterer statusmelding, validerer e-post,
  lagrer bruker og laster inn riktig rolle.
*/
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

/*
  Henter brukerrollen fra profiles-tabellen i databasen.
  Hvis profilen ikke finnes, opprettes den automatisk
  med standardrollen "user".
*/
export async function loadProfileRole() {
  const currentUser = getCurrentUser();
  if (!currentUser) return;

  const { data, error } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", currentUser.id)
    .single();

  if (error) {
    console.warn("Kunne ikke hente profilrolle:", error.message);

    if (error.code === "PGRST116") {
      const { error: insertError } = await supabase.from("profiles").insert([
        {
          id: currentUser.id,
          email: currentUser.email,
          role: "user",
        },
      ]);

      if (insertError) {
        console.error("Kunne ikke opprette profil:", insertError.message);
      }
    }

    setCurrentRole("user");
    return;
  }

  setCurrentRole(data?.role || "user");
}

/*
  Logger brukeren ut og nullstiller
  lagret bruker og rolle i applikasjonen.
*/
export async function handleLogout() {
  await supabase.auth.signOut();
  setCurrentUser(null);
  setCurrentRole("user");
}

/*
  Lytter etter endringer i innloggingsstatus fra Supabase
  og oppdaterer gjeldende bruker automatisk.
*/
supabase.auth.onAuthStateChange((_event, session) => {
  setCurrentUser(session?.user ?? null);
});

/*
  Denne filen oppretter Supabase-klienten med riktig URL og nøkkel
  og håndterer all grunnleggende autentisering i applikasjonen.

  ensureAuthOnLoad() sjekker om brukeren er innlogget når siden lastes,
  sørger for at e-posten er bekreftet, og oppdaterer statusmeldingen.

  loadProfileRole() henter rollen til brukeren fra databasen, eller
  oppretter en ny profil med standardrolle hvis den ikke finnes.

  handleLogout() logger brukeren ut og nullstiller lagret tilstand.

  Til slutt lyttes det på endringer i innloggingstilstanden slik at
  brukerdata alltid er synkronisert.
*/
