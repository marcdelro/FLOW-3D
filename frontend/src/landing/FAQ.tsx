import { useState } from "react";

import { Eyebrow, H2, Lead, Section } from "./primitives/Section";

type QA = { q: string; a: string };

const ITEMS: QA[] = [
  {
    q: "Is FLOW-3D free?",
    a: "Yes during the thesis pilot. The web app and 3D viewer are free to use while we collect feedback from real haulers. Pricing for production accounts will be announced before pilot ends.",
  },
  {
    q: "Do my items have to be perfect rectangles?",
    a: "Yes. FLOW-3D models every item as a rectangular box defined by length × width × height in millimetres. For an irregular item, enter the smallest bounding box that contains it. The trade-off is a small amount of wasted space; the upside is a plan you can trust geometrically.",
  },
  {
    q: "What happens to items marked Fragile?",
    a: "Nothing gets stacked on them. FLOW-3D enforces a no-stacking rule for any item flagged Fragile, both inside the solver and in a second independent check after the plan is built. A fragile item may still rest on a non-fragile crate below it — what we forbid is anything sitting on top.",
  },
  {
    q: "Will it respect my delivery order?",
    a: "Yes. FLOW-3D enforces Route-Sequenced LIFO: items destined for later stops sit deeper inside the truck, and items for your first stop sit nearest the rear door. Whatever comes out first was loaded last. This is a hard constraint, not a preference.",
  },
  {
    q: "How big a manifest can it handle?",
    a: "The engine automatically routes small manifests to the exact ILP solver and larger ones to the FFD heuristic. In practice that means anything from a handful of items to a full multi-stop run on a 6-wheeler. If a manifest is too tight to fit at all, FLOW-3D tells you exactly which items couldn't be placed.",
  },
  {
    q: "Can it overload my truck?",
    a: "No. FLOW-3D checks total payload against the truck's rated capacity as part of the solve. If the manifest exceeds payload, items are dropped from the plan and listed for review rather than silently included.",
  },
  {
    q: "Do I need internet, or can it run on a laptop in the warehouse?",
    a: "The current pilot runs as a web app, so you'll need internet to generate plans. A self-hosted on-premise build is on the roadmap for haulers with unreliable connectivity — the same engine, just packaged to run locally on a warehouse laptop.",
  },
  {
    q: "Is this an academic project or production-ready?",
    a: "Honest answer: it is a thesis-grade Decision Support System currently in pilot with real haulers. The math, validation, and 3D viewer are production-quality; the surrounding product (accounts, fleet management, exports) is still being built. Plans are advisory — your dispatcher remains responsible for final load verification.",
  },
];

export function FAQ() {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <Section id="faq" className="py-24 md:py-32">
      <div className="max-w-3xl">
        <Eyebrow>FAQ</Eyebrow>
        <H2>Common questions from haulers and dispatchers.</H2>
        <Lead>
          If something here doesn&rsquo;t answer your question, get in touch — we&rsquo;re actively talking to pilots.
        </Lead>
      </div>

      <div className="mt-12 max-w-3xl divide-y divide-white/[0.08] rounded-2xl border border-white/[0.08] bg-white/[0.025] overflow-hidden">
        {ITEMS.map((item, i) => {
          const isOpen = open === i;
          return (
            <div key={i}>
              <button
                onClick={() => setOpen(isOpen ? null : i)}
                aria-expanded={isOpen}
                className="w-full flex items-center justify-between gap-4 px-5 md:px-7 py-5 text-left hover:bg-white/[0.025] transition"
              >
                <span className="text-base md:text-lg font-semibold text-white tracking-tight">
                  {item.q}
                </span>
                <span
                  className={`flex w-7 h-7 shrink-0 rounded-full bg-white/[0.06] border border-white/10 items-center justify-center text-gray-300 transition-transform ${
                    isOpen ? "rotate-45" : ""
                  }`}
                  aria-hidden
                >
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 5v14M5 12h14" />
                  </svg>
                </span>
              </button>
              <div
                className={`grid transition-all duration-300 ${
                  isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
                }`}
              >
                <div className="overflow-hidden">
                  <p className="px-5 md:px-7 pb-6 text-gray-400 leading-relaxed">{item.a}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </Section>
  );
}
