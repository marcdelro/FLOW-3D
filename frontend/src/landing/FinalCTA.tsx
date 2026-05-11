import { Link } from "react-router-dom";

import { ButtonLink } from "./primitives/Button";

export function FinalCTA() {
  return (
    <section className="relative overflow-hidden py-24 md:py-28 bg-gradient-to-b from-[#0a0d12] to-[#070a0f] border-y border-white/[0.06]">
      <div
        className="absolute inset-0 opacity-40"
        style={{
          backgroundImage:
            "radial-gradient(ellipse at 30% 50%, rgba(59,130,246,0.18), transparent 55%), radial-gradient(ellipse at 75% 50%, rgba(125,211,252,0.1), transparent 60%)",
        }}
      />
      <div className="relative mx-auto max-w-4xl px-6 md:px-10 text-center">
        <h2 className="text-3xl md:text-5xl font-bold tracking-tight text-white leading-tight">
          Stop packing trucks twice. Let&rsquo;s plan it right the first time.
        </h2>
        <p className="mt-5 text-lg text-gray-400 max-w-2xl mx-auto">
          Generate your first LIFO-correct loading plan in under a minute. No credit card, no install.
        </p>
        <div className="mt-9 flex flex-wrap justify-center gap-3">
          <ButtonLink to="/register" variant="primary" size="lg">
            Get Started — It&rsquo;s Free
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14M13 5l7 7-7 7" />
            </svg>
          </ButtonLink>
        </div>
        <p className="mt-5 text-sm text-gray-500">
          Already have an account?{" "}
          <Link to="/login" className="text-blue-300 hover:text-blue-200 underline underline-offset-2">
            Sign in
          </Link>
        </p>
      </div>
    </section>
  );
}
