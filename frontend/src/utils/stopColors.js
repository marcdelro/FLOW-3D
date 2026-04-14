/**
 * stopColors.js
 *
 * Canonical color palette for delivery stop LIFO visualization.
 *
 * Convention (CLAUDE.md):
 *   Stop 1  = first unloaded = nearest the door = "hottest" (red end).
 *   Higher stop numbers = deeper in the container = "cooler" (blue/violet end).
 *
 * The palette contains 8 distinct stops.  For manifests with more stops the
 * colors wrap around.  Update STOP_COLORS here and the Legend component will
 * pick up the change automatically.
 */

/** Ordered palette — index 0 maps to stop 1. */
export const STOP_COLORS = [
  '#ff3b3b', // Stop 1  — red      (door, first off)
  '#ff8c00', // Stop 2  — orange
  '#f5e642', // Stop 3  — yellow
  '#4cde5a', // Stop 4  — green
  '#23c6c8', // Stop 5  — cyan
  '#3a7bd5', // Stop 6  — blue
  '#8b5cf6', // Stop 7  — violet
  '#ec4899', // Stop 8  — pink     (deepest in container)
];

/**
 * Map a 1-based delivery stop number to a CSS hex color string.
 *
 * @param {number} stop - delivery_stop value from the placement manifest.
 * @returns {string}    - CSS color string, e.g. "#ff3b3b".
 */
export function getStopColor(stop) {
  // stop is 1-based; wrap when stop count exceeds palette length.
  const idx = ((stop - 1) % STOP_COLORS.length + STOP_COLORS.length) % STOP_COLORS.length;
  return STOP_COLORS[idx];
}
