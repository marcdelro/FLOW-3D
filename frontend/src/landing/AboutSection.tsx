import { Eyebrow, H2, Lead, Section } from "./primitives/Section";

export function AboutSection() {
  return (
    <Section id="features" className="py-24 md:py-32" containerClass="">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20">
        <div>
          <Eyebrow>What FLOW-3D is</Eyebrow>
          <H2>A decision support system, not a black-box autopilot.</H2>
          <Lead>
            FLOW-3D is a hybrid 3D loading engine for furniture haulers. For small manifests it runs an exact
            integer linear program through Gurobi&rsquo;s branch-and-bound solver; for large manifests it falls
            back to a route-sequential First-Fit Decreasing heuristic.
          </Lead>
          <Lead>
            Every plan — exact or heuristic — is then re-checked by an independent ConstraintValidator before it
            ever reaches your screen. If the engine produces a plan that breaks LIFO, overhangs the truck, or
            stacks something on a fragile item, the plan is rejected outright.
          </Lead>

          <ul className="mt-8 space-y-3 text-sm text-gray-300">
            <Check>Exact when it can be, fast when it has to be — automatic switch.</Check>
            <Check>Every plan validated by a separate checker before display.</Check>
            <Check>The dispatcher keeps the final call: review plans in 3D, override, export.</Check>
          </ul>
        </div>

        <div className="relative">
          <Eyebrow>Why this matters in the Philippines</Eyebrow>
          <H2>Built for narrow streets, mixed cargo, and tight margins.</H2>

          <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Card title="Multi-stop deliveries">
              Metro Manila plus provincial drops means stop order is rarely negotiable — and unloading order
              has to match.
            </Card>
            <Card title="Narrow side streets">
              Once the truck is parked there&rsquo;s no shuffling. The first stop&rsquo;s items must come out
              first.
            </Card>
            <Card title="Fragile cargo, daily">
              Mirrors, glass cabinets, ceramics — routinely crushed by ad-hoc loading. FLOW-3D refuses to put
              anything on top of them.
            </Card>
            <Card title="Cost of re-handling">
              Fuel, hours, and damaged stock. A bad plan costs more than the planning tool ever could.
            </Card>
            <Card title="No CAD, no software team">
              SME haulers run on spreadsheets and group chats. FLOW-3D meets you there.
            </Card>
            <Card title="Dispatcher in the loop">
              We surface three alternative plans per manifest. You pick. We don&rsquo;t.
            </Card>
          </div>
        </div>
      </div>
    </Section>
  );
}

function Check({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-3">
      <span className="mt-1 inline-flex w-5 h-5 rounded-full bg-blue-500/15 border border-blue-400/30 items-center justify-center shrink-0">
        <svg className="w-3 h-3 text-blue-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      </span>
      <span className="leading-relaxed">{children}</span>
    </li>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-white/[0.08] bg-white/[0.025] p-5 hover:bg-white/[0.04] hover:border-white/15 transition">
      <h3 className="text-white font-semibold tracking-tight">{title}</h3>
      <p className="mt-2 text-sm text-gray-400 leading-relaxed">{children}</p>
    </div>
  );
}
