import type { PackingPlan, SolveStrategy } from "../types";

const PLAN_LABELS = ["A", "B", "C"] as const;

const STRATEGY_NAMES: Record<SolveStrategy, string> = {
  optimal:   "Optimal",
  balanced:  "Balanced",
  stability: "Stability",
};

const STRATEGY_BLURB: Record<SolveStrategy, string> = {
  optimal:   "Maximizes volumetric utilization.",
  balanced:  "Fast and predictable packing.",
  stability: "Heavy items stay near the floor.",
};

interface PlanSelectorProps {
  plans: PackingPlan[];
  selectedIdx: number;
  onSelect: (idx: number) => void;
  lightMode?: boolean;
}

export function PlanSelector({ plans, selectedIdx, onSelect, lightMode = false }: PlanSelectorProps) {
  return (
    <div className="px-5 py-5 space-y-3">
      <div>
        <h2 className={`text-lg font-bold ${lightMode ? "text-slate-900" : "text-gray-100"}`}>
          Packing Plans
        </h2>
        <p className={`text-base mt-1 ${lightMode ? "text-slate-600" : "text-gray-400"}`}>
          Select a plan to preview in the 3D viewer.
        </p>
      </div>

      <div className="space-y-3">
        {plans.map((plan, i) => {
          const utilPct  = Math.round(plan.v_util * 100);
          const packed   = plan.placements.filter((p) => p.is_packed);
          const total    = plan.placements.length;
          const selected = i === selectedIdx;

          // Sum packed-item volumes (mm³ → m³).
          const packedVolM3 = packed.reduce(
            (s, p) => s + (p.w * p.l * p.h) / 1e9,
            0,
          );

          const barColor =
            utilPct >= 70 ? "#16a34a" : utilPct >= 40 ? "#d97706" : "#dc2626";

          return (
            <button
              key={i}
              onClick={() => onSelect(i)}
              aria-pressed={selected}
              className={`w-full flex flex-col gap-3 rounded-2xl border-2 p-5 text-left transition-all focus:outline-none ${
                selected
                  ? lightMode
                    ? "border-blue-600 bg-blue-50 shadow-md"
                    : "border-blue-500 bg-blue-950/40 shadow-md"
                  : lightMode
                    ? "border-slate-200 bg-white hover:border-slate-400 hover:bg-slate-50"
                    : "border-gray-700 bg-gray-900 hover:border-gray-500 hover:bg-gray-800/60"
              }`}
            >
              {/* Top row: label + strategy + solver badge */}
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-2.5">
                  <span className={`w-9 h-9 rounded-full flex items-center justify-center text-base font-bold ${
                    selected
                      ? "bg-blue-600 text-white"
                      : lightMode
                        ? "bg-slate-200 text-slate-700"
                        : "bg-gray-800 text-gray-300"
                  }`}>
                    {PLAN_LABELS[i]}
                  </span>
                  <div>
                    <div className={`text-base font-bold leading-tight ${
                      selected
                        ? lightMode ? "text-blue-700" : "text-blue-200"
                        : lightMode ? "text-slate-900" : "text-gray-100"
                    }`}>
                      {STRATEGY_NAMES[plan.strategy] ?? plan.strategy}
                    </div>
                    <div className={`text-sm leading-tight mt-0.5 ${lightMode ? "text-slate-600" : "text-gray-400"}`}>
                      {STRATEGY_BLURB[plan.strategy] ?? ""}
                    </div>
                  </div>
                </div>
                <span
                  className={`text-sm font-bold px-2.5 py-1 rounded-full leading-none ${
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
              </div>

              {/* Big utilization number + bar (with m³ next to %) */}
              <div className="w-full">
                <div className="flex items-baseline justify-between mb-2 gap-2">
                  <span className={`text-base font-semibold ${lightMode ? "text-slate-700" : "text-gray-300"}`}>
                    Volumetric Utilization
                  </span>
                  <div className="text-right">
                    <span className="text-3xl font-bold font-mono leading-none" style={{ color: barColor }}>
                      {utilPct}
                      <span className="text-xl">%</span>
                    </span>
                    <div className={`text-sm font-mono mt-1 ${lightMode ? "text-slate-600" : "text-gray-400"}`}>
                      {packedVolM3.toFixed(2)} m³
                    </div>
                  </div>
                </div>
                <div className={`h-3 rounded-full overflow-hidden ${lightMode ? "bg-slate-200" : "bg-gray-800"}`}>
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${utilPct}%`, backgroundColor: barColor }}
                  />
                </div>
              </div>

              {/* Stat row: packed / time */}
              <div className={`grid grid-cols-2 gap-2 pt-2 border-t ${lightMode ? "border-slate-200" : "border-gray-800"}`}>
                <Stat
                  label="Packed"
                  value={`${packed.length} / ${total}`}
                  lightMode={lightMode}
                />
                <Stat
                  label="Exec time"
                  value={`${plan.t_exec_ms} ms`}
                  lightMode={lightMode}
                />
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  lightMode,
}: {
  label: string;
  value: string;
  lightMode: boolean;
}) {
  return (
    <div>
      <div className={`text-sm ${lightMode ? "text-slate-500" : "text-gray-500"}`}>{label}</div>
      <div className={`text-base font-bold font-mono mt-0.5 ${lightMode ? "text-slate-900" : "text-gray-100"}`}>
        {value}
      </div>
    </div>
  );
}
