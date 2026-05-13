import type { FurnitureItem, PackingPlan, Placement, TruckSpec } from "../types";

/**
 * Naive grid placement preview — NOT the real solver.
 *
 * Walks items in input order and places each at the next free X position,
 * wrapping by row along Y, then by layer along Z. No LIFO, no orientation
 * search, no fragility handling. Its only job is to render a live preview
 * of what the user has typed in before they click Solve Packing Plan.
 */
export function buildPreviewPlan(
  items: FurnitureItem[],
  truck: TruckSpec,
): PackingPlan {
  const placements: Placement[] = [];
  const unplaced: string[] = [];

  let cursorX = 0;
  let cursorY = 0;
  let cursorZ = 0;
  let rowDepth = 0;
  let layerHeight = 0;

  for (const item of items) {
    const { w, l, h } = item;

    if (w > truck.W || l > truck.L || h > truck.H) {
      unplaced.push(item.item_id);
      continue;
    }

    if (cursorX + w > truck.W) {
      cursorY += rowDepth;
      cursorX = 0;
      rowDepth = 0;
    }
    if (cursorY + l > truck.L) {
      cursorZ += layerHeight;
      cursorY = 0;
      cursorX = 0;
      rowDepth = 0;
      layerHeight = 0;
    }
    if (cursorZ + h > truck.H) {
      unplaced.push(item.item_id);
      continue;
    }

    placements.push({
      item_id: item.item_id,
      x: cursorX,
      y: cursorY,
      z: cursorZ,
      w,
      l,
      h,
      orientation_index: 0,
      stop_id: item.stop_id,
      is_packed: true,
      model_variant: item.model_variant,
    });

    cursorX += w;
    if (l > rowDepth) rowDepth = l;
    if (h > layerHeight) layerHeight = h;
  }

  const truckVol = truck.W * truck.L * truck.H;
  const packedVol = placements.reduce((s, p) => s + p.w * p.l * p.h, 0);

  return {
    placements,
    v_util: truckVol > 0 ? packedVol / truckVol : 0,
    t_exec_ms: 0,
    solver_mode: "FFD",
    unplaced_items: unplaced,
    strategy: "optimal",
    rationale:
      "Preview only — items shown in input order without LIFO or constraint optimisation. Click Solve Packing Plan to run the real engine.",
  };
}
