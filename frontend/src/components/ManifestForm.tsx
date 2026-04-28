import type { ReactNode } from "react";
import { useState } from "react";

import type {
  DeliveryStop,
  FurnitureItem,
  SolveRequest,
  TruckSpec,
} from "../types";
import {
  FURNITURE_DEFAULTS,
  FURNITURE_OPTIONS,
} from "../data/modelCatalog";

// ── Palette (mirrors tailwind.config stop colours) ────────────────────────────
const STOP_BADGE: Record<number, string> = {
  1: "#F0997B",
  2: "#5DCAA5",
  3: "#AFA9EC",
  4: "#60A5FA",
  5: "#FBBF24",
  6: "#F472B6",
};
const badgeColor = (id: number) => STOP_BADGE[id] ?? "#888780";

// ── Defaults ──────────────────────────────────────────────────────────────────
const DEFAULT_TRUCK: TruckSpec = { W: 2400, L: 13600, H: 2440, payload_kg: 3000 };

const DEFAULT_STOPS: DeliveryStop[] = [
  { stop_id: 1, address: "123 Quezon Ave, Manila" },
  { stop_id: 2, address: "456 Ortigas Ave, Pasig" },
  { stop_id: 3, address: "789 EDSA, Makati" },
];

const blankItem = (): FurnitureItem => ({
  item_id: "", w: 800, l: 600, h: 1000, weight_kg: 30, stop_id: 1, side_up: false,
});

// ── Shared micro-styles ────────────────────────────────────────────────────────
const inputCls =
  "w-full bg-gray-900 border border-gray-700 rounded px-2 py-1 text-xs text-gray-100 " +
  "focus:outline-none focus:border-blue-600 font-mono placeholder-gray-700";
const labelCls = "block text-xs text-gray-500 mb-1";

// ── Section header (sticky within the scrollable sidebar) ─────────────────────
function Section({
  title,
  badge,
  children,
}: {
  title: string;
  badge?: number;
  children: ReactNode;
}) {
  return (
    <>
      <div className="flex items-center justify-between px-4 py-2 border-b border-gray-800 bg-gray-950 sticky top-0 z-10">
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
          {title}
        </span>
        {badge !== undefined && (
          <span className="text-xs font-mono text-gray-700">{badge}</span>
        )}
      </div>
      <div className="px-4 py-3">{children}</div>
    </>
  );
}

// ── Add-Item inline form ───────────────────────────────────────────────────────
function AddItemForm({
  value,
  stops,
  existingIds,
  error,
  onChange,
  onConfirm,
  onCancel,
}: {
  value: FurnitureItem;
  stops: DeliveryStop[];
  existingIds: string[];
  error: string | null;
  onChange: (v: FurnitureItem) => void;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const [selectedPrefix, setSelectedPrefix] = useState("");

  function set<K extends keyof FurnitureItem>(k: K, v: FurnitureItem[K]) {
    onChange({ ...value, [k]: v });
  }

  function handlePrefixChange(prefix: string) {
    setSelectedPrefix(prefix);
    if (!prefix) {
      onChange({ ...value, item_id: "" });
      return;
    }
    // Find the smallest unused numeric suffix for this prefix
    const pattern = new RegExp(`^${prefix}_(\\d+)$`);
    const used = existingIds
      .map((id) => pattern.exec(id.toLowerCase())?.[1])
      .filter(Boolean)
      .map(Number);
    let n = 1;
    while (used.includes(n)) n++;
    const newId = `${prefix}_${String(n).padStart(2, "0")}`;
    const def = FURNITURE_DEFAULTS[prefix];
    onChange({ ...value, item_id: newId, ...(def ?? {}) });
  }

  return (
    <div className="border border-gray-700 rounded p-3 space-y-2 bg-gray-900/30">
      {/* Furniture type dropdown grouped by category */}
      <div>
        <label className={labelCls}>Furniture Type</label>
        <select
          className={`${inputCls} cursor-pointer`}
          value={selectedPrefix}
          // eslint-disable-next-line jsx-a11y/no-autofocus
          autoFocus
          onChange={(e) => handlePrefixChange(e.target.value)}
        >
          <option value="">— select furniture type —</option>
          {FURNITURE_OPTIONS.map((group) => (
            <optgroup key={group.folder} label={group.categoryLabel}>
              {group.items.map((item) => (
                <option key={item.prefix} value={item.prefix}>
                  {item.label}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      </div>

      {/* Auto-generated item ID badge */}
      {value.item_id && (
        <div className="flex items-center gap-1.5 py-0.5">
          <span className="text-xs text-gray-600">ID:</span>
          <span className="font-mono text-xs text-blue-400 bg-blue-950/40 border border-blue-900/40 px-2 py-0.5 rounded">
            {value.item_id}
          </span>
        </div>
      )}

      <div className="grid grid-cols-3 gap-2">
        {(["w", "l", "h"] as const).map((k) => (
          <div key={k}>
            <label className={labelCls}>{k.toUpperCase()} (mm)</label>
            <input
              className={inputCls}
              type="number"
              min={1}
              value={value[k]}
              onChange={(e) =>
                set(k, Math.max(1, parseInt(e.target.value) || 1))
              }
            />
          </div>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-2 items-end">
        <div>
          <label className={labelCls}>Weight (kg)</label>
          <input
            className={inputCls}
            type="number"
            min={0}
            step={1}
            value={value.weight_kg}
            onChange={(e) => set("weight_kg", parseFloat(e.target.value) || 0)}
          />
        </div>
        <div>
          <label className={labelCls}>Stop</label>
          <select
            className={`${inputCls} cursor-pointer`}
            value={value.stop_id}
            onChange={(e) => set("stop_id", parseInt(e.target.value))}
          >
            {stops.map((s) => (
              <option key={s.stop_id} value={s.stop_id}>
                Stop {s.stop_id}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2 pb-0.5">
          <input
            id="new_side_up"
            type="checkbox"
            className="accent-blue-500 cursor-pointer"
            checked={value.side_up}
            onChange={(e) => set("side_up", e.target.checked)}
          />
          <label htmlFor="new_side_up" className={`${labelCls} mb-0 cursor-pointer`}>
            Side Up
          </label>
        </div>
      </div>

      {error && <p className="text-xs text-red-400">{error}</p>}

      <div className="flex gap-2 pt-1">
        <button
          onClick={onCancel}
          className="flex-1 py-1.5 text-xs rounded border border-gray-700 text-gray-400 hover:bg-gray-800 transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={onConfirm}
          className="flex-1 py-1.5 text-xs rounded bg-blue-700 hover:bg-blue-600 text-white font-medium transition-colors"
        >
          Add
        </button>
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────
interface ManifestFormProps {
  onSolve: (req: SolveRequest) => void;
  loading: boolean;
}

export function ManifestForm({ onSolve, loading }: ManifestFormProps) {
  const [truck, setTruck]   = useState<TruckSpec>(DEFAULT_TRUCK);
  const [stops, setStops]   = useState<DeliveryStop[]>(DEFAULT_STOPS);
  const [items, setItems]   = useState<FurnitureItem[]>([]);
  const [draft, setDraft]   = useState<FurnitureItem>(blankItem());
  const [showAdd, setShowAdd]   = useState(false);
  const [itemError, setItemError] = useState<string | null>(null);

  // Theoretical packing density info
  const truckVol = (truck.W * truck.L * truck.H) / 1e9;
  const itemsVol = items.reduce((s, it) => s + (it.w * it.l * it.h) / 1e9, 0);
  const theoPct  = truckVol > 0 ? Math.round((itemsVol / truckVol) * 100) : 0;

  // ── Truck field updater ──
  function setTruckField(k: keyof TruckSpec, v: number) {
    setTruck((t) => ({ ...t, [k]: v }));
  }

  // ── Stop helpers ──
  function addStop() {
    const next = stops.length ? Math.max(...stops.map((s) => s.stop_id)) + 1 : 1;
    setStops((s) => [...s, { stop_id: next, address: "" }]);
  }

  function removeStop(idx: number) {
    const removed = stops[idx].stop_id;
    setStops((s) => s.filter((_, i) => i !== idx));
    setItems((its) => its.filter((it) => it.stop_id !== removed));
  }

  // ── Item helpers ──
  function commitAdd() {
    setItemError(null);
    if (!draft.item_id.trim())
      return setItemError("Select a furniture type.");
    if (items.some((it) => it.item_id === draft.item_id.trim()))
      return setItemError("Item ID must be unique.");
    if (draft.w <= 0 || draft.l <= 0 || draft.h <= 0)
      return setItemError("All dimensions must be > 0.");
    if (!stops.some((s) => s.stop_id === draft.stop_id))
      return setItemError("Stop ID does not exist in the stop list.");
    setItems((its) => [...its, { ...draft, item_id: draft.item_id.trim() }]);
    setDraft(blankItem());
    setShowAdd(false);
  }

  function cancelAdd() {
    setShowAdd(false);
    setItemError(null);
    setDraft(blankItem());
  }

  return (
    <div className="flex flex-col pb-4">
      {/* ── Truck Spec ─────────────────────────────────────────────────────── */}
      <Section title="Truck Specification">
        <div className="grid grid-cols-2 gap-2 mb-2">
          {(["W", "L", "H"] as const).map((k) => (
            <div key={k}>
              <label className={labelCls}>
                {k === "W" ? "Width" : k === "L" ? "Length" : "Height"} (mm)
              </label>
              <input
                type="number"
                className={inputCls}
                min={1}
                value={truck[k]}
                onChange={(e) =>
                  setTruckField(k, Math.max(1, parseInt(e.target.value) || 1))
                }
              />
            </div>
          ))}
          <div>
            <label className={labelCls}>Payload (kg)</label>
            <input
              type="number"
              className={inputCls}
              min={0}
              step={100}
              value={truck.payload_kg}
              onChange={(e) =>
                setTruckField("payload_kg", parseFloat(e.target.value) || 0)
              }
            />
          </div>
        </div>
        <div className="text-xs text-gray-700 font-mono bg-gray-900/40 rounded px-2 py-1">
          Vol:&nbsp;{truckVol.toFixed(2)}&nbsp;m³ &nbsp;·&nbsp; Cargo:&nbsp;~{theoPct}%&nbsp;theoretical
        </div>
      </Section>

      {/* ── Delivery Stops ─────────────────────────────────────────────────── */}
      <Section title="Delivery Stops" badge={stops.length}>
        <div className="space-y-2 mb-2">
          {stops.map((stop, i) => (
            <div key={stop.stop_id} className="flex items-center gap-2">
              <span
                className="w-5 h-5 rounded text-xs font-bold flex items-center justify-center shrink-0 text-gray-950 leading-none"
                style={{ backgroundColor: badgeColor(stop.stop_id) }}
              >
                {stop.stop_id}
              </span>
              <input
                className={`${inputCls} flex-1 min-w-0`}
                type="text"
                placeholder="Address"
                value={stop.address}
                onChange={(e) =>
                  setStops((s) =>
                    s.map((x, j) =>
                      j === i ? { ...x, address: e.target.value } : x,
                    ),
                  )
                }
              />
              {stops.length > 1 && (
                <button
                  onClick={() => removeStop(i)}
                  title="Remove stop"
                  className="text-gray-700 hover:text-red-400 transition-colors text-xs shrink-0"
                >
                  ✕
                </button>
              )}
            </div>
          ))}
        </div>
        <button
          onClick={addStop}
          className="w-full text-xs text-gray-600 hover:text-gray-300 border border-dashed border-gray-800 hover:border-gray-600 rounded py-1.5 transition-colors"
        >
          + Add Stop
        </button>
        <p className="text-xs text-gray-700 mt-2">
          Stop&nbsp;1&nbsp;=&nbsp;first delivery (near door). Higher&nbsp;#&nbsp;=&nbsp;deeper in truck&nbsp;(LIFO).
        </p>
      </Section>

      {/* ── Cargo Items ────────────────────────────────────────────────────── */}
      <Section title="Cargo Items" badge={items.length}>
        {items.length > 0 && (
          <div className="rounded border border-gray-800 overflow-hidden mb-2">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-gray-900 text-gray-600">
                  <th className="text-left px-2 py-1.5 font-medium">ID</th>
                  <th className="text-right px-2 py-1.5 font-medium whitespace-nowrap">
                    W×L×H
                  </th>
                  <th className="text-center px-1 py-1.5 font-medium w-8">Stp</th>
                  <th className="text-center px-1 py-1.5 font-medium w-6">↑</th>
                  <th className="w-5" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/40">
                {items.map((item, i) => (
                  <tr key={item.item_id} className="hover:bg-gray-900/40">
                    <td
                      className="px-2 py-1.5 font-mono text-gray-200 max-w-[100px] truncate"
                      title={item.item_id}
                    >
                      {item.item_id}
                    </td>
                    <td className="px-2 py-1.5 text-right font-mono text-gray-500 whitespace-nowrap">
                      {item.w}×{item.l}×{item.h}
                    </td>
                    <td className="px-1 py-1.5 text-center">
                      <span
                        className="inline-flex w-4 h-4 rounded text-xs font-bold items-center justify-center text-gray-950 leading-none"
                        style={{ backgroundColor: badgeColor(item.stop_id) }}
                      >
                        {item.stop_id}
                      </span>
                    </td>
                    <td className="px-1 py-1.5 text-center text-gray-600 text-xs">
                      {item.side_up && <span title="Upright only">↑</span>}
                    </td>
                    <td className="pr-2 text-right">
                      <button
                        onClick={() =>
                          setItems((its) => its.filter((_, j) => j !== i))
                        }
                        title="Remove item"
                        className="text-gray-700 hover:text-red-400 transition-colors"
                      >
                        ✕
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {showAdd ? (
          <AddItemForm
            value={draft}
            stops={stops}
            existingIds={items.map((it) => it.item_id)}
            error={itemError}
            onChange={setDraft}
            onConfirm={commitAdd}
            onCancel={cancelAdd}
          />
        ) : stops.length > 0 ? (
          <button
            onClick={() => setShowAdd(true)}
            className="w-full text-xs text-gray-600 hover:text-gray-300 border border-dashed border-gray-800 hover:border-gray-600 rounded py-1.5 transition-colors"
          >
            + Add Item
          </button>
        ) : (
          <p className="text-xs text-gray-700 text-center py-2">
            Add at least one stop before adding items.
          </p>
        )}
      </Section>

      {/* ── Solve button ───────────────────────────────────────────────────── */}
      <div className="px-4 pt-2">
        <button
          onClick={() => onSolve({ items, truck, stops })}
          disabled={loading || items.length === 0}
          className="w-full py-2.5 text-sm font-semibold rounded-lg bg-blue-600 hover:bg-blue-500 disabled:bg-gray-800 disabled:text-gray-600 text-white transition-colors flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Solving…
            </>
          ) : (
            "Solve Packing Plan"
          )}
        </button>
        {items.length === 0 && !loading && (
          <p className="text-xs text-gray-700 text-center mt-2">
            Add at least one item to solve.
          </p>
        )}
      </div>
    </div>
  );
}
