import { showPage } from "./ui.js";
import { pythonCode } from "../content/pythonCode.js";
import { project3Text } from "../content/project3Text.js";

export function initProjects() {
  const project2Card = document.getElementById("project2");
  const project2BackBtn = document.getElementById("project2-back-btn");
  const project3Card = document.getElementById("project3");
  const project3BackBtn = document.getElementById("project3-back-btn");
  const project4Card = document.getElementById("project4");
  const project4BackBtn = document.getElementById("project4-back-btn");

  project2Card?.addEventListener("click", () => {
    document.getElementById("code-page-content").textContent = pythonCode;
    showPage("project2-area");
  });

  project2BackBtn?.addEventListener("click", () => {
    showPage("portfolio-area");
  });

  project3Card?.addEventListener("click", () => {
    const content = document.getElementById("project3-content");
    if (typeof marked !== "undefined") {
      content.innerHTML = marked.parse(project3Text);
    } else {
      content.innerHTML = `<pre>${project3Text}</pre>`;
    }
    showPage("project3-area");
  });

  project3BackBtn?.addEventListener("click", () => {
    showPage("portfolio-area");
  });

  project4Card?.addEventListener("click", () => {
    showPage("project4-area");
  });

  project4BackBtn?.addEventListener("click", () => {
    showPage("portfolio-area");
  });
}

// Filen henter inn funksjonen showPage fra ui.js, og innholdet som skal vises i prosjekt 2 og 3. Når initProjects() kjøres, settes det opp klikk på prosjektkortene og «Tilbake»-knappene. Hvis du klikker på prosjekt 2, vises Python-koden. Klikker du på prosjekt 3, vises teksten til prosjektet, enten som formatert tekst eller vanlig tekst. Prosjekt 4 åpner bare sin egen side. «Tilbake»-knappene tar deg alltid tilbake til porteføljesiden.
// Denne filen fungerer bare hvis portefølje- og prosjektsidene fortsatt finnes i HTML-koden. I den nåværende løsningen, som bare har innlogging, blir den derfor ikke brukt.
