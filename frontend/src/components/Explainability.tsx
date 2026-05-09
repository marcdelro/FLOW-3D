import type { FurnitureItem, PackingPlan, TruckSpec } from "../types";

/**
 * SOLVER_THRESHOLD mirrors backend/settings.py.
 * Hybrid dispatch: n <= threshold → ILP, otherwise FFD (see core/optimizer.py).
 */
const SOLVER_THRESHOLD = 20;

interface ExplainabilityProps {
  plan: PackingPlan;
  items: FurnitureItem[];
  truck: TruckSpec;
  lightMode?: boolean;
}

function SectionHeader({
  title,
  hint,
  lightMode,
}: {
  title: string;
  hint?: string;
  lightMode?: boolean;
}) {
  return (
    <div className={`px-5 py-3 border-b-2 sticky top-0 z-10 ${
      lightMode ? "border-slate-200 bg-white" : "border-gray-800 bg-gray-950"
    }`}>
      <div className={`text-lg font-bold leading-tight ${lightMode ? "text-slate-900" : "text-gray-100"}`}>
        {title}
      </div>
      {hint && (
        <div className={`text-sm mt-0.5 leading-snug ${lightMode ? "text-slate-600" : "text-gray-400"}`}>
          {hint}
        </div>
      )}
    </div>
  );
}

export function Explainability({ plan, items, truck, lightMode = false }: ExplainabilityProps) {
  const n          = items.length;
  const usedILP    = plan.solver_mode === "ILP";
  const strategy   = plan.strategy;
  const stopIds    = Array.from(new Set(items.map((i) => i.stop_id))).sort((a, b) => a - b);
  const fragiles   = items.filter((i) => i.fragile);
  const packed     = plan.placements.filter((p) => p.is_packed);
  const total      = plan.placements.length;
  const utilPct    = Math.round(plan.v_util * 100);
  const packedKg   = packed.reduce((s, p) => {
    const it = items.find((i) => i.item_id === p.item_id);
    return s + (it?.weight_kg ?? 0);
  }, 0);
  const payloadPct = truck.payload_kg > 0
    ? Math.round((packedKg / truck.payload_kg) * 100)
    : 0;

  // Dispatch reason depends on BOTH strategy and n. Axle Balance and Stability
  // are FFD-only by design (see backend/core/optimizer.py); only the Optimal
  // strategy consults SOLVER_THRESHOLD.
  let dispatchReason: string;
  if (strategy === "axle_balance") {
    dispatchReason = `The Axle Balance strategy is FFD-only by design — it runs the Route-Sequential FFD heuristic with an axle-aware position picker. Among LIFO-feasible candidate positions, the solver picks the one that brings the cargo's longitudinal centre-of-mass closest to truck.L / 2 so front and rear axles share load evenly. The SOLVER_THRESHOLD does not apply here. With n = ${n} item${n === 1 ? "" : "s"}, FFD completes in milliseconds.`;
  } else if (strategy === "stability") {
    dispatchReason = `The Stability strategy is FFD-only by design — it always runs FFD with a weight-descending presort so heavy items are placed first and settle low in the load. The SOLVER_THRESHOLD does not apply here; the goal is a low center of gravity for transit safety, not maximum V_util. With n = ${n} item${n === 1 ? "" : "s"}, FFD completes in milliseconds.`;
  } else if (usedILP) {
    dispatchReason = `Optimal strategy with n = ${n} item${n === 1 ? "" : "s"}, which is at or below the SOLVER_THRESHOLD of ${SOLVER_THRESHOLD}. The hybrid engine routed this to the exact ILP solver (Gurobi Branch-and-Bound), which provably maximizes V_util but runs in O(2ⁿ).`;
  } else {
    dispatchReason = `Optimal strategy with n = ${n} items, which exceeds the SOLVER_THRESHOLD of ${SOLVER_THRESHOLD}. The hybrid engine fell back to the Route-Sequential FFD heuristic — O(n²), milliseconds — because exact ILP is intractable at this size.`;
  }

  const card = lightMode
    ? "bg-white border-slate-200"
    : "bg-gray-900 border-gray-800";
  const cardSoft = lightMode
    ? "bg-slate-50 border-slate-200"
    : "bg-gray-900 border-gray-800";
  const textBody = lightMode ? "text-slate-700" : "text-gray-300";
  const textMuted = lightMode ? "text-slate-600" : "text-gray-400";
  const textStrong = lightMode ? "text-slate-900" : "text-gray-100";

  const solverBadge = usedILP
    ? lightMode
      ? "bg-violet-100 text-violet-800 border border-violet-300"
      : "bg-violet-950 text-violet-200 border border-violet-800"
    : lightMode
      ? "bg-teal-100 text-teal-800 border border-teal-300"
      : "bg-teal-950 text-teal-200 border border-teal-800";

  const payloadColor = payloadPct >= 90 ? "#dc2626" : payloadPct >= 70 ? "#d97706" : "#16a34a";

  return (
    <div className="flex flex-col">

      {/* ── Solver Dispatch ─────────────────────────────────────────────── */}
      <SectionHeader
        title="Solver Dispatch"
        hint="Why the hybrid engine chose this solver."
        lightMode={lightMode}
      />
      <div className="px-5 py-4 space-y-3">

        {/* Decision banner */}
        <div className={`rounded-xl border-2 p-4 ${card}`}>
          <div className="flex items-center gap-3 mb-3">
            <span className={`text-base font-bold px-3 py-1 rounded-full ${solverBadge}`}>
              {plan.solver_mode}
            </span>
            <span className={`text-sm font-semibold ${textMuted}`}>
              {usedILP ? "Exact · Branch-and-Bound" : "Heuristic · First-Fit Decreasing"}
            </span>
          </div>
          <p className={`text-base leading-relaxed ${textBody}`}>
            {dispatchReason}
          </p>
        </div>

        {/* Strategy ↔ solver matrix — active row is highlighted so a panel
            member sees at a glance which mapping drove THIS plan. */}
        <div className={`rounded-xl border-2 p-4 ${cardSoft}`}>
          <div className={`text-sm font-semibold mb-2 ${textBody}`}>Strategy → Solver mapping</div>
          <div className="space-y-1 text-sm font-mono">
            {([
              ["optimal",   "Optimal",   `ILP if n ≤ ${SOLVER_THRESHOLD}, else FFD`],
              ["axle_balance", "Axle Balance", "FFD with axle-aware best-fit — always"],
              ["stability", "Stability", "FFD (weight-desc) — always"],
            ] as const).map(([key, label, mapping]) => {
              const active = strategy === key;
              return (
                <div
                  key={key}
                  className={`flex items-center justify-between gap-3 px-2 py-1.5 rounded-md ${
                    active
                      ? lightMode
                        ? "bg-blue-100 ring-1 ring-blue-300"
                        : "bg-blue-950/60 ring-1 ring-blue-800"
                      : ""
                  }`}
                >
                  <span className={`flex items-center gap-2 ${active ? textStrong : textMuted}`}>
                    {active && (
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                        lightMode ? "bg-blue-600 text-white" : "bg-blue-500 text-white"
                      }`}>
                        ACTIVE
                      </span>
                    )}
                    {label}
                  </span>
                  <span className={active ? textStrong : textBody}>{mapping}</span>
                </div>
              );
            })}
          </div>
          {strategy === "optimal" ? (
            <>
              <div className={`mt-3 pt-3 border-t flex items-baseline justify-between ${
                lightMode ? "border-slate-200" : "border-gray-800"
              }`}>
                <span className={`text-sm font-semibold ${textBody}`}>This run</span>
                <span className={`text-sm font-mono ${textMuted}`}>n = {n} / {SOLVER_THRESHOLD}</span>
              </div>
              <div className={`relative h-3 rounded-full overflow-hidden mt-2 ${
                lightMode ? "bg-slate-200" : "bg-gray-800"
              }`}>
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{
                    width: `${Math.min(100, (n / SOLVER_THRESHOLD) * 100)}%`,
                    backgroundColor: usedILP ? "#7c3aed" : "#0d9488",
                  }}
                />
              </div>
            </>
          ) : (
            <div className={`mt-3 pt-3 border-t text-xs leading-relaxed ${
              lightMode ? "border-slate-200 text-slate-600" : "border-gray-800 text-gray-400"
            }`}>
              SOLVER_THRESHOLD does not apply to this strategy — {strategy === "axle_balance" ? "Axle Balance" : "Stability"} runs FFD at every n.
            </div>
          )}
        </div>
      </div>

      {/* ── Performance Snapshot ────────────────────────────────────────── */}
      <SectionHeader
        title="Performance Snapshot"
        hint="What the chosen solver produced."
        lightMode={lightMode}
      />
      <div className="px-5 py-4 grid grid-cols-3 gap-2">
        <div className={`rounded-xl border p-3 text-center ${cardSoft}`}>
          <div className={`text-2xl font-bold leading-none font-mono ${textStrong}`}>
            {utilPct}<span className="text-base">%</span>
          </div>
          <div className={`text-xs mt-1.5 font-medium ${textMuted}`}>V_util</div>
        </div>
        <div className={`rounded-xl border p-3 text-center ${cardSoft}`}>
          <div className={`text-2xl font-bold leading-none font-mono ${textStrong}`}>
            {plan.t_exec_ms}<span className="text-base ml-1">ms</span>
          </div>
          <div className={`text-xs mt-1.5 font-medium ${textMuted}`}>T_exec</div>
        </div>
        <div className={`rounded-xl border p-3 text-center ${cardSoft}`}>
          <div className={`text-2xl font-bold leading-none font-mono ${textStrong}`}>
            {packed.length}<span className={`text-base ml-1 ${textMuted}`}>/{total}</span>
          </div>
          <div className={`text-xs mt-1.5 font-medium ${textMuted}`}>Packed</div>
        </div>
      </div>

      {/* ── Constraints in Effect ───────────────────────────────────────── */}
      <SectionHeader
        title="Constraints in Effect"
        hint="What shaped the plan beyond geometry."
        lightMode={lightMode}
      />
      <div className="px-5 py-4 space-y-3">

        {/* LIFO */}
        <div className={`rounded-xl border-2 p-4 ${card}`}>
          <div className="flex items-center justify-between mb-1.5">
            <span className={`text-base font-bold ${textStrong}`}>Route-Sequenced LIFO</span>
            <span className={`text-sm font-mono ${textMuted}`}>
              {stopIds.length} stop{stopIds.length === 1 ? "" : "s"}
            </span>
          </div>
          <p className={`text-sm leading-relaxed ${textBody}`}>
            Items for {stopIds.length === 1
              ? "the single stop"
              : `${stopIds.length} delivery stops (${stopIds.join(", ")})`} are
            ordered along the truck's Y-axis so later stops sit deeper.
            {stopIds.length > 1 && " The first stop unloaded sits nearest the door; the last stop unloaded sits at the rear."}
          </p>
        </div>

        {/* Fragile */}
        <div className={`rounded-xl border-2 p-4 ${card}`}>
          <div className="flex items-center justify-between mb-1.5">
            <span className={`text-base font-bold ${textStrong}`}>Fragile No-Stacking</span>
            <span className={`text-sm font-mono ${textMuted}`}>
              {fragiles.length} fragile
            </span>
          </div>
          {fragiles.length === 0 ? (
            <p className={`text-sm leading-relaxed ${textBody}`}>
              No items in this manifest are flagged fragile. Stacking is bounded
              only by vertical-support physics.
            </p>
          ) : (
            <>
              <p className={`text-sm leading-relaxed ${textBody}`}>
                {fragiles.length} item{fragiles.length === 1 ? "" : "s"} flagged
                fragile — the solver forbids any item from resting on top of
                {fragiles.length === 1 ? " it" : " them"}.
                {plan.unplaced_items.length > 0 &&
                  " Items that could not satisfy this contract surface as unplaced."}
              </p>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {fragiles.map((f) => (
                  <span
                    key={f.item_id}
                    className={`text-xs font-mono rounded px-2 py-0.5 border ${
                      lightMode
                        ? "bg-rose-50 text-rose-800 border-rose-200"
                        : "bg-rose-950/40 text-rose-200 border-rose-900"
                    }`}
                  >
                    {f.item_id}
                  </span>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Payload */}
        <div className={`rounded-xl border-2 p-4 ${card}`}>
          <div className="flex items-baseline justify-between mb-2">
            <span className={`text-base font-bold ${textStrong}`}>Truck Payload</span>
            <span className="text-sm font-mono" style={{ color: payloadColor }}>
              {packedKg.toFixed(0)} / {truck.payload_kg} kg · {payloadPct}%
            </span>
          </div>
          <div className={`h-2.5 rounded-full overflow-hidden mb-2 ${
            lightMode ? "bg-slate-200" : "bg-gray-800"
          }`}>
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{ width: `${Math.min(100, payloadPct)}%`, backgroundColor: payloadColor }}
            />
          </div>
          <p className={`text-sm leading-relaxed ${textBody}`}>
            {payloadPct >= 95
              ? "Payload is at the cap — additional items would be rejected by the weight constraint regardless of free volume."
              : payloadPct >= 70
              ? "Payload is in the upper band; remaining slack is limited."
              : "Payload is well under the cap; the binding constraint here is geometry, not weight."}
          </p>
        </div>

        {/* Unplaced explainer */}
        {plan.unplaced_items.length > 0 && (
          <div className={`rounded-xl border-2 p-4 ${
            lightMode
              ? "bg-amber-50 border-amber-300"
              : "bg-amber-950/40 border-amber-900"
          }`}>
            <div className={`text-base font-bold mb-1.5 ${lightMode ? "text-amber-900" : "text-amber-200"}`}>
              {plan.unplaced_items.length} unplaced
            </div>
            <p className={`text-sm leading-relaxed ${lightMode ? "text-amber-900" : "text-amber-200"}`}>
              {usedILP
                ? "The ILP proved no feasible placement exists for these items under the active constraints (geometry, LIFO, fragile, payload). Removing or re-routing them is required to pack everything."
                : "The FFD heuristic could not seat these items after sorting by volume. They may still fit under ILP — try lowering the manifest size or splitting the run."}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
