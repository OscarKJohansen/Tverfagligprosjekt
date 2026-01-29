/**
 * Filmvurderingsspørsmål-generator
 * Henter filmdata fra OMDb API og genererer quizspørsmål
 */

const OMDB_API_KEY = "7a8dd0da";
const OMDB_BASE_URL = "http://www.omdbapi.com/";

/**
 * Søk etter filmer etter tittel (returnerer flere resultater)
 * @param {string} searchQuery - Søkspørringen
 * @returns {Promise<Array>} Matrise av filmresultater
 */
export async function searchMovies(searchQuery) {
  if (!searchQuery || searchQuery.length < 2) {
    return [];
  }

  try {
    const params = new URLSearchParams({
      s: searchQuery,
      type: "movie",
      apikey: OMDB_API_KEY,
    });

    const response = await fetch(`${OMDB_BASE_URL}?${params.toString()}`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    if (data.Response === "False" || !data.Search) {
      return [];
    }

    // Returner første 8 resultater
    return data.Search.slice(0, 8).map((result) => ({
      title: result.Title,
      year: result.Year,
      imdbId: result.imdbID,
      poster: result.Poster,
    }));
  } catch (error) {
    console.error("Feil ved søk etter filmer:", error);
    return [];
  }
}

/**
 * Hent filmdata fra OMDb API
 * @param {string} movieTitle - Filmtittelen som skal søkes etter
 * @returns {Promise<Object|null>} Filmdataobjekt eller null hvis ikke funnet
 */
export async function fetchMovieData(movieTitle) {
  try {
    const params = new URLSearchParams({
      t: movieTitle,
      apikey: OMDB_API_KEY,
    });

    const response = await fetch(`${OMDB_BASE_URL}?${params.toString()}`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    // Sjekk om filmen ble funnet
    if (data.Response === "False") {
      return null;
    }

    return {
      title: data.Title,
      year: data.Year,
      rating: parseFloat(data.imdbRating),
    };
  } catch (error) {
    console.error("Feil ved henting av filmdata:", error);
    throw new Error("Feil ved henting av filmdata. Prøv igjen.");
  }
}

/**
 * Generer plausible vurderingsalternativer innenfor område av riktig vurdering
 * @param {number} correctRating - Den riktige IMDb-vurderingen
 * @param {number} count - Antall alternativer som skal genereres (unntatt korrekt)
 * @param {number} range - Hvor langt skal avvike fra riktig vurdering (±range)
 * @returns {number[]} Matrise av plausible vurderinger
 */
function generatePlausibleRatings(correctRating, count, range) {
  const ratings = new Set();

  while (ratings.size < count) {
    // Generer tilfeldig avvik innenfor område
    const deviation = (Math.random() - 0.5) * 2 * range;
    let newRating = correctRating + deviation;

    // Klemm til gyldig IMDb-område
    newRating = Math.max(1.0, Math.min(10.0, newRating));

    // Rund til en desimal
    newRating = Math.round(newRating * 10) / 10;

    // Unngå duplikater og riktig svar
    if (newRating !== correctRating) {
      ratings.add(newRating);
    }
  }

  return Array.from(ratings);
}

/**
 * Generer et filmvurderingsspørsmål i multiple choice-modus
 * @param {string} movieTitle - Filmtittel som skal hentes
 * @returns {Promise<Object>} Spørsmål JSON-objekt
 */
export async function generateMovieRatingMultipleChoice(movieTitle) {
  const movie = await fetchMovieData(movieTitle);

  if (!movie) {
    throw new Error(
      `Film "${movieTitle}" ikke funnet. Prøv igjen med riktig tittel.`,
    );
  }

  const correctRating = Math.round(movie.rating * 10) / 10;

  // Generer 3 plausible gale svar innenfor ±1,5 av riktig vurdering
  const wrongRatings = generatePlausibleRatings(correctRating, 3, 1.5);

  // Kombiner alle svar
  const allAnswers = [correctRating, ...wrongRatings];

  // Bland svar
  const shuffledAnswers = allAnswers.sort(() => Math.random() - 0.5);

  return {
    type: "multiple_choice",
    question: `What is the IMDb rating of ${movie.title} (${movie.year})?`,
    answers: shuffledAnswers.map((r) => r.toFixed(1)),
    correctAnswer: correctRating.toFixed(1),
  };
}

/**
 * Generer et filmvurderingsspørsmål i tekstsvar-modus
 * @param {string} movieTitle - Filmtittel som skal hentes
 * @returns {Promise<Object>} Spørsmål JSON-objekt
 */
export async function generateMovieRatingTextAnswer(movieTitle) {
  const movie = await fetchMovieData(movieTitle);

  if (!movie) {
    throw new Error(
      `Film "${movieTitle}" ikke funnet. Prøv igjen med riktig tittel.`,
    );
  }

  const correctRating = Math.round(movie.rating * 10) / 10;

  return {
    type: "text",
    question: `What is the IMDb rating of ${movie.title} (${movie.year})?`,
    correctAnswer: correctRating.toFixed(1),
    acceptedRange: 0.2,
  };
}

/**
 * Valider om et svar er korrekt for tekstmodus
 * @param {string} userAnswer - Brukerens svar som streng
 * @param {string} correctAnswer - Riktig svar som streng
 * @param {number} acceptedRange - Toleranseområde
 * @returns {boolean} Sant hvis svar er innenfor akseptert område
 */
export function validateMovieRatingAnswer(
  userAnswer,
  correctAnswer,
  acceptedRange,
) {
  try {
    const userValue = parseFloat(userAnswer);
    const correctValue = parseFloat(correctAnswer);

    if (isNaN(userValue) || isNaN(correctValue)) {
      return false;
    }

    const difference = Math.abs(userValue - correctValue);
    return difference <= acceptedRange;
  } catch {
    return false;
  }
}
