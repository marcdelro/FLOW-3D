/**
 * Shared display formatters used by Dashboard / Explainability / PlanSelector
 * so the same value never appears in two different units across the UI.
 */

/**
 * Format a wall-clock duration in milliseconds for human display.
 *
 *   0–999 ms       →  "423 ms"
 *   1 s – 59.9 s   →  "30.0 s"
 *   60 s and up    →  "1 m 5 s"
 *
 * Returns an object with `{value, unit}` so callers can style the unit
 * differently from the number (matching the existing metric-tile look).
 */
export function formatExecTime(ms: number): { value: string; unit: string } {
  if (!Number.isFinite(ms) || ms < 0) return { value: "—", unit: "" };
  if (ms < 1000) return { value: String(Math.round(ms)), unit: "ms" };
  if (ms < 60_000) return { value: (ms / 1000).toFixed(1), unit: "s" };
  const minutes = Math.floor(ms / 60_000);
  const seconds = Math.round((ms % 60_000) / 1000);
  return { value: `${minutes} m ${seconds}`, unit: "s" };
}

/** Plain-string variant for places that don't need separate unit styling. */
export function formatExecTimeStr(ms: number): string {
  const { value, unit } = formatExecTime(ms);
  return unit ? `${value} ${unit}` : value;
}

/** Pretty percentage from a 0..1 value, capped at 100 and rounded to int. */
export function formatPct(ratio: number): string {
  if (!Number.isFinite(ratio)) return "—";
  return `${Math.round(Math.max(0, Math.min(1, ratio)) * 100)}`;
}
