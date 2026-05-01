import type { PackingPlan } from "../types";

const PLAN_LABELS = ["A", "B", "C"] as const;

const PLAN_NAMES: Record<string, string> = {
  ILP: "Optimal",
  FFD: "Heuristic",
};

interface PlanSelectorProps {
  plans: PackingPlan[];
  selectedIdx: number;
  onSelect: (idx: number) => void;
  lightMode?: boolean;
}

export function PlanSelector({ plans, selectedIdx, onSelect, lightMode = false }: PlanSelectorProps) {
  return (
    <div className="px-4 py-4 space-y-3">
      <p className={`text-sm ${lightMode ? "text-gray-600" : "text-gray-400"}`}>
        Select a plan to preview in the 3D viewer.
      </p>
      <div className="grid grid-cols-3 gap-2">
        {plans.map((plan, i) => {
          const utilPct  = Math.round(plan.v_util * 100);
          const packed   = plan.placements.filter((p) => p.is_packed).length;
          const total    = plan.placements.length;
          const selected = i === selectedIdx;

          const barColor =
            utilPct >= 70 ? "#5DCAA5" : utilPct >= 40 ? "#FBBF24" : "#F0997B";

          return (
            <button
              key={i}
              onClick={() => onSelect(i)}
              className={`flex flex-col items-start gap-2.5 rounded-lg border p-4 text-left transition-all focus:outline-none ${
                selected
                  ? lightMode
                    ? "border-blue-600 bg-blue-50 ring-1 ring-blue-600/30"
                    : "border-blue-500 bg-blue-950/30 ring-1 ring-blue-500/40"
                  : lightMode
                    ? "border-gray-300 bg-white hover:border-gray-400 hover:bg-gray-50"
                    : "border-gray-700 bg-gray-900 hover:border-gray-600 hover:bg-gray-800/60"
              }`}
            >
              {/* Plan label + solver */}
              <div className="flex items-center justify-between w-full">
                <span className={`text-sm font-bold ${
                  selected
                    ? lightMode ? "text-blue-700" : "text-blue-300"
                    : lightMode ? "text-gray-800" : "text-gray-200"
                }`}>
                  Plan {PLAN_LABELS[i]}
                </span>
                <span
                  className={`text-xs font-bold px-1.5 py-0.5 rounded leading-none ${
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
              </div>

              {/* Util percentage */}
              <div className="w-full">
                <div className="flex items-baseline justify-between mb-1.5">
                  <span className="text-xl font-bold font-mono leading-none" style={{ color: barColor }}>
                    {utilPct}
                    <span className={`text-sm ${lightMode ? "text-gray-500" : "text-gray-400"}`}>%</span>
                  </span>
                </div>
                <div className={`h-1.5 rounded-full overflow-hidden ${lightMode ? "bg-gray-200" : "bg-gray-800"}`}>
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${utilPct}%`, backgroundColor: barColor }}
                  />
                </div>
              </div>

              {/* Stats */}
              <div className="w-full space-y-1">
                <div className="flex justify-between text-sm">
                  <span className={lightMode ? "text-gray-500" : "text-gray-400"}>Packed</span>
                  <span className={`font-mono ${lightMode ? "text-gray-800" : "text-gray-200"}`}>
                    {packed}/{total}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className={lightMode ? "text-gray-500" : "text-gray-400"}>Time</span>
                  <span className={`font-mono ${lightMode ? "text-gray-800" : "text-gray-200"}`}>
                    {plan.t_exec_ms}ms
                  </span>
                </div>
              </div>

              {/* Plan name tag */}
              <div className={`text-sm font-medium ${
                selected
                  ? lightMode ? "text-blue-600" : "text-blue-400"
                  : lightMode ? "text-gray-500" : "text-gray-400"
              }`}>
                {PLAN_NAMES[plan.solver_mode] ?? plan.solver_mode}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
