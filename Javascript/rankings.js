import { supabase } from "./auth.js";
import { getCurrentUser } from "./state.js";

/**
 * Viser rangeringseksjonen og skjuler andre seksjoner
 */
export function showRankingsPage() {
  // Denne funksjonen brukes av quiz-ui.js toggleAreas
  // Rangeringseksjonen vises når "rankings-area" er i AREAS-listen
}

/**
 * Laster og viser brukerrangeringer fra Supabase
 */
export async function loadRankings() {
  const loadingEl = document.getElementById("rankings-loading");
  const listEl = document.getElementById("rankings-list");
  const errorEl = document.getElementById("rankings-error");
  const tbodyEl = document.getElementById("rankings-tbody");

  if (!loadingEl || !listEl || !errorEl || !tbodyEl) return;

  // Vis laster-indikator
  loadingEl.classList.remove("d-none");
  listEl.classList.add("d-none");
  errorEl.classList.add("d-none");

  try {
    // Hent rangeringer fra user_points-tabellen, sortert etter poeng (synkende)
    const { data, error } = await supabase
      .from("user_points")
      .select("user_email, total_points, quizzes_played, accuracy")
      .order("total_points", { ascending: false })
      .limit(100);

    if (error) throw error;

    // Skjul lasting, vis listen
    loadingEl.classList.add("d-none");
    listEl.classList.remove("d-none");

    // Tøm eksisterende rader
    tbodyEl.innerHTML = "";

    if (!data || data.length === 0) {
      tbodyEl.innerHTML = `
        <tr>
          <td colspan="5" class="text-center py-5">
            <div style="font-size: 2rem;">📭</div>
            <p class="fw-bold mt-3">Ingen rangeringer ennå. Vær den første!</p>
          </td>
        </tr>
      `;
      return;
    }

    // Fyll tabellen med rangeringer
    data.forEach((user, index) => {
      const rank = index + 1;
      let medal = "";
      let rankClass = "";

      // Legg til medaljer for topp 3
      if (rank === 1) {
        medal = "🥇";
        rankClass = "rank-1";
      } else if (rank === 2) {
        medal = "🥈";
        rankClass = "rank-2";
      } else if (rank === 3) {
        medal = "🥉";
        rankClass = "rank-3";
      }

      const accuracy = user.accuracy || 0;
      const accuracyFormatted = accuracy.toFixed(1) + "%";

      const row = document.createElement("tr");
      row.className = rankClass;
      row.innerHTML = `
        <td class="fw-bold" style="font-size: 1.25rem;">${medal} ${rank}</td>
        <td class="fw-semibold">${user.user_email}</td>
        <td class="text-end fw-bold" style="color: var(--kahoot-orange); font-size: 1.125rem;">
          ${user.total_points.toLocaleString()}
        </td>
        <td class="text-end">${user.quizzes_played || 0}</td>
        <td class="text-end">${accuracyFormatted}</td>
      `;

      tbodyEl.appendChild(row);
    });
  } catch (error) {
    console.error("Feil ved lasting av rangeringer:", error);
    loadingEl.classList.add("d-none");
    errorEl.classList.remove("d-none");
  }
}

/**
 * Oppdaterer brukerpoeng etter fullført quiz
 */
export async function updateUserPoints(points, accuracy) {
  const user = getCurrentUser();
  if (!user || !user.email) return;

  try {
    // Forsøk først å hente eksisterende brukerdata
    const { data: existing, error: fetchError } = await supabase
      .from("user_points")
      .select("*")
      .eq("user_email", user.email)
      .single();

    if (fetchError && fetchError.code !== "PGRST116") {
      // PGRST116 betyr at ingen rader ble funnet, noe som er helt greit
      console.error("Feil ved henting av brukerpoeng:", fetchError);
      return;
    }

    if (existing) {
      // Oppdater eksisterende rad
      const newTotalPoints = existing.total_points + points;
      const newQuizzesPlayed = existing.quizzes_played + 1;
      const newAccuracy =
        (existing.accuracy * existing.quizzes_played + accuracy) /
        newQuizzesPlayed;

      const { error: updateError } = await supabase
        .from("user_points")
        .update({
          total_points: newTotalPoints,
          quizzes_played: newQuizzesPlayed,
          accuracy: newAccuracy,
          updated_at: new Date().toISOString(),
        })
        .eq("user_email", user.email);

      if (updateError) {
        console.error("Feil ved oppdatering av brukerpoeng:", updateError);
      }
    } else {
      // Sett inn ny rad for brukeren
      const { error: insertError } = await supabase.from("user_points").insert({
        user_email: user.email,
        total_points: points,
        quizzes_played: 1,
        accuracy: accuracy,
      });

      if (insertError) {
        console.error("Feil ved innsetting av brukerpoeng:", insertError);
      }
    }
  } catch (error) {
    console.error("Feil ved oppdatering av brukerpoeng:", error);
  }
}

/**
 * Initialiserer rangeringseksjonen
 */
export function initRankings() {
  const rankingsNav = document.getElementById("nav-rankings");
  const backBtn = document.getElementById("back-from-rankings-btn");

  if (rankingsNav) {
    rankingsNav.addEventListener("click", (e) => {
      e.preventDefault();
      showRankings();
    });
  }

  if (backBtn) {
    backBtn.addEventListener("click", () => {
      hideRankings();
    });
  }
}

// Viser rangeringer ved å laste data og oppdatere UI
function showRankings() {
  // Importerer dynamisk for å unngå sirkulær import
  import("./quiz-ui.js").then(({ toggleAreas }) => {
    toggleAreas(["rankings-area"]);
    loadRankings();
  });
}

// Skjuler rangeringer og viser quiz-listen igjen
function hideRankings() {
  // Importerer dynamisk for å unngå sirkulær import
  import("./quiz-ui.js").then(({ toggleAreas }) => {
    toggleAreas(["app-area", "quiz-list-area"]);
  });
}
