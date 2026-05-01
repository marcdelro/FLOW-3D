import { useState } from "react";

import { fetchSolutions } from "./api/client";
import { Dashboard } from "./components/Dashboard";
import { ManifestForm } from "./components/ManifestForm";
import { PlanSelector } from "./components/PlanSelector";
import { TruckViewer } from "./components/TruckViewer";
import type { PackingPlan, SolveRequest, TruckSpec } from "./types";

type Tab = "manifest" | "results";

function App() {
  const [plans, setPlans]               = useState<PackingPlan[]>([]);
  const [selectedIdx, setSelectedIdx]   = useState(0);
  const [loading, setLoading]           = useState(false);
  const [error, setError]               = useState<string | null>(null);
  const [tab, setTab]                   = useState<Tab>("manifest");
  const [lightMode, setLightMode]       = useState(false);
  const [truckSpec, setTruckSpec]       = useState<TruckSpec>({
    W: 2400, L: 13600, H: 2440, payload_kg: 3000,
  });

  const selectedPlan = plans[selectedIdx] ?? null;

  async function handleSolve(req: SolveRequest) {
    setLoading(true);
    setError(null);
    setTruckSpec(req.truck);
    try {
      const results = await fetchSolutions(req);
      setPlans(results);
      setSelectedIdx(0);
      setTab("results");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Solve failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={`h-screen grid grid-cols-[400px_1fr] ${lightMode ? "bg-slate-50 text-gray-900" : "bg-gray-950 text-gray-100"} overflow-hidden`}>

      {/* ── Sidebar ─────────────────────────────────────────────────────────── */}
      <aside className={`border-r ${lightMode ? "border-gray-300" : "border-gray-800"} flex flex-col overflow-hidden`}>

        {/* Logo */}
        <div className={`px-4 py-3 border-b ${lightMode ? "border-gray-300" : "border-gray-800"} shrink-0 flex items-center justify-between`}>
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-blue-950 border border-blue-900 flex items-center justify-center shrink-0">
              <svg
                className="w-4 h-4 text-blue-400"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
              >
                <path d="M2 7.5L12 3l10 4.5v9L12 21 2 16.5v-9z" />
                <path d="M12 3v18M2 7.5l10 4.5 10-4.5" />
              </svg>
            </div>
            <div>
              <div className={`text-sm font-bold tracking-widest uppercase ${lightMode ? "text-gray-900" : "text-white"}`}>
                FLOW-3D
              </div>
              <div className={`text-xs -mt-0.5 ${lightMode ? "text-gray-600" : "text-gray-400"}`}>Logistics DSS</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* SVG pill toggle — no emoji */}
            <button
              onClick={() => setLightMode((m) => !m)}
              aria-label={lightMode ? "Switch to dark mode" : "Switch to light mode"}
              title={lightMode ? "Switch to dark mode" : "Switch to light mode"}
              className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 border text-xs font-semibold transition-all select-none ${
                lightMode
                  ? "bg-white border-gray-300 text-gray-600 hover:bg-gray-50 shadow-sm"
                  : "bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700"
              }`}
            >
              {/* Moon icon — active in dark mode */}
              <svg
                className={`w-3.5 h-3.5 transition-opacity ${lightMode ? "opacity-35" : "opacity-100"}`}
                viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
              >
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
              </svg>
              <span className={`w-px h-3.5 ${lightMode ? "bg-gray-300" : "bg-gray-600"}`} />
              {/* Sun icon — active in light mode */}
              <svg
                className={`w-3.5 h-3.5 transition-opacity ${lightMode ? "opacity-100" : "opacity-35"}`}
                viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
              >
                <circle cx="12" cy="12" r="5" />
                <line x1="12" y1="1" x2="12" y2="3" />
                <line x1="12" y1="21" x2="12" y2="23" />
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                <line x1="1" y1="12" x2="3" y2="12" />
                <line x1="21" y1="12" x2="23" y2="12" />
                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
              </svg>
            </button>
            <span className={`text-xs font-mono px-2 py-0.5 rounded border ${
              lightMode
                ? "text-gray-600 bg-gray-100 border-gray-300"
                : "text-gray-400 bg-gray-900 border-gray-700"
            }`}>
              v0.3
            </span>
          </div>
        </div>

        {/* Tabs */}
        <div className={`flex border-b ${lightMode ? "border-gray-300" : "border-gray-800"} shrink-0`}>
          {(["manifest", "results"] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-3 text-sm font-semibold tracking-widest uppercase transition-all ${
                tab === t
                  ? lightMode
                    ? "text-blue-800 border-b-2 border-blue-700"
                    : "text-white border-b-2 border-blue-500"
                  : lightMode
                    ? "text-gray-500 hover:text-gray-700"
                    : "text-gray-600 hover:text-gray-400"
              }`}
            >
              {t === "manifest" ? (
                "Manifest"
              ) : (
                <span className="flex items-center justify-center gap-1.5">
                  Results
                  {selectedPlan && (
                    <span className={`px-1.5 py-px rounded-full text-xs font-mono normal-case leading-none ${
                      lightMode
                        ? "bg-emerald-100 text-emerald-700 border border-emerald-300"
                        : "bg-emerald-950 text-emerald-400"
                    }`}>
                      {Math.round(selectedPlan.v_util * 100)}%
                    </span>
                  )}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Content — ManifestForm stays mounted to preserve form state */}
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
                <div className={`border-t ${lightMode ? "border-gray-300" : "border-gray-800"}`} />
                <Dashboard plan={selectedPlan!} lightMode={lightMode} />
              </>
            ) : (
              <div className={`p-6 text-center text-sm ${lightMode ? "text-gray-600" : "text-gray-500"}`}>
                Run a solve to see results.
              </div>
            ))}
        </div>

        {error && (
          <div className={`px-4 py-3 border-t text-sm shrink-0 flex gap-2 items-start ${
            lightMode
              ? "border-red-300 bg-red-50 text-red-700"
              : "border-red-900/50 bg-red-950/30 text-red-400"
          }`}>
            <span className="shrink-0 mt-px">⚠</span>
            <span>{error}</span>
          </div>
        )}
      </aside>

      {/* ── Main viewer ─────────────────────────────────────────────────────── */}
      <main className="overflow-hidden">
        {selectedPlan ? (
          <TruckViewer
            plan={selectedPlan}
            truck={{ W: truckSpec.W, L: truckSpec.L, H: truckSpec.H }}
            lightMode={lightMode}
          />
        ) : loading ? (
          <div className="flex flex-col items-center justify-center h-full gap-4">
            <div className="w-10 h-10 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            <div className="text-center">
              <p className={`text-base font-semibold ${lightMode ? "text-gray-800" : "text-gray-200"}`}>
                Solving packing plans…
              </p>
              <p className={`text-sm mt-1 ${lightMode ? "text-gray-500" : "text-gray-400"}`}>
                Generating 3 alternative plans
              </p>
            </div>
          </div>
        ) : (
          /* Empty state — inline so lightMode is in scope */
          <div className="flex flex-col items-center justify-center h-full gap-5 text-center px-8">
            <div className={`w-20 h-20 rounded-2xl border flex items-center justify-center ${
              lightMode ? "bg-gray-100 border-gray-300" : "bg-gray-900 border-gray-800"
            }`}>
              <svg
                className={`w-10 h-10 ${lightMode ? "text-gray-400" : "text-gray-700"}`}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1"
              >
                <path d="M2 7.5L12 3l10 4.5v9L12 21 2 16.5v-9z" />
                <path d="M12 3v18M2 7.5l10 4.5 10-4.5" />
              </svg>
            </div>
            <div>
              <p className={`text-base font-semibold ${lightMode ? "text-gray-800" : "text-gray-300"}`}>
                No packing plan loaded
              </p>
              <p className={`text-sm mt-1.5 max-w-xs leading-relaxed ${lightMode ? "text-gray-500" : "text-gray-400"}`}>
                Fill in the cargo manifest on the left and click{" "}
                <span className={`font-medium ${lightMode ? "text-gray-800" : "text-gray-200"}`}>
                  Solve Packing Plan
                </span>{" "}
                to generate 3 alternative LIFO-compliant loading plans.
              </p>
            </div>
            <div className="flex flex-wrap justify-center gap-2">
              {["ILP solver", "FFD heuristic", "LIFO constraints", "3D viz"].map((t) => (
                <span
                  key={t}
                  className={`text-sm px-3 py-1.5 rounded border ${
                    lightMode
                      ? "text-gray-600 bg-white border-gray-300"
                      : "text-gray-400 bg-gray-900 border-gray-700"
                  }`}
                >
                  {t}
                </span>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
