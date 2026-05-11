import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { ButtonLink } from "./primitives/Button";

const LINKS = [
  { href: "#features", label: "Features" },
  { href: "#how", label: "How it works" },
  { href: "#faq", label: "FAQ" },
];

export function Nav() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-40 transition-all duration-300 ${
        scrolled
          ? "bg-[#0b0d12]/70 backdrop-blur-xl border-b border-white/[0.06]"
          : "bg-transparent border-b border-transparent"
      }`}
    >
      <div className="mx-auto max-w-7xl px-6 md:px-10 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2.5 group">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center shadow-[0_0_20px_rgba(59,130,246,0.45)]">
            <svg viewBox="0 0 24 24" className="w-5 h-5 text-white" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M2 7.5L12 3l10 4.5v9L12 21 2 16.5v-9z" />
              <path d="M12 3v18M2 7.5l10 4.5 10-4.5" />
            </svg>
          </div>
          <span className="font-bold tracking-tight text-white text-lg">FLOW-3D</span>
        </Link>

        <nav className="hidden md:flex items-center gap-1">
          {LINKS.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="px-3 py-2 text-sm text-gray-300 hover:text-white rounded-md hover:bg-white/[0.05] transition"
            >
              {l.label}
            </a>
          ))}
        </nav>

        <div className="hidden md:flex items-center gap-3">
          <ButtonLink to="/login" variant="ghost" size="md">
            Sign in
          </ButtonLink>
          <ButtonLink to="/register" variant="primary" size="md">
            Get Started
          </ButtonLink>
        </div>

        <button
          onClick={() => setOpen((v) => !v)}
          aria-label="Toggle menu"
          aria-expanded={open}
          className="md:hidden p-2 rounded-md text-gray-200 hover:bg-white/[0.06]"
        >
          <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            {open ? (
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 6l12 12M6 18L18 6" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 7h18M3 12h18M3 17h18" />
            )}
          </svg>
        </button>
      </div>

      {open && (
        <div className="md:hidden border-t border-white/[0.06] bg-[#0b0d12]/95 backdrop-blur-xl">
          <div className="px-6 py-4 flex flex-col gap-2">
            {LINKS.map((l) => (
              <a
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className="px-3 py-2.5 text-base text-gray-200 hover:text-white rounded-md hover:bg-white/[0.05]"
              >
                {l.label}
              </a>
            ))}
            <div className="flex gap-2 pt-2">
              <ButtonLink to="/login" variant="ghost" size="md" onClick={() => setOpen(false)}>
                Sign in
              </ButtonLink>
              <ButtonLink to="/register" variant="primary" size="md" onClick={() => setOpen(false)}>
                Get Started
              </ButtonLink>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
