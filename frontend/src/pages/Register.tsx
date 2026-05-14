import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link, useNavigate } from "react-router-dom";

import { FormField, inputClass } from "../components/forms/FormField";
import { registerSchema, type RegisterInput } from "../lib/formSchemas";

const USE_MOCK = import.meta.env.VITE_USE_MOCK !== "false";
const API_URL  = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

export function Register() {
  const navigate = useNavigate();
  const [showPw, setShowPw] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    mode: "onTouched",
    defaultValues: { username: "", password: "", confirm: "" },
  });

  async function onSubmit(values: RegisterInput) {
    setServerError(null);
    try {
      if (USE_MOCK) {
        await new Promise<void>((r) => setTimeout(r, 700));
        navigate("/login", { state: { registered: true }, replace: true });
        return;
      }
      const res = await fetch(`${API_URL}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: values.username.trim(), password: values.password }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { detail?: string };
        throw new Error(body.detail ?? "Registration failed. Please try again.");
      }
      navigate("/login", { state: { registered: true }, replace: true });
    } catch (err) {
      setServerError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    }
  }

  return (
    <main className="min-h-screen bg-[#0b0d12] text-gray-100 flex items-center justify-center px-6 py-16">
      <div className="max-w-md w-full">
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur px-8 py-10 relative">
          {/* X close button */}
          <button
            onClick={() => navigate("/")}
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
            <h1 className="text-3xl font-bold tracking-tight text-gray-100">Create account</h1>
            <p className="mt-1.5 text-sm text-gray-400 text-center">Join FLOW-3D to manage loading plans</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
            {serverError && (
              <div role="alert" className="rounded-xl border border-red-500/40 bg-red-950/40 text-red-300 text-sm px-4 py-3 flex items-center gap-2.5">
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                {serverError}
              </div>
            )}

            <FormField
              label="Username"
              htmlFor="reg-username"
              error={errors.username?.message}
              hint="At least 3 characters. Letters, digits, dot, dash, or underscore."
            >
              <input
                id="reg-username"
                type="text"
                autoComplete="username"
                autoFocus
                disabled={isSubmitting}
                placeholder="Choose a username"
                aria-invalid={!!errors.username}
                aria-describedby={errors.username ? "reg-username-error" : undefined}
                className={inputClass(!!errors.username)}
                {...register("username", { onChange: () => setServerError(null) })}
              />
            </FormField>

            <FormField
              label="Password"
              htmlFor="reg-password"
              error={errors.password?.message}
              hint="At least 6 characters."
            >
              <div className="relative">
                <input
                  id="reg-password"
                  type={showPw ? "text" : "password"}
                  autoComplete="new-password"
                  disabled={isSubmitting}
                  placeholder="Min. 6 characters"
                  aria-invalid={!!errors.password}
                  aria-describedby={errors.password ? "reg-password-error" : undefined}
                  className={inputClass(!!errors.password, "pr-12")}
                  {...register("password", { onChange: () => setServerError(null) })}
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
            </FormField>

            <FormField label="Confirm password" htmlFor="reg-confirm" error={errors.confirm?.message}>
              <input
                id="reg-confirm"
                type={showPw ? "text" : "password"}
                autoComplete="new-password"
                disabled={isSubmitting}
                placeholder="Re-enter your password"
                aria-invalid={!!errors.confirm}
                aria-describedby={errors.confirm ? "reg-confirm-error" : undefined}
                className={inputClass(!!errors.confirm)}
                {...register("confirm", { onChange: () => setServerError(null) })}
              />
            </FormField>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-xl px-4 py-3 bg-blue-600 hover:bg-blue-500 text-white font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-2"
            >
              {isSubmitting ? (
                <>
                  <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Creating account…
                </>
              ) : (
                "Create Account"
              )}
            </button>
          </form>

          <div className="mt-7 space-y-3 text-center">
            <p className="text-sm text-gray-400">
              Already have an account?{" "}
              <Link to="/login" className="text-blue-300 hover:text-blue-200 underline underline-offset-2 transition">
                Sign in
              </Link>
            </p>
            <p className="text-sm">
              <Link to="/app" className="text-gray-500 hover:text-gray-400 transition underline underline-offset-2">
                See Simulator Preview &rarr;
              </Link>
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}

/** Kept for compatibility with any existing imports. */
export function StubCard({ title, body }: { title: string; body: string }) {
  return (
    <main className="min-h-screen bg-[#0b0d12] text-gray-100 flex items-center justify-center px-6">
      <div className="max-w-md w-full rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur px-8 py-10 text-center">
        <div className="inline-flex w-14 h-14 rounded-2xl bg-blue-600/20 border border-blue-500/30 items-center justify-center mb-5">
          <span className="text-2xl font-bold text-blue-300">3D</span>
        </div>
        <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
        <p className="mt-3 text-gray-400">{body}</p>
        <div className="mt-8 flex flex-col gap-3">
          <Link to="/" className="rounded-lg px-4 py-2.5 bg-white text-gray-900 font-semibold hover:bg-gray-200 transition">
            Back to home
          </Link>
          <Link to="/app" className="text-sm text-blue-300 hover:text-blue-200 underline underline-offset-2">
            Open the simulator preview
          </Link>
        </div>
      </div>
    </main>
  );
}

export default Register;
