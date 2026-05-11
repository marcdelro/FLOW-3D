import type { ReactNode } from "react";

export function Section({
  id,
  children,
  className = "",
  containerClass = "",
}: {
  id?: string;
  children: ReactNode;
  className?: string;
  containerClass?: string;
}) {
  return (
    <section id={id} className={`relative w-full ${className}`}>
      <div className={`mx-auto max-w-7xl px-6 md:px-10 ${containerClass}`}>{children}</div>
    </section>
  );
}

export function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <p className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs font-medium uppercase tracking-[0.18em] text-blue-300">
      {children}
    </p>
  );
}

export function H2({ children }: { children: ReactNode }) {
  return (
    <h2 className="text-3xl md:text-5xl font-bold tracking-tight text-white mt-4">
      {children}
    </h2>
  );
}

export function Lead({ children }: { children: ReactNode }) {
  return (
    <p className="mt-4 text-lg md:text-xl text-gray-400 leading-relaxed max-w-2xl">
      {children}
    </p>
  );
}
