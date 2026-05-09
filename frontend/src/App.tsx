import { useState } from "react";

import { fetchSolutions } from "./api/client";
import { Dashboard } from "./components/Dashboard";
import { Explainability } from "./components/Explainability";
import { ManifestForm } from "./components/ManifestForm";
import { PlanSelector } from "./components/PlanSelector";
import { TruckViewer } from "./components/TruckViewer";
import type { FurnitureItem, PackingPlan, SolveRequest, TruckSpec } from "./types";

type Tab = "manifest" | "results" | "explain";

function App() {
  const [plans, setPlans]               = useState<PackingPlan[]>([]);
  const [selectedIdx, setSelectedIdx]   = useState(0);
  const [loading, setLoading]           = useState(false);
  const [error, setError]               = useState<string | null>(null);
  const [tab, setTab]                   = useState<Tab>("manifest");
  const [lightMode, setLightMode]       = useState(true);
  const [truckSpec, setTruckSpec]       = useState<TruckSpec>({
    W: 2400, L: 13600, H: 2440, payload_kg: 3000,
  });
  const [solveItems, setSolveItems]     = useState<FurnitureItem[]>([]);

  const selectedPlan = plans[selectedIdx] ?? null;

  async function handleSolve(req: SolveRequest) {
    setLoading(true);
    setError(null);
    setTruckSpec(req.truck);
    setSolveItems(req.items);
    try {
      const results = await fetchSolutions(req);
      setPlans(results);
      setSelectedIdx(0);
      setTab("results");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong while planning. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  // Theme tokens — used across the shell.
  const shell      = lightMode ? "bg-slate-50 text-slate-900" : "bg-gray-950 text-gray-100";
  const sideBg     = lightMode ? "bg-white" : "bg-gray-950";
  const sideBorder = lightMode ? "border-slate-200" : "border-gray-800";
  const headerBg   = lightMode ? "bg-white" : "bg-gray-950";

  const tabsAvailable: { key: Tab; step: string; title: string; subtitle: string }[] = [
    { key: "manifest", step: "1", title: "Manifest", subtitle: "Truck, stops, and cargo" },
    { key: "results",  step: "2", title: "Results",  subtitle: "Pick a plan and review" },
    { key: "explain",  step: "3", title: "Explain",  subtitle: "Why this solver, why this plan" },
  ];

  return (
    <div className={`h-screen grid grid-cols-[440px_1fr] ${shell} overflow-hidden`}>

      {/* ── Sidebar ─────────────────────────────────────────────────────────── */}
      <aside className={`border-r ${sideBorder} ${sideBg} flex flex-col overflow-hidden`}>

        {/* Header — logo + name + theme toggle */}
        <div className={`px-5 py-4 border-b ${sideBorder} ${headerBg} shrink-0 flex items-center justify-between`}>
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
              lightMode ? "bg-blue-600" : "bg-blue-700"
            }`}>
              <svg
                className="w-7 h-7 text-white"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M2 7.5L12 3l10 4.5v9L12 21 2 16.5v-9z" />
                <path d="M12 3v18M2 7.5l10 4.5 10-4.5" />
              </svg>
            </div>
            <div>
              <div className={`text-2xl font-bold tracking-tight ${lightMode ? "text-slate-900" : "text-white"}`}>
                FLOW-3D
              </div>
              <div className={`text-base ${lightMode ? "text-slate-600" : "text-gray-400"}`}>
                Logistics DSS
              </div>
            </div>
          </div>
          <button
            onClick={() => setLightMode((m) => !m)}
            aria-label={lightMode ? "Switch to dark colors" : "Switch to light colors"}
            title={lightMode ? "Switch to dark colors" : "Switch to light colors"}
            className={`flex items-center gap-2 rounded-full px-4 py-2.5 border-2 text-sm font-semibold transition-all select-none ${
              lightMode
                ? "bg-slate-50 border-slate-300 text-slate-700 hover:bg-slate-100"
                : "bg-gray-900 border-gray-700 text-gray-200 hover:bg-gray-800"
            }`}
          >
            {lightMode ? (
              <>
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="4" />
                  <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
                </svg>
                Light
              </>
            ) : (
              <>
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                </svg>
                Dark
              </>
            )}
          </button>
        </div>

        {/* Step tabs — large, numbered, with subtitles */}
        <div className={`grid grid-cols-3 border-b-2 ${sideBorder} shrink-0`}>
          {tabsAvailable.map((t) => {
            const active   = tab === t.key;
            const disabled = (t.key === "results" || t.key === "explain") && plans.length === 0;
            return (
              <button
                key={t.key}
                onClick={() => !disabled && setTab(t.key)}
                disabled={disabled}
                className={`flex items-center gap-2 px-3 py-4 text-left transition-all border-b-4 ${
                  active
                    ? lightMode
                      ? "bg-blue-50 border-blue-600"
                      : "bg-blue-950/40 border-blue-500"
                    : disabled
                      ? lightMode
                        ? "bg-slate-50 border-transparent opacity-50 cursor-not-allowed"
                        : "bg-gray-900/30 border-transparent opacity-40 cursor-not-allowed"
                      : lightMode
                        ? "bg-white border-transparent hover:bg-slate-50"
                        : "bg-gray-950 border-transparent hover:bg-gray-900"
                }`}
              >
                <div className={`w-9 h-9 rounded-full flex items-center justify-center text-base font-bold shrink-0 ${
                  active
                    ? "bg-blue-600 text-white"
                    : lightMode
                      ? "bg-slate-200 text-slate-700"
                      : "bg-gray-800 text-gray-300"
                }`}>
                  {t.step}
                </div>
                <div className="min-w-0">
                  <div className={`text-sm font-bold leading-tight ${
                    active
                      ? lightMode ? "text-blue-700" : "text-blue-200"
                      : lightMode ? "text-slate-800" : "text-gray-200"
                  }`}>
                    {t.title}
                  </div>
                  <div className={`text-xs leading-tight mt-0.5 truncate ${lightMode ? "text-slate-500" : "text-gray-500"}`}>
                    {t.subtitle}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Content area */}
        <div className="flex-1 overflow-y-auto">
          <div className={tab === "manifest" ? "" : "hidden"}>
            <ManifestForm onSolve={handleSolve} loading={loading} lightMode={lightMode} />
          </div>
          {tab === "results" &&
            (plans.length > 0 ? (
              <>
                <PlanSelector
                  plans={plans}
                  selectedIdx={selectedIdx}
                  onSelect={setSelectedIdx}
                  lightMode={lightMode}
                />
                <div className={`border-t ${sideBorder}`} />
                <Dashboard plan={selectedPlan!} lightMode={lightMode} />
              </>
            ) : (
              <div className={`p-8 text-center ${lightMode ? "text-slate-600" : "text-gray-400"}`}>
                <p className="text-lg font-semibold mb-2">No results yet</p>
                <p className="text-base">Run a solve from the Manifest tab to see plans.</p>
              </div>
            ))}
          {tab === "explain" &&
            (plans.length > 0 && selectedPlan ? (
              <>
                <PlanSelector
                  plans={plans}
                  selectedIdx={selectedIdx}
                  onSelect={setSelectedIdx}
                  lightMode={lightMode}
                />
                <div className={`border-t ${sideBorder}`} />
                <Explainability
                  plan={selectedPlan}
                  items={solveItems}
                  truck={truckSpec}
                  lightMode={lightMode}
                />
              </>
            ) : (
              <div className={`p-8 text-center ${lightMode ? "text-slate-600" : "text-gray-400"}`}>
                <p className="text-lg font-semibold mb-2">Nothing to explain yet</p>
                <p className="text-base">Run a solve from the Manifest tab to see why the engine picked its solver and what constrained the plan.</p>
              </div>
            ))}
        </div>

        {error && (
          <div className={`px-5 py-4 border-t-2 text-base shrink-0 flex gap-3 items-start ${
            lightMode
              ? "border-red-300 bg-red-50 text-red-800"
              : "border-red-900/50 bg-red-950/40 text-red-300"
          }`}>
            <svg className="w-6 h-6 shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <div>
              <div className="font-bold mb-0.5">Could not finish</div>
              <div>{error}</div>
            </div>
          </div>
        )}
      </aside>

      {/* ── Main viewer ─────────────────────────────────────────────────────── */}
      <main className="overflow-hidden">
        {selectedPlan ? (
          <TruckViewer
            plan={selectedPlan}
            truck={{ W: truckSpec.W, L: truckSpec.L, H: truckSpec.H }}
            items={solveItems}
            lightMode={lightMode}
          />
        ) : loading ? (
          <div className="flex flex-col items-center justify-center h-full gap-6 px-8">
            <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
            <div className="text-center max-w-md">
              <p className={`text-2xl font-bold ${lightMode ? "text-slate-900" : "text-gray-100"}`}>
                Solving packing plans…
              </p>
              <p className={`text-lg mt-3 leading-relaxed ${lightMode ? "text-slate-600" : "text-gray-400"}`}>
                Generating 3 alternative LIFO-compliant plans.
                This usually takes only a few seconds.
              </p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full gap-6 text-center px-8">
            <div className={`w-28 h-28 rounded-3xl border-2 flex items-center justify-center ${
              lightMode ? "bg-white border-slate-200 shadow-sm" : "bg-gray-900 border-gray-800"
            }`}>
              <svg
                className={`w-14 h-14 ${lightMode ? "text-blue-500" : "text-blue-400"}`}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M2 7.5L12 3l10 4.5v9L12 21 2 16.5v-9z" />
                <path d="M12 3v18M2 7.5l10 4.5 10-4.5" />
              </svg>
            </div>
            <div className="max-w-xl">
              <p className={`text-3xl font-bold ${lightMode ? "text-slate-900" : "text-gray-100"}`}>
                No packing plan loaded
              </p>
              <p className={`text-lg mt-4 leading-relaxed ${lightMode ? "text-slate-600" : "text-gray-300"}`}>
                Fill in the cargo manifest on the left and click{" "}
                <span className={`font-semibold ${lightMode ? "text-slate-800" : "text-gray-100"}`}>
                  Solve Packing Plan
                </span>{" "}
                to generate 3 alternative LIFO-compliant loading plans.
              </p>
            </div>
            <div className={`grid grid-cols-3 gap-3 max-w-2xl w-full mt-2`}>
              <HelpCard
                step="1"
                title="Manifest"
                body="Truck spec, delivery stops, and cargo items."
                lightMode={lightMode}
              />
              <HelpCard
                step="2"
                title="Solve"
                body="ILP for small manifests, FFD for large."
                lightMode={lightMode}
              />
              <HelpCard
                step="3"
                title="Review"
                body="Compare plans in the 3D viewer."
                lightMode={lightMode}
              />
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function HelpCard({
  step,
  title,
  body,
  lightMode,
}: {
  step: string;
  title: string;
  body: string;
  lightMode: boolean;
}) {
  return (
    <div className={`text-left rounded-2xl p-5 border-2 ${
      lightMode
        ? "bg-white border-slate-200 shadow-sm"
        : "bg-gray-900 border-gray-800"
    }`}>
      <div className={`w-9 h-9 rounded-full flex items-center justify-center text-base font-bold mb-3 ${
        lightMode ? "bg-blue-100 text-blue-700" : "bg-blue-950 text-blue-300"
      }`}>
        {step}
      </div>
      <div className={`font-bold text-base mb-1.5 ${lightMode ? "text-slate-900" : "text-gray-100"}`}>
        {title}
      </div>
      <div className={`text-sm leading-relaxed ${lightMode ? "text-slate-600" : "text-gray-400"}`}>
        {body}
      </div>
    </div>
  );
}

export default App;
