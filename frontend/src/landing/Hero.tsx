import { Suspense, lazy } from "react";

import { ButtonLink } from "./primitives/Button";
import { useIsMobile } from "./hooks/useIsMobile";
import { usePrefersReducedMotion } from "./hooks/usePrefersReducedMotion";

const Hero3D = lazy(() => import("./Hero3D"));

export function Hero() {
  const isMobile = useIsMobile(768);
  const reduced = usePrefersReducedMotion();
  const showCanvas = !isMobile && !reduced;

  return (
    <section className="relative min-h-[100vh] w-full overflow-hidden bg-[#0b0d12]">
      {/* Background gradient + grid */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(59,130,246,0.15),transparent_55%),radial-gradient(ellipse_at_bottom_left,rgba(125,211,252,0.08),transparent_50%)]" />
      <div
        className="absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage:
            "linear-gradient(to right, rgba(255,255,255,0.4) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.4) 1px, transparent 1px)",
          backgroundSize: "56px 56px",
          maskImage:
            "radial-gradient(ellipse at center, black 30%, transparent 70%)",
        }}
      />

      {/* 3D canvas (desktop, motion-friendly) or poster fallback */}
      {showCanvas ? (
        <Suspense
          fallback={
            <div
              className="absolute inset-0 bg-[url('/landing/hero-poster.webp')] bg-center bg-cover opacity-60 blur-md"
              aria-hidden
            />
          }
        >
          <Hero3D />
        </Suspense>
      ) : (
        <div
          className="absolute inset-0 bg-[url('/landing/hero-poster.webp')] bg-center bg-cover opacity-70"
          aria-hidden
        />
      )}

      <span className="sr-only">
        Stylized 3D scene: a translucent box-truck container with low-poly furniture pieces — sofas, wardrobes,
        refrigerators, bed frames, dining chairs, side tables — settling into route-sequenced loading positions.
      </span>

      {/* Left-side scrim — keeps headline readable over the bright grid behind it */}
      <div className="pointer-events-none absolute inset-y-0 left-0 w-full md:w-[70%] lg:w-[60%] bg-gradient-to-r from-[#0b0d12] via-[#0b0d12]/85 md:via-[#0b0d12]/75 to-transparent z-[5]" />

      {/* Bottom fade */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-b from-transparent to-[#0b0d12] z-[5]" />

      {/* Copy column — pointer-events disabled on the container so the canvas
          behind it stays interactive; re-enabled per-element on the actual UI. */}
      <div className="pointer-events-none relative z-10 mx-auto max-w-7xl px-6 md:px-10 pt-32 pb-24 md:pt-40 md:pb-32 min-h-[100vh] flex items-center">
        <div className="max-w-2xl">
          <div className="pointer-events-auto inline-flex items-center gap-2 rounded-full border border-white/15 bg-[#0b0d12]/70 backdrop-blur px-3 py-1 text-xs font-medium text-cyan-200">
            <span className="h-1.5 w-1.5 rounded-full bg-cyan-300 animate-pulse" />
            FEU Institute of Technology · BS Computer Science Thesis 2026
          </div>

          <h1
            className="mt-6 text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight text-white leading-[1.05]"
            style={{ textShadow: "0 2px 24px rgba(0,0,0,0.85), 0 1px 3px rgba(0,0,0,0.95)" }}
          >
            Loading plans that respect your{" "}
            <span className="bg-gradient-to-r from-blue-300 via-cyan-200 to-blue-400 bg-clip-text text-transparent">
              route
            </span>
            , your{" "}
            <span className="bg-gradient-to-r from-fuchsia-300 to-pink-300 bg-clip-text text-transparent">
              fragile
            </span>
            , and your{" "}
            <span className="bg-gradient-to-r from-amber-200 to-orange-300 bg-clip-text text-transparent">
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

          <div className="pointer-events-auto mt-9 flex flex-wrap items-center gap-3">
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
