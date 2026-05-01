import type { ReactNode } from "react";
import { useRef, useState } from "react";

import type {
  DeliveryStop,
  FurnitureItem,
  SolveRequest,
  TruckSpec,
} from "../types";
import {
  FURNITURE_DEFAULTS,
  FURNITURE_OPTIONS,
  getCatalogVariants,
} from "../data/modelCatalog";
import { ModelPreview } from "./ModelPreview";
import {
  downloadManifestTemplate,
  importManifestFile,
} from "../data/manifestImport";

/** Strip the trailing "_NN" from an item_id. Used by the edit flow. */
function prefixOf(item_id: string): string | undefined {
  const m = item_id.toLowerCase().match(/^(.+)_(\d+)$/);
  return m ? m[1] : undefined;
}

/** Pad an integer to a 2-digit zero-prefixed string ("3" → "03"). */
function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

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
  boxed: false, fragile: false,
});

const DEFAULT_ITEMS: FurnitureItem[] = [
  { item_id: "wardrobe_01",     w: 1200, l: 600, h: 1800, weight_kg: 90, stop_id: 3, side_up: true  },
  { item_id: "desk_01",         w: 1200, l: 600, h: 750,  weight_kg: 40, stop_id: 3, side_up: false },
  { item_id: "dining_table_01", w: 1500, l: 900, h: 750,  weight_kg: 50, stop_id: 2, side_up: false },
  { item_id: "sofa_01",         w: 2000, l: 900, h: 850,  weight_kg: 80, stop_id: 1, side_up: false },
  { item_id: "bookshelf_01",    w: 800,  l: 300, h: 1800, weight_kg: 30, stop_id: 1, side_up: true  },
];

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
  bg2,
  border,
  muted,
}: {
  title: string;
  badge?: number;
  children: ReactNode;
  bg2: string;
  border: string;
  muted: string;
}) {
  return (
    <>
      <div className={`flex items-center justify-between px-4 py-3 border-b ${border} ${bg2} sticky top-0 z-10`}>
        <span className={`text-sm font-semibold ${muted} uppercase tracking-wider`}>
          {title}
        </span>
        {badge !== undefined && (
          <span className={`text-xs font-mono ${muted}`}>{badge}</span>
        )}
      </div>
      <div className="px-4 py-4">{children}</div>
    </>
  );
}

// ── Add / Edit Item inline form ────────────────────────────────────────────────
function AddItemForm({
  value,
  stops,
  existingIds,
  error,
  quantity,
  onQuantityChange,
  onChange,
  onConfirm,
  onCancel,
  initialPrefix,
  confirmLabel,
  inputCls,
  labelCls,
  lightMode,
  isEditing,
}: {
  value: FurnitureItem;
  stops: DeliveryStop[];
  existingIds: string[];
  error: string | null;
  quantity: number;
  onQuantityChange: (n: number) => void;
  onChange: (v: FurnitureItem) => void;
  onConfirm: () => void;
  onCancel: () => void;
  initialPrefix?: string;
  confirmLabel: string;
  inputCls: string;
  labelCls: string;
  lightMode?: boolean;
  isEditing: boolean;
}) {
  const [selectedPrefix, setSelectedPrefix] = useState(initialPrefix ?? "");
  /** Variant index that the user is currently hovering over — drives the preview. */
  const [hoverVariant, setHoverVariant] = useState<number | null>(null);

  function set<K extends keyof FurnitureItem>(k: K, v: FurnitureItem[K]) {
    onChange({ ...value, [k]: v });
  }

  function handlePrefixChange(prefix: string) {
    setSelectedPrefix(prefix);
    if (!prefix) {
      onChange({ ...value, item_id: "", model_variant: undefined });
      return;
    }
    const pattern = new RegExp(`^${prefix}_(\\d+)$`);
    const used = existingIds
      .map((id) => pattern.exec(id.toLowerCase())?.[1])
      .filter(Boolean)
      .map(Number);
    let n = 1;
    while (used.includes(n)) n++;
    const newId = `${prefix}_${pad2(n)}`;
    const def = FURNITURE_DEFAULTS[prefix];
    onChange({ ...value, item_id: newId, model_variant: undefined, ...(def ?? {}) });
  }

  const variants = getCatalogVariants(selectedPrefix);
  /** Variant rendered in the preview — hover wins, selection second, first variant last. */
  const previewVariant =
    hoverVariant ?? value.model_variant ?? (variants.length > 0 ? 0 : undefined);

  return (
    <div className={`border rounded-lg p-4 space-y-3 ${lightMode ? "border-gray-300 bg-slate-50" : "border-gray-700 bg-gray-900/30"}`}>
      {/* Furniture type dropdown grouped by category */}
      <div>
        <label className={labelCls}>Furniture Type</label>
        <select
          className={`${inputCls} cursor-pointer`}
          value={selectedPrefix}
          // eslint-disable-next-line jsx-a11y/no-autofocus
          autoFocus={!initialPrefix}
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
          <span className="text-sm text-gray-400">ID:</span>
          <span className="font-mono text-sm text-blue-400 bg-blue-950/40 border border-blue-900/40 px-2 py-1 rounded">
            {value.item_id}
          </span>
        </div>
      )}

      {/* Inline 3D preview — shows the hovered/selected variant as a turntable thumbnail */}
      {selectedPrefix && previewVariant !== undefined && (
        <div className="flex items-center gap-3">
          <ModelPreview
            prefix={selectedPrefix}
            variantIdx={previewVariant}
            size={140}
            lightMode={lightMode}
          />
          <div className="text-sm flex-1">
            <div className={`font-semibold mb-1 ${lightMode ? "text-gray-800" : "text-gray-200"}`}>
              Preview
            </div>
            <p className={`leading-relaxed ${lightMode ? "text-gray-600" : "text-gray-400"}`}>
              {variants.length > 1
                ? "Hover a variant below to preview it. Click to select."
                : "Selected model — appears in the 3D viewer once packed."}
            </p>
          </div>
        </div>
      )}

      {/* Model variant picker — only shown when there is a real choice */}
      {variants.length > 1 && (
        <div>
          <label className={labelCls}>Model Variant</label>
          <div className="flex flex-wrap gap-1.5">
            {variants.map((v) => {
              const active = value.model_variant === v.index;
              return (
                <button
                  key={v.index}
                  type="button"
                  onClick={() => onChange({ ...value, model_variant: v.index })}
                  onMouseEnter={() => setHoverVariant(v.index)}
                  onMouseLeave={() => setHoverVariant(null)}
                  className={`px-3 py-2 text-sm rounded-md border transition-colors ${
                    active
                      ? lightMode
                        ? "border-blue-500 bg-blue-100 text-blue-700"
                        : "border-blue-500 bg-blue-950 text-blue-300"
                      : lightMode
                        ? "border-gray-300 bg-white text-gray-700 hover:border-gray-400"
                        : "border-gray-700 bg-gray-900 text-gray-300 hover:border-gray-600"
                  }`}
                >
                  {v.label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="grid grid-cols-3 gap-3">
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

      <div className="grid grid-cols-3 gap-3 items-end">
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

      {/* Boxed / Fragile / Quantity row */}
      <div className="grid grid-cols-3 gap-3 items-end">
        <div className="flex items-center gap-2 pb-0.5">
          <input
            id="new_boxed"
            type="checkbox"
            className="accent-blue-500 cursor-pointer"
            checked={!!value.boxed}
            onChange={(e) => set("boxed", e.target.checked)}
          />
          <label htmlFor="new_boxed" className={`${labelCls} mb-0 cursor-pointer`}>
            Boxed
          </label>
        </div>
        <div className="flex items-center gap-2 pb-0.5">
          <input
            id="new_fragile"
            type="checkbox"
            className="accent-amber-500 cursor-pointer"
            checked={!!value.fragile}
            onChange={(e) => set("fragile", e.target.checked)}
          />
          <label htmlFor="new_fragile" className={`${labelCls} mb-0 cursor-pointer`}>
            Fragile
          </label>
        </div>
        <div>
          <label className={labelCls}>Quantity</label>
          <input
            className={inputCls}
            type="number"
            min={1}
            max={99}
            disabled={isEditing}
            title={isEditing ? "Quantity only applies when adding new items." : "Number of identical items to add."}
            value={quantity}
            onChange={(e) =>
              onQuantityChange(Math.max(1, Math.min(99, parseInt(e.target.value) || 1)))
            }
          />
        </div>
      </div>

      {/* Fragile handling notice — only shown when checked */}
      {value.fragile && (
        <div className={`rounded-md border p-2.5 text-xs leading-relaxed ${
          lightMode
            ? "border-amber-300 bg-amber-50 text-amber-800"
            : "border-amber-700 bg-amber-950 text-amber-200"
        }`}>
          <div className="font-bold mb-1 flex items-center gap-1.5">
            <span>⚠</span> Fragile handling required
          </div>
          Wrap with moving blankets, foam, or bubble wrap. Secure corners with
          cardboard and use heavy-duty straps. The packing solver will not stack
          other items against this one.
        </div>
      )}

      {error && <p className="text-sm text-red-400">{error}</p>}

      <div className="flex gap-2 pt-1">
        <button
          onClick={onCancel}
          className={`flex-1 py-2.5 text-sm rounded-md border font-medium transition-colors ${
            lightMode
              ? "border-gray-300 text-gray-700 hover:bg-gray-100"
              : "border-gray-700 text-gray-300 hover:bg-gray-800"
          }`}
        >
          Cancel
        </button>
        <button
          onClick={onConfirm}
          className="flex-1 py-2.5 text-sm rounded-md bg-blue-700 hover:bg-blue-600 text-white font-semibold transition-colors"
        >
          {confirmLabel}
        </button>
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────
interface ManifestFormProps {
  onSolve: (req: SolveRequest) => void;
  loading: boolean;
  lightMode?: boolean;
}

export function ManifestForm({ onSolve, loading, lightMode = false }: ManifestFormProps) {
  // ── Theme helpers ──
  const bg     = lightMode ? "bg-white"        : "bg-gray-900";
  const bg2    = lightMode ? "bg-slate-100"    : "bg-gray-950";
  const border = lightMode ? "border-gray-300" : "border-gray-700";
  const text   = lightMode ? "text-gray-900"   : "text-gray-100";
  const muted  = lightMode ? "text-gray-700"   : "text-gray-400";

  const inputCls =
    `w-full ${bg} border ${border} rounded-md px-3 py-2 text-sm ${text} ` +
    `focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 font-mono ` +
    (lightMode ? "shadow-sm placeholder-gray-400" : "placeholder-gray-500");
  const labelCls = `block text-sm font-medium ${muted} mb-1.5`;

  const [truck, setTruck]   = useState<TruckSpec>(DEFAULT_TRUCK);
  const [stops, setStops]   = useState<DeliveryStop[]>(DEFAULT_STOPS);
  const [items, setItems]   = useState<FurnitureItem[]>(DEFAULT_ITEMS);
  const [draft, setDraft]   = useState<FurnitureItem>(blankItem());
  const [draftQty, setDraftQty]     = useState<number>(1);
  const [showAdd, setShowAdd]       = useState(false);
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [itemError, setItemError]   = useState<string | null>(null);

  // Import flow — file input, drag-overlay, last-import digest
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [importMessage, setImportMessage] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  async function handleFile(file: File) {
    setImportMessage(null);
    try {
      const result = await importManifestFile(file);
      if (result.truck) setTruck(result.truck);
      if (result.stops && result.stops.length > 0) setStops(result.stops);
      if (result.items) setItems(result.items);

      const parts: string[] = [];
      if (result.truck) parts.push("truck");
      if (result.stops?.length) parts.push(`${result.stops.length} stop${result.stops.length === 1 ? "" : "s"}`);
      if (result.items?.length) parts.push(`${result.items.length} item${result.items.length === 1 ? "" : "s"}`);
      const digest = parts.length ? parts.join(", ") : "no recognised data";
      const warn = result.warnings.length ? ` (${result.warnings.length} warning${result.warnings.length === 1 ? "" : "s"})` : "";
      setImportMessage({ kind: "ok", text: `Imported ${digest} from ${file.name}${warn}.` });
    } catch (e) {
      setImportMessage({ kind: "err", text: (e as Error).message });
    }
  }

  function onFilePicked(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f) void handleFile(f);
    e.target.value = "";
  }

  function onDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragging(false);
    const f = e.dataTransfer.files?.[0];
    if (f) void handleFile(f);
  }

  const truckVol = (truck.W * truck.L * truck.H) / 1e9;
  const itemsVol = items.reduce((s, it) => s + (it.w * it.l * it.h) / 1e9, 0);
  const theoPct  = truckVol > 0 ? Math.round((itemsVol / truckVol) * 100) : 0;

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

  function moveStop(idx: number, dir: -1 | 1) {
    const next = idx + dir;
    if (next < 0 || next >= stops.length) return;
    setStops((s) => {
      const arr = [...s];
      [arr[idx], arr[next]] = [arr[next], arr[idx]];
      return arr;
    });
  }

  // ── Item helpers ──
  function commitAdd() {
    setItemError(null);
    const baseId = draft.item_id.trim();
    if (!baseId)
      return setItemError("Select a furniture type.");
    if (draft.w <= 0 || draft.l <= 0 || draft.h <= 0)
      return setItemError("All dimensions must be > 0.");
    if (!stops.some((s) => s.stop_id === draft.stop_id))
      return setItemError("Stop ID does not exist in the stop list.");

    // ── Edit path: single update, quantity is irrelevant ──────────────────
    if (editingIdx !== null) {
      if (items.some((it, j) => it.item_id === baseId && j !== editingIdx))
        return setItemError("Item ID must be unique.");
      setItems((its) =>
        its.map((it, j) => j === editingIdx ? { ...draft, item_id: baseId } : it),
      );
      setEditingIdx(null);
      setDraft(blankItem());
      setDraftQty(1);
      setShowAdd(false);
      return;
    }

    // ── Add path: replicate the draft `draftQty` times, auto-incrementing
    // the trailing _NN suffix so each clone has a unique item_id.
    const qty = Math.max(1, Math.min(99, draftQty));

    // Either append to an existing prefix (e.g. "chair_01" → next free chair_NN)
    // or, if the user typed a free-form id without a numeric suffix, just
    // append "_01", "_02", … starting from 1.
    const m = baseId.match(/^(.+)_(\d+)$/);
    const prefix = m ? m[1] : baseId;

    const usedSuffixes = new Set<number>();
    for (const it of items) {
      const mm = it.item_id.toLowerCase().match(new RegExp(`^${prefix.toLowerCase()}_(\\d+)$`));
      if (mm) usedSuffixes.add(Number(mm[1]));
    }

    const generated: FurnitureItem[] = [];
    let n = m ? Number(m[2]) : 1;
    while (generated.length < qty) {
      while (usedSuffixes.has(n)) n++;
      usedSuffixes.add(n);
      generated.push({ ...draft, item_id: `${prefix}_${pad2(n)}` });
      n++;
    }

    setItems((its) => [...its, ...generated]);
    setDraft(blankItem());
    setDraftQty(1);
    setShowAdd(false);
  }

  function cancelAdd() {
    setShowAdd(false);
    setEditingIdx(null);
    setItemError(null);
    setDraft(blankItem());
    setDraftQty(1);
  }

  function startEdit(idx: number) {
    setEditingIdx(idx);
    setDraft({ ...items[idx] });
    setDraftQty(1);
    setShowAdd(true);
    setItemError(null);
  }

  return (
    <div
      className={`relative flex flex-col pb-4 ${lightMode ? "bg-slate-50" : ""}`}
      onDragOver={(e) => { e.preventDefault(); if (!isDragging) setIsDragging(true); }}
      onDragLeave={(e) => {
        // only clear when leaving the container itself (not a child)
        if (e.currentTarget === e.target) setIsDragging(false);
      }}
      onDrop={onDrop}
    >
      {/* Drag-and-drop overlay */}
      {isDragging && (
        <div className={`absolute inset-0 z-30 flex flex-col items-center justify-center pointer-events-none border-2 border-dashed rounded-lg ${
          lightMode
            ? "bg-blue-50/95 border-blue-400 text-blue-700"
            : "bg-blue-950/95 border-blue-500 text-blue-200"
        }`}>
          <div className="text-2xl font-bold mb-1">Drop manifest file</div>
          <div className="text-sm opacity-80">.xlsx · .xls · .json</div>
        </div>
      )}

      {/* ── Import bar ──────────────────────────────────────────────────────── */}
      <div className={`flex items-center gap-2 px-4 py-3 border-b ${border} ${bg2}`}>
        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx,.xls,.json,application/json,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          className="hidden"
          onChange={onFilePicked}
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className={`flex items-center gap-1.5 text-sm font-semibold px-3 py-1.5 rounded-md border transition-colors ${
            lightMode
              ? "border-gray-300 bg-white text-gray-700 hover:bg-gray-100 hover:border-gray-400"
              : "border-gray-600 bg-gray-900 text-gray-200 hover:bg-gray-800 hover:border-gray-500"
          }`}
          title="Import a .xlsx, .xls, or .json manifest"
        >
          <span>↑</span> Import Manifest
        </button>
        <button
          type="button"
          onClick={downloadManifestTemplate}
          className={`text-sm px-2.5 py-1.5 rounded-md transition-colors ${
            lightMode
              ? "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
              : "text-gray-400 hover:text-gray-100 hover:bg-gray-800"
          }`}
          title="Download a starter .xlsx template"
        >
          Template
        </button>
        <span className={`ml-auto text-xs ${muted}`}>or drop a file here</span>
      </div>
      {importMessage && (
        <div className={`px-4 py-2 text-sm border-b ${border} ${
          importMessage.kind === "ok"
            ? lightMode ? "bg-green-50 text-green-800" : "bg-green-950 text-green-300"
            : lightMode ? "bg-red-50 text-red-800"   : "bg-red-950 text-red-300"
        }`}>
          {importMessage.text}
        </div>
      )}

      {/* ── Truck Spec ─────────────────────────────────────────────────────── */}
      <Section title="Truck Specification" bg2={bg2} border={border} muted={muted}>
        <div className="grid grid-cols-2 gap-3 mb-3">
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
        <div className={`text-sm ${muted} font-mono ${bg2} rounded-md px-3 py-2`}>
          Vol:&nbsp;{truckVol.toFixed(2)}&nbsp;m³ &nbsp;·&nbsp; Cargo:&nbsp;~{theoPct}%&nbsp;theoretical
        </div>
      </Section>

      {/* ── Delivery Stops ─────────────────────────────────────────────────── */}
      <Section title="Delivery Stops" badge={stops.length} bg2={bg2} border={border} muted={muted}>
        <div className="space-y-2 mb-2">
          {stops.map((stop, i) => (
            <div key={stop.stop_id} className="flex items-center gap-1.5">
              <span
                className="w-7 h-7 rounded text-sm font-bold flex items-center justify-center shrink-0 text-gray-950 leading-none"
                style={{
                  backgroundColor: badgeColor(stop.stop_id),
                  outline: lightMode ? "1.5px solid rgba(0,0,0,0.18)" : "none",
                  outlineOffset: "1px",
                }}
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
              {/* Reorder buttons */}
              <div className="flex flex-col gap-px shrink-0">
                <button
                  onClick={() => moveStop(i, -1)}
                  disabled={i === 0}
                  title="Move up"
                  className="text-gray-500 hover:text-gray-200 disabled:opacity-20 disabled:cursor-default transition-colors text-sm leading-none px-1"
                >
                  ▲
                </button>
                <button
                  onClick={() => moveStop(i, 1)}
                  disabled={i === stops.length - 1}
                  title="Move down"
                  className="text-gray-500 hover:text-gray-200 disabled:opacity-20 disabled:cursor-default transition-colors text-sm leading-none px-1"
                >
                  ▼
                </button>
              </div>
              {stops.length > 1 && (
                <button
                  onClick={() => removeStop(i)}
                  title="Remove stop"
                  className="text-gray-500 hover:text-red-400 transition-colors text-sm shrink-0"
                >
                  ✕
                </button>
              )}
            </div>
          ))}
        </div>
        <button
          onClick={addStop}
          className={`w-full text-sm ${muted} border border-dashed ${border} rounded-md py-2.5 transition-colors font-medium ${
            lightMode
              ? "hover:text-gray-900 hover:border-gray-400 hover:bg-white"
              : "hover:text-gray-200 hover:border-gray-500"
          }`}
        >
          + Add Stop
        </button>
        <p className={`text-sm ${muted} mt-2 leading-relaxed`}>
          Stop&nbsp;1&nbsp;=&nbsp;first delivery (near door). Higher&nbsp;#&nbsp;=&nbsp;deeper in truck&nbsp;(LIFO).
        </p>
      </Section>

      {/* ── Cargo Items ────────────────────────────────────────────────────── */}
      <Section title="Cargo Items" badge={items.length} bg2={bg2} border={border} muted={muted}>
        {items.length > 0 && (
          <div className={`rounded border ${border} overflow-hidden mb-2`}>
            <table className="w-full text-xs">
              <thead>
                <tr className={`${bg2} ${muted}`}>
                  <th className="text-left px-2 py-2 font-semibold text-sm">ID</th>
                  <th className="text-right px-2 py-2 font-semibold text-sm whitespace-nowrap">
                    W×L×H
                  </th>
                  <th className="text-center px-1 py-2 font-semibold text-sm w-8">Stp</th>
                  <th className="text-center px-1 py-2 font-semibold text-sm w-12" title="Side-up · Boxed · Fragile">Flags</th>
                  <th className="w-12" />
                </tr>
              </thead>
              <tbody className={`divide-y ${border}/40`}>
                {items.map((item, i) => (
                  <tr key={item.item_id} className={lightMode ? "hover:bg-slate-100" : "hover:bg-gray-800/30"}>
                    <td
                      className={`px-2 py-2 font-mono text-sm ${text} max-w-[100px] truncate`}
                      title={item.item_id}
                    >
                      {item.item_id}
                    </td>
                    <td className={`px-2 py-2 text-right font-mono text-sm ${muted} whitespace-nowrap`}>
                      {item.w}×{item.l}×{item.h}
                    </td>
                    <td className="px-1 py-2 text-center">
                      <span
                        className="inline-flex w-6 h-6 rounded text-sm font-bold items-center justify-center text-gray-950 leading-none"
                        style={{
                          backgroundColor: badgeColor(item.stop_id),
                          outline: lightMode ? "1.5px solid rgba(0,0,0,0.18)" : "none",
                          outlineOffset: "1px",
                        }}
                      >
                        {item.stop_id}
                      </span>
                    </td>
                    <td className={`px-1 py-2 text-center text-sm`}>
                      <div className="flex items-center justify-center gap-1">
                        {item.side_up && (
                          <span className={muted} title="Upright only">↑</span>
                        )}
                        {item.boxed && (
                          <span
                            className={`inline-block text-[10px] font-bold px-1 rounded ${
                              lightMode
                                ? "bg-blue-100 text-blue-700 border border-blue-300"
                                : "bg-blue-950 text-blue-300 border border-blue-800"
                            }`}
                            title="Boxed (renders cardboard wrapper in viewer)"
                          >
                            BOX
                          </span>
                        )}
                        {item.fragile && (
                          <span
                            className={`inline-block text-[10px] font-bold px-1 rounded ${
                              lightMode
                                ? "bg-amber-100 text-amber-700 border border-amber-300"
                                : "bg-amber-950 text-amber-300 border border-amber-800"
                            }`}
                            title="Fragile — solver will not stack against this item"
                          >
                            FRG
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="pr-2 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => startEdit(i)}
                          title="Edit item"
                          className="text-gray-500 hover:text-blue-400 transition-colors text-sm p-1"
                        >
                          ✎
                        </button>
                        <button
                          onClick={() =>
                            setItems((its) => its.filter((_, j) => j !== i))
                          }
                          title="Remove item"
                          className="text-gray-500 hover:text-red-400 transition-colors text-sm p-1"
                        >
                          ✕
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {showAdd ? (
          <AddItemForm
            key={editingIdx ?? "new"}
            value={draft}
            stops={stops}
            existingIds={items.filter((_, j) => j !== editingIdx).map((it) => it.item_id)}
            error={itemError}
            quantity={draftQty}
            onQuantityChange={setDraftQty}
            onChange={setDraft}
            onConfirm={commitAdd}
            onCancel={cancelAdd}
            initialPrefix={editingIdx !== null ? prefixOf(items[editingIdx].item_id) : undefined}
            confirmLabel={
              editingIdx !== null
                ? "Save"
                : draftQty > 1
                  ? `Add ${draftQty}`
                  : "Add"
            }
            inputCls={inputCls}
            labelCls={labelCls}
            lightMode={lightMode}
            isEditing={editingIdx !== null}
          />
        ) : stops.length > 0 ? (
          <button
            onClick={() => setShowAdd(true)}
            className={`w-full text-sm ${muted} border border-dashed ${border} rounded-md py-2.5 transition-colors font-medium ${
              lightMode
                ? "hover:text-gray-900 hover:border-gray-400 hover:bg-white"
                : "hover:text-gray-200 hover:border-gray-500"
            }`}
          >
            + Add Item
          </button>
        ) : (
          <p className={`text-sm ${muted} text-center py-2`}>
            Add at least one stop before adding items.
          </p>
        )}
      </Section>

      {/* ── Solve button ───────────────────────────────────────────────────── */}
      <div className="px-4 pt-2">
        <button
          onClick={() => onSolve({ items, truck, stops })}
          disabled={loading || items.length === 0}
          className="w-full py-3.5 text-base font-bold rounded-lg bg-blue-600 hover:bg-blue-500 disabled:bg-gray-800 disabled:text-gray-500 text-white transition-colors flex items-center justify-center gap-2"
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
          <p className={`text-sm ${muted} text-center mt-2`}>
            Add at least one item to solve.
          </p>
        )}
      </div>
    </div>
  );
}
