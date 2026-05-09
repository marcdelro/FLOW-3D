/**
 * TypeScript contract mirroring backend/api/models.py and docs/mockPlan.json.
 * Field names and units match the thesis variable naming in CLAUDE.md exactly.
 */

export interface Placement {
  /** Unique item identifier */
  item_id: string;
  /** x-coordinate in mm — thesis variable x_i */
  x: number;
  /** y-coordinate in mm (truck rear = 0, door = L) — thesis variable y_i */
  y: number;
  /** z-coordinate in mm — thesis variable z_i */
  z: number;
  /** Width in mm — thesis variable w_i */
  w: number;
  /** Length in mm — thesis variable l_i */
  l: number;
  /** Height in mm — thesis variable h_i */
  h: number;
  /** Orientation pose 0-5 */
  orientation_index: number;
  /** Delivery stop id (LIFO key) */
  stop_id: number;
  /** b_i packing status */
  is_packed: boolean;
  /** 0-based index into the CATALOG model array — overrides hash when set */
  model_variant?: number;
}

/** DSS plan-selection strategy — see backend/core/optimizer.py. */
export type SolveStrategy = "optimal" | "axle_balance" | "stability";

export interface PackingPlan {
  placements: Placement[];
  /** V_util in [0, 1] */
  v_util: number;
  /** T_exec in milliseconds */
  t_exec_ms: number;
  solver_mode: "ILP" | "FFD";
  unplaced_items: string[];
  /** DSS strategy that produced this plan */
  strategy: SolveStrategy;
  /** Human-readable justification for choosing this plan */
  rationale: string;
}

export interface FurnitureItem {
  item_id: string;
  /** Width w_i in mm */
  w: number;
  /** Length l_i in mm */
  l: number;
  /** Height h_i in mm */
  h: number;
  weight_kg: number;
  stop_id: number;
  /** If true, restricts orientation_index to upright poses */
  side_up: boolean;
  /** 0-based index into the CATALOG model array for this category */
  model_variant?: number;
  /** Item is packed inside a cardboard box — viewer renders box wrapper around model */
  boxed?: boolean;
  /** Fragile — may not be stacked against; requires protective wrapping */
  fragile?: boolean;
}

export interface TruckSpec {
  /** Internal width W in mm */
  W: number;
  /** Internal length L in mm */
  L: number;
  /** Internal height H in mm */
  H: number;
  payload_kg: number;
}

export interface DeliveryStop {
  stop_id: number;
  address: string;
}

export interface SolveRequest {
  items: FurnitureItem[];
  truck: TruckSpec;
  stops: DeliveryStop[];
  /** DSS strategy; defaults to "optimal" server-side when omitted */
  strategy?: SolveStrategy;
}
