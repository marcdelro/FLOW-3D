import React from "react";
import type { PackingPlan, Placement, SolveStrategy } from "../types";

const STRATEGY_LABEL: Record<SolveStrategy, string> = {
  optimal:   "Optimal",
  balanced:  "Balanced",
  stability: "Stability",
};

const STRATEGY_BADGE_DARK: Record<SolveStrategy, string> = {
  optimal:   "bg-violet-950 text-violet-200 border border-violet-800",
  balanced:  "bg-teal-950 text-teal-200 border border-teal-800",
  stability: "bg-amber-950 text-amber-200 border border-amber-800",
};
const STRATEGY_BADGE_LIGHT: Record<SolveStrategy, string> = {
  optimal:   "bg-violet-100 text-violet-800 border border-violet-300",
  balanced:  "bg-teal-100 text-teal-800 border border-teal-300",
  stability: "bg-amber-100 text-amber-800 border border-amber-300",
};

function downloadPlan(plan: PackingPlan) {
  const blob = new Blob([JSON.stringify(plan, null, 2)], { type: "application/json" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href     = url;
  a.download = `flow3d_${plan.solver_mode}_${Date.now()}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

// ── Stop palette (mirrors TruckViewer) ──────────────────────────────────────
const STOP_STYLE: Record<number, { bg: string; border: string; text: string; bgLight: string; borderLight: string }> = {
  1: { bg: "#2d1a0e", border: "#7a4020", text: "#F0997B", bgLight: "#FEF0EB", borderLight: "#d4845a" },
  2: { bg: "#0e2420", border: "#2d6050", text: "#5DCAA5", bgLight: "#EDFAF5", borderLight: "#3da882" },
  3: { bg: "#1a1830", border: "#5a5895", text: "#8B82D8", bgLight: "#F3F2FC", borderLight: "#8880cc" },
  4: { bg: "#0d1e35", border: "#2a5085", text: "#60A5FA", bgLight: "#EFF6FF", borderLight: "#4488d8" },
  5: { bg: "#2a1e08", border: "#7a5510", text: "#D97706", bgLight: "#FFFBEB", borderLight: "#c49020" },
  6: { bg: "#2a0e20", border: "#7a3060", text: "#F472B6", bgLight: "#FDF2F8", borderLight: "#d05898" },
};
const DEFAULT_STYLE = { bg: "#1e1e1e", border: "#555550", text: "#888780", bgLight: "#F5F5F5", borderLight: "#aaaaaa" };
const stopStyle = (sid: number) => STOP_STYLE[sid] ?? DEFAULT_STYLE;

// ── Section header ──
function SectionHeader({
  title,
  hint,
  action,
  lightMode,
}: {
  title: string;
  hint?: string;
  action?: React.ReactNode;
  lightMode?: boolean;
}) {
  return (
    <div className={`flex items-start justify-between gap-3 px-5 py-4 border-b-2 sticky top-0 z-10 ${
      lightMode ? "border-slate-200 bg-white" : "border-gray-800 bg-gray-950"
    }`}>
      <div>
        <div className={`text-lg font-bold leading-tight ${lightMode ? "text-slate-900" : "text-gray-100"}`}>
          {title}
        </div>
        {hint && (
          <div className={`text-sm mt-0.5 leading-snug ${lightMode ? "text-slate-600" : "text-gray-400"}`}>
            {hint}
          </div>
        )}
      </div>
      {action}
    </div>
  );
}

function StatCard({
  value,
  unit,
  label,
  lightMode,
}: {
  value: string;
  unit?: string;
  label: string;
  lightMode?: boolean;
}) {
  return (
    <div className={`rounded-xl p-4 text-center border ${
      lightMode ? "bg-slate-50 border-slate-200" : "bg-gray-900 border-gray-800"
    }`}>
      <div className={`text-2xl font-bold leading-none ${lightMode ? "text-slate-900" : "text-white"}`}>
        {value}
        {unit && (
          <span className={`text-base font-semibold ml-1 ${lightMode ? "text-slate-500" : "text-gray-400"}`}>
            {unit}
          </span>
        )}
      </div>
      <div className={`text-sm mt-2 font-medium ${lightMode ? "text-slate-600" : "text-gray-400"}`}>{label}</div>
    </div>
  );
}

// ── Main component ──────────────────────────────────────────────────────────

interface DashboardProps {
  plan: PackingPlan;
  lightMode?: boolean;
}

export function Dashboard({ plan, lightMode = false }: DashboardProps) {
  const utilPct = Math.round(plan.v_util * 100);
  const packed  = plan.placements.filter((p) => p.is_packed);
  const total   = plan.placements.length;

  // Sum packed-item volumes (mm³ → m³) for the explicit utilized-volume readout.
  const packedVolM3 = packed.reduce(
    (s, p) => s + (p.w * p.l * p.h) / 1e9,
    0,
  );

  const byStop = packed.reduce<Record<number, Placement[]>>((acc, p) => {
    (acc[p.stop_id] ??= []).push(p);
    return acc;
  }, {});

  // Highest stop_id loaded first (sits deepest / nearest rear).
  const stopIds = Object.keys(byStop).map(Number).sort((a, b) => b - a);

  const barColor =
    utilPct >= 70 ? "#16a34a" : utilPct >= 40 ? "#d97706" : "#dc2626";

  return (
    <div className="flex flex-col">

      {/* ── Why this plan? ─────────────────────────────────────────────── */}
      {plan.rationale && (
        <>
          <SectionHeader
            title="Why This Plan"
            hint="Strategy rationale for this option."
            lightMode={lightMode}
          />
          <div className="px-5 py-4">
            <div className={`rounded-xl border-2 p-4 space-y-3 ${
              lightMode
                ? "border-slate-200 bg-slate-50"
                : "border-gray-800 bg-gray-900"
            }`}>
              <span
                className={`inline-block text-sm font-bold px-3 py-1 rounded-full ${
                  (lightMode ? STRATEGY_BADGE_LIGHT : STRATEGY_BADGE_DARK)[plan.strategy]
                  ?? (lightMode ? "bg-slate-200 text-slate-700" : "bg-gray-800 text-gray-300")
                }`}
              >
                {STRATEGY_LABEL[plan.strategy] ?? plan.strategy}
              </span>
              <p className={`text-base leading-relaxed ${lightMode ? "text-slate-700" : "text-gray-300"}`}>
                {plan.rationale}
              </p>
            </div>
          </div>
        </>
      )}

      {/* ── Performance ────────────────────────────────────────────────── */}
      <SectionHeader
        title="Performance"
        hint="Solver metrics for this plan."
        lightMode={lightMode}
        action={
          <button
            onClick={() => downloadPlan(plan)}
            className={`flex items-center gap-2 text-sm font-semibold px-3 py-2 rounded-lg border-2 transition-colors shrink-0 ${
              lightMode
                ? "border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
                : "border-gray-700 bg-gray-900 text-gray-200 hover:bg-gray-800"
            }`}
            title="Download packing plan as JSON"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            Export JSON
          </button>
        }
      />
      <div className="px-5 py-5 space-y-5">

        {/* Big utilization bar — % and m³ side by side */}
        <div className={`rounded-xl border-2 p-4 ${
          lightMode ? "bg-white border-slate-200" : "bg-gray-900 border-gray-800"
        }`}>
          <div className="flex items-baseline justify-between mb-3 gap-2">
            <span className={`text-base font-semibold ${lightMode ? "text-slate-700" : "text-gray-300"}`}>
              Volumetric Utilization
            </span>
            <div className="text-right">
              <span className="text-4xl font-bold font-mono leading-none" style={{ color: barColor }}>
                {utilPct}<span className="text-2xl">%</span>
              </span>
              <div className={`text-base font-mono mt-1.5 ${lightMode ? "text-slate-600" : "text-gray-400"}`}>
                {packedVolM3.toFixed(2)} m³ packed
              </div>
            </div>
          </div>
          <div className={`h-4 rounded-full overflow-hidden ${lightMode ? "bg-slate-200" : "bg-gray-800"}`}>
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{ width: `${utilPct}%`, backgroundColor: barColor }}
            />
          </div>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-3 gap-3">
          <StatCard
            value={String(plan.t_exec_ms)}
            unit="ms"
            label="Exec Time"
            lightMode={lightMode}
          />
          <div className={`rounded-xl p-4 text-center border flex flex-col items-center justify-center gap-2 ${
            lightMode ? "bg-slate-50 border-slate-200" : "bg-gray-900 border-gray-800"
          }`}>
            <span
              className={`text-base font-bold px-3 py-1 rounded-full ${
                plan.solver_mode === "ILP"
                  ? lightMode
                    ? "bg-violet-100 text-violet-800 border border-violet-300"
                    : "bg-violet-950 text-violet-200 border border-violet-800"
                  : lightMode
                    ? "bg-teal-100 text-teal-800 border border-teal-300"
                    : "bg-teal-950 text-teal-200 border border-teal-800"
              }`}
            >
              {plan.solver_mode}
            </span>
            <span className={`text-sm font-medium ${lightMode ? "text-slate-600" : "text-gray-400"}`}>Solver</span>
          </div>
          <StatCard
            value={`${packed.length}`}
            unit={`/ ${total}`}
            label="Packed"
            lightMode={lightMode}
          />
        </div>
      </div>

      {/* ── LIFO load sequence ────────────────────────────────────────── */}
      <SectionHeader
        title="LIFO Load Sequence"
        hint="Order items into the truck — rear to door."
        lightMode={lightMode}
      />
      <div className="px-5 py-5 space-y-4">

        {/* Instruction card */}
        <div className={`rounded-xl px-4 py-3.5 border-2 ${
          lightMode
            ? "bg-blue-50 border-blue-200"
            : "bg-blue-950/40 border-blue-900/60"
        }`}>
          <div className="flex items-start gap-3">
            <svg className={`w-6 h-6 shrink-0 mt-0.5 ${lightMode ? "text-blue-600" : "text-blue-400"}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="16" x2="12" y2="12" />
              <line x1="12" y1="8" x2="12.01" y2="8" />
            </svg>
            <div>
              <p className={`text-base font-bold ${lightMode ? "text-blue-900" : "text-blue-200"}`}>
                Loading order — rear to door
              </p>
              <p className={`text-sm mt-1 leading-relaxed ${lightMode ? "text-blue-800" : "text-blue-300"}`}>
                Step 1 is loaded first and sits at the truck rear. The last step
                loads near the door and is unloaded first on delivery.
              </p>
            </div>
          </div>
        </div>

        {stopIds.map((sid, i) => {
          const s        = stopStyle(sid);
          const its      = byStop[sid];
          const loadStep = i + 1;
          const isFirst  = i === 0;
          const isLast   = i === stopIds.length - 1 && stopIds.length > 1;
          return (
            <div
              key={sid}
              className="rounded-2xl border-2 p-5"
              style={{
                borderColor: lightMode ? s.borderLight : s.border,
                backgroundColor: lightMode ? s.bgLight : s.bg,
              }}
            >
              <div className="flex items-center justify-between mb-3 gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl font-bold text-gray-950 shrink-0 shadow"
                    style={{ backgroundColor: s.text }}
                    aria-hidden="true"
                  >
                    {loadStep}
                  </div>
                  <div className="min-w-0">
                    <div className="text-lg font-bold leading-tight" style={{ color: s.text }}>
                      Step {loadStep} · Stop {sid}
                    </div>
                    <div className={`text-sm leading-tight mt-0.5 ${lightMode ? "text-slate-600" : "text-gray-400"}`}>
                      {isFirst
                        ? "First in · sits at rear"
                        : isLast
                        ? "Last in · nearest door"
                        : `Step ${loadStep} of ${stopIds.length}`}
                    </div>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className={`text-3xl font-bold leading-none ${lightMode ? "text-slate-900" : "text-white"}`}>
                    {its.length}
                  </div>
                  <div className={`text-sm mt-1 ${lightMode ? "text-slate-600" : "text-gray-400"}`}>
                    item{its.length !== 1 ? "s" : ""}
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {its.map((p) => (
                  <span
                    key={p.item_id}
                    className={`text-base font-medium rounded-lg px-3 py-1.5 border-2 ${
                      lightMode ? "text-slate-800 bg-white" : "text-gray-100 bg-gray-950/60"
                    }`}
                    style={{
                      borderColor: lightMode ? s.borderLight : s.border,
                    }}
                  >
                    {p.item_id}
                  </span>
                ))}
              </div>
            </div>
          );
        })}

        {/* Direction guide: rear ↔ door */}
        <div className={`flex items-center gap-4 pt-4 mt-1 border-t-2 ${
          lightMode ? "border-slate-200" : "border-gray-800"
        }`}>
          <div className="text-center shrink-0">
            <div className={`text-base font-bold ${lightMode ? "text-slate-800" : "text-gray-200"}`}>
              Rear
            </div>
            <div className={`text-sm ${lightMode ? "text-slate-500" : "text-gray-500"}`}>Load first</div>
          </div>
          <div className="flex-1 flex items-center gap-2">
            <div className={`flex-1 h-1 rounded-full bg-gradient-to-r ${
              lightMode ? "from-slate-300 to-slate-200" : "from-gray-600 to-gray-700"
            }`} />
            <svg className={`w-6 h-6 ${lightMode ? "text-slate-500" : "text-gray-400"}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="5" y1="12" x2="19" y2="12" />
              <polyline points="12 5 19 12 12 19" />
            </svg>
          </div>
          <div className="text-center shrink-0">
            <div className={`text-base font-bold ${lightMode ? "text-slate-800" : "text-gray-200"}`}>
              Door
            </div>
            <div className={`text-sm ${lightMode ? "text-slate-500" : "text-gray-500"}`}>Unload first</div>
          </div>
        </div>
      </div>

      {/* ── Unplaced items ────────────────────────────────────────────── */}
      {plan.unplaced_items.length > 0 && (
        <>
          <SectionHeader
            title="Unplaced Items"
            hint="Items the solver could not fit."
            lightMode={lightMode}
          />
          <div className="px-5 py-5">
            <div className={`rounded-xl p-4 border-2 ${
              lightMode
                ? "bg-amber-50 border-amber-300"
                : "bg-amber-950/60 border-amber-800"
            }`}>
              <div className="flex items-start gap-3 mb-3">
                <svg className={`w-6 h-6 shrink-0 mt-0.5 ${lightMode ? "text-amber-700" : "text-amber-400"}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                  <line x1="12" y1="9" x2="12" y2="13" />
                  <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
                <p className={`text-base leading-relaxed font-semibold ${lightMode ? "text-amber-900" : "text-amber-200"}`}>
                  {plan.unplaced_items.length} item
                  {plan.unplaced_items.length > 1 ? "s" : ""} could not be packed —
                  truck capacity exceeded.
                </p>
              </div>
              <ul className="space-y-1.5 ml-9">
                {plan.unplaced_items.map((id) => (
                  <li key={id} className={`text-base font-mono ${lightMode ? "text-amber-900" : "text-amber-200"}`}>
                    · {id}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
