import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { TOUR_STEPS } from "./steps";

/** Set to "1" once the user has actually completed or skipped a tour. */
const TOUR_DONE_KEY = "flow3d_tour_done";
/**
 * Set to "1" when the user opts out of the first-visit prompt with the
 * "Don't show this again" checkbox ticked. Independent from TOUR_DONE_KEY
 * so users who decline once but want to be asked again next visit (the
 * default "No" branch) still get the prompt on their next /app load.
 */
const TOUR_PROMPT_DISMISSED_KEY = "flow3d_tour_prompt_dismissed";

interface TourContextValue {
  active: boolean;
  step: number;
  total: number;
  justCompleted: boolean;
  isAppRoute: boolean;
  tourDone: boolean;
  /** First-visit Yes/No modal is visible. */
  showPrompt: boolean;
  /** Start the tour immediately, bypassing the prompt. Called from the
   *  TourRestartButton ("?") and the Help & Support modal. */
  start: () => void;
  next: () => void;
  back: () => void;
  skip: () => void;
  /** User answered Yes on the first-visit prompt. If dontShowAgain is true
   *  the prompt won't auto-appear on later visits even before completion. */
  acceptPrompt: (dontShowAgain: boolean) => void;
  /** User answered No on the first-visit prompt. dontShowAgain hides the
   *  prompt permanently (until they manually clear localStorage). */
  declinePrompt: (dontShowAgain: boolean) => void;
}

const TourContext = createContext<TourContextValue | null>(null);

export function TourProvider({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const isAppRoute = location.pathname.startsWith("/app");

  const [active, setActive] = useState(false);
  const [step, setStep] = useState(0);
  const [justCompleted, setJustCompleted] = useState(false);
  const [tourDone, setTourDone] = useState(() => !!localStorage.getItem(TOUR_DONE_KEY));
  const [showPrompt, setShowPrompt] = useState(false);

  // First-visit prompt gate.
  // The prompt auto-shows on /app when:
  //   - the user has never completed/skipped the tour
  //   - AND has not ticked "Don't show again" on a previous prompt
  // Tour is no longer auto-started; only the prompt is. The user must
  // explicitly accept to begin the spotlight sequence.
  useEffect(() => {
    if (isAppRoute) {
      const done      = !!localStorage.getItem(TOUR_DONE_KEY);
      const dismissed = !!localStorage.getItem(TOUR_PROMPT_DISMISSED_KEY);
      if (!done && !dismissed) {
        setShowPrompt(true);
      }
    } else {
      setActive(false);
      setShowPrompt(false);
      setStep(0);
    }
  }, [isAppRoute]);

  // Escape key only skips while the spotlight tour is active.
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && active) skip();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  const start = useCallback(() => {
    setShowPrompt(false);
    setStep(0);
    setActive(true);
  }, []);

  const next = useCallback(() => {
    setStep((s) => {
      const n = s + 1;
      if (n >= TOUR_STEPS.length) {
        localStorage.setItem(TOUR_DONE_KEY, "1");
        setTourDone(true);
        setActive(false);
        setJustCompleted(true);
        setTimeout(() => setJustCompleted(false), 3000);
        return 0;
      }
      return n;
    });
  }, []);

  const back = useCallback(() => {
    setStep((s) => Math.max(0, s - 1));
  }, []);

  const skip = useCallback(() => {
    localStorage.setItem(TOUR_DONE_KEY, "1");
    setTourDone(true);
    setActive(false);
    setStep(0);
  }, []);

  const acceptPrompt = useCallback((dontShowAgain: boolean) => {
    if (dontShowAgain) localStorage.setItem(TOUR_PROMPT_DISMISSED_KEY, "1");
    setShowPrompt(false);
    setStep(0);
    setActive(true);
  }, []);

  const declinePrompt = useCallback((dontShowAgain: boolean) => {
    if (dontShowAgain) localStorage.setItem(TOUR_PROMPT_DISMISSED_KEY, "1");
    setShowPrompt(false);
  }, []);

  return (
    <TourContext.Provider
      value={{
        active,
        step,
        total: TOUR_STEPS.length,
        justCompleted,
        isAppRoute,
        tourDone,
        showPrompt,
        start,
        next,
        back,
        skip,
        acceptPrompt,
        declinePrompt,
      }}
    >
      {children}
    </TourContext.Provider>
  );
}

export function useTour() {
  const ctx = useContext(TourContext);
  if (!ctx) throw new Error("useTour must be used within TourProvider");
  return ctx;
}
