import React from "react";
import type { PackingPlan, Placement } from "../types";

function downloadPlan(plan: PackingPlan) {
  const blob = new Blob([JSON.stringify(plan, null, 2)], { type: "application/json" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href     = url;
  a.download = `flow3d_${plan.solver_mode}_${Date.now()}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

// ── Stop palette (mirrors TruckViewer / tailwind config) ──────────────────────
const STOP_STYLE: Record<number, { bg: string; border: string; text: string; bgLight: string; borderLight: string }> = {
  1: { bg: "#F0997B0f", border: "#F0997B35", text: "#F0997B", bgLight: "#FEF0EB", borderLight: "#F0997B60" },
  2: { bg: "#5DCAA50f", border: "#5DCAA535", text: "#5DCAA5", bgLight: "#EDFAF5", borderLight: "#5DCAA560" },
  3: { bg: "#AFA9EC0f", border: "#AFA9EC35", text: "#8B82D8", bgLight: "#F3F2FC", borderLight: "#AFA9EC60" },
  4: { bg: "#60A5FA0f", border: "#60A5FA35", text: "#60A5FA", bgLight: "#EFF6FF", borderLight: "#60A5FA60" },
  5: { bg: "#FBBF240f", border: "#FBBF2435", text: "#D97706", bgLight: "#FFFBEB", borderLight: "#FBBF2460" },
  6: { bg: "#F472B60f", border: "#F472B635", text: "#F472B6", bgLight: "#FDF2F8", borderLight: "#F472B660" },
};
const DEFAULT_STYLE = { bg: "#8887800f", border: "#88878035", text: "#888780", bgLight: "#F9F9F9", borderLight: "#88878060" };
const stopStyle = (sid: number) => STOP_STYLE[sid] ?? DEFAULT_STYLE;

// ── Shared sub-components ─────────────────────────────────────────────────────

function SectionHeader({
  title,
  action,
  lightMode,
}: {
  title: string;
  action?: React.ReactNode;
  lightMode?: boolean;
}) {
  return (
    <div className={`flex items-center justify-between px-4 py-3 border-b sticky top-0 z-10 ${
      lightMode ? "border-gray-300 bg-white" : "border-gray-800 bg-gray-950"
    }`}>
      <span className={`text-sm font-semibold uppercase tracking-wider ${
        lightMode ? "text-gray-700" : "text-gray-300"
      }`}>
        {title}
      </span>
      {action}
    </div>
  );
}

function StatCard({
  value,
  unit,
  label,
  mono = false,
  lightMode,
}: {
  value: string;
  unit?: string;
  label: string;
  mono?: boolean;
  lightMode?: boolean;
}) {
  return (
    <div className={`rounded-lg p-3 text-center ${
      lightMode ? "bg-gray-100 border border-gray-200" : "bg-gray-900"
    }`}>
      <div className={`text-lg font-bold leading-tight ${mono ? "font-mono" : ""} ${
        lightMode ? "text-gray-900" : "text-white"
      }`}>
        {value}
        {unit && (
          <span className={`text-base ml-0.5 ${lightMode ? "text-gray-500" : "text-gray-300"}`}>
            {unit}
          </span>
        )}
      </div>
      <div className={`text-sm mt-1 ${lightMode ? "text-gray-600" : "text-gray-400"}`}>{label}</div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

interface DashboardProps {
  plan: PackingPlan;
  lightMode?: boolean;
}

export function Dashboard({ plan, lightMode = false }: DashboardProps) {
  const utilPct = Math.round(plan.v_util * 100);
  const packed  = plan.placements.filter((p) => p.is_packed);
  const total   = plan.placements.length;

  // Group packed items by stop_id
  const byStop = packed.reduce<Record<number, Placement[]>>((acc, p) => {
    (acc[p.stop_id] ??= []).push(p);
    return acc;
  }, {});

  // LIFO order: highest stop_id loaded first (sits deepest / nearest rear)
  const stopIds = Object.keys(byStop).map(Number).sort((a, b) => b - a);

  // Utilisation colour: green ≥70 %, amber ≥40 %, red below
  const barColor =
    utilPct >= 70 ? "#5DCAA5" : utilPct >= 40 ? "#FBBF24" : "#F0997B";

  return (
    <div className="flex flex-col">

      {/* ── Performance metrics ───────────────────────────────────────────── */}
      <SectionHeader
        title="Performance"
        lightMode={lightMode}
        action={
          <button
            onClick={() => downloadPlan(plan)}
            className={`flex items-center gap-1.5 text-sm transition-colors px-2.5 py-1.5 rounded ${
              lightMode
                ? "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                : "text-gray-400 hover:text-gray-100 hover:bg-gray-800"
            }`}
            title="Download packing plan as JSON"
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="currentColor">
              <path d="M8 12l-4-4h2.5V3h3v5H12L8 12z"/>
              <path d="M3 13h10v1.5H3z"/>
            </svg>
            Export JSON
          </button>
        }
      />
      <div className="px-4 py-4 space-y-4">

        {/* Utilisation bar */}
        <div>
          <div className="flex items-baseline justify-between mb-2">
            <span className={`text-sm ${lightMode ? "text-gray-600" : "text-gray-400"}`}>
              Volumetric Utilization
            </span>
            <span className={`text-2xl font-bold font-mono tracking-tight leading-none ${
              lightMode ? "text-gray-900" : "text-white"
            }`}>
              {utilPct}
              <span className={`text-base ${lightMode ? "text-gray-500" : "text-gray-400"}`}>%</span>
            </span>
          </div>
          <div className={`h-2.5 rounded-full overflow-hidden ${lightMode ? "bg-gray-200" : "bg-gray-800"}`}>
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{ width: `${utilPct}%`, backgroundColor: barColor }}
            />
          </div>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-3 gap-2">
          <StatCard value={String(plan.t_exec_ms)} unit="ms" label="Exec Time" mono lightMode={lightMode} />
          <div className={`rounded-lg p-3 text-center flex flex-col items-center justify-center gap-1.5 ${
            lightMode ? "bg-gray-100 border border-gray-200" : "bg-gray-900"
          }`}>
            <span
              className={`text-sm font-bold px-2.5 py-1 rounded ${
                plan.solver_mode === "ILP"
                  ? lightMode
                    ? "bg-violet-100 text-violet-700 border border-violet-300"
                    : "bg-violet-950 text-violet-300"
                  : lightMode
                    ? "bg-teal-100 text-teal-700 border border-teal-300"
                    : "bg-teal-950 text-teal-300"
              }`}
            >
              {plan.solver_mode}
            </span>
            <span className={`text-sm ${lightMode ? "text-gray-600" : "text-gray-400"}`}>solver</span>
          </div>
          <StatCard
            value={`${packed.length}`}
            unit={`/${total}`}
            label="Packed"
            mono
            lightMode={lightMode}
          />
        </div>
      </div>

      {/* ── LIFO load sequence ────────────────────────────────────────────── */}
      <SectionHeader title="LIFO Load Sequence" lightMode={lightMode} />
      <div className="px-4 py-4 space-y-3">

        {/* Instruction card */}
        <div className={`rounded-lg px-4 py-3 mb-1 border ${
          lightMode
            ? "bg-blue-50 border-blue-200"
            : "bg-gray-900/60 border-gray-700"
        }`}>
          <p className={`text-sm font-semibold ${lightMode ? "text-gray-800" : "text-gray-200"}`}>
            Loading order — rear to door
          </p>
          <p className={`text-sm mt-1 leading-relaxed ${lightMode ? "text-gray-600" : "text-gray-400"}`}>
            Step 1 is loaded first and sits at the truck rear. The last step loads near the door and is unloaded first on delivery.
          </p>
        </div>

        {stopIds.map((sid, i) => {
          const s        = stopStyle(sid);
          const its      = byStop[sid];
          const loadStep = i + 1;
          return (
            <div
              key={sid}
              className="rounded-lg border p-4"
              style={{
                borderColor: lightMode ? s.borderLight : s.border,
                backgroundColor: lightMode ? s.bgLight : s.bg,
              }}
            >
              {/* Card header: step counter + stop label + item count */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-xl font-bold text-gray-950 shrink-0 shadow-sm"
                    style={{ backgroundColor: s.text }}
                  >
                    {loadStep}
                  </div>
                  <div>
                    <div className="text-base font-semibold leading-tight" style={{ color: s.text }}>
                      Stop {sid}
                    </div>
                    <div className={`text-sm leading-tight mt-0.5 ${lightMode ? "text-gray-600" : "text-gray-400"}`}>
                      {i === 0
                        ? "First in · sits at rear"
                        : i === stopIds.length - 1 && stopIds.length > 1
                        ? "Last in · nearest door"
                        : `Step ${loadStep} of ${stopIds.length}`}
                    </div>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className={`text-2xl font-bold font-mono leading-none ${lightMode ? "text-gray-900" : "text-white"}`}>
                    {its.length}
                  </div>
                  <div className={`text-xs mt-0.5 ${lightMode ? "text-gray-500" : "text-gray-400"}`}>
                    item{its.length !== 1 ? "s" : ""}
                  </div>
                </div>
              </div>

              {/* Item chips — tinted with stop color */}
              <div className="flex flex-wrap gap-2">
                {its.map((p) => (
                  <span
                    key={p.item_id}
                    className={`text-sm font-mono rounded-md px-2.5 py-1 border ${
                      lightMode ? "text-gray-700" : "text-gray-200"
                    }`}
                    style={{
                      backgroundColor: lightMode ? s.bgLight : s.bg,
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

        {/* Rear → Door annotated direction bar */}
        <div className={`flex items-center gap-3 pt-3 mt-1 border-t ${
          lightMode ? "border-gray-300" : "border-gray-800"
        }`}>
          <div className="text-center shrink-0">
            <div className={`text-xs font-bold uppercase tracking-widest ${lightMode ? "text-gray-700" : "text-gray-300"}`}>
              Rear
            </div>
            <div className="text-xs text-gray-500 mt-0.5">Load first</div>
          </div>
          <div className="flex-1 flex items-center gap-1">
            <div className={`flex-1 h-px bg-gradient-to-r ${
              lightMode ? "from-gray-400 to-gray-300" : "from-gray-600 to-gray-700"
            }`} />
            <span className={`text-lg leading-none ${lightMode ? "text-gray-500" : "text-gray-400"}`}>→</span>
          </div>
          <div className="text-center shrink-0">
            <div className={`text-xs font-bold uppercase tracking-widest ${lightMode ? "text-gray-700" : "text-gray-300"}`}>
              Door
            </div>
            <div className="text-xs text-gray-500 mt-0.5">Unload first</div>
          </div>
        </div>
      </div>

      {/* ── Unplaced items warning ────────────────────────────────────────── */}
      {plan.unplaced_items.length > 0 && (
        <>
          <SectionHeader title="Unplaced Items" lightMode={lightMode} />
          <div className="px-4 py-4">
            <div className="bg-amber-950/20 border border-amber-900/40 rounded-lg p-3.5">
              <p className="text-sm text-amber-400 mb-2 leading-relaxed">
                {plan.unplaced_items.length} item
                {plan.unplaced_items.length > 1 ? "s" : ""} could not be
                packed — truck capacity exceeded.
              </p>
              <ul className="space-y-1">
                {plan.unplaced_items.map((id) => (
                  <li key={id} className="text-sm font-mono text-amber-300/70">
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
