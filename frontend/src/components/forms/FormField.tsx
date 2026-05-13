import type { ReactNode } from "react";

/**
 * Generic label + control + error-message wrapper. Designed so any
 * `<input>` or `<textarea>` registered via React-Hook-Form's `register()`
 * shows a consistent label, aria-wired error message, and red-tinted
 * focus ring when the field is invalid.
 *
 * Pass the field's `error?.message` from `formState.errors[name]?.message`
 * — when it's a non-empty string the wrapper switches to error styling
 * and renders the message below the control.
 */
export function FormField({
  label,
  htmlFor,
  error,
  hint,
  children,
}: {
  label: string;
  htmlFor: string;
  error?: string;
  hint?: ReactNode;
  children: ReactNode;
}) {
  const errorId = `${htmlFor}-error`;
  return (
    <div>
      <label htmlFor={htmlFor} className="block text-sm font-semibold text-gray-300 mb-1.5">
        {label}
      </label>
      {children}
      {hint && !error && (
        <p className="mt-1.5 text-xs text-gray-500">{hint}</p>
      )}
      {error && (
        <p id={errorId} role="alert" className="mt-1.5 text-xs text-red-300 flex items-start gap-1.5">
          <svg className="w-3.5 h-3.5 shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <span>{error}</span>
        </p>
      )}
    </div>
  );
}

/**
 * Tailwind class string for a dark-themed text input — adds a red ring +
 * border when `invalid` is true so the user sees the error before they
 * read the message. Use with `aria-invalid` + `aria-describedby` for a11y.
 */
export function inputClass(invalid: boolean, extra = ""): string {
  return [
    "w-full rounded-xl border px-4 py-3 text-gray-100 placeholder-gray-600",
    "bg-white/[0.05] focus:outline-none focus:ring-2 transition disabled:opacity-50",
    invalid
      ? "border-red-500/60 focus:ring-red-500/60"
      : "border-white/10 focus:ring-blue-500",
    extra,
  ].join(" ");
}

/**
 * Lighter variant for the admin dashboard (light mode toggles to white
 * card background). Same invalid-state ring treatment.
 */
export function adminInputClass(invalid: boolean, lightMode: boolean): string {
  const base = "w-full rounded-xl border px-4 py-2.5 text-sm focus:outline-none focus:ring-2 transition";
  if (invalid) {
    return `${base} ${lightMode ? "border-red-400 bg-white text-slate-900 placeholder-slate-400 focus:ring-red-400" : "border-red-500/60 bg-gray-800 text-gray-100 placeholder-gray-600 focus:ring-red-500/60"}`;
  }
  return `${base} ${lightMode ? "border-slate-200 bg-white text-slate-900 placeholder-slate-400 focus:ring-blue-500" : "border-gray-700 bg-gray-800 text-gray-100 placeholder-gray-600 focus:ring-blue-500"}`;
}
