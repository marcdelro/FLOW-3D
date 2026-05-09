import mockPlanJson from "./mockPlan.json";
import type { PackingPlan } from "../types";

const RATIONALES = {
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
} as const;

// Plan A — Optimal (ILP exact solve, max V_util)
export const mockPlan: PackingPlan = {
  ...(mockPlanJson as Omit<PackingPlan, "strategy" | "rationale">),
  strategy: "optimal",
  rationale: RATIONALES.optimal,
};

// Plan B — Axle Balance (FFD with axle-aware best-fit placement)
const mockPlanB: PackingPlan = {
  v_util: 0.41,
  t_exec_ms: 23,
  solver_mode: "FFD",
  unplaced_items: [],
  strategy: "axle_balance",
  rationale: RATIONALES.axle_balance,
  placements: [
    { item_id: "wardrobe_01",    x: 1200, y: 0,    z: 0, w: 1200, l: 600, h: 1800, orientation_index: 0, stop_id: 3, is_packed: true },
    { item_id: "desk_01",        x: 0,    y: 0,    z: 0, w: 1000, l: 600, h: 750,  orientation_index: 0, stop_id: 3, is_packed: true },
    { item_id: "dining_table_01",x: 0,    y: 600,  z: 0, w: 1500, l: 900, h: 750,  orientation_index: 0, stop_id: 2, is_packed: true },
    { item_id: "sofa_01",        x: 400,  y: 1500, z: 0, w: 2000, l: 900, h: 850,  orientation_index: 0, stop_id: 1, is_packed: true },
    { item_id: "bookshelf_01",   x: 1600, y: 2400, z: 0, w: 800,  l: 300, h: 1800, orientation_index: 0, stop_id: 1, is_packed: true },
  ],
};

// Plan C — Stability (FFD weight-descending; heavies sit deepest within each stop)
const mockPlanC: PackingPlan = {
  v_util: 0.39,
  t_exec_ms: 18,
  solver_mode: "FFD",
  unplaced_items: ["bookshelf_01"],
  strategy: "stability",
  rationale: RATIONALES.stability,
  placements: [
    { item_id: "wardrobe_01",    x: 0,    y: 0,    z: 0, w: 1200, l: 600, h: 1800, orientation_index: 0, stop_id: 3, is_packed: true  },
    { item_id: "desk_01",        x: 1200, y: 0,    z: 0, w: 1000, l: 600, h: 750,  orientation_index: 0, stop_id: 3, is_packed: true  },
    { item_id: "dining_table_01",x: 0,    y: 600,  z: 0, w: 1500, l: 900, h: 750,  orientation_index: 0, stop_id: 2, is_packed: true  },
    { item_id: "sofa_01",        x: 0,    y: 1500, z: 0, w: 2000, l: 900, h: 850,  orientation_index: 0, stop_id: 1, is_packed: true  },
    { item_id: "bookshelf_01",   x: 0,    y: 0,    z: 0, w: 800,  l: 300, h: 1800, orientation_index: 0, stop_id: 1, is_packed: false },
  ],
};

export const mockPlans: PackingPlan[] = [mockPlan, mockPlanB, mockPlanC];
