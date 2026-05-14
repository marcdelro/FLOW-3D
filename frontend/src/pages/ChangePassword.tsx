import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate } from "react-router-dom";

import { useAuth } from "../auth/AuthContext";
import { FormField, inputClass } from "../components/forms/FormField";
import { changePasswordSchema, type ChangePasswordInput } from "../lib/formSchemas";

export function ChangePassword() {
  const { user, changePassword } = useAuth();
  const navigate = useNavigate();

  const [showPw, setShowPw] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ChangePasswordInput>({
    resolver: zodResolver(changePasswordSchema),
    mode: "onTouched",
    defaultValues: { newPassword: "", confirmPassword: "" },
  });

  async function onSubmit(values: ChangePasswordInput) {
    setServerError(null);
    try {
      await changePassword(values.newPassword);
      const dest = user?.role === "admin" ? "/admin" : "/app";
      navigate(dest, { replace: true });
    } catch (err) {
      setServerError(err instanceof Error ? err.message : "Something went wrong.");
    }
  }

  return (
    <main className="min-h-screen bg-[#0b0d12] text-gray-100 flex items-center justify-center px-6 py-16">
      <div className="max-w-md w-full">
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur px-8 py-10">
          {/* Logo */}
          <div className="flex flex-col items-center mb-8">
            <div className="inline-flex w-14 h-14 rounded-2xl bg-blue-600/20 border border-blue-500/30 items-center justify-center mb-5">
              <svg viewBox="0 0 24 24" className="w-7 h-7 text-blue-300" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0110 0v4" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-100">Set your password</h1>
            <p className="mt-1.5 text-sm text-gray-400 text-center">
              Welcome, <span className="text-gray-200 font-semibold">{user?.username}</span>. Choose a new password to continue.
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
            {serverError && (
              <div role="alert" className="rounded-xl border border-red-500/40 bg-red-950/40 text-red-300 text-sm px-4 py-3 flex items-center gap-2.5">
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                {serverError}
              </div>
            )}

            <FormField
              label="New Password"
              htmlFor="cp-new"
              error={errors.newPassword?.message}
              hint="At least 6 characters."
            >
              <div className="relative">
                <input
                  id="cp-new"
                  type={showPw ? "text" : "password"}
                  autoComplete="new-password"
                  autoFocus
                  disabled={isSubmitting}
                  placeholder="At least 6 characters"
                  aria-invalid={!!errors.newPassword}
                  aria-describedby={errors.newPassword ? "cp-new-error" : undefined}
                  className={inputClass(!!errors.newPassword, "pr-12")}
                  {...register("newPassword", { onChange: () => setServerError(null) })}
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

            <FormField label="Confirm Password" htmlFor="cp-confirm" error={errors.confirmPassword?.message}>
              <input
                id="cp-confirm"
                type={showPw ? "text" : "password"}
                autoComplete="new-password"
                disabled={isSubmitting}
                placeholder="Repeat your new password"
                aria-invalid={!!errors.confirmPassword}
                aria-describedby={errors.confirmPassword ? "cp-confirm-error" : undefined}
                className={inputClass(!!errors.confirmPassword)}
                {...register("confirmPassword", { onChange: () => setServerError(null) })}
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
                  Saving…
                </>
              ) : (
                "Set Password & Continue"
              )}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}

export default ChangePassword;
