import { Section } from "./primitives/Section";

const LOGOS = [
  "FEU Institute of Technology",
  "BS Computer Science Thesis 2026",
  "Philippine Furniture Logistics",
  "Yukti Engineering",
];

export function SocialProof() {
  return (
    <Section className="border-y border-white/[0.06] bg-white/[0.015]" containerClass="py-10">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-center">
        <div className="md:col-span-2 flex flex-wrap items-center gap-x-7 gap-y-3 text-sm text-gray-500">
          {LOGOS.map((l) => (
            <span key={l} className="uppercase tracking-wider font-medium">
              {l}
            </span>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <div className="flex gap-0.5" aria-label="5 out of 5 stars">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star key={i} />
            ))}
          </div>
          <div className="text-sm text-gray-400 leading-tight">
            <div className="text-white font-semibold">Validated on every plan</div>
            <div>by an independent ConstraintValidator</div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3">
          <Testimonial
            quote="The last-stop-first ordering saved my crew about 40 minutes per route. Less re-handling, less arguing in narrow streets."
            attrib="Pilot Dispatcher, Metro Manila"
          />
          <Testimonial
            quote="I used to overstuff the truck and crack mirrors twice a month. With FLOW-3D the fragile pieces actually get respected."
            attrib="Operations Lead, Cavite furniture hauler"
          />
        </div>
      </div>
      <p className="mt-4 text-[11px] uppercase tracking-widest text-gray-600">
        {/* TODO: replace placeholder testimonials with real pilot quotes */}
        Placeholder pilot testimonials — to be replaced ahead of demo day.
      </p>
    </Section>
  );
}

function Star() {
  return (
    <svg className="w-4 h-4 text-amber-300" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 .587l3.668 7.431 8.2 1.192-5.934 5.784 1.4 8.165L12 18.896l-7.334 3.863 1.4-8.165L.132 9.21l8.2-1.192z" />
    </svg>
  );
}

function Testimonial({ quote, attrib }: { quote: string; attrib: string }) {
  return (
    <figure className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-3 text-sm">
      <blockquote className="text-gray-200 leading-snug">&ldquo;{quote}&rdquo;</blockquote>
      <figcaption className="mt-1.5 text-xs text-gray-500">— {attrib}</figcaption>
    </figure>
  );
}
