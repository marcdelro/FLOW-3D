import { useEffect, useRef } from "react";

import { ButtonLink } from "./primitives/Button";
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
      className="relative min-h-[100vh] w-full overflow-hidden bg-[#0b0d12]"
      style={{ ["--mx" as string]: "50%", ["--my" as string]: "35%" }}
    >
      {/* Ambient aurora gradient — fixed, low-cost */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(59,130,246,0.18),transparent_55%),radial-gradient(ellipse_at_bottom_left,rgba(125,211,252,0.10),transparent_50%)]" />

      {/* Pointer-aware spotlight — only paints; no layout/JS-driven anim */}
      <div
        className="pointer-events-none absolute inset-0 transition-opacity duration-300"
        style={{
          background:
            "radial-gradient(560px circle at var(--mx) var(--my), rgba(96,165,250,0.18), transparent 60%)",
        }}
        aria-hidden
      />

      {/* Two slow pulsing orbs — pure CSS, GPU-composited */}
      <div
        className={`pointer-events-none absolute -top-40 -left-32 w-[520px] h-[520px] rounded-full bg-blue-500/10 blur-3xl ${
          reduced ? "" : "animate-pulse"
        }`}
        style={{ animationDuration: "9s" }}
        aria-hidden
      />
      <div
        className={`pointer-events-none absolute -bottom-40 -right-32 w-[520px] h-[520px] rounded-full bg-cyan-500/10 blur-3xl ${
          reduced ? "" : "animate-pulse"
        }`}
        style={{ animationDuration: "11s", animationDelay: "1.5s" }}
        aria-hidden
      />

      {/* Vignette grid — pure CSS, no animation */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.06]"
        style={{
          backgroundImage:
            "linear-gradient(to right, rgba(255,255,255,0.45) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.45) 1px, transparent 1px)",
          backgroundSize: "56px 56px",
          maskImage:
            "radial-gradient(ellipse at center, black 35%, transparent 75%)",
          WebkitMaskImage:
            "radial-gradient(ellipse at center, black 35%, transparent 75%)",
        }}
        aria-hidden
      />

      {/* Bottom fade into the next section */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-b from-transparent to-[#0b0d12] z-[5]" />

      {/* Copy column */}
      <div className="relative z-10 mx-auto max-w-7xl px-6 md:px-10 pt-32 pb-24 md:pt-40 md:pb-32 min-h-[100vh] flex items-center">
        <div className="max-w-2xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-[#0b0d12]/70 backdrop-blur px-3 py-1 text-xs font-medium text-cyan-200">
            <span className="h-1.5 w-1.5 rounded-full bg-cyan-300 animate-pulse" />
            FEU Institute of Technology · BS Computer Science Thesis 2026
          </div>

          <h1
            className="mt-6 text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight text-white leading-[1.05]"
            style={{ textShadow: "0 2px 24px rgba(0,0,0,0.85), 0 1px 3px rgba(0,0,0,0.95)" }}
          >
            Loading plans that respect your{" "}
            <span
              className="italic font-black text-sky-300"
              style={{ textShadow: "0 0 22px rgba(125,211,252,0.7), 0 0 44px rgba(56,189,248,0.35)" }}
            >
              route
            </span>
            , your{" "}
            <span
              className="italic font-black text-pink-300"
              style={{ textShadow: "0 0 22px rgba(240,171,252,0.7), 0 0 44px rgba(244,114,182,0.35)" }}
            >
              fragile
            </span>
            , and your{" "}
            <span
              className="italic font-black text-amber-300"
              style={{ textShadow: "0 0 22px rgba(252,211,77,0.7), 0 0 44px rgba(251,191,36,0.35)" }}
            >
              truck
            </span>
            .
          </h1>

          <p
            className="mt-6 text-lg md:text-xl text-gray-100 leading-relaxed max-w-xl"
            style={{ textShadow: "0 1px 12px rgba(0,0,0,0.9)" }}
          >
            FLOW-3D generates LIFO-correct, route-aware 3D loading plans for Philippine furniture haulers — so
            every stop unloads first, glass cabinets stay intact, and you stop paying for empty space.
          </p>

          <div className="mt-9 flex flex-wrap items-center gap-3">
            <ButtonLink to="/login" variant="primary" size="lg">
              Sign In
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14M13 5l7 7-7 7" />
              </svg>
            </ButtonLink>
            <ButtonLink to="#how" variant="secondary" size="lg">
              See a Sample Plan
            </ButtonLink>
          </div>

          <p
            className="mt-6 text-sm text-gray-300"
            style={{ textShadow: "0 1px 8px rgba(0,0,0,0.9)" }}
          >
            No CAD skills, no math. If you can fill a spreadsheet, you can run FLOW-3D.
          </p>
        </div>
      </div>
    </section>
  );
}
