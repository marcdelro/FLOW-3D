import { useEffect, useRef } from "react";

import { ButtonLink } from "./primitives/Button";
import { TruckIllustration } from "./TruckIllustration";
import { usePrefersReducedMotion } from "./hooks/usePrefersReducedMotion";

export function Hero() {
  const reduced = usePrefersReducedMotion();
  const heroRef = useRef<HTMLDivElement | null>(null);

  // Pointer-aware spotlight — updates CSS variables directly so React never
  // re-renders on mouse move. rAF coalesces high-frequency pointer events so
  // we paint at most once per frame even on a 240 Hz mouse.
  useEffect(() => {
    if (reduced) return;
    const el = heroRef.current;
    if (!el) return;

    let frame = 0;
    let nextX = 50;
    let nextY = 35;

    function flush() {
      frame = 0;
      el!.style.setProperty("--mx", `${nextX}%`);
      el!.style.setProperty("--my", `${nextY}%`);
    }

    function onMove(e: PointerEvent) {
      const rect = el!.getBoundingClientRect();
      nextX = ((e.clientX - rect.left) / rect.width) * 100;
      nextY = ((e.clientY - rect.top) / rect.height) * 100;
      if (!frame) frame = requestAnimationFrame(flush);
    }

    el.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      el.removeEventListener("pointermove", onMove);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [reduced]);

  return (
    <section
      ref={heroRef}
      className="relative min-h-[100vh] w-full overflow-hidden"
      style={{
        ["--mx" as string]: "50%",
        ["--my" as string]: "35%",
        background:
          "linear-gradient(135deg, #fef3ec 0%, #fde7d8 22%, #e7f0ff 55%, #dbe9ff 78%, #c7defc 100%)",
      }}
    >
      {/* Soft pastel aurora — warm peach + cool sky */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(255,180,140,0.55),transparent_55%),radial-gradient(ellipse_at_bottom_left,rgba(125,170,255,0.45),transparent_55%),radial-gradient(circle_at_30%_15%,rgba(255,225,205,0.6),transparent_50%)]" />

      {/* Pointer-aware spotlight — warm amber glow to pop on the light bg */}
      <div
        className="pointer-events-none absolute inset-0 transition-opacity duration-300"
        style={{
          background:
            "radial-gradient(560px circle at var(--mx) var(--my), rgba(255,168,118,0.35), rgba(168,196,255,0.22) 38%, transparent 62%)",
          mixBlendMode: "multiply",
        }}
        aria-hidden
      />

      {/* Slow pulsing orbs — pastel tints, GPU-composited */}
      <div
        className={`pointer-events-none absolute -top-40 -left-32 w-[520px] h-[520px] rounded-full bg-rose-300/30 blur-3xl ${
          reduced ? "" : "animate-pulse"
        }`}
        style={{ animationDuration: "9s" }}
        aria-hidden
      />
      <div
        className={`pointer-events-none absolute top-1/2 -right-32 w-[520px] h-[520px] rounded-full bg-sky-400/25 blur-3xl ${
          reduced ? "" : "animate-pulse"
        }`}
        style={{ animationDuration: "11s", animationDelay: "1.5s" }}
        aria-hidden
      />
      <div
        className={`pointer-events-none absolute -bottom-32 left-1/3 w-[420px] h-[420px] rounded-full bg-violet-300/25 blur-3xl ${
          reduced ? "" : "animate-pulse"
        }`}
        style={{ animationDuration: "13s", animationDelay: "3s" }}
        aria-hidden
      />

      {/* Subtle grid — darker hairlines so they read on a light bg */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage:
            "linear-gradient(to right, rgba(30,41,59,0.6) 1px, transparent 1px), linear-gradient(to bottom, rgba(30,41,59,0.6) 1px, transparent 1px)",
          backgroundSize: "56px 56px",
          maskImage:
            "radial-gradient(ellipse at center, black 35%, transparent 75%)",
          WebkitMaskImage:
            "radial-gradient(ellipse at center, black 35%, transparent 75%)",
        }}
        aria-hidden
      />

      {/* Bottom fade into the next (dark) section */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-b from-transparent to-[#0b0d12] z-[5]" />

      {/* Content */}
      <div className="relative z-10 mx-auto max-w-7xl px-6 md:px-10 pt-32 pb-24 md:pt-40 md:pb-32 min-h-[100vh] flex items-center">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-8 w-full items-center">
          {/* Copy column */}
          <div className="lg:col-span-7 max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-slate-900/15 bg-white/60 backdrop-blur px-3 py-1 text-xs font-medium text-slate-800 shadow-sm">
              <span className="h-1.5 w-1.5 rounded-full bg-cyan-500 animate-pulse" />
              FEU Institute of Technology · BS Computer Science Thesis 2026
            </div>

            <h1 className="mt-6 text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight text-slate-900 leading-[1.05]">
              Loading plans that respect your{" "}
              <span
                className="italic font-black text-sky-600"
                style={{ textShadow: "0 0 22px rgba(56,189,248,0.45)" }}
              >
                route
              </span>
              , your{" "}
              <span
                className="italic font-black text-rose-600"
                style={{ textShadow: "0 0 22px rgba(244,114,182,0.45)" }}
              >
                fragile
              </span>
              , and your{" "}
              <span
                className="italic font-black text-amber-600"
                style={{ textShadow: "0 0 22px rgba(251,191,36,0.5)" }}
              >
                truck
              </span>
              .
            </h1>

            <p className="mt-6 text-lg md:text-xl text-slate-700 leading-relaxed max-w-xl">
              FLOW-3D generates LIFO-correct, route-aware 3D loading plans for Philippine furniture haulers — so
              every stop unloads first, glass cabinets stay intact, and you stop paying for empty space.
            </p>

            <div className="mt-9 flex flex-wrap items-center gap-3">
              <ButtonLink
                to="/login"
                variant="primary"
                size="lg"
                className="!bg-slate-900 !text-white hover:!bg-slate-800 shadow-[0_10px_30px_-10px_rgba(15,23,42,0.55)]"
              >
                Sign In
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14M13 5l7 7-7 7" />
                </svg>
              </ButtonLink>
              <ButtonLink
                to="#how"
                variant="secondary"
                size="lg"
                className="!bg-white/70 !text-slate-900 !border-slate-900/15 hover:!bg-white/90 backdrop-blur"
              >
                See a Sample Plan
              </ButtonLink>
            </div>

            <p className="mt-6 text-sm text-slate-700/90">
              No CAD skills, no math. If you can fill a spreadsheet, you can run FLOW-3D.
            </p>
          </div>

          {/* Truck illustration column */}
          <div className="lg:col-span-5 hidden lg:flex justify-center items-center">
            <TruckIllustration animated={!reduced} />
          </div>
        </div>
      </div>

      {/* Mobile illustration — shown beneath the copy on small screens */}
      <div className="relative z-10 lg:hidden flex justify-center pb-16 -mt-8 px-6">
        <TruckIllustration animated={!reduced} compact />
      </div>
    </section>
  );
}
