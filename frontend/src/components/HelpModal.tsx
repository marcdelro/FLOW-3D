import { useEffect, useState, type ReactNode } from "react";

import { ContactForm } from "../landing/ContactForm";
import { GLOSSARY } from "../landing/Glossary";
import { useTour } from "../tour/TourContext";

type HelpTab = "guide" | "feedback";

type GuideSection =
  | "quickstart"
  | "manifest"
  | "results"
  | "explain"
  | "viewer"
  | "shortcuts"
  | "glossary"
  | "tips";

export function HelpModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [tab, setTab] = useState<HelpTab>("guide");
  const [section, setSection] = useState<GuideSection>("quickstart");

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Help & Support"
      className="fixed inset-0 z-[80] flex items-center justify-center px-4 py-8"
    >
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
      />
      <div className="relative w-full max-w-5xl max-h-[88vh] flex flex-col rounded-2xl border border-white/10 bg-[#0f1117] shadow-[0_30px_80px_-20px_rgba(0,0,0,0.85)]">

        {/* ── Title bar ───────────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.07]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/40 flex items-center justify-center">
              <svg viewBox="0 0 24 24" className="w-5 h-5 text-blue-300" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-bold tracking-tight text-white">Help &amp; Support</h2>
              <p className="text-xs text-gray-400">Learn the simulator and send us your feedback.</p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="p-1.5 rounded-md text-gray-400 hover:text-white hover:bg-white/[0.06] transition"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 6l12 12M6 18L18 6" />
            </svg>
          </button>
        </div>

        {/* ── Primary tab strip ────────────────────────────────────────── */}
        <div className="flex border-b border-white/[0.07] px-4 shrink-0">
          <PrimaryTab active={tab === "guide"} onClick={() => setTab("guide")} icon="book">
            User Guide
          </PrimaryTab>
          <PrimaryTab active={tab === "feedback"} onClick={() => setTab("feedback")} icon="send">
            Send Feedback
          </PrimaryTab>
        </div>

        {/* ── Content area ─────────────────────────────────────────────── */}
        {tab === "guide" ? (
          <div className="flex-1 grid grid-cols-[200px_1fr] overflow-hidden">

            {/* Section nav */}
            <nav className="overflow-y-auto border-r border-white/[0.07] py-3 px-2 space-y-0.5">
              <SectionLink active={section === "quickstart"} onClick={() => setSection("quickstart")}>
                Quick Start
              </SectionLink>
              <SectionLink active={section === "manifest"} onClick={() => setSection("manifest")}>
                1 · Manifest Tab
              </SectionLink>
              <SectionLink active={section === "results"} onClick={() => setSection("results")}>
                2 · Results Tab
              </SectionLink>
              <SectionLink active={section === "explain"} onClick={() => setSection("explain")}>
                3 · Explain Tab
              </SectionLink>
              <SectionLink active={section === "viewer"} onClick={() => setSection("viewer")}>
                3D Viewer
              </SectionLink>
              <SectionLink active={section === "shortcuts"} onClick={() => setSection("shortcuts")}>
                Shortcuts
              </SectionLink>
              <SectionLink active={section === "glossary"} onClick={() => setSection("glossary")}>
                Glossary
              </SectionLink>
              <SectionLink active={section === "tips"} onClick={() => setSection("tips")}>
                Tips &amp; FAQ
              </SectionLink>
            </nav>

            {/* Section body */}
            <div className="overflow-y-auto px-6 py-5 text-sm leading-relaxed text-gray-300">
              {section === "quickstart" && <QuickStartContent onClose={onClose} />}
              {section === "manifest"   && <ManifestContent />}
              {section === "results"    && <ResultsContent />}
              {section === "explain"    && <ExplainContent />}
              {section === "viewer"     && <ViewerContent />}
              {section === "shortcuts"  && <ShortcutsContent />}
              {section === "glossary"   && <GlossaryContent />}
              {section === "tips"       && <TipsContent />}
            </div>
          </div>
        ) : (
          <div className="overflow-y-auto px-6 py-5 text-sm text-gray-300 flex-1">
            <p className="text-gray-400 mb-4">
              Your feedback helps us improve FLOW-3D. Tell us what's working, what isn't, or
              what you'd like to see next. Submitting opens your email client with the
              message pre-filled and addressed to the thesis team.
            </p>
            <ContactForm onClose={onClose} />
          </div>
        )}
      </div>
    </div>
  );
}

// ── Tab + nav primitives ─────────────────────────────────────────────────

function PrimaryTab({
  active,
  onClick,
  icon,
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon: "book" | "send";
  children: ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition ${
        active
          ? "border-blue-500 text-white"
          : "border-transparent text-gray-400 hover:text-gray-200"
      }`}
    >
      {icon === "book" ? (
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 19.5A2.5 2.5 0 016.5 17H20" />
          <path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" />
        </svg>
      ) : (
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
        </svg>
      )}
      {children}
    </button>
  );
}

function SectionLink({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-3 py-2 rounded-md text-sm font-medium transition ${
        active
          ? "bg-blue-600/20 text-blue-100 border border-blue-500/40"
          : "text-gray-400 hover:text-gray-200 hover:bg-white/[0.04] border border-transparent"
      }`}
    >
      {children}
    </button>
  );
}

// ── Guide content blocks ─────────────────────────────────────────────────

/**
 * "Take the guided tour" CTA shown at the top of Quick Start. Calls the
 * tour context's `start()` to begin the spotlight tour immediately, and
 * closes the Help modal so the spotlight has the screen to itself.
 *
 * Also surfaces here so users who dismissed the first-visit prompt with
 * "Don't show this again" know where to find the tour later.
 */
function TourLauncher({ onClose }: { onClose: () => void }) {
  const { start, active } = useTour();
  return (
    <div className="my-4 rounded-xl border border-blue-500/30 bg-blue-600/10 p-4 flex items-start gap-3">
      <div className="shrink-0 w-9 h-9 rounded-lg bg-blue-600/30 border border-blue-500/40 flex items-center justify-center">
        <svg className="w-4 h-4 text-blue-300" viewBox="0 0 24 24" fill="currentColor" stroke="none">
          <path d="M8 5v14l11-7z" />
        </svg>
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-semibold text-white mb-0.5">
          Take the guided tour
        </div>
        <div className="text-xs text-gray-400 leading-relaxed mb-2.5">
          A 7-step spotlight walkthrough of the full workflow — about 60
          seconds. Use this anytime you want a refresher.
        </div>
        <button
          onClick={() => {
            onClose();
            // Defer one tick so the Help modal's body-overflow lock releases
            // before the tour spotlight measures element positions.
            setTimeout(start, 50);
          }}
          disabled={active}
          className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-600/40 disabled:cursor-not-allowed text-white text-xs font-semibold transition"
        >
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor" stroke="none">
            <path d="M8 5v14l11-7z" />
          </svg>
          {active ? "Tour running…" : "Start tour"}
        </button>
      </div>
    </div>
  );
}

function H3({ children }: { children: ReactNode }) {
  return <h3 className="text-base font-bold text-white mt-5 mb-2 first:mt-0">{children}</h3>;
}

function P({ children }: { children: ReactNode }) {
  return <p className="mb-3 leading-relaxed">{children}</p>;
}

function UL({ children }: { children: ReactNode }) {
  return <ul className="list-disc pl-5 space-y-1.5 mb-3 marker:text-gray-600">{children}</ul>;
}

function Kbd({ children }: { children: ReactNode }) {
  return (
    <kbd className="inline-block px-1.5 py-0.5 rounded border border-white/15 bg-white/[0.06] text-xs font-mono text-gray-200">
      {children}
    </kbd>
  );
}

function Highlight({ children }: { children: ReactNode }) {
  return <span className="text-white font-semibold">{children}</span>;
}

function Callout({ children, kind = "info" }: { children: ReactNode; kind?: "info" | "warn" }) {
  const cls =
    kind === "warn"
      ? "border-amber-700/60 bg-amber-950/40 text-amber-200"
      : "border-blue-700/60 bg-blue-950/40 text-blue-100";
  return <div className={`rounded-lg border px-3.5 py-2.5 text-sm mb-3 ${cls}`}>{children}</div>;
}

function QuickStartContent({ onClose }: { onClose: () => void }) {
  return (
    <>
      <H3>Welcome to FLOW-3D</H3>
      <P>
        FLOW-3D generates LIFO-compliant 3D truck-loading plans for Philippine
        furniture logistics. The workflow is three steps and the sidebar reflects them.
      </P>
      <TourLauncher onClose={onClose} />
      <UL>
        <li><Highlight>Step 1 — Manifest.</Highlight> Enter truck dimensions, delivery stops, and cargo items. You can also import an Excel or JSON file.</li>
        <li><Highlight>Step 2 — Results.</Highlight> Pick one of three plans (Optimal, Axle Balance, Stability) and review packed items, utilization, and the LIFO load sequence.</li>
        <li><Highlight>Step 3 — Explain.</Highlight> See why the engine picked its solver (ILP or FFD) and which constraints shaped the plan.</li>
      </UL>
      <H3>Solver Pipeline</H3>
      <P>
        A hybrid engine dispatches to <Highlight>ILP</Highlight> (exact Branch-and-Bound via
        Gurobi) when the manifest is small, and to <Highlight>FFD</Highlight> (Route-Sequential
        First-Fit Decreasing heuristic) for large manifests. Every plan is independently
        validated before it reaches the 3D viewer — no plan you see violates the geometry,
        LIFO, fragile, or payload constraints.
      </P>
      <Callout>
        <Highlight>Tip:</Highlight> The 3D viewer renders even <em>before</em> you solve — items
        appear in a naive preview layout as you type. Click <Highlight>Solve Packing Plan</Highlight>
        for the constraint-optimised result.
      </Callout>
    </>
  );
}

function ManifestContent() {
  return (
    <>
      <H3>1 · Manifest Tab</H3>
      <P>
        The Manifest tab has three sub-panels selectable from the top tab strip
        (<Highlight>Truck · Stops · Items</Highlight>). Live counts show how many stops
        and items are already entered.
      </P>

      <H3>Truck Specification</H3>
      <UL>
        <li><Highlight>Width / Length / Height</Highlight> — internal cargo bay dimensions. The unit toggle (mm · cm · m · in) at the top is shared with the Items section.</li>
        <li><Highlight>Payload (kg)</Highlight> — maximum loaded weight. The solver enforces <em>Σ weight_kg · b_i ≤ payload_kg</em>.</li>
      </UL>

      <H3>Delivery Stops</H3>
      <P>
        Each stop has a numeric ID. Items destined for a higher stop ID sit deeper in
        the truck (loaded first, unloaded last). Add at least one stop before adding items.
      </P>

      <H3>Cargo Items</H3>
      <UL>
        <li><Highlight>Add an item</Highlight> via the inline form — pick a furniture type or enter a custom name, set dimensions, weight, quantity, stop, and handling flags.</li>
        <li><Highlight>Side-up</Highlight> — restricts the orientation set so rigid items (refrigerators, wardrobes) cannot be laid on their side.</li>
        <li><Highlight>Boxed</Highlight> — visual flag in the viewer; informs the dispatcher that the item is crated.</li>
        <li><Highlight>Fragile</Highlight> — the solver forbids stacking <em>any other item</em> directly above this one.</li>
        <li><Highlight>Quantity</Highlight> — convenience field; expanded into individual items on submit.</li>
      </UL>

      <H3>Import &amp; Export</H3>
      <UL>
        <li><Highlight>Download Template</Highlight> — produces a blank <code>.xlsx</code> with the expected column layout.</li>
        <li><Highlight>Import Manifest</Highlight> — drag and drop, or click to pick. Accepts both <code>.xlsx</code> and <code>.json</code>. The full truck + stops + items are replaced on import.</li>
      </UL>

      <Callout>
        <Highlight>Undo/Redo</Highlight> on cargo-item edits is available for the last 30 mutations — use
        the ↺/↻ buttons in the section header, or <Kbd>Ctrl</Kbd> + <Kbd>Z</Kbd> / <Kbd>Ctrl</Kbd> + <Kbd>Y</Kbd>.
      </Callout>
    </>
  );
}

function ResultsContent() {
  return (
    <>
      <H3>2 · Results Tab</H3>
      <P>
        The Results tab has three sub-tabs at the top so you don't have to scroll
        through every section to find what you need:
        <Highlight> Overview</Highlight>, <Highlight> Sequence</Highlight>,
        and <Highlight> Issues</Highlight>.
      </P>

      <H3>Plan Selector (always visible)</H3>
      <P>
        Three cards labelled A · B · C represent the three strategies. Each card shows
        utilization %, m³ packed, and the solver mode used. Click a card to switch the
        3D viewer to that plan.
      </P>

      <H3>Overview sub-tab</H3>
      <UL>
        <li><Highlight>Why This Plan</Highlight> — one-paragraph rationale for the active strategy (Optimal vs Axle Balance vs Stability).</li>
        <li><Highlight>Volumetric Utilization</Highlight> — V_util as a percentage and m³, with a color-coded bar (green ≥ 70%, amber 40–69%, red &lt; 40%).</li>
        <li><Highlight>Stat cards</Highlight> — execution time, solver mode (ILP/FFD), packed count.</li>
        <li><Highlight>Export JSON</Highlight> — downloads the full PackingPlan contract (placements, V_util, t_exec_ms, solver_mode, unplaced_items) for record-keeping.</li>
      </UL>

      <H3>Sequence sub-tab</H3>
      <P>
        Shows the LIFO load order. Step 1 is loaded <em>first</em> and sits at the rear of the truck;
        the last step is loaded near the door and unloaded first on delivery. Each
        stop card lists the items assigned to that stop.
      </P>

      <H3>Issues sub-tab</H3>
      <P>
        Only appears when the solver could not pack every item. The unplaced items are
        listed by ID. Common causes: payload cap reached, truck volume exhausted, or
        fragile-no-stacking constraints leaving no valid supporter.
      </P>
    </>
  );
}

function ExplainContent() {
  return (
    <>
      <H3>3 · Explain Tab</H3>
      <P>
        The Explain tab tells the panel <em>why</em> a plan looks the way it does. Three sub-tabs
        — <Highlight>Dispatch</Highlight>, <Highlight>Metrics</Highlight>, <Highlight>Constraints</Highlight>.
      </P>

      <H3>Dispatch</H3>
      <UL>
        <li><Highlight>Decision banner</Highlight> — solver mode (ILP/FFD) plus a paragraph explaining the routing decision.</li>
        <li><Highlight>Strategy → Solver mapping</Highlight> — a three-row table; the active row is highlighted with an <code>ACTIVE</code> chip.</li>
        <li><Highlight>n vs SOLVER_THRESHOLD bar</Highlight> — shown only for the Optimal strategy. Axle Balance and Stability are FFD-only by design and the threshold does not apply.</li>
      </UL>

      <H3>Metrics</H3>
      <P>
        Three large cards: <Highlight>V_util</Highlight>, <Highlight>T_exec</Highlight> (milliseconds), and
        <Highlight> Packed / Total</Highlight>. These mirror the Performance card on the Results
        tab but in a denser, panel-friendly layout for the defense.
      </P>

      <H3>Constraints</H3>
      <UL>
        <li><Highlight>Route-Sequenced LIFO</Highlight> — number of stops and how they are ordered along the Y-axis.</li>
        <li><Highlight>Fragile No-Stacking</Highlight> — fragile item IDs, with the supporting constraint description.</li>
        <li><Highlight>Truck Payload</Highlight> — kg packed vs cap, with a color-coded bar and a sentence on whether the binding constraint is geometry or weight.</li>
        <li><Highlight>Unplaced explainer</Highlight> — appears only when items could not be packed; explains whether ILP proved infeasibility or FFD simply gave up.</li>
      </UL>
    </>
  );
}

function ViewerContent() {
  return (
    <>
      <H3>3D Viewer</H3>
      <P>
        The right pane is a live three.js scene. The camera defaults to an isometric
        angle looking into the cargo bay. The truck door is on the +Y side; items
        slide in from there toward the rear (−Y).
      </P>

      <H3>Mouse &amp; touch</H3>
      <UL>
        <li><Highlight>Drag</Highlight> — orbit around the truck.</li>
        <li><Highlight>Right-drag</Highlight> — pan.</li>
        <li><Highlight>Scroll / pinch</Highlight> — zoom.</li>
        <li><Highlight>Hover</Highlight> — pops a tooltip with the item ID, dimensions, weight, stop, and handling flags.</li>
      </UL>

      <H3>Camera toolbar</H3>
      <P>
        Bottom-left of the viewer — click the camera icon to open the panel.
      </P>
      <UL>
        <li><Highlight>PAN D-pad</Highlight> — step the view in 8 % increments of the largest truck dimension.</li>
        <li><Highlight>Zoom + / −</Highlight> — 15 % increments along the look direction, clamped to a 20-unit minimum distance.</li>
        <li><Highlight>VIEW presets</Highlight> — Reset, Top, Front, Side. Each transitions with a 30-frame cubic ease-out, so the move is readable.</li>
      </UL>

      <H3>Animate mode</H3>
      <P>
        Switches the viewer to LIFO playback — items appear in the order the truck is
        actually loaded (deepest stop first). A playback bar at the bottom offers play /
        pause and a scrub slider. A "Placing" badge marks the most recent item; an
        "All loaded" badge appears once the sequence finishes.
      </P>

      <H3>Visual cues</H3>
      <UL>
        <li><Highlight>Stop colors</Highlight> — every stop gets a distinct palette (peach, teal, violet, blue, amber, magenta) carried across the dashboard and the viewer.</li>
        <li><Highlight>Fragile decals</Highlight> — small warning glyphs render on fragile items so they are visible in the load.</li>
        <li><Highlight>Fallback geometry chip</Highlight> — amber chip top-right warns when an item's 3D mesh failed to resolve. Hover reveals the offending item IDs.</li>
      </UL>
    </>
  );
}

function ShortcutsContent() {
  return (
    <>
      <H3>Keyboard shortcuts</H3>
      <table className="w-full text-sm">
        <tbody className="divide-y divide-white/[0.06]">
          <tr><td className="py-2 pr-4"><Kbd>Ctrl</Kbd> + <Kbd>Z</Kbd></td><td className="text-gray-400">Undo last cargo-item mutation (30-deep history).</td></tr>
          <tr><td className="py-2 pr-4"><Kbd>Ctrl</Kbd> + <Kbd>Y</Kbd></td><td className="text-gray-400">Redo.</td></tr>
          <tr><td className="py-2 pr-4"><Kbd>Ctrl</Kbd> + <Kbd>Shift</Kbd> + <Kbd>Z</Kbd></td><td className="text-gray-400">Redo (alternate binding).</td></tr>
          <tr><td className="py-2 pr-4"><Kbd>Esc</Kbd></td><td className="text-gray-400">Dismiss the delete-confirm popover, modal, or this dialog.</td></tr>
        </tbody>
      </table>

      <H3>Theme toggle</H3>
      <P>
        Top-right of the sidebar — switches the dashboard between light and dark modes.
        The 3D viewer also adapts its background.
      </P>

      <H3>Save State / Log Out</H3>
      <P>
        Top-right of the viewer. <Highlight>Save State</Highlight> serialises the current
        manifest, plans, and selection into <code>localStorage</code> under your username.
        <Highlight> Log Out</Highlight> auto-saves before signing out — the session restores
        on your next sign-in.
      </P>
    </>
  );
}

/**
 * In-app glossary — reuses the term list from landing/Glossary.tsx so the
 * wording is identical to what users saw before signing in. Rendered as a
 * single scrolling document grouped by category, since the Help modal
 * already has its own left-rail navigation.
 */
function GlossaryContent() {
  return (
    <>
      <H3>Glossary</H3>
      <P>
        Plain-language definitions for every acronym, math symbol, and domain
        term FLOW-3D uses. Grouped by area so you can scan for what you need.
      </P>
      {GLOSSARY.map((cat) => (
        <div key={cat.label} className="mt-6 first:mt-4">
          <div className="text-xs font-bold uppercase tracking-[0.18em] text-blue-300 mb-1">
            {cat.label}
          </div>
          <p className="text-xs text-gray-500 italic mb-3">{cat.blurb}</p>
          <div className="space-y-3">
            {cat.terms.map((t) => (
              <div
                key={t.term}
                className="rounded-lg border border-white/[0.06] bg-white/[0.02] px-3.5 py-2.5"
              >
                <div className="flex items-baseline gap-2 flex-wrap mb-1">
                  <Highlight>{t.term}</Highlight>
                  {t.aka && (
                    <span className="text-xs italic text-blue-300/80">{t.aka}</span>
                  )}
                </div>
                <p className="text-sm text-gray-400 leading-relaxed">{t.definition}</p>
              </div>
            ))}
          </div>
        </div>
      ))}
    </>
  );
}

function TipsContent() {
  return (
    <>
      <H3>Why is an item unplaced?</H3>
      <UL>
        <li><Highlight>Volume</Highlight> — the truck simply ran out of room. Compare the V_util bar in Results — anywhere near 100 % means geometry is the binding constraint.</li>
        <li><Highlight>Payload</Highlight> — check the Payload bar on the Explain → Constraints tab. If it's red, removing the heaviest items first will reclaim capacity.</li>
        <li><Highlight>Fragile</Highlight> — an item could not find a non-fragile supporter inside its footprint and could not rest on the floor either. Move it to a smaller stop or unset the fragile flag if appropriate.</li>
        <li><Highlight>LIFO</Highlight> — a later-stop item could not be placed deeper than an already-placed earlier-stop item.</li>
      </UL>

      <H3>Why did the solver pick FFD instead of ILP?</H3>
      <P>
        ILP runs only for the <Highlight>Optimal</Highlight> strategy and only when{" "}
        <em>n ≤ SOLVER_THRESHOLD</em> (default 20). Larger manifests fall back to FFD because
        exact Branch-and-Bound is O(2ⁿ). Axle Balance and Stability are FFD-only by design.
      </P>

      <H3>Three plans look almost identical — what changed?</H3>
      <P>
        For very small manifests (≤ 5 items) the three strategies often produce visually
        similar plans because every item fits regardless of ordering. Try larger or
        weight-asymmetric manifests to see the strategies diverge.
      </P>

      <H3>How do I share a plan with the team?</H3>
      <UL>
        <li>Use <Highlight>Export JSON</Highlight> in the Results tab — the file contains the full <code>PackingPlan</code> contract and can be re-imported by any FLOW-3D instance.</li>
        <li>Or sign in and click <Highlight>Save State</Highlight> — the session restores from <code>localStorage</code> on the same browser.</li>
      </UL>

      <Callout kind="warn">
        <Highlight>Operational reminder.</Highlight> FLOW-3D is a Decision Support System, not
        an autopilot. The dispatcher must verify the physical load against the plan before
        the truck leaves the depot — fragile contracts, payload caps, and LTO/LTFRB
        compliance are the operator's final responsibility.
      </Callout>

      <H3>Found a bug or have an idea?</H3>
      <P>
        Switch to the <Highlight>Send Feedback</Highlight> tab above and tell us what you
        observed — we use these messages to prioritise the next sprint.
      </P>
    </>
  );
}
