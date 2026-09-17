/**
 * api.js — All backend communication lives here.
 *
 * One function, one job: send an image to /predict and return the JSON.
 *
 * CONCEPT: VITE_API_URL environment variable
 *   - In development (npm run dev): VITE_API_URL is empty string "".
 *     The fetch goes to "/predict" which the Vite proxy forwards to
 *     http://localhost:8000/predict automatically.
 *
 *   - In production (Vercel): you set VITE_API_URL in the Vercel dashboard.
 *     e.g. VITE_API_URL = "https://plant-detector-backend.onrender.com"
 *     Then fetch goes to "https://plant-detector-backend.onrender.com/predict".
 *
 *   import.meta.env.VITE_API_URL is how Vite reads environment variables.
 *   IMPORTANT: env vars in Vite MUST start with "VITE_" to be exposed to
 *   the browser. Any other prefix is hidden for security.
 */

const BASE_URL = import.meta.env.VITE_API_URL || '';

/**
 * Send a file to the /predict endpoint.
 *
 * @param {File} file - The File object from the file input or drag-drop event
 * @returns {Promise<object>} - The parsed JSON response from the backend
 * @throws {Error} - If the request fails or the server returns an error status
 */
export async function predictDisease(file) {
  // FormData is the browser's way of sending files over HTTP.
  // It creates a multipart/form-data request — the same format HTML forms use.
  // The 'file' field name must match what FastAPI expects: File(...) named "file".
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(`${BASE_URL}/predict`, {
    method: 'POST',
    body: formData,
    // Do NOT set Content-Type manually when using FormData.
    // The browser sets it automatically with the correct boundary value.
  });

  // If HTTP status is 4xx or 5xx, .json() gives us the FastAPI error detail
  if (!response.ok) {
    let detail = `Server error (${response.status})`;
    try {
      const errorBody = await response.json();
      detail = errorBody.detail || detail;
    } catch {
      // If the response body isn't JSON, just use the status message
    }
    throw new Error(detail);
  }

  return response.json();
}
