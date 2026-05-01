import * as XLSX from "xlsx";

import type { DeliveryStop, FurnitureItem, TruckSpec } from "../types";

/**
 * Cross-format manifest import for the FLOW-3D DSS.
 *
 *   - .json : a single object {truck, stops, items} mirroring SolveRequest.
 *   - .xlsx / .xls : a workbook with three sheets named "Truck", "Stops",
 *     "Items" (case-insensitive). Each sheet's first row is the header.
 *
 * Returns whatever subset of {truck, stops, items} the file contained, plus
 * any non-fatal warnings (unrecognised columns, dropped rows, etc.) so the
 * UI can show a digest to the user instead of silently swallowing data.
 */
export interface ImportedManifest {
  truck?: TruckSpec;
  stops?: DeliveryStop[];
  items?: FurnitureItem[];
  warnings: string[];
}

const TRUCK_KEYS = ["Truck", "TRUCK", "truck", "TruckSpec"];
const STOP_KEYS  = ["Stops", "STOPS", "stops", "DeliveryStops"];
const ITEM_KEYS  = ["Items", "ITEMS", "items", "Cargo", "FurnitureItems"];

function findSheet(wb: XLSX.WorkBook, candidates: string[]): string | null {
  const lower = wb.SheetNames.map((n) => n.toLowerCase());
  for (const c of candidates) {
    const idx = lower.indexOf(c.toLowerCase());
    if (idx >= 0) return wb.SheetNames[idx];
  }
  return null;
}

function num(v: unknown, fallback = 0): number {
  if (typeof v === "number" && !Number.isNaN(v)) return v;
  if (typeof v === "string" && v.trim() !== "") {
    const n = Number(v);
    if (!Number.isNaN(n)) return n;
  }
  return fallback;
}

function bool(v: unknown): boolean {
  if (typeof v === "boolean") return v;
  if (typeof v === "number")  return v !== 0;
  if (typeof v === "string") {
    const s = v.trim().toLowerCase();
    return s === "true" || s === "yes" || s === "y" || s === "1";
  }
  return false;
}

function rowToItem(row: Record<string, unknown>): FurnitureItem | null {
  const id = String(row.item_id ?? row.ID ?? row.id ?? "").trim();
  if (!id) return null;
  const w = Math.max(1, num(row.w ?? row.W ?? row.width));
  const l = Math.max(1, num(row.l ?? row.L ?? row.length));
  const h = Math.max(1, num(row.h ?? row.H ?? row.height));
  const stop_id = Math.max(1, num(row.stop_id ?? row.stop ?? row.Stop ?? 1, 1));
  return {
    item_id:   id,
    w, l, h,
    weight_kg: num(row.weight_kg ?? row.weight ?? row.Weight ?? 0),
    stop_id,
    side_up:   bool(row.side_up ?? row.SideUp),
    boxed:     bool(row.boxed ?? row.Boxed),
    fragile:   bool(row.fragile ?? row.Fragile),
    model_variant:
      row.model_variant !== undefined && row.model_variant !== ""
        ? num(row.model_variant)
        : undefined,
  };
}

function rowToStop(row: Record<string, unknown>): DeliveryStop | null {
  const sid = num(row.stop_id ?? row.stop ?? row.Stop ?? row.id, NaN);
  if (Number.isNaN(sid) || sid < 1) return null;
  return {
    stop_id: Math.round(sid),
    address: String(row.address ?? row.Address ?? "").trim(),
  };
}

function rowToTruck(row: Record<string, unknown>): TruckSpec {
  return {
    W: Math.max(1, num(row.W ?? row.width  ?? row.Width,  2400)),
    L: Math.max(1, num(row.L ?? row.length ?? row.Length, 13600)),
    H: Math.max(1, num(row.H ?? row.height ?? row.Height, 2440)),
    payload_kg: num(row.payload_kg ?? row.payload ?? row.Payload, 3000),
  };
}

export async function importManifestFile(file: File): Promise<ImportedManifest> {
  const warnings: string[] = [];
  const name = file.name.toLowerCase();

  if (name.endsWith(".json")) {
    const text = await file.text();
    let data: unknown;
    try { data = JSON.parse(text); }
    catch (e) { throw new Error(`Invalid JSON: ${(e as Error).message}`); }

    if (!data || typeof data !== "object") throw new Error("JSON root must be an object.");
    const root = data as Record<string, unknown>;

    const result: ImportedManifest = { warnings };
    if (root.truck && typeof root.truck === "object") {
      result.truck = rowToTruck(root.truck as Record<string, unknown>);
    }
    if (Array.isArray(root.stops)) {
      result.stops = (root.stops as Record<string, unknown>[])
        .map(rowToStop)
        .filter((s): s is DeliveryStop => s !== null);
      if (result.stops.length !== (root.stops as unknown[]).length) {
        warnings.push("Some stop rows were dropped (missing stop_id).");
      }
    }
    if (Array.isArray(root.items)) {
      result.items = (root.items as Record<string, unknown>[])
        .map(rowToItem)
        .filter((it): it is FurnitureItem => it !== null);
      if (result.items.length !== (root.items as unknown[]).length) {
        warnings.push("Some item rows were dropped (missing item_id).");
      }
    }
    return result;
  }

  if (name.endsWith(".xlsx") || name.endsWith(".xls")) {
    const buf = await file.arrayBuffer();
    const wb  = XLSX.read(buf, { type: "array" });
    const result: ImportedManifest = { warnings };

    const truckSheet = findSheet(wb, TRUCK_KEYS);
    if (truckSheet) {
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(wb.Sheets[truckSheet]);
      if (rows.length > 0) result.truck = rowToTruck(rows[0]);
      else warnings.push(`Sheet "${truckSheet}" is empty — truck spec ignored.`);
    }

    const stopsSheet = findSheet(wb, STOP_KEYS);
    if (stopsSheet) {
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(wb.Sheets[stopsSheet]);
      const parsed = rows.map(rowToStop).filter((s): s is DeliveryStop => s !== null);
      result.stops = parsed;
      if (parsed.length !== rows.length) {
        warnings.push(`Dropped ${rows.length - parsed.length} stop row(s) without stop_id.`);
      }
    }

    const itemsSheet = findSheet(wb, ITEM_KEYS);
    if (itemsSheet) {
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(wb.Sheets[itemsSheet]);
      const parsed = rows.map(rowToItem).filter((i): i is FurnitureItem => i !== null);
      result.items = parsed;
      if (parsed.length !== rows.length) {
        warnings.push(`Dropped ${rows.length - parsed.length} item row(s) without item_id.`);
      }
    }

    if (!truckSheet && !stopsSheet && !itemsSheet) {
      throw new Error('Workbook contains none of the expected sheets ("Truck", "Stops", "Items").');
    }
    return result;
  }

  throw new Error(`Unsupported file type: ${file.name}. Use .xlsx, .xls, or .json.`);
}

/**
 * Builds a starter .xlsx the user can fill in and re-upload. Lives here so
 * the UI doesn't need to know the column layout.
 */
export function downloadManifestTemplate(): void {
  const wb = XLSX.utils.book_new();

  const truck = XLSX.utils.json_to_sheet([
    { W: 2400, L: 13600, H: 2440, payload_kg: 3000 },
  ]);
  XLSX.utils.book_append_sheet(wb, truck, "Truck");

  const stops = XLSX.utils.json_to_sheet([
    { stop_id: 1, address: "123 Quezon Ave, Manila" },
    { stop_id: 2, address: "456 Ortigas Ave, Pasig" },
  ]);
  XLSX.utils.book_append_sheet(wb, stops, "Stops");

  const items = XLSX.utils.json_to_sheet([
    {
      item_id: "sofa_01", w: 2000, l: 900, h: 850,
      weight_kg: 80, stop_id: 1, side_up: false, boxed: false, fragile: false,
    },
    {
      item_id: "refrigerator_01", w: 700, l: 700, h: 1800,
      weight_kg: 80, stop_id: 1, side_up: true, boxed: true, fragile: true,
    },
  ]);
  XLSX.utils.book_append_sheet(wb, items, "Items");

  XLSX.writeFile(wb, "flow3d_manifest_template.xlsx");
}
