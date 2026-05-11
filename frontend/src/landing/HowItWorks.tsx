import { Eyebrow, H2, Lead, Section } from "./primitives/Section";

const STEPS = [
  {
    n: "1",
    title: "Enter your stops and items",
    body: "Paste or type your manifest: item name, length × width × height in mm, weight, fragile?, and stop number.",
    icon: ClipboardIcon,
  },
  {
    n: "2",
    title: "Pick your truck",
    body: "Choose from saved truck profiles or enter your own dimensions and payload limit.",
    icon: TruckIcon,
  },
  {
    n: "3",
    title: "Click Generate Plan",
    body: "FLOW-3D automatically picks the right solver — exact ILP for small manifests, FFD heuristic for large ones.",
    icon: SparkIcon,
  },
  {
    n: "4",
    title: "Review in 3D and export",
    body: "Rotate the truck, inspect each stop's layer, and download the loading sheet for your crew.",
    icon: BoxIcon,
  },
];

export function HowItWorks() {
  return (
    <Section id="how" className="py-24 md:py-32 bg-white/[0.015] border-y border-white/[0.06]">
      <div className="max-w-3xl">
        <Eyebrow>How it works</Eyebrow>
        <H2>Four steps from manifest to a loaded truck.</H2>
        <Lead>
          No CAD skills, no math. If you can fill a spreadsheet, you can run FLOW-3D.
        </Lead>
      </div>

      <div className="mt-14 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {STEPS.map((s) => (
          <div
            key={s.n}
            className="relative rounded-2xl border border-white/[0.08] bg-white/[0.025] p-6 hover:bg-white/[0.04] hover:border-white/15 transition"
          >
            <div className="flex items-center justify-between mb-5">
              <div className="w-11 h-11 rounded-xl bg-blue-500/15 border border-blue-400/25 flex items-center justify-center text-blue-300">
                <s.icon />
              </div>
              <span className="text-5xl font-bold text-white/[0.07] leading-none select-none">{s.n}</span>
            </div>
            <h3 className="text-lg font-semibold text-white tracking-tight">{s.title}</h3>
            <p className="mt-2 text-sm text-gray-400 leading-relaxed">{s.body}</p>
          </div>
        ))}
      </div>
    </Section>
  );
}

function ClipboardIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="3" width="6" height="4" rx="1.2" />
      <path d="M9 5H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-3" />
      <path d="M8 12h8M8 16h5" />
    </svg>
  );
}
function TruckIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1.5" y="6" width="13" height="10" rx="1" />
      <path d="M14.5 9.5h4l3 3.5v3h-7z" />
      <circle cx="6" cy="18" r="2" />
      <circle cx="18" cy="18" r="2" />
    </svg>
  );
}
function SparkIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1" />
      <circle cx="12" cy="12" r="3.2" />
    </svg>
  );
}
function BoxIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 7.5L12 3l9 4.5v9L12 21 3 16.5v-9z" />
      <path d="M12 3v18M3 7.5l9 4.5 9-4.5" />
    </svg>
  );
}
