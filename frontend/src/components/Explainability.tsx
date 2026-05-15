import { useState, type ReactNode } from "react";
import type { FurnitureItem, PackingPlan, TruckSpec } from "../types";
import { formatExecTime } from "../lib/format";
import { SuccessRateBar } from "./SuccessRateBar";

/**
 * SOLVER_THRESHOLD mirrors backend/settings.py.
 * Hybrid dispatch: n <= threshold → ILP, otherwise FFD (see core/optimizer.py).
 */
const SOLVER_THRESHOLD = 20;

type SubTab = "dispatch" | "metrics" | "constraints";

interface ExplainabilityProps {
  plan: PackingPlan;
  items: FurnitureItem[];
  truck: TruckSpec;
  lightMode?: boolean;
}

function SubTabStrip({
  tab,
  onChange,
  lightMode,
}: {
  tab: SubTab;
  onChange: (t: SubTab) => void;
  lightMode?: boolean;
}) {
  const tabs: { key: SubTab; label: string; icon: ReactNode }[] = [
    {
      key: "dispatch", label: "Dispatch",
      icon: (
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
        </svg>
      ),
    },
    {
      key: "metrics", label: "Metrics",
      icon: (
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="12" y1="20" x2="12" y2="10" />
          <line x1="18" y1="20" x2="18" y2="4" />
          <line x1="6" y1="20" x2="6" y2="16" />
        </svg>
      ),
    },
    {
      key: "constraints", label: "Constraints",
      icon: (
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
          <path d="M7 11V7a5 5 0 0110 0v4" />
        </svg>
      ),
    },
  ];

  return (
    <div className={`grid grid-cols-3 sticky top-0 z-10 border-b-2 ${
      lightMode ? "border-slate-200 bg-white" : "border-gray-800 bg-gray-950"
    }`}>
      {tabs.map((t) => {
        const active = tab === t.key;
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
            {t.icon}
            {t.label}
          </button>
        );
      })}
    </div>
  );
}

export function Explainability({ plan, items, truck, lightMode = false }: ExplainabilityProps) {
  const [subTab, setSubTab] = useState<SubTab>("dispatch");

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

  let dispatchReason: string;
  if (strategy === "axle_balance") {
    dispatchReason = `The Axle Balance strategy is FFD-only by design — it runs the Route-Sequential FFD heuristic with an axle-aware position picker. Among LIFO-feasible candidate positions, the solver picks the one that minimises the variance of per-axle loads across truck.axle_count axles modelled as end-supported beam reactions, so each axle bears a share of the cargo as close to the mean as possible. The SOLVER_THRESHOLD does not apply here. With n = ${n} item${n === 1 ? "" : "s"}, FFD completes in milliseconds.`;
  } else if (strategy === "stability") {
    dispatchReason = `The Stability strategy is FFD-only by design — it always runs FFD with a weight-descending presort so heavy items are placed first and settle low in the load. The SOLVER_THRESHOLD does not apply here; the goal is a low center of gravity for transit safety, not maximum V_util. With n = ${n} item${n === 1 ? "" : "s"}, FFD completes in milliseconds.`;
  } else if (strategy === "baseline") {
    dispatchReason = `The Baseline strategy is the thesis comparison baseline — naive first-fit in input order with no LIFO presort, no orientation enumeration, no vertical support, and no fragile guard. It is shown so you can quantify what the Optimal / Axle Balance / Stability plans actually buy: the gap in V_util and Success Rate against this plan is the real solvers' contribution. SOLVER_THRESHOLD does not apply.`;
  } else if (usedILP) {
    dispatchReason = `Optimal strategy with n = ${n} item${n === 1 ? "" : "s"}, which is at or below the SOLVER_THRESHOLD of ${SOLVER_THRESHOLD}. The hybrid engine routed this to the exact ILP solver (Gurobi Branch-and-Bound), which provably maximizes V_util but runs in O(2ⁿ).`;
  } else {
    dispatchReason = `Optimal strategy with n = ${n} items, which exceeds the SOLVER_THRESHOLD of ${SOLVER_THRESHOLD}. The hybrid engine fell back to the Route-Sequential FFD heuristic — O(n²), milliseconds — because exact ILP is intractable at this size.`;
  }

  const card = lightMode ? "bg-white border-slate-200" : "bg-gray-900 border-gray-800";
  const cardSoft = lightMode ? "bg-slate-50 border-slate-200" : "bg-gray-900 border-gray-800";
  const textBody = lightMode ? "text-slate-700" : "text-gray-300";
  const textMuted = lightMode ? "text-slate-600" : "text-gray-400";
  const textStrong = lightMode ? "text-slate-900" : "text-gray-100";

  const solverBadge = usedILP
    ? lightMode
      ? "bg-violet-100 text-violet-800 border border-violet-300"
      : "bg-violet-950 text-violet-200 border border-violet-800"
    : plan.solver_mode === "BASELINE"
      ? lightMode
        ? "bg-slate-100 text-slate-700 border border-slate-300"
        : "bg-slate-800 text-slate-300 border border-slate-600"
      : lightMode
        ? "bg-teal-100 text-teal-800 border border-teal-300"
        : "bg-teal-950 text-teal-200 border border-teal-800";

  const payloadColor = payloadPct >= 90 ? "#dc2626" : payloadPct >= 70 ? "#d97706" : "#16a34a";

  return (
    <div className="flex flex-col">
      <SubTabStrip tab={subTab} onChange={setSubTab} lightMode={lightMode} />

      {subTab === "dispatch" && (
        <div className="px-5 py-4 space-y-3">
          <div className={`rounded-xl border-2 p-3.5 ${card}`}>
            <div className="flex items-center gap-2.5 mb-2.5 flex-wrap">
              <span className={`text-sm font-bold px-2.5 py-0.5 rounded-full ${solverBadge}`}>
                {plan.solver_mode}
              </span>
              <span className={`text-xs font-semibold ${textMuted}`}>
                {usedILP ? "Exact · Branch-and-Bound" : "Heuristic · First-Fit Decreasing"}
              </span>
            </div>
            <p className={`text-sm leading-relaxed ${textBody}`}>
              {dispatchReason}
            </p>
          </div>

          <div className={`rounded-xl border-2 p-3.5 ${cardSoft}`}>
            <div className={`text-xs font-bold uppercase tracking-wide mb-2 ${textMuted}`}>
              Strategy → Solver mapping
            </div>
            <div className="space-y-1 text-xs font-mono">
              {([
                ["optimal",      "Optimal",        `ILP if n ≤ ${SOLVER_THRESHOLD}, else FFD`],
                ["axle_balance", "Axle Balance",   "FFD with axle-aware best-fit — always"],
                ["stability",    "Stability",      "FFD (weight-desc) — always"],
                ["baseline",     "Baseline (Naive)", "First-fit, no LIFO, no orientation"],
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
                  <span className={`text-xs font-semibold ${textBody}`}>This run</span>
                  <span className={`text-xs font-mono ${textMuted}`}>n = {n} / {SOLVER_THRESHOLD}</span>
                </div>
                <div className={`relative h-2.5 rounded-full overflow-hidden mt-2 ${
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
                SOLVER_THRESHOLD does not apply — {
                  strategy === "axle_balance" ? "Axle Balance" :
                  strategy === "stability"    ? "Stability"    :
                                                "Baseline"
                } runs at every n.
              </div>
            )}
          </div>
        </div>
      )}

      {subTab === "metrics" && (
        <div className="px-5 py-4 space-y-3">
          {(() => {
            const successRatio = plan.success_rate ?? (total > 0 ? packed.length / total : 1);
            const successPct = Math.round(successRatio * 100);
            const execFmt = formatExecTime(plan.t_exec_ms);
            return (
              <>
                <div className="grid grid-cols-4 gap-2">
                  <div
                    className={`rounded-xl border p-3 text-center ${cardSoft}`}
                    title="Volumetric Utilization — fraction of the truck's interior volume occupied by packed items."
                  >
                    <div className={`text-2xl font-bold leading-none font-mono ${textStrong}`}>
                      {utilPct}<span className="text-base">%</span>
                    </div>
                    <div className={`text-xs mt-1.5 font-medium ${textMuted}`}>V_util</div>
                  </div>
                  <div
                    className={`rounded-xl border p-3 text-center ${cardSoft}`}
                    title="Success Rate — share of the manifest items that were actually packed."
                  >
                    <div className={`text-2xl font-bold leading-none font-mono ${textStrong}`}>
                      {successPct}<span className="text-base">%</span>
                    </div>
                    <div className={`text-xs mt-1.5 font-medium ${textMuted}`}>Success Rate</div>
                  </div>
                  <div
                    className={`rounded-xl border p-3 text-center ${cardSoft}`}
                    title={`T_exec — solver wall-clock time (${plan.t_exec_ms} ms).`}
                  >
                    <div className={`text-2xl font-bold leading-none font-mono ${textStrong}`}>
                      {execFmt.value}<span className="text-base ml-1">{execFmt.unit}</span>
                    </div>
                    <div className={`text-xs mt-1.5 font-medium ${textMuted}`}>T_exec</div>
                  </div>
                  <div
                    className={`rounded-xl border p-3 text-center ${cardSoft}`}
                    title="Items packed out of the input manifest."
                  >
                    <div className={`text-2xl font-bold leading-none font-mono ${textStrong}`}>
                      {packed.length}<span className={`text-base ml-1 ${textMuted}`}>/{total}</span>
                    </div>
                    <div className={`text-xs mt-1.5 font-medium ${textMuted}`}>Packed</div>
                  </div>
                </div>

                {/* Success-rate progress bar — shows fulfilment at a glance */}
                <div className={`rounded-xl border p-3 ${cardSoft}`}>
                  <div className="flex items-baseline justify-between mb-2">
                    <span className={`text-xs font-semibold ${textBody}`}>
                      Manifest fulfilment
                    </span>
                    <span className={`text-xs font-mono ${textMuted}`}>
                      {packed.length} of {total} packed · {successPct}%
                    </span>
                  </div>
                  <SuccessRateBar
                    value={successRatio}
                    lightMode={lightMode}
                    height={8}
                  />
                </div>
              </>
            );
          })()}

          <AxleLoadCard
            plan={plan}
            items={items}
            truck={truck}
            cardClass={card}
            textStrong={textStrong}
            textBody={textBody}
            textMuted={textMuted}
            lightMode={lightMode}
          />

          <div className={`rounded-xl border-2 p-3.5 ${card}`}>
            <div className={`text-xs font-bold uppercase tracking-wide mb-2 ${textMuted}`}>What these numbers mean</div>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between gap-3">
                <dt className={`font-semibold ${textStrong}`}>V_util</dt>
                <dd className={`text-right ${textBody}`}>Packed volume divided by total cargo bay (0–100%).</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className={`font-semibold ${textStrong}`}>Success Rate</dt>
                <dd className={`text-right ${textBody}`}>(items packed) / (total items submitted). 100% means every manifest item fit.</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className={`font-semibold ${textStrong}`}>T_exec</dt>
                <dd className={`text-right ${textBody}`}>Wall-clock time the solver spent producing this plan.</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className={`font-semibold ${textStrong}`}>Packed</dt>
                <dd className={`text-right ${textBody}`}>Items the solver could fit / total items in the manifest.</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className={`font-semibold ${textStrong}`}>Axle Loads</dt>
                <dd className={`text-right ${textBody}`}>Per-axle weight estimate from each placed item's longitudinal centroid via the simply-supported lever rule. The variance row is what the Axle Balance strategy minimises — lower is better.</dd>
              </div>
            </dl>
          </div>
        </div>
      )}

      {subTab === "constraints" && (
        <div className="px-5 py-4 space-y-3">
          {/* LIFO */}
          <div className={`rounded-xl border-2 p-3.5 ${card}`}>
            <div className="flex items-center justify-between mb-1.5 gap-2">
              <span className={`text-sm font-bold ${textStrong}`}>Route-Sequenced LIFO</span>
              <span className={`text-xs font-mono ${textMuted}`}>
                {stopIds.length} stop{stopIds.length === 1 ? "" : "s"}
              </span>
            </div>
            <p className={`text-xs leading-relaxed ${textBody}`}>
              Items for {stopIds.length === 1
                ? "the single stop"
                : `${stopIds.length} delivery stops (${stopIds.join(", ")})`} are
              ordered along the truck's Y-axis so later stops sit deeper.
              {stopIds.length > 1 && " The first stop unloaded sits nearest the door; the last stop unloaded sits at the rear."}
            </p>
          </div>

          {/* Fragile */}
          <div className={`rounded-xl border-2 p-3.5 ${card}`}>
            <div className="flex items-center justify-between mb-1.5 gap-2">
              <span className={`text-sm font-bold ${textStrong}`}>Fragile No-Stacking</span>
              <span className={`text-xs font-mono ${textMuted}`}>
                {fragiles.length} fragile
              </span>
            </div>
            {fragiles.length === 0 ? (
              <p className={`text-xs leading-relaxed ${textBody}`}>
                No items in this manifest are flagged fragile. Stacking is bounded
                only by vertical-support physics.
              </p>
            ) : (
              <>
                <p className={`text-xs leading-relaxed ${textBody}`}>
                  {fragiles.length} item{fragiles.length === 1 ? "" : "s"} flagged
                  fragile — the solver forbids any item from resting on top of
                  {fragiles.length === 1 ? " it" : " them"}.
                  {plan.unplaced_items.length > 0 &&
                    " Items that could not satisfy this contract surface as unplaced."}
                </p>
                <div className="flex flex-wrap gap-1 mt-2">
                  {fragiles.map((f) => (
                    <span
                      key={f.item_id}
                      className={`text-[11px] font-mono rounded px-1.5 py-0.5 border ${
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
          <div className={`rounded-xl border-2 p-3.5 ${card}`}>
            <div className="flex items-baseline justify-between mb-2 gap-2">
              <span className={`text-sm font-bold ${textStrong}`}>Truck Payload</span>
              <span className="text-xs font-mono" style={{ color: payloadColor }}>
                {packedKg.toFixed(0)} / {truck.payload_kg} kg · {payloadPct}%
              </span>
            </div>
            <div className={`h-2 rounded-full overflow-hidden mb-2 ${
              lightMode ? "bg-slate-200" : "bg-gray-800"
            }`}>
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{ width: `${Math.min(100, payloadPct)}%`, backgroundColor: payloadColor }}
              />
            </div>
            <p className={`text-xs leading-relaxed ${textBody}`}>
              {payloadPct >= 95
                ? "Payload is at the cap — additional items would be rejected by the weight constraint regardless of free volume."
                : payloadPct >= 70
                ? "Payload is in the upper band; remaining slack is limited."
                : "Payload is well under the cap; the binding constraint here is geometry, not weight."}
            </p>
          </div>

          {/* Unplaced explainer */}
          {plan.unplaced_items.length > 0 && (
            <div className={`rounded-xl border-2 p-3.5 ${
              lightMode ? "bg-amber-50 border-amber-300" : "bg-amber-950/40 border-amber-900"
            }`}>
              <div className={`text-sm font-bold mb-1.5 ${lightMode ? "text-amber-900" : "text-amber-200"}`}>
                {plan.unplaced_items.length} unplaced
              </div>
              <p className={`text-xs leading-relaxed ${lightMode ? "text-amber-900" : "text-amber-200"}`}>
                {usedILP
                  ? "The ILP proved no feasible placement exists for these items under the active constraints (geometry, LIFO, fragile, payload). Removing or re-routing them is required to pack everything."
                  : "The FFD heuristic could not seat these items after sorting by volume. They may still fit under ILP — try lowering the manifest size or splitting the run."}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Per-axle load schematic ─────────────────────────────────────────────────
//
// Mirrors `ConstraintValidator.compute_axle_loads()` in
// `backend/core/validator.py`. Axles sit at y_k = L · k / (N − 1) for
// k = 0..N-1; each item's weight is split between its two adjacent axles
// by the simply-supported lever rule. The variance row is what the Axle
// Balance strategy minimises, so this card is the visual answer to
// "how do we know axle balance is actually balancing the axles?".

interface AxleLoadCardProps {
  plan: PackingPlan;
  items: FurnitureItem[];
  truck: TruckSpec;
  cardClass: string;
  textStrong: string;
  textBody: string;
  textMuted: string;
  lightMode: boolean;
}

function computeAxleLoads(
  plan: PackingPlan,
  items: FurnitureItem[],
  truck: TruckSpec,
): { axleY: number[]; loads: number[] } {
  const axleCount = Math.max(2, truck.axle_count ?? 2);
  const axleY: number[] = [];
  for (let k = 0; k < axleCount; k++) {
    axleY.push((truck.L * k) / (axleCount - 1));
  }
  const loads = new Array<number>(axleCount).fill(0);
  const weights = new Map(items.map((it) => [it.item_id, it.weight_kg]));

  for (const p of plan.placements) {
    if (!p.is_packed) continue;
    const w = weights.get(p.item_id) ?? 0;
    if (w <= 0) continue;
    const itemY = p.y + p.l / 2;
    if (itemY <= axleY[0]) {
      loads[0] += w;
      continue;
    }
    if (itemY >= axleY[axleY.length - 1]) {
      loads[loads.length - 1] += w;
      continue;
    }
    for (let k = 0; k < axleCount - 1; k++) {
      if (axleY[k] <= itemY && itemY <= axleY[k + 1]) {
        const span = axleY[k + 1] - axleY[k];
        const shareNext = span > 0 ? (itemY - axleY[k]) / span : 0.5;
        loads[k] += w * (1 - shareNext);
        loads[k + 1] += w * shareNext;
        break;
      }
    }
  }
  return { axleY, loads };
}

function AxleLoadCard({
  plan, items, truck, cardClass, textStrong, textBody, textMuted, lightMode,
}: AxleLoadCardProps) {
  const { axleY, loads } = computeAxleLoads(plan, items, truck);
  const total = loads.reduce((s, x) => s + x, 0);
  const mean  = loads.length > 0 ? total / loads.length : 0;
  const variance = loads.length > 0
    ? loads.reduce((s, x) => s + (x - mean) ** 2, 0) / loads.length
    : 0;
  const maxLoad = Math.max(1, ...loads);
  const axleCount = loads.length;

  // SVG side-view dimensions — wide rectangle for the cargo bay, axle
  // triangles below. 380×100 fits the metrics column at all viewport sizes.
  const W_SVG = 380;
  const H_SVG = 110;
  const PAD_X = 20;
  const BAY_TOP = 20;
  const BAY_H = 40;
  const bayLeft  = PAD_X;
  const bayRight = W_SVG - PAD_X;
  const bayW = bayRight - bayLeft;

  const axleX = (y_mm: number) => bayLeft + (y_mm / Math.max(1, truck.L)) * bayW;

  const bayFill   = lightMode ? "#E2E8F0" : "#1F2937";
  const bayStroke = lightMode ? "#94A3B8" : "#4B5563";
  const axleFill  = lightMode ? "#0F172A" : "#E5E7EB";
  const labelFill = lightMode ? "#334155" : "#D1D5DB";

  return (
    <div className={`rounded-xl border-2 p-3.5 ${cardClass}`}>
      <div className="flex items-center justify-between mb-2">
        <div className={`text-xs font-bold uppercase tracking-wide ${textMuted}`}>
          Per-Axle Load Distribution
        </div>
        <div className={`text-xs font-mono ${textMuted}`}>
          {axleCount} axle{axleCount === 1 ? "" : "s"}
        </div>
      </div>

      <svg
        viewBox={`0 0 ${W_SVG} ${H_SVG}`}
        className="w-full"
        role="img"
        aria-label="Truck side view with per-axle load values"
      >
        {/* Cargo bay rectangle */}
        <rect
          x={bayLeft}
          y={BAY_TOP}
          width={bayW}
          height={BAY_H}
          fill={bayFill}
          stroke={bayStroke}
          strokeWidth={1.5}
          rx={2}
        />
        {/* y=0 (rear) and y=L (door) endpoint labels */}
        <text x={bayLeft - 2}  y={BAY_TOP + BAY_H + 12} fontSize={9} fill={labelFill} textAnchor="end">y=0</text>
        <text x={bayRight + 2} y={BAY_TOP + BAY_H + 12} fontSize={9} fill={labelFill} textAnchor="start">y=L</text>

        {/* Axle markers */}
        {axleY.map((y, k) => {
          const x = axleX(y);
          const load = loads[k];
          const loadPct = (load / maxLoad) * 100;
          const barH = (load / Math.max(1, maxLoad)) * (BAY_H - 4);
          const barColor =
            loadPct > 110 - 100 / axleCount ? "#dc2626" :
            loadPct < 100 / axleCount * 0.5  ? "#d97706" :
                                               "#16a34a";
          return (
            <g key={k}>
              {/* Bar inside the bay showing this axle's share */}
              <rect
                x={x - 8}
                y={BAY_TOP + BAY_H - barH - 2}
                width={16}
                height={Math.max(2, barH)}
                fill={barColor}
                opacity={0.85}
                rx={1.5}
              />
              {/* Triangle axle below the bay */}
              <polygon
                points={`${x - 6},${BAY_TOP + BAY_H + 2} ${x + 6},${BAY_TOP + BAY_H + 2} ${x},${BAY_TOP + BAY_H + 14}`}
                fill={axleFill}
              />
              <circle cx={x} cy={BAY_TOP + BAY_H + 18} r={4} fill={axleFill} />
              {/* Load label */}
              <text
                x={x}
                y={H_SVG - 4}
                fontSize={10}
                fontFamily="ui-monospace, monospace"
                fill={labelFill}
                textAnchor="middle"
                fontWeight="bold"
              >
                {Math.round(load)} kg
              </text>
              <text
                x={x}
                y={BAY_TOP - 4}
                fontSize={9}
                fill={labelFill}
                textAnchor="middle"
              >
                axle {k + 1}
              </text>
            </g>
          );
        })}
      </svg>

      <div className={`mt-2 pt-2 border-t grid grid-cols-3 gap-2 text-xs ${
        lightMode ? "border-slate-200" : "border-gray-800"
      }`}>
        <div>
          <div className={textMuted}>Total</div>
          <div className={`font-mono font-bold ${textStrong}`}>
            {Math.round(total)} kg
          </div>
        </div>
        <div>
          <div className={textMuted}>Mean / axle</div>
          <div className={`font-mono font-bold ${textStrong}`}>
            {Math.round(mean)} kg
          </div>
        </div>
        <div>
          <div className={textMuted}>Variance σ²</div>
          <div className={`font-mono font-bold ${textStrong}`}>
            {variance < 1 ? variance.toFixed(2) : Math.round(variance).toLocaleString()} kg²
          </div>
        </div>
      </div>
      {plan.strategy !== "axle_balance" && (
        <div className={`mt-2 text-xs leading-relaxed ${textBody}`}>
          Switch to the <span className="font-semibold">Axle Balance</span> plan to compare — that strategy explicitly minimises the variance row above.
        </div>
      )}
    </div>
  );
}
