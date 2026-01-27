/**
 * Unsplash API module for fetching and managing images
 */

const UNSPLASH_API_KEY = "VpyHCRMEThyIPlJu3dyxdTDbAn5N69pQY0gbBcM1F0I";
const UNSPLASH_API_BASE = "https://api.unsplash.com";

/**
 * Search for images on Unsplash
 * @param {string} query - Search keyword
 * @param {number} perPage - Number of results to return (default: 12)
 * @returns {Promise<Array>} Array of image objects with url, photographer, and attribution
 */
export async function searchUnsplashImages(query, perPage = 12) {
  if (!query.trim()) {
    return [];
  }

  try {
    const response = await fetch(
      `${UNSPLASH_API_BASE}/search/photos?query=${encodeURIComponent(
        query,
      )}&per_page=${perPage}&client_id=${UNSPLASH_API_KEY}`,
    );

    if (!response.ok) {
      console.error("Unsplash API error:", response.status);
      return [];
    }

    const data = await response.json();

    return (data.results || []).map((photo) => ({
      id: photo.id,
      url: `${photo.urls.raw}&w=400&h=225&fit=crop`,
      rawUrl: photo.urls.raw,
      photographer: photo.user.name,
      photographerProfile: photo.user.links.html,
      photographerUsername: photo.user.username,
      alt: photo.alt_description || "Unsplash image",
      links: photo.links,
    }));
  } catch (error) {
    console.error("Error fetching from Unsplash API:", error);
    return [];
  }
}

/**
 * Get a formatted image URL with specific dimensions
 * @param {string} baseUrl - The raw Unsplash URL
 * @param {number} width - Width in pixels
 * @param {number} height - Height in pixels
 * @returns {string} Formatted URL with dimensions
 */
export function getFormattedImageUrl(baseUrl, width = 400, height = 225) {
  return `${baseUrl}&w=${width}&h=${height}&fit=crop`;
}

/**
 * Get attribution HTML for an image
 * @param {object} imageData - Image object from searchUnsplashImages
 * @returns {string} HTML string with photographer attribution
 */
export function getAttributionHtml(imageData) {
  return `
    Photo by <a href="${imageData.photographerProfile}" target="_blank" rel="noopener noreferrer">
      ${escapeHtml(imageData.photographer)}
    </a> on <a href="https://unsplash.com/?utm_source=tverfagligprosjekt&utm_medium=referral" 
       target="_blank" rel="noopener noreferrer">Unsplash</a>
  `;
}

/**
 * Escape HTML special characters
 * @param {string} text - Text to escape
 * @returns {string} Escaped text
 */
function escapeHtml(text) {
  const map = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  };
  return text.replace(/[&<>"']/g, (m) => map[m]);
}

export { escapeHtml };
