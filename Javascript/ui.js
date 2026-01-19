import { getCurrentUser, getCurrentRole } from "./state.js";

function updateBadges() {
  const userBadge = document.getElementById("user-badge");
  const roleBadge = document.getElementById("role-badge");
  const currentUser = getCurrentUser();
  const currentRole = getCurrentRole();

  if (!userBadge || !roleBadge) return;

  if (currentUser?.email) {
    const isAdmin = currentRole === "admin";
    userBadge.textContent = currentUser.email;
    userBadge.className = "badge rounded-pill text-bg-secondary";
    roleBadge.textContent = isAdmin ? "Admin" : "Bruker";
    roleBadge.className =
      "badge rounded-pill " +
      (isAdmin ? "text-bg-warning" : "text-bg-secondary");
    roleBadge.classList.remove("d-none");
  } else {
    userBadge.textContent = "Gjest";
    userBadge.className = "badge rounded-pill text-bg-light";
    roleBadge.classList.add("d-none");
  }
}

function updateAccountCard() {
  const accountEmail = document.getElementById("account-email");
  const accountRole = document.getElementById("account-role");
  const currentUser = getCurrentUser();
  const currentRole = getCurrentRole();

  if (accountEmail)
    accountEmail.textContent = currentUser?.email || "Ikke innlogget";
  if (accountRole) {
    if (!currentUser) {
      accountRole.textContent = "—";
    } else if (currentRole === "admin") {
      accountRole.textContent = "Admin";
    } else {
      accountRole.textContent = "Bruker";
    }
  }
}

export function updateAuthUI() {
  const authArea = document.getElementById("auth-area");
  const accountArea = document.getElementById("account-area");
  const currentUser = getCurrentUser();

  updateBadges();
  updateAccountCard();

  if (!authArea || !accountArea) return;

  if (currentUser) {
    authArea.classList.add("d-none");
    accountArea.classList.remove("d-none");
  } else {
    authArea.classList.remove("d-none");
    accountArea.classList.add("d-none");
  }
}
// Denne koden sjekker om det finnes en innlogget bruker og hvilken rolle brukeren har. Øverst på siden oppdateres små merker som viser e-posten og om brukeren er admin eller vanlig bruker. 
// Hvis ingen er innlogget, står det bare Gjest. Kontoen blir også oppdatert med e-post og rolle, eller viser -hvis man er logget ut. 
// Til slutt sørger updateAuthUI() for å vise riktig del av siden: innlogging når ingen er logget inn, og kontosiden når en bruker er innlogget, slik at alt holder seg oppdatert hele tiden 