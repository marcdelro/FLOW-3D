/**
 * Horizontal progress bar visualising the share of manifest items that the
 * solver actually packed. Used wherever a numeric success_rate is rendered
 * so users can see fulfilment at a glance instead of mentally mapping a
 * percentage.
 *
 * Colour bands match the thesis fulfilment grades:
 *    success_rate >= 0.90  → green   (excellent)
 *    success_rate >= 0.70  → blue    (good)
 *    success_rate >= 0.40  → amber   (partial)
 *    success_rate <  0.40  → red     (poor — manifest does not fit)
 */

type Props = {
  /** Share of items packed, in [0, 1]. */
  value: number;
  /** Use the light-mode palette. */
  lightMode?: boolean;
  /** Bar height in pixels — defaults to 6 for compact metric tiles. */
  height?: number;
  /** Show the "12 / 20 packed" caption beneath the bar. */
  caption?: { packed: number; total: number };
};

export function SuccessRateBar({ value, lightMode = false, height = 6, caption }: Props) {
  const ratio = Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : 0;
  const pct = Math.round(ratio * 100);

  const band =
    ratio >= 0.9 ? "good-excellent" :
    ratio >= 0.7 ? "good" :
    ratio >= 0.4 ? "partial" : "poor";

  const fill =
    band === "good-excellent" ? "bg-emerald-500"
    : band === "good"         ? "bg-blue-500"
    : band === "partial"      ? "bg-amber-500"
    :                           "bg-red-500";

  const track = lightMode ? "bg-slate-200" : "bg-gray-800";
  const captionColor = lightMode ? "text-slate-600" : "text-gray-400";

  return (
    <div className="w-full">
      <div
        className={`w-full rounded-full overflow-hidden ${track}`}
        style={{ height }}
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`Success rate ${pct}%`}
      >
        <div
          className={`h-full ${fill} transition-all duration-500 ease-out`}
          style={{ width: `${pct}%` }}
        />
      </div>
      {caption && (
        <div className={`mt-1 text-[11px] font-medium ${captionColor}`}>
          {caption.packed} / {caption.total} packed
        </div>
      )}
    </div>
  );
}
