import { supabase } from "./auth.js";
import { getCurrentUser } from "./state.js";

/**
 * Load and display user rankings from Supabase
 */
export async function loadRankings() {
  const loadingEl = document.getElementById("rankings-loading");
  const listEl = document.getElementById("rankings-list");
  const errorEl = document.getElementById("rankings-error");
  const tbodyEl = document.getElementById("rankings-tbody");

  if (!loadingEl || !listEl || !errorEl || !tbodyEl) return;

  // Show loading
  loadingEl.classList.remove("d-none");
  listEl.classList.add("d-none");
  errorEl.classList.add("d-none");

  try {
    // Fetch rankings from user_points table, ordered by points descending
    const { data, error } = await supabase
      .from("user_points")
      .select("user_email, total_points, quizzes_played, accuracy")
      .order("total_points", { ascending: false })
      .limit(100);

    if (error) throw error;

    // Hide loading, show list
    loadingEl.classList.add("d-none");
    listEl.classList.remove("d-none");

    // Clear existing rows
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

    // Populate table with rankings
    data.forEach((user, index) => {
      const rank = index + 1;
      let medal = "";
      let rankClass = "";

      // Add medals for top 3
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
        <td class="text-end fw-bold" style="color: var(--kahoot-orange); font-size: 1.125rem;">${user.total_points.toLocaleString()}</td>
        <td class="text-end">${user.quizzes_played || 0}</td>
        <td class="text-end">${accuracyFormatted}</td>
      `;

      tbodyEl.appendChild(row);
    });
  } catch (error) {
    console.error("Error loading rankings:", error);
    loadingEl.classList.add("d-none");
    errorEl.classList.remove("d-none");
  }
}

/**
 * Update user points after completing a quiz
 */
export async function updateUserPoints(points, accuracy) {
  const user = getCurrentUser();
  if (!user || !user.email) return;

  try {
    // First, try to get existing record
    const { data: existing, error: fetchError } = await supabase
      .from("user_points")
      .select("*")
      .eq("user_email", user.email)
      .single();

    if (fetchError && fetchError.code !== "PGRST116") {
      // PGRST116 means no rows found, which is fine
      console.error("Error fetching user points:", fetchError);
      return;
    }

    if (existing) {
      // Update existing record
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
        console.error("Error updating user points:", updateError);
      }
    } else {
      // Insert new record
      const { error: insertError } = await supabase.from("user_points").insert({
        user_email: user.email,
        total_points: points,
        quizzes_played: 1,
        accuracy: accuracy,
      });

      if (insertError) {
        console.error("Error inserting user points:", insertError);
      }
    }
  } catch (error) {
    console.error("Error updating user points:", error);
  }
}

/**
 * Initialize rankings section
 */
export function initRankings() {
  const rankingsNav = document.getElementById("nav-rankings");
  const backBtn = document.getElementById("back-from-rankings-btn");

  if (rankingsNav) {
    rankingsNav.addEventListener("click", (e) => {
      e.preventDefault();
      showRankingsSection();
      loadRankings();
    });
  }

  if (backBtn) {
    backBtn.addEventListener("click", () => {
      hideRankingsSection();
    });
  }
}

function showRankingsSection() {
  const rankingsArea = document.getElementById("rankings-area");
  const quizListArea = document.getElementById("quiz-list-area");
  const quizCreateArea = document.getElementById("quiz-create-area");
  const authArea = document.getElementById("auth-area");

  if (rankingsArea) rankingsArea.classList.remove("d-none");
  if (quizListArea) quizListArea.classList.add("d-none");
  if (quizCreateArea) quizCreateArea.classList.add("d-none");
  if (authArea) authArea.classList.add("d-none");
}

function hideRankingsSection() {
  const rankingsArea = document.getElementById("rankings-area");
  const quizListArea = document.getElementById("quiz-list-area");

  if (rankingsArea) rankingsArea.classList.add("d-none");
  if (quizListArea) quizListArea.classList.remove("d-none");
}
