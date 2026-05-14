type Props = {
  animated?: boolean;
  compact?: boolean;
};

/**
 * Decorative SVG of a delivery truck whose cargo box is cut away to reveal a
 * tidy stack of furniture items inside — a visual analogue of FLOW-3D's
 * route-aware loading plan. Pure SVG so it scales crisply and adds no
 * three.js cost to the hero.
 */
export function TruckIllustration({ animated = true, compact = false }: Props) {
  const wrap = compact ? "w-full max-w-md" : "w-full max-w-[560px]";

  return (
    <div className={`relative ${wrap}`} aria-hidden>
      {/* Soft glow halo behind the truck */}
      <div
        className={`absolute inset-0 -m-8 rounded-[44px] blur-2xl bg-gradient-to-br from-sky-300/40 via-rose-200/35 to-amber-200/40 ${
          animated ? "animate-pulse" : ""
        }`}
        style={{ animationDuration: "6s" }}
      />

      <svg
        viewBox="0 0 560 360"
        className="relative w-full h-auto drop-shadow-[0_28px_40px_rgba(15,23,42,0.18)]"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="cabGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#1e3a8a" />
            <stop offset="100%" stopColor="#0ea5e9" />
          </linearGradient>
          <linearGradient id="boxGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#fafafa" />
            <stop offset="100%" stopColor="#e2e8f0" />
          </linearGradient>
          <linearGradient id="boxFloor" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#cbd5e1" />
            <stop offset="100%" stopColor="#94a3b8" />
          </linearGradient>
          <linearGradient id="couchGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#f472b6" />
            <stop offset="100%" stopColor="#ec4899" />
          </linearGradient>
          <linearGradient id="crateGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#fbbf24" />
            <stop offset="100%" stopColor="#d97706" />
          </linearGradient>
          <linearGradient id="fridgeGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#e0f2fe" />
            <stop offset="100%" stopColor="#7dd3fc" />
          </linearGradient>
          <linearGradient id="lampGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#fde68a" />
            <stop offset="100%" stopColor="#f59e0b" />
          </linearGradient>
          <linearGradient id="chairGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#34d399" />
            <stop offset="100%" stopColor="#059669" />
          </linearGradient>
          <linearGradient id="roadGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="rgba(15,23,42,0.06)" />
            <stop offset="50%" stopColor="rgba(15,23,42,0.18)" />
            <stop offset="100%" stopColor="rgba(15,23,42,0.06)" />
          </linearGradient>
        </defs>

        {/* Ground shadow */}
        <ellipse cx="280" cy="320" rx="220" ry="14" fill="url(#roadGrad)" />

        {/* Road dashes — subtle motion sense */}
        <g opacity="0.55">
          <rect x="70" y="328" width="34" height="3" rx="1.5" fill="#475569" />
          <rect x="130" y="328" width="34" height="3" rx="1.5" fill="#475569" />
          <rect x="190" y="328" width="34" height="3" rx="1.5" fill="#475569" />
          <rect x="250" y="328" width="34" height="3" rx="1.5" fill="#475569" />
          <rect x="310" y="328" width="34" height="3" rx="1.5" fill="#475569" />
          <rect x="370" y="328" width="34" height="3" rx="1.5" fill="#475569" />
          <rect x="430" y="328" width="34" height="3" rx="1.5" fill="#475569" />
        </g>

        {/* Cargo box body */}
        <g>
          {/* Roof shadow strip */}
          <rect x="76" y="80" width="330" height="14" rx="3" fill="#0f172a" opacity="0.22" />
          {/* Box outer */}
          <rect x="80" y="86" width="320" height="200" rx="8" fill="url(#boxGrad)" stroke="#0f172a" strokeWidth="3" />
          {/* Side reinforcement panels */}
          <line x1="170" y1="92" x2="170" y2="280" stroke="#0f172a" strokeOpacity="0.12" strokeWidth="2" />
          <line x1="260" y1="92" x2="260" y2="280" stroke="#0f172a" strokeOpacity="0.12" strokeWidth="2" />
          <line x1="350" y1="92" x2="350" y2="280" stroke="#0f172a" strokeOpacity="0.12" strokeWidth="2" />

          {/* Cut-away interior (front of box) */}
          <rect x="100" y="104" width="285" height="168" rx="4" fill="#fefefe" stroke="#0f172a" strokeOpacity="0.15" strokeWidth="1.5" />
          {/* Interior floor strip */}
          <rect x="100" y="252" width="285" height="20" fill="url(#boxFloor)" />

          {/* === Furniture inside — stacked LIFO-style === */}

          {/* Refrigerator (rear of truck, deepest = unloads last) */}
          <g>
            <rect x="108" y="142" width="60" height="110" rx="4" fill="url(#fridgeGrad)" stroke="#0f172a" strokeWidth="2" />
            <line x1="108" y1="178" x2="168" y2="178" stroke="#0f172a" strokeWidth="1.5" opacity="0.6" />
            <rect x="155" y="184" width="6" height="14" rx="1.5" fill="#0f172a" opacity="0.7" />
            <rect x="155" y="148" width="6" height="14" rx="1.5" fill="#0f172a" opacity="0.7" />
            {/* Stop badge */}
            <circle cx="138" cy="135" r="11" fill="#1e3a8a" />
            <text x="138" y="139" textAnchor="middle" fontFamily="system-ui, -apple-system, sans-serif" fontWeight="700" fontSize="12" fill="#fff">3</text>
          </g>

          {/* Sofa — middle stop */}
          <g>
            <rect x="178" y="204" width="98" height="48" rx="6" fill="url(#couchGrad)" stroke="#0f172a" strokeWidth="2" />
            <rect x="184" y="210" width="86" height="20" rx="4" fill="#fff" opacity="0.28" />
            <rect x="172" y="216" width="14" height="36" rx="3" fill="#9d174d" stroke="#0f172a" strokeWidth="1.5" />
            <rect x="268" y="216" width="14" height="36" rx="3" fill="#9d174d" stroke="#0f172a" strokeWidth="1.5" />
            <circle cx="227" cy="197" r="10" fill="#be185d" />
            <text x="227" y="201" textAnchor="middle" fontFamily="system-ui, -apple-system, sans-serif" fontWeight="700" fontSize="11" fill="#fff">2</text>
          </g>

          {/* Crate on top of sofa */}
          <g>
            <rect x="200" y="166" width="56" height="38" rx="3" fill="url(#crateGrad)" stroke="#0f172a" strokeWidth="2" />
            <line x1="228" y1="166" x2="228" y2="204" stroke="#0f172a" strokeOpacity="0.4" strokeWidth="1.5" />
            <line x1="200" y1="185" x2="256" y2="185" stroke="#0f172a" strokeOpacity="0.4" strokeWidth="1.5" />
          </g>

          {/* Chair — closer to door (stop 1 = unloads first) */}
          <g>
            <rect x="294" y="212" width="44" height="40" rx="4" fill="url(#chairGrad)" stroke="#0f172a" strokeWidth="2" />
            <rect x="294" y="184" width="44" height="32" rx="5" fill="url(#chairGrad)" stroke="#0f172a" strokeWidth="2" />
            <rect x="294" y="252" width="6" height="12" fill="#065f46" />
            <rect x="332" y="252" width="6" height="12" fill="#065f46" />
            <circle cx="316" cy="175" r="10" fill="#047857" />
            <text x="316" y="179" textAnchor="middle" fontFamily="system-ui, -apple-system, sans-serif" fontWeight="700" fontSize="11" fill="#fff">1</text>
          </g>

          {/* Floor lamp tucked beside the chair */}
          <g>
            <rect x="350" y="142" width="6" height="100" fill="#475569" />
            <path d="M340 142 L366 142 L356 128 L350 128 Z" fill="url(#lampGrad)" stroke="#0f172a" strokeWidth="1.5" />
            <ellipse cx="353" cy="252" rx="16" ry="4" fill="#334155" />
          </g>
        </g>

        {/* Cab */}
        <g>
          {/* Cab body */}
          <path
            d="M400 140 L470 140 Q500 140 510 170 L510 270 Q510 286 494 286 L400 286 Z"
            fill="url(#cabGrad)"
            stroke="#0f172a"
            strokeWidth="3"
          />
          {/* Windshield */}
          <path
            d="M412 152 L468 152 Q486 154 494 178 L494 208 L412 208 Z"
            fill="#e0f2fe"
            stroke="#0f172a"
            strokeWidth="2"
            opacity="0.95"
          />
          {/* Windshield highlight */}
          <path d="M420 156 L460 156 L480 196 L420 196 Z" fill="#fff" opacity="0.35" />
          {/* Door handle */}
          <rect x="448" y="230" width="22" height="4" rx="2" fill="#fff" opacity="0.8" />
          {/* Side mirror */}
          <rect x="396" y="172" width="6" height="16" rx="1.5" fill="#0f172a" />
          {/* Headlight */}
          <circle cx="506" cy="244" r="6" fill="#fde68a" stroke="#0f172a" strokeWidth="1.5" />
        </g>

        {/* Bumper */}
        <rect x="80" y="286" width="430" height="14" rx="4" fill="#0f172a" />

        {/* Wheels */}
        <g>
          {[140, 230, 430].map((cx) => (
            <g key={cx}>
              <circle cx={cx} cy="300" r="26" fill="#0f172a" />
              <circle cx={cx} cy="300" r="14" fill="#475569" stroke="#0f172a" strokeWidth="2" />
              <circle cx={cx} cy="300" r="5" fill="#0f172a" />
              {animated && (
                <g style={{ transformOrigin: `${cx}px 300px`, animation: "wheelspin 2.4s linear infinite" }}>
                  <line x1={cx} y1="288" x2={cx} y2="312" stroke="#0f172a" strokeWidth="2" />
                  <line x1={cx - 12} y1="300" x2={cx + 12} y2="300" stroke="#0f172a" strokeWidth="2" />
                </g>
              )}
            </g>
          ))}
        </g>

        {/* Tiny route-arrow flourish above the truck */}
        <g opacity="0.85">
          <path
            d="M 110 60 Q 220 18 330 60 T 510 60"
            fill="none"
            stroke="#0f172a"
            strokeWidth="2"
            strokeDasharray="4 6"
            strokeLinecap="round"
          />
          <circle cx="110" cy="60" r="5" fill="#0ea5e9" />
          <circle cx="220" cy="42" r="5" fill="#ec4899" />
          <circle cx="330" cy="60" r="5" fill="#f59e0b" />
          <path d="M510 60 l-10 -6 l0 12 z" fill="#0f172a" />
        </g>

        <style>{`
          @keyframes wheelspin {
            from { transform: rotate(0deg); }
            to   { transform: rotate(360deg); }
          }
        `}</style>
      </svg>
    </div>
  );
}
