import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "../auth/AuthContext";
import { appendSessionLog } from "../lib/sessionLog";

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

// ── Unit helpers ──────────────────────────────────────────────────────────────
type DimUnit = "mm" | "cm" | "m" | "in";

const UNIT_TO_MM: Record<DimUnit, number> = { mm: 1, cm: 10, m: 1000, in: 25.4 };

function toDisplay(mm: number, unit: DimUnit): number {
  const val = mm / UNIT_TO_MM[unit];
  return unit === "m" || unit === "in" ? Math.round(val * 100) / 100 : Math.round(val);
}

function fromDisplay(v: number, unit: DimUnit): number {
  return Math.max(1, Math.round(v * UNIT_TO_MM[unit]));
}

function UnitToggle({
  unit,
  onChange,
  lightMode,
}: {
  unit: DimUnit;
  onChange: (u: DimUnit) => void;
  lightMode?: boolean;
}) {
  const units: DimUnit[] = ["mm", "cm", "m", "in"];
  return (
    <div className={`inline-flex rounded-lg overflow-hidden border ${lightMode ? "border-slate-300" : "border-gray-700"}`}>
      {units.map((u, i) => (
        <button
          key={u}
          type="button"
          onClick={() => onChange(u)}
          className={`px-2.5 py-1 text-xs font-semibold transition-colors ${
            u === unit
              ? "bg-blue-600 text-white"
              : lightMode
                ? "bg-white text-slate-600 hover:bg-slate-100"
                : "bg-gray-900 text-gray-400 hover:bg-gray-800"
          } ${i < units.length - 1 ? (lightMode ? "border-r border-slate-300" : "border-r border-gray-700") : ""}`}
        >
          {u}
        </button>
      ))}
    </div>
  );
}

/**
 * Number input that lets the user backspace to empty mid-edit without
 * snapping back to a fallback. Holds its own string state; only commits
 * a parsed number to `onChange` when the text parses cleanly. On blur,
 * an empty/invalid value resets to `min` (or 1 if min is 0).
 */
function NumberInput({
  value,
  onChange,
  min = 0,
  max,
  step,
  className,
  disabled,
  title,
  ariaLabel,
}: {
  value: number;
  onChange: (n: number) => void;
  min?: number;
  max?: number;
  step?: number;
  className?: string;
  disabled?: boolean;
  title?: string;
  ariaLabel?: string;
}) {
  const [text, setText] = useState<string>(String(value));

  // Resync external changes (e.g. import overwrites the value).
  useEffect(() => {
    setText((prev) => {
      const parsed = prev === "" ? NaN : Number(prev);
      return Number.isFinite(parsed) && parsed === value ? prev : String(value);
    });
  }, [value]);

  return (
    <input
      type="number"
      className={className}
      min={min}
      max={max}
      step={step}
      disabled={disabled}
      title={title}
      aria-label={ariaLabel}
      value={text}
      onChange={(e) => {
        const v = e.target.value;
        setText(v);
        if (v === "" || v === "-") return;
        const n = step && !Number.isInteger(step) ? parseFloat(v) : parseInt(v, 10);
        if (!Number.isFinite(n)) return;
        let clamped = n;
        if (typeof min === "number" && clamped < min) clamped = min;
        if (typeof max === "number" && clamped > max) clamped = max;
        onChange(clamped);
      }}
      onBlur={() => {
        const v = text;
        if (v === "" || v === "-" || !Number.isFinite(Number(v))) {
          const fallback = min > 0 ? min : 1;
          setText(String(fallback));
          onChange(fallback);
        } else {
          // Re-stringify to drop leading zeroes ("0042" → "42").
          setText(String(Number(v)));
        }
      }}
    />
  );
}

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

// ── Section header (sticky within the scrollable sidebar) ─────────────────────
function Section({
  title,
  hint,
  badge,
  action,
  children,
  bg2,
  border,
  muted,
  lightMode,
}: {
  title: string;
  hint?: string;
  badge?: number;
  action?: ReactNode;
  children: ReactNode;
  bg2: string;
  border: string;
  muted: string;
  lightMode?: boolean;
}) {
  return (
    <>
      <div className={`flex items-start justify-between gap-3 px-5 py-4 border-b-2 ${border} ${bg2} sticky top-0 z-10`}>
        <div>
          <div className={`text-lg font-bold leading-tight ${lightMode ? "text-slate-900" : "text-gray-100"}`}>
            {title}
          </div>
          {hint && (
            <div className={`text-sm mt-0.5 leading-snug ${muted}`}>{hint}</div>
          )}
        </div>
        {(action !== undefined || badge !== undefined) && (
          <div className="flex items-center gap-2 shrink-0">
            {action}
            {badge !== undefined && (
              <span className={`text-base font-bold px-2.5 py-1 rounded-full shrink-0 ${
                lightMode ? "bg-slate-200 text-slate-700" : "bg-gray-800 text-gray-300"
              }`}>
                {badge}
              </span>
            )}
          </div>
        )}
      </div>
      <div className="px-5 py-5">{children}</div>
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
  unit,
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
  unit: DimUnit;
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

  const dimStep = unit === "m" || unit === "in" ? 0.01 : 1;
  const dimMin  = unit === "m" || unit === "in" ? 0.001 : 1;

  return (
    <div className={`border-2 rounded-2xl p-5 space-y-4 ${lightMode ? "border-slate-300 bg-slate-50" : "border-gray-700 bg-gray-900/40"}`}>
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
        <div className="flex items-center gap-2 py-0.5">
          <span className={`text-sm font-medium ${lightMode ? "text-slate-600" : "text-gray-400"}`}>ID:</span>
          <span className={`text-sm font-semibold px-2.5 py-1 rounded-lg ${
            lightMode
              ? "text-blue-700 bg-blue-50 border border-blue-200"
              : "text-blue-300 bg-blue-950/40 border border-blue-900/40"
          }`}>
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
          <div className="flex flex-wrap gap-2">
            {variants.map((v) => {
              const active = value.model_variant === v.index;
              return (
                <button
                  key={v.index}
                  type="button"
                  onClick={() => onChange({ ...value, model_variant: v.index })}
                  onMouseEnter={() => setHoverVariant(v.index)}
                  onMouseLeave={() => setHoverVariant(null)}
                  className={`px-4 py-2.5 text-base font-semibold rounded-lg border-2 transition-colors ${
                    active
                      ? lightMode
                        ? "border-blue-600 bg-blue-100 text-blue-800"
                        : "border-blue-500 bg-blue-950 text-blue-200"
                      : lightMode
                        ? "border-slate-300 bg-white text-slate-700 hover:border-slate-500"
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

      <div>
        <label className={labelCls}>Dimensions ({unit})</label>
        <div className="grid grid-cols-3 gap-3">
          {(["w", "l", "h"] as const).map((k) => (
            <div key={k}>
              <div className={`text-sm font-medium mb-1 ${lightMode ? "text-slate-600" : "text-gray-400"}`}>
                {k === "w" ? "Width" : k === "l" ? "Length" : "Height"}
              </div>
              <NumberInput
                className={inputCls}
                min={dimMin}
                step={dimStep}
                value={toDisplay(value[k], unit)}
                onChange={(n) => set(k, fromDisplay(n, unit))}
              />
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>Weight (kg)</label>
          <NumberInput
            className={inputCls}
            min={0}
            step={1}
            value={value.weight_kg}
            onChange={(n) => set("weight_kg", n)}
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
      </div>

      {/* Handling flags */}
      <div className="space-y-2.5">
        <label className={labelCls}>Handling</label>
        <CheckboxRow
          id="new_side_up"
          checked={value.side_up}
          onChange={(v) => set("side_up", v)}
          title="Side Up"
          desc="Item must remain upright."
          lightMode={lightMode}
        />
        <CheckboxRow
          id="new_boxed"
          checked={!!value.boxed}
          onChange={(v) => set("boxed", v)}
          title="Boxed"
          desc="Renders a cardboard wrapper in the viewer."
          lightMode={lightMode}
        />
        <CheckboxRow
          id="new_fragile"
          checked={!!value.fragile}
          onChange={(v) => set("fragile", v)}
          title="Fragile"
          desc="Solver will not stack other items on top."
          lightMode={lightMode}
          warn
        />
      </div>

      {!isEditing && (
        <div>
          <label className={labelCls}>Quantity</label>
          <NumberInput
            className={`${inputCls} max-w-[120px]`}
            min={1}
            max={99}
            value={quantity}
            onChange={onQuantityChange}
          />
        </div>
      )}

      {/* Fragile handling notice — only shown when checked */}
      {value.fragile && (
        <div className={`rounded-xl border-2 p-3.5 text-sm leading-relaxed ${
          lightMode
            ? "border-amber-300 bg-amber-50 text-amber-900"
            : "border-amber-700 bg-amber-950 text-amber-100"
        }`}>
          <div className="font-bold mb-1.5 flex items-center gap-2 text-base">
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
            Fragile handling required
          </div>
          Wrap with moving blankets, foam, or bubble wrap. Secure corners with
          cardboard and use heavy-duty straps. The packing solver will not stack
          other items against this one.
        </div>
      )}

      {error && (
        <p className={`text-base font-semibold ${lightMode ? "text-red-700" : "text-red-300"}`}>
          {error}
        </p>
      )}

      <div className="flex gap-3 pt-2">
        <button
          onClick={onCancel}
          className={`flex-1 py-3 text-base font-semibold rounded-xl border-2 transition-colors ${
            lightMode
              ? "border-slate-300 text-slate-700 hover:bg-slate-100"
              : "border-gray-700 text-gray-300 hover:bg-gray-800"
          }`}
        >
          Cancel
        </button>
        <button
          onClick={onConfirm}
          className="flex-1 py-3 text-base font-bold rounded-xl bg-blue-600 hover:bg-blue-700 text-white transition-colors shadow-md hover:shadow-lg"
        >
          {confirmLabel}
        </button>
      </div>
    </div>
  );
}

function CheckboxRow({
  id,
  checked,
  onChange,
  title,
  desc,
  lightMode,
  warn,
}: {
  id: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  title: string;
  desc: string;
  lightMode?: boolean;
  warn?: boolean;
}) {
  const activeBorder = warn
    ? "border-amber-500"
    : "border-blue-500";
  const activeBg = warn
    ? lightMode ? "bg-amber-50" : "bg-amber-950/30"
    : lightMode ? "bg-blue-50" : "bg-blue-950/30";

  return (
    <label
      htmlFor={id}
      className={`flex items-start gap-3 p-3 rounded-xl border-2 cursor-pointer transition-colors ${
        checked
          ? `${activeBorder} ${activeBg}`
          : lightMode
            ? "border-slate-200 bg-white hover:border-slate-300"
            : "border-gray-700 bg-gray-900/40 hover:border-gray-600"
      }`}
    >
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className={`mt-1 w-5 h-5 cursor-pointer ${warn ? "accent-amber-500" : "accent-blue-600"}`}
      />
      <div className="flex-1">
        <div className={`text-base font-semibold ${lightMode ? "text-slate-900" : "text-gray-100"}`}>
          {title}
        </div>
        <div className={`text-sm leading-snug mt-0.5 ${lightMode ? "text-slate-600" : "text-gray-400"}`}>
          {desc}
        </div>
      </div>
    </label>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────
interface ManifestFormProps {
  onSolve: (req: SolveRequest) => void;
  loading: boolean;
  lightMode?: boolean;
}

export function ManifestForm({ onSolve, loading, lightMode = false }: ManifestFormProps) {
  const { user } = useAuth();

  // ── Theme helpers ──
  const bg     = lightMode ? "bg-white"        : "bg-gray-900";
  const bg2    = lightMode ? "bg-slate-100"    : "bg-gray-950";
  const border = lightMode ? "border-gray-300" : "border-gray-700";
  const text   = lightMode ? "text-gray-900"   : "text-gray-100";
  const muted  = lightMode ? "text-gray-700"   : "text-gray-400";

  const inputCls =
    `w-full ${bg} border-2 ${border} rounded-lg px-3.5 py-2.5 text-base ${text} ` +
    `focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 ` +
    (lightMode ? "shadow-sm placeholder-slate-400" : "placeholder-gray-500");
  const labelCls = `block text-base font-semibold ${lightMode ? "text-slate-700" : "text-gray-300"} mb-1.5`;

  // ── Core state ──
  const [truck, setTruck]   = useState<TruckSpec>(DEFAULT_TRUCK);
  const [stops, setStops]   = useState<DeliveryStop[]>(DEFAULT_STOPS);
  const [items, setItems]   = useState<FurnitureItem[]>(DEFAULT_ITEMS);
  const [draft, setDraft]   = useState<FurnitureItem>(blankItem());
  const [draftQty, setDraftQty]     = useState<number>(1);
  const [showAdd, setShowAdd]       = useState(false);
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [itemError, setItemError]   = useState<string | null>(null);

  // ── Unit conversion ──
  const [unit, setUnit] = useState<DimUnit>("mm");

  // ── Undo / redo ──
  const itemHistory = useRef<FurnitureItem[][]>([[...DEFAULT_ITEMS]]);
  const [historyIdx, setHistoryIdx] = useState(0);

  // ── Delete confirmation ──
  const [pendingDeleteIdx, setPendingDeleteIdx] = useState<number | null>(null);

  const editFormRef = useRef<HTMLDivElement | null>(null);

  // Import flow — file input, drag-overlay, last-import digest
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [importMessage, setImportMessage] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  // ── History helpers ──
  function pushHistory(newItems: FurnitureItem[]) {
    const slice = itemHistory.current.slice(0, historyIdx + 1);
    const next = [...slice, newItems].slice(-30);
    itemHistory.current = next;
    setHistoryIdx(next.length - 1);
  }

  function undo() {
    if (historyIdx === 0) return;
    const newIdx = historyIdx - 1;
    setHistoryIdx(newIdx);
    setItems(itemHistory.current[newIdx]);
    setShowAdd(false);
    setEditingIdx(null);
    setItemError(null);
    setDraft(blankItem());
    setDraftQty(1);
  }

  function redo() {
    if (historyIdx === itemHistory.current.length - 1) return;
    const newIdx = historyIdx + 1;
    setHistoryIdx(newIdx);
    setItems(itemHistory.current[newIdx]);
  }

  // ── Delete confirmation helpers ──
  function requestDelete(idx: number) {
    setPendingDeleteIdx(idx);
  }

  function confirmDelete(idx: number) {
    if (editingIdx !== null && idx < editingIdx) setEditingIdx(editingIdx - 1);
    const deleted = items[idx];
    const newItems = items.filter((_, j) => j !== idx);
    setItems(newItems);
    pushHistory(newItems);
    setPendingDeleteIdx(null);
    if (user) appendSessionLog(user.username, "item_deleted", deleted.item_id);
  }

  function cancelDelete() {
    setPendingDeleteIdx(null);
  }

  // Stable ref so keyboard handler always calls the latest closures.
  const historyActionsRef = useRef({ undo, redo, cancelDelete });
  historyActionsRef.current = { undo, redo, cancelDelete };

  // Keyboard shortcuts: Ctrl+Z undo, Ctrl+Y / Ctrl+Shift+Z redo, Escape cancel delete.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.ctrlKey && !e.shiftKey && e.key === "z") {
        e.preventDefault();
        historyActionsRef.current.undo();
      } else if ((e.ctrlKey && e.key === "y") || (e.ctrlKey && e.shiftKey && e.key === "z")) {
        e.preventDefault();
        historyActionsRef.current.redo();
      } else if (e.key === "Escape") {
        historyActionsRef.current.cancelDelete();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  async function handleFile(file: File) {
    setImportMessage(null);
    try {
      const result = await importManifestFile(file);
      if (result.truck) setTruck(result.truck);
      if (result.stops && result.stops.length > 0) setStops(result.stops);
      if (result.items) {
        setItems(result.items);
        itemHistory.current = [result.items];
        setHistoryIdx(0);
      }

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
    if (user) appendSessionLog(user.username, "truck_param_changed", `${k}=${v}`);
  }

  // ── Stop helpers ──
  function addStop() {
    const next = stops.length ? Math.max(...stops.map((s) => s.stop_id)) + 1 : 1;
    setStops((s) => [...s, { stop_id: next, address: "" }]);
    if (user) appendSessionLog(user.username, "stop_added", `stop_id=${next}`);
  }

  function removeStop(idx: number) {
    const removed = stops[idx].stop_id;
    setStops((s) => s.filter((_, i) => i !== idx));
    setItems((its) => its.filter((it) => it.stop_id !== removed));
    if (user) appendSessionLog(user.username, "stop_removed", `stop_id=${removed}`);
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
      const newItems = items.map((it, j) => j === editingIdx ? { ...draft, item_id: baseId } : it);
      setItems(newItems);
      pushHistory(newItems);
      setEditingIdx(null);
      setDraft(blankItem());
      setDraftQty(1);
      setShowAdd(false);
      if (user) appendSessionLog(user.username, "item_edited", baseId);
      return;
    }

    // ── Add path: replicate the draft `draftQty` times, auto-incrementing
    // the trailing _NN suffix so each clone has a unique item_id.
    const qty = Math.max(1, Math.min(99, draftQty));

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

    const newItems = [...items, ...generated];
    setItems(newItems);
    pushHistory(newItems);
    setDraft(blankItem());
    setDraftQty(1);
    setShowAdd(false);
    if (user) appendSessionLog(user.username, "item_added", generated.map((g) => g.item_id).join(", "));
  }

  function cancelAdd() {
    setShowAdd(false);
    setEditingIdx(null);
    setItemError(null);
    setDraft(blankItem());
    setDraftQty(1);
  }

  function startEdit(idx: number) {
    setPendingDeleteIdx(null);
    setEditingIdx(idx);
    setDraft({ ...items[idx] });
    setDraftQty(1);
    setShowAdd(true);
    setItemError(null);
    setTimeout(() => {
      editFormRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }, 0);
  }

  // ── Truck dimension step/min based on current unit ──
  const truckDimStep = unit === "m" || unit === "in" ? 0.01 : 1;
  const truckDimMin  = unit === "m" || unit === "in" ? 0.001 : 1;

  // ── Undo/redo buttons for Cargo Items section header ──
  const undoRedoAction = (
    <div className="flex items-center gap-1">
      <button
        type="button"
        onClick={undo}
        disabled={historyIdx === 0}
        title="Undo (Ctrl+Z)"
        aria-label="Undo"
        className={`w-9 h-9 rounded-lg flex items-center justify-center transition-colors disabled:opacity-30 disabled:cursor-default ${
          lightMode
            ? "text-slate-600 hover:text-blue-700 hover:bg-blue-50 border border-slate-300 hover:border-blue-300"
            : "text-gray-400 hover:text-blue-300 hover:bg-blue-950/40 border border-gray-700 hover:border-blue-800"
        }`}
      >
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="1 4 1 10 7 10" />
          <path d="M3.51 15a9 9 0 1 0 .49-3.68" />
        </svg>
      </button>
      <button
        type="button"
        onClick={redo}
        disabled={historyIdx === itemHistory.current.length - 1}
        title="Redo (Ctrl+Y)"
        aria-label="Redo"
        className={`w-9 h-9 rounded-lg flex items-center justify-center transition-colors disabled:opacity-30 disabled:cursor-default ${
          lightMode
            ? "text-slate-600 hover:text-blue-700 hover:bg-blue-50 border border-slate-300 hover:border-blue-300"
            : "text-gray-400 hover:text-blue-300 hover:bg-blue-950/40 border border-gray-700 hover:border-blue-800"
        }`}
      >
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="23 4 23 10 17 10" />
          <path d="M20.49 15a9 9 0 1 1-.49-3.68" />
        </svg>
      </button>
    </div>
  );

  return (
    <div
      className={`relative flex flex-col pb-4 ${lightMode ? "bg-slate-50" : ""}`}
      onDragOver={(e) => { e.preventDefault(); if (!isDragging) setIsDragging(true); }}
      onDragLeave={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) setIsDragging(false);
      }}
      onDrop={onDrop}
    >
      {/* Drag-and-drop overlay */}
      {isDragging && (
        <div className={`absolute inset-0 z-30 flex flex-col items-center justify-center pointer-events-none border-4 border-dashed rounded-2xl ${
          lightMode
            ? "bg-blue-50/95 border-blue-500 text-blue-800"
            : "bg-blue-950/95 border-blue-400 text-blue-100"
        }`}>
          <svg className="w-16 h-16 mb-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="17 8 12 3 7 8" />
            <line x1="12" y1="3" x2="12" y2="15" />
          </svg>
          <div className="text-3xl font-bold mb-2">Drop your file here</div>
          <div className="text-base opacity-80">Excel or JSON file</div>
        </div>
      )}

      {/* ── Import bar ──────────────────────────────────────────────────────── */}
      <div className={`px-5 py-4 border-b-2 ${border} ${bg2} space-y-3`}>
        {/* Action buttons row */}
        <div className="flex items-center gap-2">
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
            className={`flex items-center gap-2 text-base font-semibold px-4 py-2.5 rounded-lg border-2 transition-colors ${
              lightMode
                ? "border-slate-300 bg-white text-slate-800 hover:bg-slate-100 hover:border-slate-400"
                : "border-gray-600 bg-gray-900 text-gray-200 hover:bg-gray-800 hover:border-gray-500"
            }`}
            title="Import a .xlsx, .xls, or .json manifest"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            Import Manifest
          </button>
          <button
            type="button"
            onClick={downloadManifestTemplate}
            className={`flex items-center gap-2 text-base font-semibold px-4 py-2.5 rounded-lg border-2 transition-colors ${
              lightMode
                ? "border-slate-300 bg-white text-slate-700 hover:bg-slate-100 hover:border-slate-400"
                : "border-gray-600 bg-gray-900 text-gray-200 hover:bg-gray-800 hover:border-gray-500"
            }`}
            title="Download a starter .xlsx template — fill it in and re-import"
          >
            <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            <span>
              Download Template
              <span className={`block text-[11px] font-normal leading-none mt-0.5 ${lightMode ? "text-slate-500" : "text-gray-400"}`}>.xlsx format</span>
            </span>
          </button>
        </div>

        {/* Drop zone */}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className={`w-full flex flex-col items-center justify-center gap-2 py-5 rounded-xl border-2 border-dashed transition-colors duration-150 cursor-pointer ${
            isDragging
              ? lightMode
                ? "border-blue-500 bg-blue-50"
                : "border-blue-500 bg-blue-900/30"
              : lightMode
                ? "border-blue-300 bg-white hover:border-blue-400 hover:bg-blue-50"
                : "border-blue-700 bg-gray-900/40 hover:border-blue-500 hover:bg-blue-950/30"
          }`}
          aria-label="Drop manifest file here or click to browse"
        >
          <svg
            className={`w-8 h-8 ${isDragging ? "text-blue-500" : lightMode ? "text-blue-400" : "text-blue-600"}`}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="16 16 12 12 8 16" />
            <line x1="12" y1="12" x2="12" y2="21" />
            <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3" />
          </svg>
          <div className="text-center leading-tight">
            <div className={`text-base font-semibold ${lightMode ? "text-slate-800" : "text-gray-200"}`}>
              Drop your manifest here
            </div>
            <div className={`text-sm mt-0.5 ${lightMode ? "text-slate-500" : "text-gray-400"}`}>
              or click to browse
            </div>
          </div>
          <div className={`text-xs ${lightMode ? "text-slate-400" : "text-gray-500"}`}>
            .xlsx · .xls · .json — max 10 MB
          </div>
        </button>
      </div>
      {importMessage && (
        <div className={`px-5 py-3 text-base border-b-2 ${border} ${
          importMessage.kind === "ok"
            ? lightMode ? "bg-green-50 text-green-800 border-green-200" : "bg-green-950 text-green-300"
            : lightMode ? "bg-red-50 text-red-800 border-red-200"       : "bg-red-950 text-red-300"
        }`}>
          {importMessage.text}
        </div>
      )}

      {/* ── Truck Specification ────────────────────────────────────────────── */}
      <Section
        title="Truck Specification"
        hint="Interior dimensions and payload limit."
        bg2={bg2}
        border={border}
        muted={muted}
        lightMode={lightMode}
      >
        {/* Unit toggle */}
        <div className="flex items-center justify-between mb-4">
          <span className={`text-sm ${muted}`}>Display unit</span>
          <UnitToggle unit={unit} onChange={setUnit} lightMode={lightMode} />
        </div>

        <div className="grid grid-cols-2 gap-3 mb-3">
          {(["W", "L", "H"] as const).map((k) => (
            <div key={k}>
              <label className={labelCls}>
                {k === "W" ? "Width" : k === "L" ? "Length" : "Height"} ({unit})
              </label>
              <NumberInput
                className={inputCls}
                min={truckDimMin}
                step={truckDimStep}
                value={toDisplay(truck[k], unit)}
                onChange={(n) => setTruckField(k, fromDisplay(n, unit))}
              />
            </div>
          ))}
          <div>
            <label className={labelCls}>Payload (kg)</label>
            <NumberInput
              className={inputCls}
              min={0}
              step={100}
              value={truck.payload_kg}
              onChange={(n) => setTruckField("payload_kg", n)}
            />
          </div>
        </div>
        <div className={`rounded-xl px-4 py-3 border ${
          lightMode ? "bg-slate-50 border-slate-200 text-slate-700" : "bg-gray-900 border-gray-800 text-gray-300"
        }`}>
          <div className="flex justify-between text-base">
            <span>Volume:</span>
            <span className="font-bold font-mono">{truckVol.toFixed(2)} m³</span>
          </div>
          <div className="flex justify-between text-base mt-1">
            <span>Cargo (theoretical):</span>
            <span className="font-bold font-mono">~{theoPct}%</span>
          </div>
        </div>
      </Section>

      {/* ── Delivery Stops ─────────────────────────────────────────────────── */}
      <Section
        title="Delivery Stops"
        hint="Listed in delivery order. Stop 1 is unloaded first."
        badge={stops.length}
        bg2={bg2}
        border={border}
        muted={muted}
        lightMode={lightMode}
      >
        <div className="space-y-3 mb-3">
          {stops.map((stop, i) => (
            <div key={stop.stop_id} className="flex items-center gap-2">
              <span
                className="w-11 h-11 rounded-xl text-lg font-bold flex items-center justify-center shrink-0 text-gray-950 leading-none shadow-sm"
                style={{
                  backgroundColor: badgeColor(stop.stop_id),
                  outline: lightMode ? "1.5px solid rgba(0,0,0,0.18)" : "none",
                  outlineOffset: "1px",
                }}
                aria-label={`Stop ${stop.stop_id}`}
              >
                {stop.stop_id}
              </span>
              <input
                className={`${inputCls} flex-1 min-w-0`}
                type="text"
                placeholder="Type the address"
                value={stop.address}
                onChange={(e) =>
                  setStops((s) =>
                    s.map((x, j) =>
                      j === i ? { ...x, address: e.target.value } : x,
                    ),
                  )
                }
              />
              <div className="flex flex-col gap-1 shrink-0">
                <button
                  onClick={() => moveStop(i, -1)}
                  disabled={i === 0}
                  title="Move up in the list"
                  aria-label="Move stop up"
                  className={`w-8 h-8 rounded-lg flex items-center justify-center disabled:opacity-25 disabled:cursor-default transition-colors ${
                    lightMode
                      ? "text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-300"
                      : "text-gray-400 hover:text-gray-100 hover:bg-gray-800 border border-gray-700"
                  }`}
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="18 15 12 9 6 15" />
                  </svg>
                </button>
                <button
                  onClick={() => moveStop(i, 1)}
                  disabled={i === stops.length - 1}
                  title="Move down in the list"
                  aria-label="Move stop down"
                  className={`w-8 h-8 rounded-lg flex items-center justify-center disabled:opacity-25 disabled:cursor-default transition-colors ${
                    lightMode
                      ? "text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-300"
                      : "text-gray-400 hover:text-gray-100 hover:bg-gray-800 border border-gray-700"
                  }`}
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </button>
              </div>
              {stops.length > 1 && (
                <button
                  onClick={() => removeStop(i)}
                  title="Remove this stop"
                  aria-label="Remove stop"
                  className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors shrink-0 ${
                    lightMode
                      ? "text-slate-500 hover:text-red-700 hover:bg-red-50 border border-slate-300 hover:border-red-300"
                      : "text-gray-500 hover:text-red-300 hover:bg-red-950/40 border border-gray-700 hover:border-red-800"
                  }`}
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              )}
            </div>
          ))}
        </div>
        <button
          onClick={addStop}
          className={`w-full text-base font-semibold border-2 border-dashed rounded-xl py-3.5 transition-colors flex items-center justify-center gap-2 ${
            lightMode
              ? "border-slate-300 text-slate-700 hover:text-slate-900 hover:border-slate-500 hover:bg-slate-50"
              : "border-gray-700 text-gray-300 hover:text-gray-100 hover:border-gray-500 hover:bg-gray-900"
          }`}
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Add another stop
        </button>
        <p className={`text-sm mt-3 leading-relaxed ${muted}`}>
          Stop 1 = first delivery (near door). Higher # = deeper in truck (LIFO).
        </p>
      </Section>

      {/* ── Cargo Items ────────────────────────────────────────────────────── */}
      <Section
        title="Cargo Items"
        hint="Furniture to be packed into the truck."
        badge={items.length}
        action={undoRedoAction}
        bg2={bg2}
        border={border}
        muted={muted}
        lightMode={lightMode}
      >
        {/* Unit toggle */}
        <div className="flex items-center justify-between mb-4">
          <span className={`text-sm ${muted}`}>Display unit</span>
          <UnitToggle unit={unit} onChange={setUnit} lightMode={lightMode} />
        </div>

        {items.length > 0 && (
          <div className={`rounded-xl border-2 ${border} mb-3 ${pendingDeleteIdx !== null ? "overflow-visible" : "overflow-hidden"}`}>
            <table className="w-full table-fixed">
              <thead>
                <tr className={`${bg2} border-b-2 ${border}`}>
                  <th className={`text-left px-3 py-3 font-bold text-sm ${lightMode ? "text-slate-700" : "text-gray-300"}`}>Item</th>
                  <th className={`text-right px-3 py-3 font-bold text-sm w-28 ${lightMode ? "text-slate-700" : "text-gray-300"}`}>
                    Size ({unit})
                  </th>
                  <th className={`text-center px-2 py-3 font-bold text-sm w-12 ${lightMode ? "text-slate-700" : "text-gray-300"}`}>Stop</th>
                  <th className="w-20" />
                </tr>
              </thead>
              <tbody>
                {items.map((item, i) => (
                  <tr
                    key={item.item_id}
                    onClick={() => startEdit(i)}
                    className={`relative border-t ${border} cursor-pointer transition-colors ${
                      pendingDeleteIdx === i
                        ? lightMode ? "bg-red-50" : "bg-red-950/30"
                        : editingIdx === i
                          ? lightMode ? "bg-blue-50" : "bg-blue-950/30"
                          : lightMode ? "hover:bg-slate-50" : "hover:bg-gray-800/30"
                    }`}
                  >
                    <td className="px-3 py-2.5" title={item.item_id}>
                      <div className={`break-all text-sm font-medium ${text}`}>{item.item_id}</div>
                      {(item.side_up || item.boxed || item.fragile) && (
                        <div className="flex items-center gap-1 mt-0.5 flex-wrap">
                          {item.side_up && (
                            <span
                              className={`inline-block text-[10px] font-bold px-1.5 py-px rounded ${
                                lightMode
                                  ? "bg-slate-100 text-slate-600 border border-slate-300"
                                  : "bg-gray-800 text-gray-300 border border-gray-700"
                              }`}
                              title="Side-up"
                            >↑</span>
                          )}
                          {item.boxed && (
                            <span
                              className={`inline-block text-[10px] font-bold px-1.5 py-px rounded ${
                                lightMode
                                  ? "bg-blue-100 text-blue-700 border border-blue-300"
                                  : "bg-blue-950 text-blue-200 border border-blue-800"
                              }`}
                              title="Boxed"
                            >BOX</span>
                          )}
                          {item.fragile && (
                            <span
                              className={`inline-block text-[10px] font-bold px-1.5 py-px rounded ${
                                lightMode
                                  ? "bg-amber-100 text-amber-700 border border-amber-300"
                                  : "bg-amber-950 text-amber-200 border border-amber-800"
                              }`}
                              title="Fragile"
                            >FRG</span>
                          )}
                        </div>
                      )}
                    </td>
                    <td className={`px-3 py-3 text-right text-sm font-mono truncate ${muted}`}>
                      {toDisplay(item.w, unit)}×{toDisplay(item.l, unit)}×{toDisplay(item.h, unit)}
                    </td>
                    <td className="px-2 py-3 text-center">
                      <span
                        className="inline-flex w-9 h-9 rounded-lg text-base font-bold items-center justify-center text-gray-950 leading-none shadow-sm"
                        style={{
                          backgroundColor: badgeColor(item.stop_id),
                          outline: lightMode ? "1.5px solid rgba(0,0,0,0.18)" : "none",
                          outlineOffset: "1px",
                        }}
                        aria-label={`Stop ${item.stop_id}`}
                      >
                        {item.stop_id}
                      </span>
                    </td>
                    <td className="pr-3 py-3 text-right overflow-visible">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={(e) => { e.stopPropagation(); startEdit(i); }}
                          title="Change this item"
                          aria-label={`Edit ${item.item_id}`}
                          className={`w-9 h-9 rounded-lg flex items-center justify-center transition-colors ${
                            lightMode
                              ? "text-slate-600 hover:text-blue-700 hover:bg-blue-50 border border-slate-300 hover:border-blue-300"
                              : "text-gray-400 hover:text-blue-300 hover:bg-blue-950/40 border border-gray-700 hover:border-blue-800"
                          }`}
                        >
                          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                          </svg>
                        </button>
                        <div className="relative">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              pendingDeleteIdx === i ? cancelDelete() : requestDelete(i);
                            }}
                            disabled={editingIdx === i}
                            title={pendingDeleteIdx === i ? "Cancel delete" : "Delete this item"}
                            aria-label={`Delete ${item.item_id}`}
                            className={`w-9 h-9 rounded-lg flex items-center justify-center transition-colors ${
                              editingIdx === i
                                ? (lightMode
                                    ? "opacity-30 cursor-not-allowed text-slate-600 border border-slate-300"
                                    : "opacity-30 cursor-not-allowed text-gray-400 border border-gray-700")
                                : pendingDeleteIdx === i
                                  ? lightMode
                                    ? "text-red-600 bg-red-50 border border-red-300"
                                    : "text-red-400 bg-red-950/40 border border-red-800"
                                  : lightMode
                                    ? "text-slate-600 hover:text-red-600 hover:bg-red-50 border border-slate-300 hover:border-red-300"
                                    : "text-gray-400 hover:text-red-400 hover:bg-red-950/30 border border-gray-700 hover:border-red-800"
                            }`}
                          >
                            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="3 6 5 6 21 6"/>
                              <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                              <path d="M10 11v6"/>
                              <path d="M14 11v6"/>
                              <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
                            </svg>
                          </button>
                          {pendingDeleteIdx === i && (
                            <div
                              className={`absolute bottom-full right-0 mb-2 w-44 rounded-xl shadow-xl border-2 p-3 z-20 ${
                                lightMode ? "bg-white border-gray-200" : "bg-gray-800 border-gray-700"
                              }`}
                              onClick={(e) => e.stopPropagation()}
                            >
                              <div className={`text-xs font-semibold truncate mb-1.5 ${lightMode ? "text-slate-500" : "text-gray-400"}`}>
                                {item.item_id}
                              </div>
                              <div className={`flex items-center gap-1.5 mb-3 ${lightMode ? "text-slate-900" : "text-gray-100"}`}>
                                <svg className="w-4 h-4 shrink-0 text-red-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                  <polyline points="3 6 5 6 21 6"/>
                                  <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                                  <path d="M10 11v6"/>
                                  <path d="M14 11v6"/>
                                  <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
                                </svg>
                                <span className="text-sm font-bold">Remove this item?</span>
                              </div>
                              <div className="flex flex-col gap-1.5">
                                <button
                                  onClick={(e) => { e.stopPropagation(); confirmDelete(i); }}
                                  className="w-full py-1.5 text-sm font-semibold rounded-lg bg-red-600 hover:bg-red-700 text-white transition-colors"
                                >
                                  Delete
                                </button>
                                <button
                                  onClick={(e) => { e.stopPropagation(); cancelDelete(); }}
                                  className={`w-full py-1.5 text-sm font-semibold rounded-lg border-2 transition-colors ${
                                    lightMode
                                      ? "border-slate-300 text-slate-700 hover:bg-slate-100"
                                      : "border-gray-700 text-gray-300 hover:bg-gray-800"
                                  }`}
                                >
                                  Cancel
                                </button>
                              </div>
                              <div className={`absolute bottom-[-6px] right-3 w-3 h-3 rotate-45 ${
                                lightMode
                                  ? "bg-white border-r-2 border-b-2 border-gray-200"
                                  : "bg-gray-800 border-r-2 border-b-2 border-gray-700"
                              }`} />
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {showAdd ? (
          <div ref={editFormRef}>
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
            unit={unit}
            inputCls={inputCls}
            labelCls={labelCls}
            lightMode={lightMode}
            isEditing={editingIdx !== null}
          />
          </div>
        ) : stops.length > 0 ? (
          <button
            onClick={() => setShowAdd(true)}
            className={`w-full text-base font-semibold border-2 border-dashed rounded-xl py-4 transition-colors flex items-center justify-center gap-2 ${
              lightMode
                ? "border-slate-300 text-slate-700 hover:text-slate-900 hover:border-slate-500 hover:bg-slate-50"
                : "border-gray-700 text-gray-300 hover:text-gray-100 hover:border-gray-500 hover:bg-gray-900"
            }`}
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Add Item
          </button>
        ) : (
          <p className={`text-base ${muted} text-center py-3`}>
            Add at least one stop before adding items.
          </p>
        )}
      </Section>

      {/* ── Big Solve button ───────────────────────────────────────────────── */}
      <div className="px-5 pt-3 pb-1">
        <button
          onClick={() => onSolve({ items, truck, stops })}
          disabled={loading || items.length === 0}
          className={`w-full py-5 text-xl font-bold rounded-2xl transition-all flex items-center justify-center gap-3 shadow-lg ${
            loading || items.length === 0
              ? lightMode
                ? "bg-slate-200 text-slate-400 cursor-not-allowed shadow-none"
                : "bg-gray-800 text-gray-500 cursor-not-allowed shadow-none"
              : "bg-blue-600 hover:bg-blue-700 text-white hover:shadow-xl"
          }`}
        >
          {loading ? (
            <>
              <span className="w-6 h-6 border-4 border-white/30 border-t-white rounded-full animate-spin" />
              Solving…
            </>
          ) : (
            <>
              <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="5 3 19 12 5 21 5 3" />
              </svg>
              Solve Packing Plan
            </>
          )}
        </button>
        {items.length === 0 && !loading && (
          <p className={`text-base ${muted} text-center mt-3`}>
            Add at least one item to solve.
          </p>
        )}
      </div>
    </div>
  );
}
