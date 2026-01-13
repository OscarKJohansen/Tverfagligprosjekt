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

// Check if user is logged in, redirect to login if not
async function checkAuth() {
  const { data, error } = await supabase.auth.getUser();

  if (error || !data?.user || !data.user.confirmed_at) {
    // Not logged in or email not confirmed, redirect to login
    window.location.href = "./index.html";
    return false;
  }

  return true;
}

// Initialize quiz page
async function initQuizPage() {
  const isLoggedIn = await checkAuth();
  if (!isLoggedIn) return;

  await ensureAuthOnLoad();
  updateQuizNav();
  setupQuizEventListeners();
  showQuizList();
}

// Logout handler
document
  .getElementById("logout-nav-btn")
  ?.addEventListener("click", async () => {
    await handleLogout();
    window.location.href = "./index.html";
  });

// Initialize on page load
initQuizPage();

// Listen for auth changes
supabase.auth.onAuthStateChange((_event, session) => {
  setCurrentUser(session?.user ?? null);
  if (!session?.user) {
    window.location.href = "./index.html";
  }
});
