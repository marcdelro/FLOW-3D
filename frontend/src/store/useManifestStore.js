/**
 * useManifestStore
 *
 * Zustand store that is the single source of truth for the placement manifest
 * and container dimensions.  The Three.js canvas (ContainerCanvas) reads from
 * this store exclusively — it never fetches data itself.  Only the API layer
 * and form components write to this store.
 *
 * Architectural rule (CLAUDE.md): the visualization layer is read-only with
 * respect to solver state.  No solver calls are made from inside this store.
 */

import { create } from 'zustand';

/**
 * @typedef {Object} Placement
 * @property {string}  item_id        - Unique identifier for the furniture item.
 * @property {number}  x              - x_i: left-front-bottom corner x, in mm.
 * @property {number}  y              - y_i: left-front-bottom corner y (height), in mm.
 * @property {number}  z              - z_i: left-front-bottom corner z (depth), in mm.
 * @property {number}  l              - l_i: length (x-extent) of the item, in mm.
 * @property {number}  w              - w_i: width  (z-extent) of the item, in mm.
 * @property {number}  h              - h_i: height (y-extent) of the item, in mm.
 * @property {string}  rotation       - Rotation descriptor; "identity" or a named rotation.
 * @property {number}  delivery_stop  - LIFO stop number (1 = first unloaded / nearest door).
 * @property {number}  phase          - 1 (ILP) or 2 (FFD).
 */

/**
 * @typedef {Object} ContainerDims
 * @property {number} L - Container length (x-axis), in mm.
 * @property {number} W - Container width  (z-axis), in mm.
 * @property {number} H - Container height (y-axis), in mm.
 */

/**
 * @typedef {Object} ManifestStore
 * @property {ContainerDims|null}  container       - Active container dimensions.
 * @property {Placement[]}         placements      - Ordered list of item placements.
 * @property {number|null}         utilization     - V_util in [0, 1].
 * @property {number|null}         solverTimeMs    - T_exec reported by backend.
 * @property {'idle'|'loading'|'error'} status     - UI async state.
 * @property {string|null}         errorMessage    - Human-readable API error.
 * @property {(manifest: object) => void} setManifest   - Write a fresh solver result.
 * @property {() => void}          clearManifest   - Reset to initial state.
 * @property {(s: string) => void} setStatus       - Update loading/error state.
 * @property {(m: string) => void} setError        - Record an error message.
 */

const useManifestStore = create((set) => ({
  // ── State ─────────────────────────────────────────────────────────────────
  container: null,
  placements: [],
  utilization: null,
  solverTimeMs: null,
  status: 'idle',       // 'idle' | 'loading' | 'error'
  errorMessage: null,

  // ── Actions ───────────────────────────────────────────────────────────────

  /**
   * Ingest the full placement manifest returned by the backend.
   * Clears any prior solution before writing new data so the canvas
   * disposal path always fires on solution replacement.
   *
   * @param {object} manifest - Raw JSON from /api/solve.
   */
  setManifest: (manifest) =>
    set({
      container: manifest.container,
      placements: manifest.placements ?? [],
      utilization: manifest.utilization ?? null,
      solverTimeMs: manifest.solver_time_ms ?? null,
      status: 'idle',
      errorMessage: null,
    }),

  /**
   * Reset to blank state — called when the user clears the form or starts
   * a new solve request.  The canvas useEffect dependency on `placements`
   * will fire and trigger geometry disposal.
   */
  clearManifest: () =>
    set({
      container: null,
      placements: [],
      utilization: null,
      solverTimeMs: null,
      status: 'idle',
      errorMessage: null,
    }),

  setStatus: (status) => set({ status }),

  setError: (errorMessage) => set({ status: 'error', errorMessage }),
}));

export default useManifestStore;
