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
const STOP_STYLE: Record<number, { bg: string; border: string; text: string }> = {
  1: { bg: "#F0997B0f", border: "#F0997B35", text: "#F0997B" },
  2: { bg: "#5DCAA50f", border: "#5DCAA535", text: "#5DCAA5" },
  3: { bg: "#AFA9EC0f", border: "#AFA9EC35", text: "#AFA9EC" },
  4: { bg: "#60A5FA0f", border: "#60A5FA35", text: "#60A5FA" },
  5: { bg: "#FBBF240f", border: "#FBBF2435", text: "#FBBF24" },
  6: { bg: "#F472B60f", border: "#F472B635", text: "#F472B6" },
};
const DEFAULT_STYLE = { bg: "#8887800f", border: "#88878035", text: "#888780" };
const stopStyle = (sid: number) => STOP_STYLE[sid] ?? DEFAULT_STYLE;

// ── Shared sub-components ─────────────────────────────────────────────────────

function SectionHeader({ title, action }: { title: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between px-4 py-2 border-b border-gray-800 sticky top-0 bg-gray-950 z-10">
      <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
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
}: {
  value: string;
  unit?: string;
  label: string;
  mono?: boolean;
}) {
  return (
    <div className="bg-gray-900 rounded-lg p-2.5 text-center">
      <div className={`text-base font-bold text-white leading-tight ${mono ? "font-mono" : ""}`}>
        {value}
        {unit && <span className="text-xs text-gray-600 ml-0.5">{unit}</span>}
      </div>
      <div className="text-xs text-gray-600 mt-0.5">{label}</div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

interface DashboardProps {
  plan: PackingPlan;
}

export function Dashboard({ plan }: DashboardProps) {
  const utilPct    = Math.round(plan.v_util * 100);
  const packed     = plan.placements.filter((p) => p.is_packed);
  const total      = plan.placements.length;

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
        action={
          <button
            onClick={() => downloadPlan(plan)}
            className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-200 transition-colors px-2 py-1 rounded hover:bg-gray-800"
            title="Download packing plan as JSON"
          >
            <svg className="w-3 h-3" viewBox="0 0 16 16" fill="currentColor">
              <path d="M8 12l-4-4h2.5V3h3v5H12L8 12z"/>
              <path d="M3 13h10v1.5H3z"/>
            </svg>
            Export JSON
          </button>
        }
      />
      <div className="px-4 py-3 space-y-3">

        {/* Utilisation bar */}
        <div>
          <div className="flex items-baseline justify-between mb-1.5">
            <span className="text-xs text-gray-500">Volumetric Utilization</span>
            <span className="text-2xl font-bold font-mono text-white tracking-tight leading-none">
              {utilPct}
              <span className="text-base text-gray-500">%</span>
            </span>
          </div>
          <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{ width: `${utilPct}%`, backgroundColor: barColor }}
            />
          </div>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-3 gap-2">
          <StatCard value={String(plan.t_exec_ms)} unit="ms" label="Exec Time" mono />
          <div className="bg-gray-900 rounded-lg p-2.5 text-center flex flex-col items-center justify-center gap-1">
            <span
              className={`text-xs font-bold px-2 py-0.5 rounded ${
                plan.solver_mode === "ILP"
                  ? "bg-violet-950 text-violet-300"
                  : "bg-teal-950 text-teal-300"
              }`}
            >
              {plan.solver_mode}
            </span>
            <span className="text-xs text-gray-600">solver</span>
          </div>
          <StatCard
            value={`${packed.length}`}
            unit={`/${total}`}
            label="Packed"
            mono
          />
        </div>
      </div>

      {/* ── LIFO load sequence ────────────────────────────────────────────── */}
      <SectionHeader title="LIFO Load Sequence" />
      <div className="px-4 py-3 space-y-2">
        <p className="text-xs text-gray-600 mb-3">
          Higher stop&nbsp;# is loaded first and sits deepest (rear).
        </p>

        {stopIds.map((sid, i) => {
          const s   = stopStyle(sid);
          const its = byStop[sid];
          return (
            <div
              key={sid}
              className="rounded-lg border p-2.5"
              style={{ borderColor: s.border, backgroundColor: s.bg }}
            >
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span
                    className="w-4 h-4 rounded text-xs font-bold flex items-center justify-center text-gray-950 leading-none shrink-0"
                    style={{ backgroundColor: s.text }}
                  >
                    {sid}
                  </span>
                  <span
                    className="text-xs font-semibold"
                    style={{ color: s.text }}
                  >
                    Stop {sid}
                  </span>
                  {i === 0 && (
                    <span className="text-xs text-gray-600">· loaded first · rear</span>
                  )}
                  {i === stopIds.length - 1 && stopIds.length > 1 && (
                    <span className="text-xs text-gray-600">· near door</span>
                  )}
                </div>
                <span className="text-xs text-gray-600 font-mono shrink-0">
                  {its.length} item{its.length !== 1 ? "s" : ""}
                </span>
              </div>

              <div className="flex flex-wrap gap-1">
                {its.map((p) => (
                  <span
                    key={p.item_id}
                    className="text-xs font-mono bg-gray-950/60 border border-gray-800/40 rounded px-1.5 py-0.5 text-gray-300"
                  >
                    {p.item_id}
                  </span>
                ))}
              </div>
            </div>
          );
        })}

        {/* Rear–door direction indicator */}
        <div className="flex items-center gap-2 pt-1 text-xs text-gray-700">
          <span className="shrink-0">REAR</span>
          <div className="flex-1 border-t border-dashed border-gray-800" />
          <span className="shrink-0">DOOR</span>
        </div>
      </div>

      {/* ── Unplaced items warning ────────────────────────────────────────── */}
      {plan.unplaced_items.length > 0 && (
        <>
          <SectionHeader title="Unplaced Items" />
          <div className="px-4 py-3">
            <div className="bg-amber-950/20 border border-amber-900/40 rounded-lg p-3">
              <p className="text-xs text-amber-400 mb-2">
                {plan.unplaced_items.length} item
                {plan.unplaced_items.length > 1 ? "s" : ""} could not be
                packed — truck capacity exceeded.
              </p>
              <ul className="space-y-0.5">
                {plan.unplaced_items.map((id) => (
                  <li key={id} className="text-xs font-mono text-amber-300/70">
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
