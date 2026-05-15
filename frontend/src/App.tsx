import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

import { fetchSolutions } from "./api/client";
import { useAuth } from "./auth/AuthContext";
import { appendSessionLog } from "./lib/sessionLog";
import { buildPreviewPlan } from "./lib/previewPacker";
import { Dashboard } from "./components/Dashboard";
import { Explainability } from "./components/Explainability";
import { HelpModal } from "./components/HelpModal";
import { ManifestForm } from "./components/ManifestForm";
import { PlanSelector } from "./components/PlanSelector";
import { TruckViewer } from "./components/TruckViewer";
import type { FurnitureItem, PackingPlan, SavedSession, SolveRequest, TruckSpec } from "./types";

type Tab = "manifest" | "results" | "explain";

/**
 * Turn a raw solver/fetch error string into a friendly title + body + hint,
 * with the original message preserved as `raw` for the "Technical details"
 * disclosure. Matches the well-known shapes thrown by `fetchSolution()` and
 * the FastAPI 422 / 4xx responses; falls back to a generic message for
 * unrecognised errors.
 */
function friendlyError(msg: string): {
  title: string;
  body: string;
  hint?: string;
  raw?: string;
} {
  // Polling timeout — Celery worker likely dead or stuck
  if (/poll timed out/i.test(msg)) {
    return {
      title: "The solver did not respond in time",
      body: "We waited 60 seconds for the packing job to finish and never got a result.",
      hint:
        "This usually means the background worker (Celery) is not running, " +
        "or the manifest is too large for the current solver configuration. " +
        "Try a smaller manifest, or contact your administrator to restart " +
        "the worker.",
      raw: msg,
    };
  }
  // FastAPI validation
  if (/HTTP 422/i.test(msg)) {
    return {
      title: "Some manifest values are invalid",
      body:
        "The server rejected the request because one or more truck or item " +
        "values are missing or out of range.",
      hint:
        "Open the Manifest tab and check that the truck dimensions, payload, " +
        "and every item's width / length / height / weight are non-zero.",
      raw: msg,
    };
  }
  if (/HTTP 401|HTTP 403/i.test(msg)) {
    return {
      title: "You are signed out",
      body: "Your session has expired. Sign in again and retry the solve.",
      raw: msg,
    };
  }
  if (/HTTP 5\d\d/i.test(msg) || /Solve failed: HTTP/i.test(msg)) {
    return {
      title: "The server hit an error while solving",
      body:
        "The packing service is reachable but returned an internal error. " +
        "This is usually transient.",
      hint: "Try again in a moment. If it keeps happening, contact your administrator.",
      raw: msg,
    };
  }
  if (/Failed to fetch|NetworkError|net::/i.test(msg)) {
    return {
      title: "Cannot reach the packing service",
      body:
        "The browser could not contact the FLOW-3D server. Check your " +
        "internet connection.",
      raw: msg,
    };
  }
  // Generic fallback
  return {
    title: "Could not finish",
    body: msg,
  };
}

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

  // Live preview state — mirrors the in-progress ManifestForm contents so the
  // 3D viewer can render items as soon as they're added, without running the
  // ILP/FFD solver. Distinct from solveItems/truckSpec, which freeze the
  // manifest used by the last completed solve.
  const [previewItems, setPreviewItems] = useState<FurnitureItem[]>([]);
  const [previewTruck, setPreviewTruck] = useState<TruckSpec>({
    W: 0, L: 0, H: 0, payload_kg: 0,
  });

  function handlePreviewChange(items: FurnitureItem[], truck: TruckSpec) {
    setPreviewItems(items);
    setPreviewTruck(truck);
  }

  const previewPlan = useMemo<PackingPlan | null>(() => {
    if (previewItems.length === 0) return null;
    if (previewTruck.W <= 0 || previewTruck.L <= 0 || previewTruck.H <= 0) return null;
    return buildPreviewPlan(previewItems, previewTruck);
  }, [previewItems, previewTruck]);

  const { user, logout }                = useAuth();
  const navigate                        = useNavigate();
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [savedFlash,    setSavedFlash]    = useState(false);
  const prevUserRef = useRef<string | null>(null);

  const SESSION_KEY = user ? `flow3d_state_${user.username}` : null;

  // Restore saved session when a user signs in and no plan is loaded yet.
  useEffect(() => {
    if (!SESSION_KEY || plans.length > 0) return;
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return;
    try {
      const saved = JSON.parse(raw) as SavedSession;
      setTruckSpec(saved.truck);
      setSolveItems(saved.items);
      setPlans(saved.plans);
      setSelectedIdx(saved.selectedIdx);
      setTab("results");
      if (user) appendSessionLog(user.username, "session_restored", `items=${saved.items.length}, plans=${saved.plans.length}`);
    } catch {
      localStorage.removeItem(SESSION_KEY);
    }
  }, [SESSION_KEY]); // eslint-disable-line react-hooks/exhaustive-deps

  // Log session_start once when a user signs in (or page loads with active token).
  useEffect(() => {
    const prev = prevUserRef.current;
    const curr = user?.username ?? null;
    if (curr && curr !== prev) {
      appendSessionLog(curr, "session_start", null);
    }
    prevUserRef.current = curr;
  }, [user]);

  function saveSession() {
    if (!SESSION_KEY || !solveItems.length) return;
    const session: SavedSession = {
      items: solveItems,
      truck: truckSpec,
      stops: [],
      plans,
      selectedIdx,
      savedAt: new Date().toISOString(),
    };
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    setSavedFlash(true);
    setTimeout(() => setSavedFlash(false), 2500);
    if (user) appendSessionLog(user.username, "session_saved", `items=${solveItems.length}, plans=${plans.length}`);
  }

  function handleLogout() {
    if (user) appendSessionLog(user.username, "session_end", null);
    if (SESSION_KEY && solveItems.length) {
      saveSession();
    }
    logout();
    navigate("/", { replace: true });
  }

  const selectedPlan = plans[selectedIdx] ?? null;

  function handleSelectPlan(idx: number) {
    setSelectedIdx(idx);
    if (user && plans[idx]) {
      const p = plans[idx];
      appendSessionLog(user.username, "plan_selected", `plan=${idx + 1}, strategy=${p.strategy}, solver=${p.solver_mode}, v_util=${(p.v_util * 100).toFixed(1)}%`);
    }
  }

  async function handleSolve(req: SolveRequest) {
    setLoading(true);
    setError(null);
    setTruckSpec(req.truck);
    setSolveItems(req.items);
    if (user) appendSessionLog(user.username, "solve_submitted", `strategy=${req.strategy}, items=${req.items.length}`);
    try {
      const results = await fetchSolutions(req);
      setPlans(results);
      setSelectedIdx(0);
      setTab("results");
      if (user && results[0]) {
        appendSessionLog(user.username, "solve_success", `solver=${results[0].solver_mode}, plans=${results.length}, best_v_util=${(results[0].v_util * 100).toFixed(1)}%`);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Something went wrong while planning. Please try again.";
      setError(msg);
      if (user) appendSessionLog(user.username, "solve_error", msg.slice(0, 120));
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
            <ManifestForm
              onSolve={handleSolve}
              loading={loading}
              lightMode={lightMode}
              onPreviewChange={handlePreviewChange}
            />
          </div>
          {tab === "results" &&
            (plans.length > 0 ? (
              <>
                <PlanSelector
                  plans={plans}
                  selectedIdx={selectedIdx}
                  onSelect={handleSelectPlan}
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
                  onSelect={handleSelectPlan}
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

      </aside>

      {/* ── Main viewer ─────────────────────────────────────────────────────── */}
      <main className="relative overflow-hidden">

        {/* ── Top-right overlay: button bar on top, status banners stacked below ── */}
        <div className="absolute top-4 right-4 z-20 flex flex-col items-end gap-2 w-[min(28rem,calc(100vw-2rem))]">

          {/* Button row — kept horizontal */}
          <div className="flex items-center gap-2">

          {/* Help / Feedback */}
          <button
            onClick={() => setShowHelpModal(true)}
            title="Help & feedback"
            aria-label="Help and feedback"
            className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl border-2 text-sm font-semibold transition-all ${
              lightMode
                ? "bg-white border-slate-300 text-blue-600 hover:bg-blue-50 hover:border-blue-300"
                : "bg-gray-900 border-gray-600 text-blue-400 hover:bg-blue-950/30 hover:border-blue-800"
            }`}
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
            Help
          </button>

          {/* Save State / Log Out cluster */}
          <div className="flex items-center gap-2">
            {/* Save State */}
            <button
              onClick={() => user ? saveSession() : setShowSaveModal(true)}
              title={user ? "Save current session" : "Sign in to save"}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 text-sm font-semibold transition-all ${
                savedFlash
                  ? lightMode
                    ? "border-green-400 bg-green-50 text-green-700"
                    : "border-green-700 bg-green-950/70 text-green-300"
                  : lightMode
                    ? "bg-white border-slate-300 text-slate-700 hover:bg-slate-50 hover:border-slate-400"
                    : "bg-gray-900 border-gray-600 text-gray-200 hover:bg-gray-800 hover:border-gray-500"
              }`}
            >
              {savedFlash ? (
                <>
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 11.08V12a10 10 0 11-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
                  </svg>
                  Saved
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z" />
                    <polyline points="17 21 17 13 7 13 7 21" />
                    <polyline points="7 3 7 8 15 8" />
                  </svg>
                  Save State
                </>
              )}
            </button>

            {/* Log Out */}
            {user && (
              <button
                onClick={handleLogout}
                title="Sign out"
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 text-sm font-semibold transition-all ${
                  lightMode
                    ? "bg-white border-slate-300 text-red-600 hover:bg-red-50 hover:border-red-300"
                    : "bg-gray-900 border-gray-600 text-red-400 hover:bg-red-950/30 hover:border-red-800"
                }`}
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" />
                </svg>
                Log Out
              </button>
            )}
          </div>
          </div>

          {/* Solve error banner */}
          {error && (() => {
            const friendly = friendlyError(error);
            return (
              <div
                role="alert"
                className={`w-full rounded-xl border-2 px-4 py-3 text-sm shadow-lg ${
                  lightMode
                    ? "border-red-300 bg-red-50 text-red-800"
                    : "border-red-900/50 bg-red-950/95 text-red-200"
                }`}
              >
                <div className="flex gap-2.5 items-start">
                  <svg className="w-5 h-5 shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold mb-1">{friendly.title}</div>
                    <div className="leading-relaxed break-words whitespace-pre-line">
                      {friendly.body}
                    </div>
                    {friendly.hint && (
                      <div className={`mt-2 text-xs leading-relaxed ${
                        lightMode ? "text-red-700/80" : "text-red-300/80"
                      }`}>
                        {friendly.hint}
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => setError(null)}
                    title="Dismiss"
                    aria-label="Dismiss error"
                    className={`shrink-0 -mr-1 -mt-1 w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${
                      lightMode ? "hover:bg-red-100 text-red-700" : "hover:bg-red-900/50 text-red-300"
                    }`}
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                </div>
                <div className="flex flex-wrap gap-2 mt-3 pl-7">
                  <button
                    onClick={() => { setError(null); setTab("manifest"); }}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                      lightMode
                        ? "bg-red-600 hover:bg-red-700 text-white"
                        : "bg-red-700 hover:bg-red-600 text-white"
                    }`}
                  >
                    Edit manifest
                  </button>
                  {friendly.raw && (
                    <details className={`text-xs ${lightMode ? "text-red-700/80" : "text-red-300/70"}`}>
                      <summary className="cursor-pointer select-none px-3 py-1.5 rounded-lg hover:underline">
                        Technical details
                      </summary>
                      <pre className={`mt-1.5 p-2 rounded-md text-[11px] font-mono whitespace-pre-wrap break-all ${
                        lightMode ? "bg-red-100/60" : "bg-red-950/60"
                      }`}>{friendly.raw}</pre>
                    </details>
                  )}
                </div>
              </div>
            );
          })()}

          {/* Unplaced items banner */}
          {selectedPlan && selectedPlan.unplaced_items.length > 0 && (
            <div className={`w-full rounded-xl border-2 px-4 py-3 text-sm shadow-lg ${
              lightMode
                ? "border-amber-300 bg-amber-50 text-amber-900"
                : "border-amber-700/60 bg-amber-950/90 text-amber-200"
            }`}>
              <div className="flex gap-2.5 items-start">
                <svg className="w-4 h-4 shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                  <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
                <div className="flex-1">
                  <div className="font-bold mb-1">
                    {selectedPlan.unplaced_items.length} item{selectedPlan.unplaced_items.length > 1 ? "s" : ""} could not be packed
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {selectedPlan.unplaced_items.map((id) => (
                      <span key={id} className={`text-xs font-mono px-1.5 py-0.5 rounded ${
                        lightMode ? "bg-amber-100 text-amber-800" : "bg-amber-900/50 text-amber-200"
                      }`}>{id}</span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>

        {selectedPlan ? (
          <div className="relative w-full h-full">
            <TruckViewer
              plan={selectedPlan}
              truck={{ W: truckSpec.W, L: truckSpec.L, H: truckSpec.H }}
              items={solveItems}
              lightMode={lightMode}
            />
          </div>
        ) : previewPlan ? (
          <div className="relative w-full h-full">
            <TruckViewer
              plan={previewPlan}
              truck={{ W: previewTruck.W, L: previewTruck.L, H: previewTruck.H }}
              items={previewItems}
              lightMode={lightMode}
            />
            {/* Preview badge — distinguishes naive placement from a solved plan.
                Anchored to bottom-center so it doesn't overlap the 3D/Exploded/
                Labels/Animate view-mode buttons in TruckViewer's top-left. */}
            <div className={`absolute bottom-6 left-1/2 -translate-x-1/2 z-10 flex items-center gap-2 px-3.5 py-2 rounded-xl border-2 text-sm font-semibold shadow-sm ${
              lightMode
                ? "bg-amber-50 border-amber-300 text-amber-900"
                : "bg-amber-950/70 border-amber-700 text-amber-200"
            }`}>
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8"  x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <span>
                Preview only — click <span className="font-bold">Solve Packing Plan</span> for the optimised layout
              </span>
            </div>
          </div>
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
            <div className="grid grid-cols-3 gap-3 max-w-2xl w-full mt-2">
              <HelpCard step="1" title="Manifest"  body="Truck spec, delivery stops, and cargo items." lightMode={lightMode} />
              <HelpCard step="2" title="Solve"     body="ILP for small manifests, FFD for large."     lightMode={lightMode} />
              <HelpCard step="3" title="Review"    body="Compare plans in the 3D viewer."             lightMode={lightMode} />
            </div>
          </div>
        )}
      </main>

      {/* ── Help & Feedback modal ── */}
      <HelpModal open={showHelpModal} onClose={() => setShowHelpModal(false)} />

      {/* ── Save State modal — sign-in prompt for guest users ── */}
      {showSaveModal && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4"
          onClick={() => setShowSaveModal(false)}
        >
          <div
            className={`rounded-2xl border-2 p-6 w-full max-w-sm shadow-2xl ${
              lightMode ? "bg-white border-slate-200" : "bg-gray-900 border-gray-700"
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Icon */}
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-4 ${
              lightMode ? "bg-blue-50 border-2 border-blue-200" : "bg-blue-950/40 border-2 border-blue-800"
            }`}>
              <svg className={`w-6 h-6 ${lightMode ? "text-blue-600" : "text-blue-400"}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z" />
                <polyline points="17 21 17 13 7 13 7 21" />
                <polyline points="7 3 7 8 15 8" />
              </svg>
            </div>

            <h2 className={`text-xl font-bold mb-2 ${lightMode ? "text-slate-900" : "text-gray-100"}`}>
              Save your session
            </h2>
            <p className={`text-sm mb-5 leading-relaxed ${lightMode ? "text-slate-600" : "text-gray-400"}`}>
              Sign in to save your cargo manifest and packing plan so you can pick up right where you left off.
            </p>

            <div className="flex flex-col gap-2">
              <button
                onClick={() => {
                  setShowSaveModal(false);
                  navigate("/login", { state: { from: { pathname: "/app" } } });
                }}
                className="w-full rounded-xl px-4 py-3 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm transition"
              >
                Sign In
              </button>
              <button
                onClick={() => setShowSaveModal(false)}
                className={`text-sm text-center mt-1 transition ${
                  lightMode ? "text-slate-400 hover:text-slate-600" : "text-gray-600 hover:text-gray-400"
                }`}
              >
                Continue without saving
              </button>
            </div>
          </div>
        </div>
      )}
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
