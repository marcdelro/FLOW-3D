import type { PackingPlan } from "../types";

interface DashboardProps {
  plan: PackingPlan;
}

export function Dashboard({ plan }: DashboardProps) {
  const utilPct = Math.round(plan.v_util * 100);
  const modeClass =
    plan.solver_mode === "ILP"
      ? "bg-stop3 text-gray-900"
      : "bg-stop2 text-gray-900";

  return (
    <div className="p-4 bg-gray-900 border-t border-gray-800 space-y-3">
      <div>
        <div className="flex items-baseline justify-between mb-1">
          <span className="text-sm text-gray-400">Volumetric utilization</span>
          <span className="text-lg font-semibold text-gray-100">
            {utilPct}%
          </span>
        </div>
        <div className="h-2 bg-gray-800 rounded overflow-hidden">
          <div
            className="h-full bg-stop2"
            style={{ width: `${utilPct}%` }}
          />
        </div>
      </div>

      <div className="flex items-center gap-3">
        <span className="text-sm text-gray-400">Execution time</span>
        <span className="text-gray-100 font-mono">{plan.t_exec_ms} ms</span>
        <span
          className={`px-2 py-0.5 text-xs rounded font-semibold ${modeClass}`}
        >
          {plan.solver_mode}
        </span>
      </div>

      {plan.unplaced_items.length > 0 && (
        <div>
          <div className="text-sm text-gray-400 mb-1">
            Unplaced items ({plan.unplaced_items.length})
          </div>
          <ul className="text-sm text-gray-200 list-disc list-inside">
            {plan.unplaced_items.map((id) => (
              <li key={id}>{id}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
