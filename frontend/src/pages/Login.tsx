import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import type { Location } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";


export function Login() {
  const { login, user, mustChangePassword } = useAuth();
  const navigate        = useNavigate();
  const location        = useLocation();

  const state   = location.state as { from?: Location; expired?: boolean } | null;
  const from    = state?.from?.pathname;
  const expired = state?.expired ?? false;

  const [username,         setUsername]         = useState("");
  const [password,         setPassword]         = useState("");
  const [showPw,           setShowPw]           = useState(false);
  const [submitting,       setSubmitting]       = useState(false);
  const [error,            setError]            = useState<string | null>(null);
  const [expiredDismissed, setExpiredDismissed] = useState(false);
  const errorTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Redirect immediately if already signed in.
  useEffect(() => {
    if (!user) return;
    if (mustChangePassword) { navigate("/change-password", { replace: true }); return; }
    const dest = from && from !== "/login" ? from : user.role === "admin" ? "/admin" : "/app";
    navigate(dest, { replace: true });
  }, [user, mustChangePassword, navigate, from]);

  function clearError() {
    if (errorTimer.current) clearTimeout(errorTimer.current);
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!username.trim() || !password) return;
    clearError();
    setSubmitting(true);
    try {
      await login(username.trim(), password);
      // Navigation handled by the useEffect above once user state updates.
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Something went wrong. Please try again.";
      setError(msg);
      errorTimer.current = setTimeout(() => setError(null), 5000);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#0b0d12] text-gray-100 flex items-center justify-center px-6 py-16">
      <div className="max-w-md w-full">

        {/* Session-expired banner */}
        {expired && !expiredDismissed && (
          <div className="mb-5 rounded-xl border border-amber-500/40 bg-amber-950/40 text-amber-300 text-sm px-4 py-3 flex items-center gap-2.5">
            <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
            <span className="flex-1">Your session expired. Please sign in again.</span>
            <button onClick={() => setExpiredDismissed(true)} className="text-amber-400 hover:text-amber-200 transition">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        {/* Card */}
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur px-8 py-10 relative">
          {/* X close button */}
          <button
            onClick={() => navigate(from && from !== "/login" ? from : "/")}
            aria-label="Close"
            className="absolute top-4 right-4 text-gray-600 hover:text-gray-300 transition p-1 rounded-lg hover:bg-white/[0.06]"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
          {/* Logo */}
          <div className="flex flex-col items-center mb-8">
            <div className="inline-flex w-14 h-14 rounded-2xl bg-blue-600/20 border border-blue-500/30 items-center justify-center mb-5">
              <svg viewBox="0 0 24 24" className="w-7 h-7 text-blue-300" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M2 7.5L12 3l10 4.5v9L12 21 2 16.5v-9z" />
                <path d="M12 3v18M2 7.5l10 4.5 10-4.5" />
              </svg>
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-gray-100">Welcome back</h1>
            <p className="mt-1.5 text-sm text-gray-400 text-center">Sign in to your FLOW-3D account</p>
          </div>

          <form onSubmit={handleSubmit} noValidate className="space-y-5">
            {/* Error notification */}
            {error && (
              <div className="rounded-xl border border-red-500/40 bg-red-950/40 text-red-300 text-sm px-4 py-3 flex items-center gap-2.5">
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                {error}
              </div>
            )}

            {/* Username */}
            <div>
              <label className="block text-sm font-semibold text-gray-300 mb-1.5">Username</label>
              <input
                type="text"
                autoComplete="username"
                autoFocus
                value={username}
                onChange={(e) => { setUsername(e.target.value); clearError(); }}
                disabled={submitting}
                placeholder="Enter your username"
                className="w-full rounded-xl border border-white/10 bg-white/[0.05] px-4 py-3 text-gray-100 placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 transition disabled:opacity-50"
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-semibold text-gray-300 mb-1.5">Password</label>
              <div className="relative">
                <input
                  type={showPw ? "text" : "password"}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); clearError(); }}
                  disabled={submitting}
                  placeholder="Enter your password"
                  className="w-full rounded-xl border border-white/10 bg-white/[0.05] px-4 py-3 pr-12 text-gray-100 placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 transition disabled:opacity-50"
                />
                <button
                  type="button"
                  onClick={() => setShowPw((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition p-1"
                  aria-label={showPw ? "Hide password" : "Show password"}
                >
                  {showPw ? (
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24" />
                      <line x1="1" y1="1" x2="23" y2="23" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={submitting || !username.trim() || !password}
              className="w-full rounded-xl px-4 py-3 bg-blue-600 hover:bg-blue-500 text-white font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-2"
            >
              {submitting ? (
                <>
                  <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Signing in…
                </>
              ) : (
                "Sign In"
              )}
            </button>
          </form>

          {/* Footer links */}
          <div className="mt-7 text-center">
            <p className="text-sm">
              <Link to="/app" className="text-gray-500 hover:text-gray-400 transition underline underline-offset-2">
                See Simulator Preview &rarr;
              </Link>
            </p>
          </div>
        </div>

        {/* Demo credentials hint */}
        <p className="mt-5 text-center text-xs text-gray-600">
          Demo &nbsp;·&nbsp;{" "}
          <span className="font-mono">admin / admin123</span>
          {" "}&nbsp;or&nbsp;{" "}
          <span className="font-mono">user / user123</span>
        </p>
      </div>
    </main>
  );
}

export default Login;
