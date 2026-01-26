import { getCurrentUser, getCurrentRole } from "./state.js";

/*
  Oppdaterer merkene (badges) øverst på siden.
  Viser e-post og rolle hvis brukeren er innlogget,
  eller "Gjest" hvis ingen er logget inn.
*/
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

/*
  Oppdaterer kontoinformasjonen på kontosiden.
  Viser e-post og rolle hvis brukeren er innlogget,
  ellers vises standardverdier.
*/
function updateAccountCard() {
  const accountEmail = document.getElementById("account-email");
  const accountRole = document.getElementById("account-role");
  const currentUser = getCurrentUser();
  const currentRole = getCurrentRole();

  if (accountEmail) {
    accountEmail.textContent = currentUser?.email || "Ikke innlogget";
  }

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

/*
  Hovedfunksjon for autentiserings-UI.
  Oppdaterer badges og kontoinfo, og
  viser enten innlogging eller kontoside
  basert på om brukeren er innlogget.
*/
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

/*
  Denne koden sjekker om det finnes en innlogget bruker og hvilken rolle brukeren har.
  Øverst på siden oppdateres små merker som viser e-post og om brukeren er admin
  eller vanlig bruker. Hvis ingen er innlogget, vises bare "Gjest".

  Konto-siden oppdateres også med riktig e-post og rolle, eller viser en
  standardverdi hvis brukeren er logget ut.

  Til slutt sørger updateAuthUI() for at riktig del av siden vises:
  innlogging når ingen er logget inn, og kontosiden når en bruker er innlogget.
*/
