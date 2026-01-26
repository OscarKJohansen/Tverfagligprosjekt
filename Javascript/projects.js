import { showPage } from "./ui.js";
import { pythonCode } from "../content/pythonCode.js";
import { project3Text } from "../content/project3Text.js";

/*
  Initialiserer prosjektsiden i porteføljen.
  Setter opp klikkhendelser for prosjektkortene
  og tilhørende «Tilbake»-knapper.
*/
export function initProjects() {
  const project2Card = document.getElementById("project2");
  const project2BackBtn = document.getElementById("project2-back-btn");
  const project3Card = document.getElementById("project3");
  const project3BackBtn = document.getElementById("project3-back-btn");
  const project4Card = document.getElementById("project4");
  const project4BackBtn = document.getElementById("project4-back-btn");

  /*
    Prosjekt 2:
    Viser Python-kode på kodesiden når prosjektkortet klikkes.
  */
  project2Card?.addEventListener("click", () => {
    document.getElementById("code-page-content").textContent = pythonCode;
    showPage("project2-area");
  });

  /*
    Tilbake-knapp for prosjekt 2.
    Sender brukeren tilbake til porteføljesiden.
  */
  project2BackBtn?.addEventListener("click", () => {
    showPage("portfolio-area");
  });

  /*
    Prosjekt 3:
    Viser prosjektekst. Hvis marked.js finnes,
    vises teksten formatert som Markdown.
  */
  project3Card?.addEventListener("click", () => {
    const content = document.getElementById("project3-content");

    if (typeof marked !== "undefined") {
      content.innerHTML = marked.parse(project3Text);
    } else {
      content.innerHTML = `<pre>${project3Text}</pre>`;
    }

    showPage("project3-area");
  });

  /*
    Tilbake-knapp for prosjekt 3.
  */
  project3BackBtn?.addEventListener("click", () => {
    showPage("portfolio-area");
  });

  /*
    Prosjekt 4:
    Åpner sin egen side uten ekstra innhold.
  */
  project4Card?.addEventListener("click", () => {
    showPage("project4-area");
  });

  /*
    Tilbake-knapp for prosjekt 4.
  */
  project4BackBtn?.addEventListener("click", () => {
    showPage("portfolio-area");
  });
}

/*
  Denne filen henter inn funksjonen showPage fra ui.js, samt innhold
  som skal vises i prosjekt 2 og 3.

  Når initProjects() kjøres, settes det opp klikkhendelser på
  prosjektkortene og «Tilbake»-knappene.

  Prosjekt 2 viser Python-kode, prosjekt 3 viser prosjektekst
  (formatert hvis Markdown er tilgjengelig), og prosjekt 4 åpner
  bare sin egen side.

  «Tilbake»-knappene sender alltid brukeren tilbake til porteføljesiden.

  Denne filen fungerer kun hvis portefølje- og prosjektsidene finnes
  i HTML-koden. I den nåværende løsningen, som kun har innlogging,
  brukes derfor ikke denne filen aktivt.
*/
