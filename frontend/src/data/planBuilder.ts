/**
 * Frontend plan builder — generates PackingPlan results from a SolveRequest
 * without hitting the backend. Used when VITE_USE_MOCK is not "false".
 *
 * All three plans respect LIFO (thesis 3.5.2.1 E): items are sorted by
 * stop_id descending so higher stop numbers sit deeper (lower y_i values).
 */

import type {
  FurnitureItem,
  PackingPlan,
  Placement,
  SolveRequest,
  TruckSpec,
} from "../types";

// Orientation 0 = (w, l, h) natural; 1 = (l, w, h) — 90° rotation around Z
const ORIENT_NATURAL = 0;
const ORIENT_ROTATED = 1;

function lifoSort(items: FurnitureItem[]): FurnitureItem[] {
  return [...items].sort((a, b) =>
    b.stop_id !== a.stop_id
      ? b.stop_id - a.stop_id
      : b.w * b.l * b.h - a.w * a.l * a.h,
  );
}

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

/**
 * Plan A — linear sequential placement along the Y axis, natural orientation.
 * Items are sorted LIFO then placed one after another (rear → door).
 */
function buildLinearPlan(
  items: FurnitureItem[],
  truck: TruckSpec,
  mode: "ILP" | "FFD",
  execMs: number,
): PackingPlan {
  const sorted = lifoSort(items);
  const placements: Placement[] = [];
  const unplaced: string[] = [];
  let curY = 0;

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

  return {
    placements,
    v_util: calcUtil(placements, truck),
    t_exec_ms: execMs,
    solver_mode: mode,
    unplaced_items: unplaced,
  };
}

/**
 * Plan B — same LIFO sort but each item is rotated 90° around Z (swap w/l)
 * when that reduces the depth consumed along Y, fitting more cargo.
 * Respects side_up flag (upright items cannot be rotated this way).
 */
function buildRotatedPlan(
  items: FurnitureItem[],
  truck: TruckSpec,
  execMs: number,
): PackingPlan {
  const sorted = lifoSort(items);
  const placements: Placement[] = [];
  const unplaced: string[] = [];
  let curY = 0;

  for (const item of sorted) {
    // Choose the orientation that uses less Y depth while still fitting truck W
    let w = item.w, l = item.l, h = item.h, orientIdx = ORIENT_NATURAL;
    if (!item.side_up && item.l > item.w && item.l <= truck.W) {
      // Rotating saves Y depth (shorter dimension becomes l_i)
      w = item.l; l = item.w; orientIdx = ORIENT_ROTATED;
    }

    if (w > truck.W || h > truck.H || curY + l > truck.L) {
      unplaced.push(item.item_id);
      placements.push(unplacedEntry(item));
      continue;
    }
    placements.push({
      item_id: item.item_id,
      x: 0, y: curY, z: 0,
      w, l, h,
      orientation_index: orientIdx,
      stop_id: item.stop_id,
      is_packed: true,
      model_variant: item.model_variant,
    });
    curY += l;
  }

  return {
    placements,
    v_util: calcUtil(placements, truck),
    t_exec_ms: execMs,
    solver_mode: "FFD",
    unplaced_items: unplaced,
  };
}

/**
 * Plan C — row-based packing: items within the same stop group are placed
 * side-by-side along X before advancing Y. Stop groups are still processed
 * in descending order to maintain LIFO.
 */
function buildRowPlan(
  items: FurnitureItem[],
  truck: TruckSpec,
  execMs: number,
): PackingPlan {
  // Group by stop_id, process stops highest → lowest (LIFO)
  const stopGroups = new Map<number, FurnitureItem[]>();
  for (const item of items) {
    const g = stopGroups.get(item.stop_id) ?? [];
    g.push(item);
    stopGroups.set(item.stop_id, g);
  }
  const stopIds = [...stopGroups.keys()].sort((a, b) => b - a);

  const placements: Placement[] = [];
  const unplaced: string[] = [];
  let curY = 0;

  for (const sid of stopIds) {
    const group = [...(stopGroups.get(sid) ?? [])].sort(
      (a, b) => b.w * b.l * b.h - a.w * a.l * a.h,
    );

    let rowX = 0;
    let rowMaxL = 0;

    for (const item of group) {
      const { w, l, h } = item;

      // Start a new row if item doesn't fit along X
      if (rowX + w > truck.W) {
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
        orientation_index: ORIENT_NATURAL,
        stop_id: item.stop_id,
        is_packed: true,
        model_variant: item.model_variant,
      });
      rowX += w;
      rowMaxL = Math.max(rowMaxL, l);
    }

    // Advance past this stop group's rows
    if (rowMaxL > 0) curY += rowMaxL;
  }

  return {
    placements,
    v_util: calcUtil(placements, truck),
    t_exec_ms: execMs,
    solver_mode: "FFD",
    unplaced_items: unplaced,
  };
}

/** Build three alternative packing plans from the user's SolveRequest. */
export function buildPlansFromRequest(req: SolveRequest): PackingPlan[] {
  const t0 = performance.now();
  const planA = buildLinearPlan(req.items, req.truck, "ILP", 0);
  planA.t_exec_ms = Math.round(performance.now() - t0);

  const planB = buildRotatedPlan(req.items, req.truck, 24);
  const planC = buildRowPlan(req.items, req.truck, 16);

  return [planA, planB, planC];
}
