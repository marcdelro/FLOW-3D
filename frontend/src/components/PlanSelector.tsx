import type { PackingPlan, SolveStrategy } from "../types";
import { formatExecTimeStr } from "../lib/format";
import { SuccessRateBar } from "./SuccessRateBar";

const STRATEGY_NAMES: Record<SolveStrategy, string> = {
  optimal:      "Optimal",
  axle_balance: "Axle Balance",
  stability:    "Stability",
  baseline:     "Baseline (Naive)",
};

const STRATEGY_BLURB: Record<SolveStrategy, string> = {
  optimal:      "Maximises volumetric utilization.",
  axle_balance: "Distributes mass evenly across axles.",
  stability:    "Heavy items rest near the floor.",
  baseline:     "Naive first-fit — comparison only.",
};

/**
 * Strategy-themed accents — replace the previous generic A/B/C/D letter badge
 * so a glance at the card communicates which DSS strategy produced the plan.
 *
 * `lightBg / darkBg / lightFg / darkFg` are the icon tile background and
 * foreground colour pairs; `dot` is a small accent pip used in the bar
 * region to tie the row visually back to its strategy.
 */
const STRATEGY_ACCENT: Record<
  SolveStrategy,
  { lightBg: string; darkBg: string; lightFg: string; darkFg: string }
> = {
  optimal: {
    lightBg: "bg-violet-100",
    darkBg:  "bg-violet-950/60",
    lightFg: "text-violet-700",
    darkFg:  "text-violet-300",
  },
  axle_balance: {
    lightBg: "bg-sky-100",
    darkBg:  "bg-sky-950/60",
    lightFg: "text-sky-700",
    darkFg:  "text-sky-300",
  },
  stability: {
    lightBg: "bg-amber-100",
    darkBg:  "bg-amber-950/60",
    lightFg: "text-amber-700",
    darkFg:  "text-amber-300",
  },
  baseline: {
    lightBg: "bg-slate-200",
    darkBg:  "bg-gray-800",
    lightFg: "text-slate-700",
    darkFg:  "text-gray-300",
  },
};

/** Inline SVG icons sized to fit the 36 px tile. */
function StrategyIcon({ strategy }: { strategy: SolveStrategy }) {
  const common = {
    className: "w-5 h-5",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2.2,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
  switch (strategy) {
    case "optimal":
      // Densely-packed cubes
      return (
        <svg {...common}>
          <path d="M3 7l9-4 9 4-9 4-9-4z" />
          <path d="M3 17l9 4 9-4" />
          <path d="M3 12l9 4 9-4" />
        </svg>
      );
    case "axle_balance":
      // Balanced scale
      return (
        <svg {...common}>
          <line x1="12" y1="3" x2="12" y2="21" />
          <line x1="5" y1="6" x2="19" y2="6" />
          <path d="M5 6l-2 6a3 3 0 006 0z" />
          <path d="M19 6l-2 6a3 3 0 006 0z" />
        </svg>
      );
    case "stability":
      // Weight-down anchor
      return (
        <svg {...common}>
          <circle cx="12" cy="5" r="2" />
          <line x1="12" y1="7" x2="12" y2="21" />
          <path d="M5 14a7 7 0 0014 0" />
          <line x1="3" y1="14" x2="7" y2="14" />
          <line x1="17" y1="14" x2="21" y2="14" />
        </svg>
      );
    case "baseline":
      // Dotted comparison
      return (
        <svg {...common}>
          <circle cx="6" cy="12" r="1.5" />
          <circle cx="12" cy="12" r="1.5" />
          <circle cx="18" cy="12" r="1.5" />
        </svg>
      );
  }
}

interface PlanSelectorProps {
  plans: PackingPlan[];
  selectedIdx: number;
  onSelect: (idx: number) => void;
  lightMode?: boolean;
}

export function PlanSelector({ plans, selectedIdx, onSelect, lightMode = false }: PlanSelectorProps) {
  // Pre-compute the index of the highest-V_util non-baseline plan so we can
  // award it a "Best fit" ribbon. Baseline is excluded by design — it would
  // sometimes win on V_util by violating LIFO/support, which is the very
  // thing the thesis comparison is meant to expose, not crown.
  const bestIdx = plans.reduce<number | null>((best, plan, i) => {
    if (plan.strategy === "baseline") return best;
    if (best === null) return i;
    return plan.v_util > plans[best].v_util ? i : best;
  }, null);

  return (
    <div className="px-5 py-4 space-y-2.5">
      <div>
        <h2 className={`text-lg font-bold ${lightMode ? "text-slate-900" : "text-gray-100"}`}>
          Packing Plans
        </h2>
        <p className={`text-sm mt-0.5 ${lightMode ? "text-slate-600" : "text-gray-400"}`}>
          Select a plan to preview in the 3D viewer.
        </p>
      </div>

      <div className="space-y-2">
        {plans.map((plan, i) => {
          const utilPct  = Math.round(plan.v_util * 100);
          const packed   = plan.placements.filter((p) => p.is_packed);
          const total    = plan.placements.length;
          const selected = i === selectedIdx;
          const isBest   = i === bestIdx;
          const accent   = STRATEGY_ACCENT[plan.strategy] ?? STRATEGY_ACCENT.baseline;

          const packedVolM3 = packed.reduce(
            (s, p) => s + (p.w * p.l * p.h) / 1e9,
            0,
          );

          const successRatio = plan.success_rate ?? (total > 0 ? packed.length / total : 1);
          const successPct = Math.round(successRatio * 100);

          const utilBarColor =
            utilPct >= 70 ? "#16a34a" : utilPct >= 40 ? "#d97706" : "#dc2626";

          return (
            <button
              key={i}
              onClick={() => onSelect(i)}
              aria-pressed={selected}
              className={`relative w-full flex flex-col gap-3 rounded-2xl border-2 p-3.5 text-left transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 ${
                selected
                  ? lightMode
                    ? "border-blue-600 bg-blue-50 shadow-md"
                    : "border-blue-500 bg-blue-950/40 shadow-md"
                  : lightMode
                    ? "border-slate-200 bg-white hover:border-slate-400 hover:bg-slate-50"
                    : "border-gray-700 bg-gray-900 hover:border-gray-500 hover:bg-gray-800/60"
              }`}
            >
              {/* Best-fit ribbon — only on the non-baseline plan with highest V_util */}
              {isBest && (
                <span className={`absolute -top-2.5 right-3 text-[10px] font-bold tracking-wide px-2 py-0.5 rounded-full uppercase ${
                  lightMode
                    ? "bg-emerald-600 text-white shadow-sm"
                    : "bg-emerald-500 text-emerald-950 shadow"
                }`}>
                  Best fit
                </span>
              )}

              {/* Header row: strategy icon + name + solver-mode badge */}
              <div className="flex items-center justify-between gap-3 w-full">
                <div className="flex items-center gap-3 min-w-0">
                  <span
                    className={`shrink-0 w-10 h-10 rounded-xl flex items-center justify-center ${
                      lightMode ? accent.lightBg : accent.darkBg
                    } ${lightMode ? accent.lightFg : accent.darkFg}`}
                    aria-hidden
                  >
                    <StrategyIcon strategy={plan.strategy} />
                  </span>
                  <div className="min-w-0">
                    <div className={`text-base font-bold leading-tight truncate ${
                      selected
                        ? lightMode ? "text-blue-700" : "text-blue-200"
                        : lightMode ? "text-slate-900" : "text-gray-100"
                    }`}>
                      {STRATEGY_NAMES[plan.strategy] ?? plan.strategy}
                    </div>
                    <div className={`text-xs leading-tight mt-0.5 truncate ${lightMode ? "text-slate-600" : "text-gray-400"}`}>
                      {STRATEGY_BLURB[plan.strategy] ?? ""}
                    </div>
                  </div>
                </div>
                <span
                  className={`shrink-0 text-[11px] font-bold px-2 py-0.5 rounded-full leading-none tracking-wide ${
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
              </div>

              {/* Paired bars — V_util and Success Rate share the same layout so
                  the eye can compare them side by side across plans. */}
              <div className="space-y-2.5">
                <BarRow
                  label="Volumetric Utilization"
                  trailing={`${utilPct}% · ${packedVolM3.toFixed(2)} m³`}
                  pct={utilPct}
                  color={utilBarColor}
                  lightMode={lightMode}
                />
                <div>
                  <div className="flex items-baseline justify-between mb-1">
                    <span className={`text-xs font-semibold ${lightMode ? "text-slate-700" : "text-gray-300"}`}>
                      Manifest Fulfilment
                    </span>
                    <span className={`text-xs font-mono ${lightMode ? "text-slate-600" : "text-gray-400"}`}>
                      {successPct}% · {packed.length} / {total}
                    </span>
                  </div>
                  <SuccessRateBar value={successRatio} lightMode={lightMode} height={6} />
                </div>
              </div>

              {/* Stat strip — same fields as before but with the formatted
                  T_exec so 30,021 ms renders as 30.0 s. */}
              <div className={`grid grid-cols-2 gap-2 pt-2 border-t ${lightMode ? "border-slate-200" : "border-gray-800"}`}>
                <Stat label="Exec time" value={formatExecTimeStr(plan.t_exec_ms)} lightMode={lightMode} />
                <Stat label="Packed volume" value={`${packedVolM3.toFixed(2)} m³`} lightMode={lightMode} align="right" />
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function BarRow({
  label,
  trailing,
  pct,
  color,
  lightMode,
}: {
  label: string;
  trailing: string;
  pct: number;
  color: string;
  lightMode: boolean;
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between mb-1">
        <span className={`text-xs font-semibold ${lightMode ? "text-slate-700" : "text-gray-300"}`}>
          {label}
        </span>
        <span className={`text-xs font-mono ${lightMode ? "text-slate-600" : "text-gray-400"}`}>
          {trailing}
        </span>
      </div>
      <div
        className={`h-1.5 rounded-full overflow-hidden ${lightMode ? "bg-slate-200" : "bg-gray-800"}`}
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className="h-full rounded-full transition-all duration-500 ease-out"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  lightMode,
  align = "left",
}: {
  label: string;
  value: string;
  lightMode: boolean;
  align?: "left" | "right";
}) {
  return (
    <div className={align === "right" ? "text-right" : ""}>
      <div className={`text-[11px] font-medium ${lightMode ? "text-slate-500" : "text-gray-500"}`}>
        {label}
      </div>
      <div className={`text-sm font-bold font-mono mt-0.5 ${lightMode ? "text-slate-900" : "text-gray-100"}`}>
        {value}
      </div>
    </div>
  );
}
