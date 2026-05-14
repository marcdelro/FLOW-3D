import React, { useState } from "react";
import type { PackingPlan, Placement, SolveStrategy } from "../types";

const STRATEGY_LABEL: Record<SolveStrategy, string> = {
  optimal:      "Optimal",
  axle_balance: "Axle Balance",
  stability:    "Stability",
  baseline:     "Baseline (Naive)",
};

const STRATEGY_BADGE_DARK: Record<SolveStrategy, string> = {
  optimal:      "bg-violet-950 text-violet-200 border border-violet-800",
  axle_balance: "bg-teal-950 text-teal-200 border border-teal-800",
  stability:    "bg-amber-950 text-amber-200 border border-amber-800",
  baseline:     "bg-slate-800 text-slate-300 border border-slate-600",
};
const STRATEGY_BADGE_LIGHT: Record<SolveStrategy, string> = {
  optimal:      "bg-violet-100 text-violet-800 border border-violet-300",
  axle_balance: "bg-teal-100 text-teal-800 border border-teal-300",
  stability:    "bg-amber-100 text-amber-800 border border-amber-300",
  baseline:     "bg-slate-100 text-slate-700 border border-slate-300",
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
    <div className={`rounded-xl p-3 text-center border ${
      lightMode ? "bg-slate-50 border-slate-200" : "bg-gray-900 border-gray-800"
    }`}>
      <div className={`text-xl font-bold leading-none ${lightMode ? "text-slate-900" : "text-white"}`}>
        {value}
        {unit && (
          <span className={`text-sm font-semibold ml-1 ${lightMode ? "text-slate-500" : "text-gray-400"}`}>
            {unit}
          </span>
        )}
      </div>
      <div className={`text-xs mt-1.5 font-medium ${lightMode ? "text-slate-600" : "text-gray-400"}`}>{label}</div>
    </div>
  );
}

// ── Sub-tab strip ───────────────────────────────────────────────────────────

type SubTab = "overview" | "sequence" | "issues";

function SubTabStrip({
  tab,
  onChange,
  hasIssues,
  lightMode,
}: {
  tab: SubTab;
  onChange: (t: SubTab) => void;
  hasIssues: boolean;
  lightMode?: boolean;
}) {
  const tabs: { key: SubTab; label: string; badge?: number; icon: React.ReactNode }[] = [
    {
      key: "overview", label: "Overview",
      icon: (
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 3v18h18" /><path d="M7 14l4-4 4 4 5-5" />
        </svg>
      ),
    },
    {
      key: "sequence", label: "Sequence",
      icon: (
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" />
          <circle cx="4" cy="6" r="1.5" /><circle cx="4" cy="12" r="1.5" /><circle cx="4" cy="18" r="1.5" />
        </svg>
      ),
    },
  ];
  if (hasIssues) {
    tabs.push({
      key: "issues", label: "Issues",
      icon: (
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
          <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
      ),
    });
  }

  return (
    <div className={`grid sticky top-0 z-10 border-b-2 ${
      lightMode ? "border-slate-200 bg-white" : "border-gray-800 bg-gray-950"
    }`} style={{ gridTemplateColumns: `repeat(${tabs.length}, minmax(0, 1fr))` }}>
      {tabs.map((t) => {
        const active = tab === t.key;
        const isIssues = t.key === "issues";
        return (
          <button
            key={t.key}
            onClick={() => onChange(t.key)}
            className={`flex items-center justify-center gap-2 px-3 py-2.5 text-sm font-semibold border-b-2 transition-colors ${
              active
                ? lightMode
                  ? "border-blue-600 text-blue-700 bg-blue-50"
                  : "border-blue-500 text-blue-200 bg-blue-950/40"
                : lightMode
                  ? "border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                  : "border-transparent text-gray-400 hover:text-gray-100 hover:bg-gray-900/60"
            }`}
          >
            <span className={isIssues ? (lightMode ? "text-amber-600" : "text-amber-400") : ""}>
              {t.icon}
            </span>
            {t.label}
          </button>
        );
      })}
    </div>
  );
}

// ── Main component ──────────────────────────────────────────────────────────

interface DashboardProps {
  plan: PackingPlan;
  lightMode?: boolean;
}

export function Dashboard({ plan, lightMode = false }: DashboardProps) {
  const [subTab, setSubTab] = useState<SubTab>("overview");

  const utilPct = Math.round(plan.v_util * 100);
  const packed  = plan.placements.filter((p) => p.is_packed);
  const total   = plan.placements.length;
  const packedVolM3 = packed.reduce((s, p) => s + (p.w * p.l * p.h) / 1e9, 0);
  const byStop = packed.reduce<Record<number, Placement[]>>((acc, p) => {
    (acc[p.stop_id] ??= []).push(p);
    return acc;
  }, {});
  const stopIds = Object.keys(byStop).map(Number).sort((a, b) => b - a);
  const hasIssues = plan.unplaced_items.length > 0;
  const barColor =
    utilPct >= 70 ? "#16a34a" : utilPct >= 40 ? "#d97706" : "#dc2626";

  // If "issues" gets hidden, fall back to overview.
  const effectiveTab: SubTab = subTab === "issues" && !hasIssues ? "overview" : subTab;

  return (
    <div className="flex flex-col">
      <SubTabStrip tab={effectiveTab} onChange={setSubTab} hasIssues={hasIssues} lightMode={lightMode} />

      {effectiveTab === "overview" && (
        <div className="px-5 py-4 space-y-3">
          {/* Rationale */}
          {plan.rationale && (
            <div className={`rounded-xl border-2 p-3.5 space-y-2 ${
              lightMode ? "border-slate-200 bg-slate-50" : "border-gray-800 bg-gray-900"
            }`}>
              <div className="flex items-center justify-between gap-2">
                <span className={`text-xs font-bold uppercase tracking-wide ${lightMode ? "text-slate-500" : "text-gray-400"}`}>
                  Why this plan
                </span>
                <span
                  className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                    (lightMode ? STRATEGY_BADGE_LIGHT : STRATEGY_BADGE_DARK)[plan.strategy]
                    ?? (lightMode ? "bg-slate-200 text-slate-700" : "bg-gray-800 text-gray-300")
                  }`}
                >
                  {STRATEGY_LABEL[plan.strategy] ?? plan.strategy}
                </span>
              </div>
              <p className={`text-sm leading-relaxed ${lightMode ? "text-slate-700" : "text-gray-300"}`}>
                {plan.rationale}
              </p>
            </div>
          )}

          {/* Utilization bar */}
          <div className={`rounded-xl border-2 p-3 ${
            lightMode ? "bg-white border-slate-200" : "bg-gray-900 border-gray-800"
          }`}>
            <div className="flex items-baseline justify-between mb-2 gap-2">
              <span className={`text-sm font-semibold ${lightMode ? "text-slate-700" : "text-gray-300"}`}>
                Volumetric Utilization
              </span>
              <div className="text-right">
                <span className="text-2xl font-bold font-mono leading-none" style={{ color: barColor }}>
                  {utilPct}<span className="text-base">%</span>
                </span>
                <div className={`text-xs font-mono mt-0.5 ${lightMode ? "text-slate-600" : "text-gray-400"}`}>
                  {packedVolM3.toFixed(2)} m³ packed
                </div>
              </div>
            </div>
            <div className={`h-2.5 rounded-full overflow-hidden ${lightMode ? "bg-slate-200" : "bg-gray-800"}`}>
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{ width: `${utilPct}%`, backgroundColor: barColor }}
              />
            </div>
          </div>

          {/* Stat cards */}
          <div className="grid grid-cols-4 gap-2">
            <StatCard value={String(plan.t_exec_ms)} unit="ms" label="Exec Time" lightMode={lightMode} />
            <div className={`rounded-xl p-3 text-center border flex flex-col items-center justify-center gap-1.5 ${
              lightMode ? "bg-slate-50 border-slate-200" : "bg-gray-900 border-gray-800"
            }`}>
              <span
                className={`text-sm font-bold px-2.5 py-0.5 rounded-full ${
                  plan.solver_mode === "ILP"
                    ? lightMode
                      ? "bg-violet-100 text-violet-800 border border-violet-300"
                      : "bg-violet-950 text-violet-200 border border-violet-800"
                    : plan.solver_mode === "BASELINE"
                      ? lightMode
                        ? "bg-slate-100 text-slate-700 border border-slate-300"
                        : "bg-slate-800 text-slate-300 border border-slate-600"
                      : lightMode
                        ? "bg-teal-100 text-teal-800 border border-teal-300"
                        : "bg-teal-950 text-teal-200 border border-teal-800"
                }`}
              >
                {plan.solver_mode}
              </span>
              <span className={`text-xs font-medium ${lightMode ? "text-slate-600" : "text-gray-400"}`}>Solver</span>
            </div>
            <StatCard value={`${packed.length}`} unit={`/ ${total}`} label="Packed" lightMode={lightMode} />
            <StatCard
              value={`${Math.round((plan.success_rate ?? (total > 0 ? packed.length / total : 1)) * 100)}`}
              unit="%"
              label="Success Rate"
              lightMode={lightMode}
            />
          </div>

          {/* Export */}
          <button
            onClick={() => downloadPlan(plan)}
            className={`w-full flex items-center justify-center gap-2 text-sm font-semibold px-3 py-2.5 rounded-xl border-2 transition-colors ${
              lightMode
                ? "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                : "border-gray-700 bg-gray-900 text-gray-200 hover:bg-gray-800"
            }`}
            title="Download packing plan as JSON"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            Export plan as JSON
          </button>
        </div>
      )}

      {effectiveTab === "sequence" && (
        <div className="px-5 py-4 space-y-2.5">
          {/* Compact LIFO direction guide at top */}
          <div className={`rounded-xl px-3.5 py-2.5 border-2 flex items-center gap-3 ${
            lightMode ? "bg-blue-50 border-blue-200" : "bg-blue-950/40 border-blue-900/60"
          }`}>
            <div className="text-center shrink-0">
              <div className={`text-xs font-bold ${lightMode ? "text-blue-900" : "text-blue-200"}`}>Rear</div>
              <div className={`text-[10px] ${lightMode ? "text-blue-700" : "text-blue-300"}`}>Load first</div>
            </div>
            <div className="flex-1 flex items-center gap-2">
              <div className={`flex-1 h-0.5 rounded-full ${lightMode ? "bg-blue-300" : "bg-blue-700"}`} />
              <svg className={`w-4 h-4 ${lightMode ? "text-blue-700" : "text-blue-300"}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="12 5 19 12 12 19" />
              </svg>
            </div>
            <div className="text-center shrink-0">
              <div className={`text-xs font-bold ${lightMode ? "text-blue-900" : "text-blue-200"}`}>Door</div>
              <div className={`text-[10px] ${lightMode ? "text-blue-700" : "text-blue-300"}`}>Unload first</div>
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
                className="rounded-xl border-2 p-3"
                style={{
                  borderColor: lightMode ? s.borderLight : s.border,
                  backgroundColor: lightMode ? s.bgLight : s.bg,
                }}
              >
                <div className="flex items-center justify-between mb-2 gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className="w-9 h-9 rounded-lg flex items-center justify-center text-base font-bold text-gray-950 shrink-0"
                      style={{ backgroundColor: s.text }}
                      aria-hidden="true"
                    >
                      {loadStep}
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-bold leading-tight" style={{ color: s.text }}>
                        Step {loadStep} · Stop {sid}
                      </div>
                      <div className={`text-xs leading-tight mt-0.5 ${lightMode ? "text-slate-600" : "text-gray-400"}`}>
                        {isFirst
                          ? "First in · sits at rear"
                          : isLast
                          ? "Last in · nearest door"
                          : `Step ${loadStep} of ${stopIds.length}`}
                      </div>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className={`text-lg font-bold leading-none ${lightMode ? "text-slate-900" : "text-white"}`}>
                      {its.length}
                    </div>
                    <div className={`text-xs mt-0.5 ${lightMode ? "text-slate-600" : "text-gray-400"}`}>
                      item{its.length !== 1 ? "s" : ""}
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {its.map((p) => (
                    <span
                      key={p.item_id}
                      className={`text-xs font-medium rounded-md px-2 py-0.5 border ${
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
        </div>
      )}

      {effectiveTab === "issues" && hasIssues && (
        <div className="px-5 py-4">
          <div className={`rounded-xl p-3.5 border-2 ${
            lightMode ? "bg-amber-50 border-amber-300" : "bg-amber-950/60 border-amber-800"
          }`}>
            <div className="flex items-start gap-3 mb-3">
              <svg className={`w-5 h-5 shrink-0 mt-0.5 ${lightMode ? "text-amber-700" : "text-amber-400"}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
              <p className={`text-sm leading-relaxed font-semibold ${lightMode ? "text-amber-900" : "text-amber-200"}`}>
                {plan.unplaced_items.length} item
                {plan.unplaced_items.length > 1 ? "s" : ""} could not be packed under the
                active constraints. Open <span className="font-bold">Explain → Constraints</span>{" "}
                to see why.
              </p>
            </div>
            <ul className="space-y-1 ml-8">
              {plan.unplaced_items.map((id) => (
                <li key={id} className={`text-sm font-mono ${lightMode ? "text-amber-900" : "text-amber-200"}`}>
                  · {id}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
