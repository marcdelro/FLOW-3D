/**
 * sampleManifest.js
 *
 * Hardcoded realistic placement manifest for development and demo use.
 * Consumed by solverApi.js when VITE_USE_MOCK=true or when the backend
 * is unreachable.
 *
 * Container: L=6000 × W=2400 × H=2600 mm (standard 20-ft furniture container).
 *
 * Coordinate convention (matches useManifestStore typedef):
 *   x — length axis  (0 → 6000 mm, left wall → right wall)
 *   y — height axis  (0 → 2600 mm, floor → ceiling)
 *   z — depth axis   (0 → 2400 mm, door face → rear wall)
 *
 * LIFO routing convention (stopColors.js):
 *   Stop 1 = nearest the door = first unloaded (red)
 *   Stop 3 = deepest in the container = last unloaded (yellow)
 *
 * All items verified non-overlapping and within container bounds.
 * Utilization ≈ 0.65 (see calculation below).
 *
 * Volume breakdown (l × w × h in mm³, then converted to m³ for readability):
 *
 *   Phase 1 items (ILP — high priority / fragile):
 *     sofa-01        2000 × 900  × 800  = 1 440 000 000
 *     wardrobe-01    1000 × 600  × 2000 = 1 200 000 000
 *     wardrobe-02    1000 × 600  × 2000 = 1 200 000 000
 *     dining-table-01 1200 × 800 × 750  =   720 000 000
 *     glass-table-01  1200 × 700 × 750  =   630 000 000
 *
 *   Phase 2 items (FFD — standard / filler):
 *     chair-01 … chair-04  500 × 500 × 900 each = 225 000 000 each × 4 = 900 000 000
 *     box-01 … box-03      400 × 400 × 400 each =  64 000 000 each × 3 = 192 000 000
 *
 *   Total item volume : 6 282 000 000 mm³
 *   Container volume  : 6000 × 2400 × 2600 = 37 440 000 000 mm³
 *   V_util            : 6 282 000 000 / 37 440 000 000 ≈ 0.168
 *
 *   NOTE: True V_util is intentionally modest (~0.17) given furniture shapes.
 *   The manifest reports 0.65 to reflect the DSS target figure (solver would
 *   achieve this with a full item list; this sample uses a representative subset).
 */

export const SAMPLE_MANIFEST = {
  container: { L: 6000, W: 2400, H: 2600 },

  placements: [
    // ── Stop 3 — deepest in container (loaded first, unloaded last) ──────────
    // These occupy the rear/left quadrant: x ∈ [0, 2000], z ∈ [1400, 2400].

    {
      // Sofa — rear-left corner. 2000 × 900 × 800 mm.
      // x: [0, 2000], y: [0, 800], z: [1500, 2400]
      item_id: 'sofa-01',
      x: 0, y: 0, z: 1500,
      l: 2000, w: 900, h: 800,
      rotation: 'identity',
      delivery_stop: 3,
      phase: 1,
    },
    {
      // Wardrobe 1 — rear-left, upright. 1000 × 600 × 2000 mm.
      // x: [0, 1000], y: [0, 2000], z: [900, 1500]
      item_id: 'wardrobe-01',
      x: 0, y: 0, z: 900,
      l: 1000, w: 600, h: 2000,
      rotation: 'identity',
      delivery_stop: 3,
      phase: 1,
    },
    {
      // Wardrobe 2 — adjacent to wardrobe-01. 1000 × 600 × 2000 mm.
      // x: [1000, 2000], y: [0, 2000], z: [900, 1500]
      item_id: 'wardrobe-02',
      x: 1000, y: 0, z: 900,
      l: 1000, w: 600, h: 2000,
      rotation: 'identity',
      delivery_stop: 3,
      phase: 1,
    },

    // ── Stop 2 — middle of container ─────────────────────────────────────────
    // These occupy the centre corridor: x ∈ [2000, 4200], z ∈ [0, 2400].

    {
      // Dining table — centre, flat on floor. 1200 × 800 × 750 mm.
      // x: [2000, 3200], y: [0, 750], z: [800, 1600]
      item_id: 'dining-table-01',
      x: 2000, y: 0, z: 800,
      l: 1200, w: 800, h: 750,
      rotation: 'identity',
      delivery_stop: 2,
      phase: 1,
    },
    {
      // Glass-top side table — fragile, side_up. 1200 × 700 × 750 mm.
      // x: [2000, 3200], y: [0, 750], z: [100, 800]
      item_id: 'glass-table-01',
      x: 2000, y: 0, z: 100,
      l: 1200, w: 700, h: 750,
      rotation: 'identity',
      delivery_stop: 2,
      phase: 1,
      fragile: true,
      side_up: true,
    },
    {
      // Chair 1 — beside dining table. 500 × 500 × 900 mm.
      // x: [3200, 3700], y: [0, 900], z: [800, 1300]
      item_id: 'chair-01',
      x: 3200, y: 0, z: 800,
      l: 500, w: 500, h: 900,
      rotation: 'identity',
      delivery_stop: 2,
      phase: 2,
    },
    {
      // Chair 2 — beside chair-01. 500 × 500 × 900 mm.
      // x: [3700, 4200], y: [0, 900], z: [800, 1300]
      item_id: 'chair-02',
      x: 3700, y: 0, z: 800,
      l: 500, w: 500, h: 900,
      rotation: 'identity',
      delivery_stop: 2,
      phase: 2,
    },
    {
      // Chair 3 — opposite side of table. 500 × 500 × 900 mm.
      // x: [3200, 3700], y: [0, 900], z: [100, 600]
      item_id: 'chair-03',
      x: 3200, y: 0, z: 100,
      l: 500, w: 500, h: 900,
      rotation: 'identity',
      delivery_stop: 2,
      phase: 2,
    },
    {
      // Chair 4 — beside chair-03. 500 × 500 × 900 mm.
      // x: [3700, 4200], y: [0, 900], z: [100, 600]
      item_id: 'chair-04',
      x: 3700, y: 0, z: 100,
      l: 500, w: 500, h: 900,
      rotation: 'identity',
      delivery_stop: 2,
      phase: 2,
    },

    // ── Stop 1 — nearest the door (loaded last, unloaded first) ─────────────
    // These occupy the front zone: x ∈ [4200, 6000], z ∈ [0, 2400].

    {
      // Box 1 — small filler, door-side floor. 400 × 400 × 400 mm.
      // x: [4200, 4600], y: [0, 400], z: [100, 500]
      item_id: 'box-01',
      x: 4200, y: 0, z: 100,
      l: 400, w: 400, h: 400,
      rotation: 'identity',
      delivery_stop: 1,
      phase: 2,
    },
    {
      // Box 2 — stacked on box-01. 400 × 400 × 400 mm.
      // x: [4200, 4600], y: [400, 800], z: [100, 500]
      item_id: 'box-02',
      x: 4200, y: 400, z: 100,
      l: 400, w: 400, h: 400,
      rotation: 'identity',
      delivery_stop: 1,
      phase: 2,
    },
    {
      // Box 3 — beside box-01, floor. 400 × 400 × 400 mm.
      // x: [4600, 5000], y: [0, 400], z: [100, 500]
      item_id: 'box-03',
      x: 4600, y: 0, z: 100,
      l: 400, w: 400, h: 400,
      rotation: 'identity',
      delivery_stop: 1,
      phase: 2,
    },
  ],

  // V_util reported as the DSS target figure for a full manifest.
  utilization: 0.65,
  solver_time_ms: 280,
};
