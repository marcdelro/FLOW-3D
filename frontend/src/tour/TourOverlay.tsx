import { useEffect, useRef, useState } from "react";
import { useTour } from "./TourContext";
import { TOUR_STEPS } from "./steps";

// ── Completion toast ────────────────────────────────────────────────────────────
export function TourCompletedToast() {
  const { justCompleted } = useTour();
  if (!justCompleted) return null;
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[10001] pointer-events-none">
      <div className="bg-[#0f1117] border border-white/15 rounded-2xl shadow-2xl px-6 py-4 text-white text-sm font-semibold flex items-center gap-3 animate-fade-in">
        You&apos;re all set!
      </div>
    </div>
  );
}

// ── Restart "?" button ─────────────────────────────────────────────────────────
export function TourRestartButton() {
  const { start, active, isAppRoute, tourDone } = useTour();
  if (!isAppRoute || active || tourDone) return null;
  return (
    <button
      onClick={start}
      title="Restart guided tour"
      aria-label="Restart guided tour"
      className="fixed bottom-6 left-6 z-50 w-11 h-11 rounded-full bg-blue-600 hover:bg-blue-500 text-white text-lg font-bold shadow-lg transition flex items-center justify-center select-none"
    >
      ?
    </button>
  );
}

// ── First-visit Yes / No prompt ────────────────────────────────────────────────
/**
 * Shown on the user's first visit to /app — replaces the previous auto-start
 * behaviour that immediately took over the screen with a spotlight. The user
 * picks Yes (take the tour) or No (skip), with an optional "Don't show this
 * again" checkbox so power-users aren't pestered on every load. The footer
 * mentions that the tour is always available from the Help button so users
 * who dismiss the prompt can still find it later.
 */
export function TourPromptModal() {
  const { showPrompt, acceptPrompt, declinePrompt } = useTour();
  const [dontShowAgain, setDontShowAgain] = useState(false);

  if (!showPrompt) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="tour-prompt-title"
      className="fixed inset-0 z-[10000] flex items-center justify-center px-4"
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div className="relative w-full max-w-md rounded-2xl border border-white/10 bg-[#0f1117] shadow-2xl p-6">
        <div className="w-12 h-12 rounded-2xl bg-blue-600/20 border border-blue-500/40 flex items-center justify-center mb-4">
          <svg className="w-6 h-6 text-blue-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
        </div>

        <h2 id="tour-prompt-title" className="text-xl font-bold text-white mb-2">
          Take a quick tour?
        </h2>
        <p className="text-sm text-gray-400 leading-relaxed mb-4">
          We&apos;ll walk you through FLOW-3D in seven steps — manifest entry,
          delivery stops, items, solving, and the 3D viewer. About 60 seconds.
        </p>

        <label className="flex items-center gap-2 mb-5 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={dontShowAgain}
            onChange={(e) => setDontShowAgain(e.target.checked)}
            className="w-4 h-4 rounded border-gray-600 bg-gray-900 text-blue-600 focus:ring-2 focus:ring-blue-500"
          />
          <span className="text-sm text-gray-300">Don&apos;t show this again</span>
        </label>

        <div className="flex flex-col gap-2">
          <button
            onClick={() => acceptPrompt(dontShowAgain)}
            className="w-full rounded-xl px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm transition"
            autoFocus
          >
            Yes, take the tour
          </button>
          <button
            onClick={() => declinePrompt(dontShowAgain)}
            className="w-full rounded-xl px-4 py-2.5 border border-white/15 hover:bg-white/[0.04] text-gray-300 font-semibold text-sm transition"
          >
            No, skip for now
          </button>
        </div>

        <p className="mt-4 text-xs text-gray-500 leading-relaxed">
          You can launch the tour anytime from the <span className="font-semibold text-gray-300">Help</span> button (top right) under <span className="font-semibold text-gray-300">Quick Start</span>.
        </p>
      </div>
    </div>
  );
}

// ── Spotlight overlay ──────────────────────────────────────────────────────────
interface SpotRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

const PAD = 8;
const TOOLTIP_W = 300;
// Generous height estimate so we never clip long tooltips
const TOOLTIP_H = 260;
const SIDEBAR_THRESHOLD = 0.45; // if element center-x < 45 % of viewport → "in sidebar"

function clamp(v: number, min: number, max: number) {
  return Math.min(Math.max(v, min), max);
}

function computeTooltipPos(rect: SpotRect): { top: number; left: number } {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const centerX = rect.left + rect.width / 2;
  const inSidebar = centerX < vw * SIDEBAR_THRESHOLD;

  let top: number;
  let left: number;

  if (inSidebar) {
    // Float the tooltip to the right of the highlighted element
    left = rect.left + rect.width + 20;
    top = rect.top + rect.height / 2 - TOOLTIP_H / 2;
    // If the tooltip would overflow the right edge, fall back to centered below
    if (left + TOOLTIP_W > vw - 16) {
      left = rect.left + rect.width / 2 - TOOLTIP_W / 2;
      top = rect.top - TOOLTIP_H - 14;
    }
  } else {
    // Main-area element: prefer above (viewer is large, below looks odd)
    left = rect.left + rect.width / 2 - TOOLTIP_W / 2;
    const spaceAbove = rect.top;
    const spaceBelow = vh - (rect.top + rect.height);
    top =
      spaceAbove >= TOOLTIP_H + 20
        ? rect.top - TOOLTIP_H - 14
        : spaceBelow >= TOOLTIP_H + 20
          ? rect.top + rect.height + 14
          : vh / 2 - TOOLTIP_H / 2;
  }

  return {
    left: clamp(left, 16, vw - TOOLTIP_W - 16),
    top: clamp(top, 16, vh - TOOLTIP_H - 16),
  };
}

export function TourOverlay() {
  const { active, step, total, next, back, skip } = useTour();
  const [rect, setRect] = useState<SpotRect | null>(null);
  const scrollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const currentStep = TOUR_STEPS[step];

  useEffect(() => {
    if (!active || !currentStep) {
      setRect(null);
      return;
    }

    function measure() {
      const el = document.querySelector<HTMLElement>(currentStep.target);
      if (!el) {
        setRect(null);
        return;
      }
      // Scroll the element into view in case the sidebar is scrolled away
      el.scrollIntoView({ behavior: "smooth", block: "nearest" });

      // Wait for the scroll to settle, then measure
      if (scrollTimerRef.current) clearTimeout(scrollTimerRef.current);
      scrollTimerRef.current = setTimeout(() => {
        const r = el.getBoundingClientRect();
        setRect({
          top:    r.top    - PAD,
          left:   r.left   - PAD,
          width:  r.width  + PAD * 2,
          height: r.height + PAD * 2,
        });
      }, 250);
    }

    measure();
    window.addEventListener("resize", measure);
    return () => {
      window.removeEventListener("resize", measure);
      if (scrollTimerRef.current) clearTimeout(scrollTimerRef.current);
    };
  }, [active, step, currentStep]);

  if (!active || !currentStep) return null;

  const isFirst = step === 0;
  const isLast  = step === total - 1;

  const pos = rect
    ? computeTooltipPos(rect)
    : { left: (window.innerWidth - TOOLTIP_W) / 2, top: window.innerHeight / 2 - TOOLTIP_H / 2 };

  return (
    <>
      {/*
        Full-screen lockout layer.
        pointer-events-auto + no onClick = silently eats all clicks so the user
        cannot interact with anything behind the overlay. The only way out is the
        Skip / ✕ / Done buttons inside the tooltip card.
      */}
      <div className="fixed inset-0 z-[9998] cursor-default" aria-hidden="true" />

      {/* Spotlight */}
      {rect ? (
        <div
          className="fixed z-[9999] pointer-events-none rounded-xl ring-2 ring-blue-400/40"
          style={{
            top:      rect.top,
            left:     rect.left,
            width:    rect.width,
            height:   rect.height,
            boxShadow: "0 0 0 9999px rgba(0,0,0,0.68)",
            transition: "top 0.22s ease, left 0.22s ease, width 0.22s ease, height 0.22s ease",
          }}
        />
      ) : (
        <div className="fixed inset-0 z-[9998] bg-black/68 pointer-events-none" aria-hidden="true" />
      )}

      {/* Tooltip card */}
      <div
        className="fixed z-[10000] pointer-events-auto"
        style={{
          top:   pos.top,
          left:  pos.left,
          width: TOOLTIP_W,
          transition: "top 0.22s ease, left 0.22s ease",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-[#0f1117] border border-white/10 rounded-2xl shadow-2xl p-5 text-white">

          {/* Header row */}
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-blue-400 uppercase tracking-wider">
              Step {step + 1} of {total}
            </span>
            <button
              onClick={skip}
              aria-label="Skip tour"
              className="text-white/40 hover:text-white/80 transition text-lg leading-none"
            >
              ✕
            </button>
          </div>

          {/* Progress bar */}
          <div className="flex gap-1.5 mb-4">
            {Array.from({ length: total }).map((_, i) => (
              <div
                key={i}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  i === step   ? "bg-blue-400 flex-[2]"
                  : i < step  ? "bg-blue-700 flex-1"
                              : "bg-white/15 flex-1"
                }`}
              />
            ))}
          </div>

          <h3 className="text-base font-bold mb-1.5 leading-tight">{currentStep.title}</h3>
          <p className="text-sm text-white/70 leading-relaxed mb-5">{currentStep.body}</p>

          {/* Navigation */}
          <div className="flex items-center justify-between gap-2">
            <button
              onClick={skip}
              className="text-xs text-white/40 hover:text-white/70 transition"
            >
              Skip tour
            </button>
            <div className="flex gap-2">
              {!isFirst && (
                <button
                  onClick={back}
                  className="px-3.5 py-2 rounded-xl border border-white/15 text-sm font-semibold text-white/70 hover:bg-white/10 transition"
                >
                  Back
                </button>
              )}
              <button
                onClick={next}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold transition"
              >
                {isLast ? "Done" : "Next"}
              </button>
            </div>
          </div>

        </div>
      </div>
    </>
  );
}
