import { useState } from "react";

import { Eyebrow, H2, Lead, Section } from "./primitives/Section";

/**
 * Plain-language definitions for every acronym, math symbol, and domain term
 * surfaced in the FLOW-3D UI. Sourced from the thesis (section 3.5.2.1) and
 * the in-app dashboard labels. Used by both this landing-page section and
 * the Help & Support modal in the simulator so the wording stays consistent.
 */
export interface GlossaryTerm {
  term: string;
  aka?: string;
  definition: string;
}

export interface GlossaryCategory {
  label: string;
  blurb: string;
  terms: GlossaryTerm[];
}

export const GLOSSARY: GlossaryCategory[] = [
  {
    label: "Solvers & Algorithms",
    blurb: "How FLOW-3D decides what gets packed where.",
    terms: [
      { term: "ILP",  aka: "Integer Linear Programming",
        definition: "An exact optimization method. Models the packing problem as integer variables and linear constraints, then proves the best possible layout. Runs only when the manifest is small (n ≤ SOLVER_THRESHOLD)." },
      { term: "FFD",  aka: "First-Fit Decreasing",
        definition: "A fast heuristic. Sorts items largest-first, then drops each into the first position that fits. Used for larger manifests because exact ILP becomes too slow." },
      { term: "Branch-and-Bound",
        definition: "The search algorithm Gurobi uses to solve the ILP. Recursively explores partial layouts and prunes branches that cannot beat the best one found so far. Worst case is O(2ⁿ)." },
      { term: "Gurobi",
        definition: "The commercial optimization solver that runs the ILP path. Provides the math engine; FLOW-3D writes the model and reads the answer." },
      { term: "3DBPP-SLC", aka: "3D Bin Packing with Sequential Loading Constraint",
        definition: "The formal problem class FLOW-3D solves. \"3D Bin Packing\" = stack rectangular items into a box without overlap. \"SLC\" adds the rule that items unloaded earlier must end up nearer the door." },
      { term: "DSS", aka: "Decision Support System",
        definition: "A tool that helps a human make a better decision — it does not replace the human. FLOW-3D produces an advisory plan; the dispatcher remains responsible for verifying the load." },
      { term: "SOLVER_THRESHOLD",
        definition: "The item-count cutoff (default 20) above which the engine switches from ILP to FFD. Below the threshold you get a provably optimal plan; above it you get a fast, near-optimal one." },
    ],
  },
  {
    label: "Constraints (the rules every plan obeys)",
    blurb: "These are the physical and operational rules the engine enforces.",
    terms: [
      { term: "LIFO", aka: "Last-In, First-Out",
        definition: "Whatever is loaded last comes out first. FLOW-3D enforces this so the first delivery sits nearest the rear door — drivers never have to dig past later stops to unload an early one." },
      { term: "Route-Sequenced LIFO",
        definition: "LIFO applied to a multi-stop route: items for higher-numbered stops sit deeper inside the truck along the Y-axis. Hard constraint, not a preference." },
      { term: "Non-overlap (Big-M)",
        definition: "Guarantees no two items occupy the same space. Implemented with six planar separation constraints per item pair (left/right, front/back, above/below) using the \"Big-M\" linearization trick." },
      { term: "Boundary",
        definition: "Every packed item must fit entirely inside the truck (W × L × H). No item may poke through a wall, floor, or ceiling." },
      { term: "Vertical Support",
        definition: "Every packed item must rest on the truck floor or be fully covered (in xy footprint) by exactly one other packed item below it. Stops items from \"floating\" mid-air." },
      { term: "Fragile No-Stacking",
        definition: "If an item is marked Fragile, the engine forbids any other item from being placed directly above it. Glass cabinets, mirrors, and marble tops travel un-crushed." },
      { term: "Payload",
        definition: "The truck's rated weight cap (kg). The sum of all packed item weights must stay within it; over-cap items are dropped from the plan and listed for review." },
      { term: "Side-up",
        definition: "Item flag meaning \"must stay upright.\" Restricts the orientation set so rigid items (refrigerators, wardrobes) cannot be tipped on their side." },
      { term: "Orientation index",
        definition: "A number 0–5 identifying which of the six axis-aligned rotations an item is placed in. Side-up items are restricted to the upright subset." },
    ],
  },
  {
    label: "Metrics & Outputs",
    blurb: "The numbers FLOW-3D reports back about each plan.",
    terms: [
      { term: "V_util", aka: "Volumetric Utilization",
        definition: "Fraction of the truck's interior volume occupied by packed items, 0 to 1. Reported as a percentage — 100 % would mean the truck is completely full (rarely possible with rigid rectangular items)." },
      { term: "T_exec", aka: "Execution Time",
        definition: "How long the solver took to produce the plan, in milliseconds. ILP runs are longer (proving optimality); FFD runs are sub-second." },
      { term: "Placement",
        definition: "A single packed item's record in the output — its ID, position (x, y, z), dimensions (w, l, h), chosen orientation, stop, and whether it was successfully packed." },
      { term: "PackingPlan",
        definition: "The full output of a solve: every placement, V_util, T_exec, the solver mode that produced it (ILP or FFD), and a list of any items that could not be packed." },
      { term: "Unplaced items",
        definition: "Items the engine could not fit while obeying every constraint. Common reasons: truck volume exhausted, payload cap reached, or no valid supporter under a fragile contract." },
    ],
  },
  {
    label: "Workflow & UI",
    blurb: "Terms you'll see across the simulator screens.",
    terms: [
      { term: "Manifest",
        definition: "Your full input to a solve: the truck's internal dimensions, the list of delivery stops, and the cargo items with their sizes, weights, and flags." },
      { term: "Stop",
        definition: "One delivery destination. Each stop has a numeric ID; lower IDs unload first (and therefore load last)." },
      { term: "Strategy (Optimal / Axle Balance / Stability)",
        definition: "Three different optimization goals the engine runs in parallel. Optimal maximizes packed volume; Axle Balance keeps weight evenly distributed; Stability favors low, broad stacks." },
      { term: "Bounding box",
        definition: "The smallest axis-aligned rectangle that contains an irregular item. FLOW-3D treats every item as its bounding box — slightly conservative, but geometrically reliable." },
      { term: "Boxed / Crated",
        definition: "A visual flag on cargo items telling the dispatcher the item is in a shipping crate. Does not affect the math; helps physical loading." },
      { term: "LTO / LTFRB",
        definition: "Philippine regulatory bodies for land transportation (LTO) and for franchising and regulation (LTFRB). FLOW-3D's payload cap helps stay within their weight limits, but compliance remains the operator's responsibility." },
    ],
  },
];

export function Glossary() {
  const [openCat, setOpenCat] = useState<number>(0);
  return (
    <Section id="glossary" className="py-24 md:py-32">
      <div className="max-w-3xl">
        <Eyebrow>Glossary</Eyebrow>
        <H2>The acronyms and jargon — explained.</H2>
        <Lead>
          FLOW-3D borrows vocabulary from operations research, logistics, and 3D
          geometry. Here&rsquo;s every acronym and technical term you&rsquo;ll meet
          in the simulator, in plain English.
        </Lead>
      </div>

      {/* Category tab strip */}
      <div className="mt-10 flex flex-wrap gap-2">
        {GLOSSARY.map((cat, i) => {
          const active = openCat === i;
          return (
            <button
              key={cat.label}
              onClick={() => setOpenCat(i)}
              className={`px-4 py-2 rounded-full text-sm font-semibold border transition ${
                active
                  ? "border-blue-500 bg-blue-600 text-white"
                  : "border-white/10 bg-white/[0.04] text-gray-300 hover:bg-white/[0.08]"
              }`}
            >
              {cat.label}
            </button>
          );
        })}
      </div>

      <p className="mt-4 text-sm text-gray-500 italic">{GLOSSARY[openCat].blurb}</p>

      {/* Term grid for the active category */}
      <div className="mt-8 grid gap-4 md:grid-cols-2">
        {GLOSSARY[openCat].terms.map((t) => (
          <div
            key={t.term}
            className="rounded-2xl border border-white/[0.08] bg-white/[0.025] p-5"
          >
            <div className="flex items-baseline gap-2 flex-wrap mb-2">
              <h3 className="text-base font-bold text-white tracking-tight">{t.term}</h3>
              {t.aka && (
                <span className="text-xs font-medium text-blue-300/80 italic">
                  {t.aka}
                </span>
              )}
            </div>
            <p className="text-sm text-gray-400 leading-relaxed">{t.definition}</p>
          </div>
        ))}
      </div>
    </Section>
  );
}
