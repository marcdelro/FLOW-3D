import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { useAuth } from "../auth/AuthContext";
import { ButtonLink } from "./primitives/Button";

const LINKS = [
  { href: "#features", label: "Features" },
  { href: "#how",      label: "How it works" },
  { href: "#faq",      label: "FAQ" },
];

export function Nav() {
  const { user, logout, isAdmin } = useAuth();
  const navigate                  = useNavigate();
  const [scrolled, setScrolled]   = useState(false);
  const [open,     setOpen]       = useState(false);
  const [dropOpen, setDropOpen]   = useState(false);
  const dropRef                   = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Close dropdown on outside click.
  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) {
        setDropOpen(false);
      }
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  function handleSignOut() {
    logout();
    setDropOpen(false);
    setOpen(false);
    navigate("/", { replace: true });
  }

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
            <a key={l.href} href={l.href} className="px-3 py-2 text-sm text-gray-300 hover:text-white rounded-md hover:bg-white/[0.05] transition">
              {l.label}
            </a>
          ))}
        </nav>

        {/* Desktop auth area */}
        <div className="hidden md:flex items-center gap-3">
          {user ? (
            <div className="relative" ref={dropRef}>
              <button
                onClick={() => setDropOpen((v) => !v)}
                className="flex items-center gap-2.5 rounded-full px-3 py-1.5 border border-white/15 bg-white/[0.06] hover:bg-white/[0.1] transition"
              >
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center text-xs font-bold text-white shrink-0">
                  {user.username.charAt(0).toUpperCase()}
                </div>
                <span className="text-sm font-semibold text-gray-100">{user.username}</span>
                {isAdmin && (
                  <span className="text-xs font-bold px-1.5 py-0.5 rounded-full bg-violet-950/80 text-violet-300 border border-violet-800">ADMIN</span>
                )}
                <svg className={`w-3.5 h-3.5 text-gray-400 transition-transform ${dropOpen ? "rotate-180" : ""}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </button>
              {dropOpen && (
                <div className="absolute right-0 top-full mt-2 w-48 rounded-xl border border-white/10 bg-[#0f1117]/95 backdrop-blur shadow-xl py-1 z-50">
                  <Link to="/app" onClick={() => setDropOpen(false)}
                    className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-200 hover:bg-white/[0.06] hover:text-white transition">
                    <svg className="w-4 h-4 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M2 7.5L12 3l10 4.5v9L12 21 2 16.5v-9z" /><path d="M12 3v18M2 7.5l10 4.5 10-4.5" />
                    </svg>
                    Open Simulator
                  </Link>
                  {isAdmin && (
                    <Link to="/admin" onClick={() => setDropOpen(false)}
                      className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-200 hover:bg-white/[0.06] hover:text-white transition">
                      <svg className="w-4 h-4 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" />
                        <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
                      </svg>
                      Admin Panel
                    </Link>
                  )}
                  <div className="border-t border-white/[0.06] my-1" />
                  <button onClick={handleSignOut}
                    className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-400 hover:bg-red-950/30 hover:text-red-300 transition">
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" />
                    </svg>
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <>
              <ButtonLink to="/login" variant="ghost" size="md">Sign in</ButtonLink>
              <ButtonLink to="/register" variant="primary" size="md">Get Started</ButtonLink>
            </>
          )}
        </div>

        {/* Mobile menu button */}
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

      {/* Mobile menu */}
      {open && (
        <div className="md:hidden border-t border-white/[0.06] bg-[#0b0d12]/95 backdrop-blur-xl">
          <div className="px-6 py-4 flex flex-col gap-2">
            {LINKS.map((l) => (
              <a key={l.href} href={l.href} onClick={() => setOpen(false)}
                className="px-3 py-2.5 text-base text-gray-200 hover:text-white rounded-md hover:bg-white/[0.05]">
                {l.label}
              </a>
            ))}
            <div className="flex flex-col gap-2 pt-2 border-t border-white/[0.06]">
              {user ? (
                <>
                  <div className="flex items-center gap-2.5 px-3 py-2">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center text-sm font-bold text-white shrink-0">
                      {user.username.charAt(0).toUpperCase()}
                    </div>
                    <span className="text-sm font-semibold text-gray-100">{user.username}</span>
                    {isAdmin && <span className="text-xs font-bold px-1.5 py-0.5 rounded-full bg-violet-950/80 text-violet-300 border border-violet-800">ADMIN</span>}
                  </div>
                  <Link to="/app" onClick={() => setOpen(false)}
                    className="px-3 py-2.5 text-sm text-gray-200 hover:text-white rounded-md hover:bg-white/[0.05]">
                    Open Simulator
                  </Link>
                  {isAdmin && (
                    <Link to="/admin" onClick={() => setOpen(false)}
                      className="px-3 py-2.5 text-sm text-gray-200 hover:text-white rounded-md hover:bg-white/[0.05]">
                      Admin Panel
                    </Link>
                  )}
                  <button onClick={handleSignOut}
                    className="px-3 py-2.5 text-sm text-red-400 hover:text-red-300 rounded-md hover:bg-red-950/20 text-left">
                    Sign Out
                  </button>
                </>
              ) : (
                <div className="flex gap-2">
                  <ButtonLink to="/login" variant="ghost" size="md" onClick={() => setOpen(false)}>Sign in</ButtonLink>
                  <ButtonLink to="/register" variant="primary" size="md" onClick={() => setOpen(false)}>Get Started</ButtonLink>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
