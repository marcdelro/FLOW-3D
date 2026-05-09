/**
 * Frontend plan builder — generates PackingPlan results from a SolveRequest
 * without hitting the backend. Used when VITE_USE_MOCK is not "false".
 *
 * Mirrors backend/core/optimizer.py at the contract level:
 *   optimal      — ILP if n <= SOLVER_THRESHOLD else FFD; densest row-pack.
 *   axle_balance — FFD with axle-aware best-fit; centres mass at L/2.
 *   stability    — FFD weight-desc; centred along X for low lateral CG.
 *
 * All three plans respect Route-Sequenced LIFO (thesis 3.5.2.1 E): higher
 * stop_id values sit deeper along Y so they unload last.
 */

import type {
  FurnitureItem,
  PackingPlan,
  Placement,
  SolveRequest,
  SolveStrategy,
  TruckSpec,
} from "../types";

/** Mirrors backend/settings.py SOLVER_THRESHOLD. */
const SOLVER_THRESHOLD = 20;

const ORIENT_NATURAL = 0;
const ORIENT_ROTATED = 1;

const RATIONALES: Record<SolveStrategy, string> = {
  optimal:
    "Maximum volumetric utilization via exact ILP. Choose this plan when " +
    "minimizing trips and fuel cost matters most — the solver provably " +
    "finds the densest LIFO-feasible packing for the given manifest.",
  axle_balance:
    "FFD with axle-aware best-fit placement — distributes mass along the " +
    "cargo bay so front and rear axles share load evenly. Choose this " +
    "plan to keep individual-axle weight within LTO regulatory limits " +
    "and reduce drive-axle wear on long runs.",
  stability:
    "FFD with weight-descending presort — heavy items go in first and " +
    "settle at the bottom of the load. Choose this plan for fragile " +
    "cargo, rough roads, or long highway transit where a low center of " +
    "gravity reduces shifting damage.",
};

function calcUtil(placements: Placement[], truck: TruckSpec): number {
  const truckVol = truck.W * truck.L * truck.H;
  if (truckVol === 0) return 0;
  const packedVol = placements
    .filter((p) => p.is_packed)
    .reduce((s, p) => s + p.w * p.l * p.h, 0);
  return Math.min(1, packedVol / truckVol);
}

function unplacedEntry(item: FurnitureItem): Placement {
  return {
    item_id: item.item_id,
    x: 0, y: 0, z: 0,
    w: item.w, l: item.l, h: item.h,
    orientation_index: ORIENT_NATURAL,
    stop_id: item.stop_id,
    is_packed: false,
    model_variant: item.model_variant,
  };
}

/** Group items by stop_id, returning [stop_id, items] entries with stops in
 *  LIFO load order: highest stop_id first (loaded first → sits at the rear). */
function groupByStopLifo(
  items: FurnitureItem[],
): Array<[number, FurnitureItem[]]> {
  const groups = new Map<number, FurnitureItem[]>();
  for (const it of items) {
    const g = groups.get(it.stop_id) ?? [];
    g.push(it);
    groups.set(it.stop_id, g);
  }
  return [...groups.entries()].sort((a, b) => b[0] - a[0]);
}

/**
 * OPTIMAL — row-packed: within each stop, items tile along X within a Y-band,
 * advancing Y only when the next item won't fit in the current row. Models the
 * density advantage that an ILP would exploit for small manifests.
 */
function buildOptimalPlan(
  items: FurnitureItem[],
  truck: TruckSpec,
  execMs: number,
): PackingPlan {
  const placements: Placement[] = [];
  const unplaced: string[] = [];
  let curY = 0;

  for (const [, group] of groupByStopLifo(items)) {
    // Volume-desc inside the stop so largest item anchors the row
    const sorted = [...group].sort(
      (a, b) => b.w * b.l * b.h - a.w * a.l * a.h,
    );

    let rowX = 0;
    let rowMaxL = 0;

    for (const item of sorted) {
      let { w, l, h } = item;
      let orientIdx = ORIENT_NATURAL;
      // Rotate 90° around Z when the item is too wide for the truck but its
      // length would fit — non-side_up items only.
      if (w > truck.W && !item.side_up && l <= truck.W) {
        [w, l] = [l, w];
        orientIdx = ORIENT_ROTATED;
      }

      // Wrap to a new row if the item won't fit beside what's already there.
      if (rowX > 0 && rowX + w > truck.W) {
        curY += rowMaxL;
        rowX = 0;
        rowMaxL = 0;
      }

      if (w > truck.W || h > truck.H || curY + l > truck.L) {
        unplaced.push(item.item_id);
        placements.push(unplacedEntry(item));
        continue;
      }

      placements.push({
        item_id: item.item_id,
        x: rowX, y: curY, z: 0,
        w, l, h,
        orientation_index: orientIdx,
        stop_id: item.stop_id,
        is_packed: true,
        model_variant: item.model_variant,
      });
      rowX += w;
      rowMaxL = Math.max(rowMaxL, l);
    }

    // Close out the stop's last row
    if (rowMaxL > 0) {
      curY += rowMaxL;
    }
  }

  // Honor the hybrid dispatch contract: ILP only when n <= SOLVER_THRESHOLD
  const solverMode: "ILP" | "FFD" =
    items.length <= SOLVER_THRESHOLD ? "ILP" : "FFD";

  return {
    placements,
    v_util: calcUtil(placements, truck),
    t_exec_ms: execMs,
    solver_mode: solverMode,
    unplaced_items: unplaced,
    strategy: "optimal",
    rationale: RATIONALES.optimal,
  };
}

/**
 * AXLE BALANCE — places each item in LIFO-feasible y-order but shifts the
 * whole packing toward the cargo midpoint (truck.L / 2) so the cumulative
 * y-CoG is centred. Mock-side approximation: lay items down compactly,
 * then translate every placed item by (L/2 - centroid_of_packing) along Y.
 *
 * This produces a layout that sits in the middle of the cargo bay rather
 * than flush at one end — visually distinct from the y=0-flush layouts
 * the other two strategies produce.
 */
function buildAxleBalancePlan(
  items: FurnitureItem[],
  truck: TruckSpec,
  execMs: number,
): PackingPlan {
  // Phase 1: same compact LIFO placement as Stability/Optimal so we have a
  // valid layout to work from. Heaviest first inside each stop so when we
  // shift, the heavy items dominate the new centroid.
  const placements: Placement[] = [];
  const unplaced: string[] = [];
  let curY = 0;

  for (const [, group] of groupByStopLifo(items)) {
    const sorted = [...group].sort((a, b) => b.weight_kg - a.weight_kg);
    for (const item of sorted) {
      const { w, l, h } = item;
      if (w > truck.W || h > truck.H || curY + l > truck.L) {
        unplaced.push(item.item_id);
        placements.push(unplacedEntry(item));
        continue;
      }
      placements.push({
        item_id: item.item_id,
        x: 0, y: curY, z: 0,
        w, l, h,
        orientation_index: ORIENT_NATURAL,
        stop_id: item.stop_id,
        is_packed: true,
        model_variant: item.model_variant,
      });
      curY += l;
    }
  }

  // Phase 2: weighted y-CoG of the current packing.
  const itemsById = new Map(items.map((i) => [i.item_id, i]));
  let totalW = 0;
  let weightedY = 0;
  for (const p of placements) {
    if (!p.is_packed) continue;
    const w = itemsById.get(p.item_id)?.weight_kg ?? 0;
    totalW    += w;
    weightedY += w * (p.y + p.l / 2);
  }
  const cogY     = totalW > 0 ? weightedY / totalW : truck.L / 2;
  const targetY  = truck.L / 2;
  let   shift    = Math.round(targetY - cogY);

  // Clamp the shift so no item goes outside the truck after translation.
  const minY = Math.min(...placements.filter((p) => p.is_packed).map((p) => p.y));
  const maxYEnd = Math.max(...placements.filter((p) => p.is_packed).map((p) => p.y + p.l));
  shift = Math.max(shift, -minY);                 // can't push past y=0
  shift = Math.min(shift, truck.L - maxYEnd);     // can't push past y=L

  for (const p of placements) {
    if (p.is_packed) p.y += shift;
  }

  return {
    placements,
    v_util: calcUtil(placements, truck),
    t_exec_ms: execMs,
    solver_mode: "FFD",
    unplaced_items: unplaced,
    strategy: "axle_balance",
    rationale: RATIONALES.axle_balance,
  };
}

/**
 * STABILITY — weight-desc inside each stop (heaviest first) and X-centered to
 * minimize lateral center-of-gravity offset. Distinct from Axle Balance: this
 * shifts mass on the X-axis (lateral) while Axle Balance shifts on Y
 * (longitudinal).
 */
function buildStabilityPlan(
  items: FurnitureItem[],
  truck: TruckSpec,
  execMs: number,
): PackingPlan {
  const placements: Placement[] = [];
  const unplaced: string[] = [];
  let curY = 0;

  for (const [, group] of groupByStopLifo(items)) {
    const sorted = [...group].sort((a, b) => b.weight_kg - a.weight_kg);

    for (const item of sorted) {
      const { w, l, h } = item;
      if (w > truck.W || h > truck.H || curY + l > truck.L) {
        unplaced.push(item.item_id);
        placements.push(unplacedEntry(item));
        continue;
      }
      // Center along X — heaviest mass on the truck's longitudinal axis.
      const x = Math.max(0, Math.floor((truck.W - w) / 2));
      placements.push({
        item_id: item.item_id,
        x, y: curY, z: 0,
        w, l, h,
        orientation_index: ORIENT_NATURAL,
        stop_id: item.stop_id,
        is_packed: true,
        model_variant: item.model_variant,
      });
      curY += l;
    }
  }

  return {
    placements,
    v_util: calcUtil(placements, truck),
    t_exec_ms: execMs,
    solver_mode: "FFD",
    unplaced_items: unplaced,
    strategy: "stability",
    rationale: RATIONALES.stability,
  };
}

/** Build three alternative packing plans from the user's SolveRequest. */
export function buildPlansFromRequest(req: SolveRequest): PackingPlan[] {
  const t0 = performance.now();
  const optimal = buildOptimalPlan(req.items, req.truck, 0);
  optimal.t_exec_ms = Math.max(1, Math.round(performance.now() - t0));

  const axleBalance = buildAxleBalancePlan(req.items, req.truck, 18);
  const stability   = buildStabilityPlan(req.items, req.truck, 21);

  return [optimal, axleBalance, stability];
}
