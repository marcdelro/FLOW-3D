/**
 * solverApi.js
 *
 * Thin HTTP wrapper around the FLOW-3D FastAPI backend.
 * This module is the ONLY place in the frontend that issues network
 * requests to solver endpoints.  It is never imported inside the
 * Three.js canvas module or inside Zustand store actions — callers
 * (form components) fetch here, then write into the store.
 *
 * Architectural rule (CLAUDE.md): the visualization layer never calls
 * solver endpoints.  Keep this module strictly separate from the
 * canvas and store layers.
 *
 * Mock mode:
 *   Set the environment variable VITE_USE_MOCK=true (in .env or
 *   .env.local) to bypass the backend entirely.  postSolveRequest()
 *   will return the hardcoded sample manifest after a 600 ms simulated
 *   delay, making the demo fully self-contained.
 *
 *   The mock also activates automatically when the real fetch throws a
 *   network error (i.e., the backend is not running), so the UI remains
 *   functional during frontend-only development without any env config.
 */

import { SAMPLE_MANIFEST } from '../data/sampleManifest.js';

/** True when the developer has opted into mock mode via the env var. */
const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true';

/** Simulated solver latency in milliseconds — makes the mock feel real. */
const MOCK_DELAY_MS = 600;

/** Base path for all solver API calls.  Proxied by Vite to localhost:8000. */
const API_BASE = '/api';

/**
 * POST /api/solve
 *
 * Submit a packing request to the backend matheuristic solver.
 * Returns the raw placement manifest JSON on success.
 *
 * @param {object} payload - The solve request body.
 * @param {object} payload.container  - { L, W, H } in mm.
 * @param {Array}  payload.items      - Array of item descriptors.
 * @returns {Promise<object>} - Parsed placement manifest.
 * @throws {Error} - On non-2xx HTTP response or network failure.
 *
 * Example payload:
 * {
 *   "container": { "L": 6000, "W": 2400, "H": 2600 },
 *   "items": [
 *     {
 *       "item_id": "chair-01",
 *       "l": 500, "w": 500, "h": 900,
 *       "delivery_stop": 1,
 *       "fragile": false,
 *       "side_up": false
 *     }
 *   ]
 * }
 */
export async function postSolveRequest(payload) {
  // ── Mock path ─────────────────────────────────────────────────────────────
  // Activated when VITE_USE_MOCK=true.  Real-fetch failures also fall through
  // to the mock so frontend development works without a running backend.
  if (USE_MOCK) {
    await new Promise((resolve) => setTimeout(resolve, MOCK_DELAY_MS));
    return SAMPLE_MANIFEST;
  }

  // ── Live path ─────────────────────────────────────────────────────────────
  let response;
  try {
    response = await fetch(`${API_BASE}/solve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch (networkErr) {
    // Backend unreachable — fall back to the mock so the UI stays useful.
    console.warn(
      '[solverApi] Backend unreachable, falling back to sample manifest.',
      networkErr.message
    );
    await new Promise((resolve) => setTimeout(resolve, MOCK_DELAY_MS));
    return SAMPLE_MANIFEST;
  }

  if (!response.ok) {
    // 5xx → backend is broken/unavailable; fall back to sample manifest.
    if (response.status >= 500) {
      console.warn(
        `[solverApi] Backend returned ${response.status}, falling back to sample manifest.`
      );
      await new Promise((resolve) => setTimeout(resolve, MOCK_DELAY_MS));
      return SAMPLE_MANIFEST;
    }

    // 4xx → surface to the user (bad request, auth errors, etc.).
    let detail = `HTTP ${response.status}`;
    try {
      const errBody = await response.json();
      detail = errBody.detail ?? errBody.message ?? detail;
    } catch {
      // Body was not JSON — use the status text.
      detail = response.statusText || detail;
    }
    throw new Error(`Solver API error: ${detail}`);
  }

  return response.json();
}

/**
 * GET /api/health
 *
 * Lightweight liveness check.  Returns true if the backend responds 200.
 * Used by the UI to show a connectivity indicator, not in the render loop.
 *
 * @returns {Promise<boolean>}
 */
export async function checkBackendHealth() {
  try {
    const response = await fetch(`${API_BASE}/health`, { method: 'GET' });
    return response.ok;
  } catch {
    return false;
  }
}
