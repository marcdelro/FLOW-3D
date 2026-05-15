import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { TOUR_STEPS } from "./steps";

const TOUR_DONE_KEY = "flow3d_tour_done";

interface TourContextValue {
  active: boolean;
  step: number;
  total: number;
  justCompleted: boolean;
  isAppRoute: boolean;
  tourDone: boolean;
  start: () => void;
  next: () => void;
  back: () => void;
  skip: () => void;
}

const TourContext = createContext<TourContextValue | null>(null);

export function TourProvider({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const isAppRoute = location.pathname.startsWith("/app");

  const [active, setActive] = useState(false);
  const [step, setStep] = useState(0);
  const [justCompleted, setJustCompleted] = useState(false);
  const [tourDone, setTourDone] = useState(() => !!localStorage.getItem(TOUR_DONE_KEY));

  // Single effect handles both auto-start and deactivation.
  // No useRef guard — calling setActive(true) is idempotent, and
  // localStorage is the real "already done" gate. This is safe under
  // React 18 StrictMode, which double-invokes effects with a state reset
  // between mounts (a useRef guard would persist across the reset and
  // silently block the second call to setActive).
  useEffect(() => {
    if (isAppRoute && !localStorage.getItem(TOUR_DONE_KEY)) {
      setActive(true);
    } else if (!isAppRoute) {
      setActive(false);
      setStep(0);
    }
  }, [isAppRoute]);

  // Escape key only skips (same as clicking Skip tour)
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && active) skip();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  const start = useCallback(() => {
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

  return (
    <TourContext.Provider
      value={{ active, step, total: TOUR_STEPS.length, justCompleted, isAppRoute, tourDone, start, next, back, skip }}
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
