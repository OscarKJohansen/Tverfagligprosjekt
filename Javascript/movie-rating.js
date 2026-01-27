/**
 * Movie Rating Question Generator
 * Fetches movie data from OMDb API and generates quiz questions
 */

const OMDB_API_KEY = "7a8dd0da";
const OMDB_BASE_URL = "http://www.omdbapi.com/";

/**
 * Search for movies by title (returns multiple results)
 * @param {string} searchQuery - The search query
 * @returns {Promise<Array>} Array of movie results
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

    // Return first 8 results
    return data.Search.slice(0, 8).map((result) => ({
      title: result.Title,
      year: result.Year,
      imdbId: result.imdbID,
      poster: result.Poster,
    }));
  } catch (error) {
    console.error("Error searching movies:", error);
    return [];
  }
}

/**
 * Fetch movie data from OMDb API
 * @param {string} movieTitle - The movie title to search for
 * @returns {Promise<Object|null>} Movie data object or null if not found
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

    // Check if movie was found
    if (data.Response === "False") {
      return null;
    }

    return {
      title: data.Title,
      year: data.Year,
      rating: parseFloat(data.imdbRating),
    };
  } catch (error) {
    console.error("Error fetching movie data:", error);
    throw new Error("Feil ved henting av filmdata. Prøv igjen.");
  }
}

/**
 * Generate plausible rating options within range of correct rating
 * @param {number} correctRating - The correct IMDb rating
 * @param {number} count - Number of options to generate (excluding correct)
 * @param {number} range - How far to deviate from correct rating (±range)
 * @returns {number[]} Array of plausible ratings
 */
function generatePlausibleRatings(correctRating, count, range) {
  const ratings = new Set();

  while (ratings.size < count) {
    // Generate random deviation within range
    const deviation = (Math.random() - 0.5) * 2 * range;
    let newRating = correctRating + deviation;

    // Clamp to valid IMDb range
    newRating = Math.max(1.0, Math.min(10.0, newRating));

    // Round to one decimal place
    newRating = Math.round(newRating * 10) / 10;

    // Avoid duplicates and the correct answer
    if (newRating !== correctRating) {
      ratings.add(newRating);
    }
  }

  return Array.from(ratings);
}

/**
 * Generate a Movie Rating question in multiple choice mode
 * @param {string} movieTitle - Movie title to fetch
 * @returns {Promise<Object>} Question JSON object
 */
export async function generateMovieRatingMultipleChoice(movieTitle) {
  const movie = await fetchMovieData(movieTitle);

  if (!movie) {
    throw new Error(
      `Film "${movieTitle}" ikke funnet. Prøv igjen med riktig tittel.`,
    );
  }

  const correctRating = Math.round(movie.rating * 10) / 10;

  // Generate 3 plausible wrong answers within ±1.5 of correct rating
  const wrongRatings = generatePlausibleRatings(correctRating, 3, 1.5);

  // Combine all answers
  const allAnswers = [correctRating, ...wrongRatings];

  // Shuffle answers
  const shuffledAnswers = allAnswers.sort(() => Math.random() - 0.5);

  return {
    type: "multiple_choice",
    question: `What is the IMDb rating of ${movie.title} (${movie.year})?`,
    answers: shuffledAnswers.map((r) => r.toFixed(1)),
    correctAnswer: correctRating.toFixed(1),
  };
}

/**
 * Generate a Movie Rating question in text answer mode
 * @param {string} movieTitle - Movie title to fetch
 * @returns {Promise<Object>} Question JSON object
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
 * Validate if an answer is correct for text mode
 * @param {string} userAnswer - User's answer as string
 * @param {string} correctAnswer - Correct answer as string
 * @param {number} acceptedRange - Tolerance range
 * @returns {boolean} True if answer is within accepted range
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
