/**
 * Detailed loading screen shown in the main viewer while the solve pipeline
 * is running. Replaces the bare "spinner + 'Solving...'" placeholder with
 * a step-by-step explanation of what the system is doing on the user's
 * behalf, so the wait feels intentional instead of opaque.
 *
 * The progress bar is **time-estimated**, not server-reported — the solver
 * runs in Celery and we don't get incremental progress events. The
 * estimate is driven by the manifest size and elapses against an asymptote
 * so the bar never falsely claims completion before the result actually
 * arrives. When the parent flips `loading=false`, the bar snaps to 100%.
 */

import { useEffect, useState } from "react";

type Stage = {
  id: string;
  title: string;
  detail: string;
  /** Approximate fraction of total wait time consumed by this stage. */
  weight: number;
};

const STAGES: Stage[] = [
  {
    id: "validate",
    title: "Validating manifest",
    detail:
      "Checking truck dimensions, payload limit, item geometry, and stop sequence against the data contract.",
    weight: 0.05,
  },
  {
    id: "dispatch",
    title: "Dispatching to the solver",
    detail:
      "Submitting four parallel solve jobs (Optimal, Axle Balance, Stability, Baseline) to the background workers via Redis.",
    weight: 0.05,
  },
  {
    id: "optimal",
    title: "Running Optimal — ILP branch-and-bound",
    detail:
      "Gurobi explores the integer-linear formulation (3.5.2.1): non-overlap, route-sequenced LIFO, vertical support, fragile no-stacking, and payload constraints. Returns the best feasible packing under a 30 s budget.",
    weight: 0.7,
  },
  {
    id: "ffd",
    title: "Running Axle Balance and Stability — Route-Sequential FFD",
    detail:
      "Sorts items by stop, then by volume/weight; greedily places each at the first LIFO-feasible position. Axle Balance picks positions that minimise per-axle load variance; Stability presorts by weight so heavy items settle at z = 0.",
    weight: 0.1,
  },
  {
    id: "validate2",
    title: "Verifying plans with the independent ConstraintValidator",
    detail:
      "Re-checks boundary, non-overlap, LIFO, support, fragile, and payload invariants on every returned plan so the engine cannot ship an unchecked layout.",
    weight: 0.1,
  },
];

type Props = {
  lightMode?: boolean;
  /** Number of items being solved — drives the runtime estimate. */
  itemCount?: number;
};

/**
 * Asymptotic progress curve: approaches 95% over `expectedMs` and never
 * crosses it on its own. Caller flips `done` to snap to 100%.
 */
function easeProgress(elapsedMs: number, expectedMs: number): number {
  if (expectedMs <= 0) return 0.95;
  const k = elapsedMs / expectedMs;
  return Math.min(0.95, 1 - Math.exp(-1.8 * k));
}

export function SolveLoadingPanel({ lightMode = false, itemCount = 0 }: Props) {
  // Estimate: small manifests resolve in ~1 s, large ILP jobs ride the 30 s
  // GUROBI_TIME_LIMIT envelope. Linear interp between those two anchors.
  const expectedMs =
    itemCount <= 10 ? 1500
    : itemCount <= 20 ? 5000 + (itemCount - 10) * 2500
    : 30_000;

  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    const start = performance.now();
    const id = window.setInterval(() => {
      setElapsed(performance.now() - start);
    }, 120);
    return () => window.clearInterval(id);
  }, []);

  const progress = easeProgress(elapsed, expectedMs);
  const pct = Math.round(progress * 100);

  // Map progress fraction → active stage by cumulative weight.
  let cumulative = 0;
  let activeIdx = 0;
  for (let i = 0; i < STAGES.length; i++) {
    cumulative += STAGES[i].weight;
    if (progress <= cumulative) {
      activeIdx = i;
      break;
    }
    activeIdx = i;
  }

  const shell      = lightMode ? "bg-white border-slate-200" : "bg-gray-900 border-gray-800";
  const titleStyle = lightMode ? "text-slate-900" : "text-gray-100";
  const bodyStyle  = lightMode ? "text-slate-700" : "text-gray-300";
  const mutedStyle = lightMode ? "text-slate-500" : "text-gray-500";
  const track      = lightMode ? "bg-slate-200" : "bg-gray-800";
  const stepDone   = lightMode ? "text-emerald-600" : "text-emerald-400";
  const stepActive = lightMode ? "text-blue-700" : "text-blue-300";

  return (
    <div className="flex flex-col items-center justify-center h-full px-8 py-12 overflow-y-auto">
      <div className={`w-full max-w-2xl rounded-3xl border-2 shadow-xl p-8 ${shell}`}>
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <div className={`shrink-0 w-14 h-14 rounded-2xl flex items-center justify-center ${
            lightMode ? "bg-blue-50" : "bg-blue-950/50"
          }`}>
            <div className="w-9 h-9 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
          <div className="min-w-0">
            <div className={`text-2xl font-bold ${titleStyle}`}>
              Generating packing plans
            </div>
            <div className={`text-sm mt-0.5 ${bodyStyle}`}>
              {itemCount > 0
                ? `Solving ${itemCount} item${itemCount === 1 ? "" : "s"} across 4 DSS strategies.`
                : "Running the hybrid ILP / FFD pipeline on your manifest."}
            </div>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mb-2 flex items-baseline justify-between">
          <span className={`text-sm font-semibold ${bodyStyle}`}>Progress</span>
          <span className={`text-sm font-mono font-bold ${titleStyle}`}>{pct}%</span>
        </div>
        <div className={`w-full rounded-full overflow-hidden ${track}`} style={{ height: 10 }}>
          <div
            className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all duration-200 ease-out"
            style={{ width: `${pct}%` }}
          />
        </div>
        <div className={`mt-2 text-xs ${mutedStyle}`}>
          Estimated; actual time depends on manifest complexity and Gurobi's
          branch-and-bound search.
        </div>

        {/* Stage list */}
        <ol className="mt-6 space-y-3">
          {STAGES.map((stage, i) => {
            const done = i < activeIdx;
            const active = i === activeIdx;
            const icon = done ? (
              <svg className={`w-5 h-5 ${stepDone}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            ) : active ? (
              <div className="w-5 h-5 flex items-center justify-center">
                <div className="w-3.5 h-3.5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (
              <div className={`w-5 h-5 rounded-full border-2 ${lightMode ? "border-slate-300" : "border-gray-600"}`} />
            );

            return (
              <li key={stage.id} className="flex gap-3 items-start">
                <div className="shrink-0 mt-0.5">{icon}</div>
                <div className="flex-1 min-w-0">
                  <div className={`text-sm font-semibold ${
                    done ? stepDone : active ? stepActive : mutedStyle
                  }`}>
                    {stage.title}
                  </div>
                  {(active || done) && (
                    <div className={`text-xs mt-0.5 leading-relaxed ${bodyStyle}`}>
                      {stage.detail}
                    </div>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}
