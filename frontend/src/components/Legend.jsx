/**
 * Legend.jsx
 *
 * Color legend panel for LIFO delivery-stop visualization.
 *
 * Renders one swatch per stop that appears in the current placement manifest.
 * When no manifest is loaded, shows the full static palette as a reference.
 *
 * Reads from the Zustand store (delivery_stop values only).
 * Makes no API calls and contains no Three.js code.
 */

import React, { useMemo } from 'react';
import useManifestStore from '../store/useManifestStore.js';
import { STOP_COLORS, getStopColor } from '../utils/stopColors.js';

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = {
  panel: {
    background: '#16181f',
    border: '1px solid #2a2d38',
    borderRadius: '8px',
    padding: '14px',
    fontSize: '12px',
    color: '#9ca3af',
    fontFamily: 'system-ui, sans-serif',
  },
  title: {
    fontSize: '11px',
    fontWeight: 600,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    color: '#6b7280',
    marginBottom: '10px',
  },
  row: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '6px',
  },
  swatch: {
    width: '12px',
    height: '12px',
    borderRadius: '3px',
    flexShrink: 0,
    border: '1px solid rgba(255,255,255,0.1)',
  },
  label: {
    color: '#d1d5db',
    whiteSpace: 'nowrap',
  },
  note: {
    marginTop: '8px',
    fontSize: '11px',
    color: '#4b5563',
    lineHeight: 1.4,
  },
};

// ── Component ─────────────────────────────────────────────────────────────────

export default function Legend() {
  const placements = useManifestStore((s) => s.placements);

  // Derive the sorted set of unique delivery stops present in the manifest.
  // If no manifest is loaded, fall back to showing all palette colors.
  const stops = useMemo(() => {
    if (placements.length === 0) {
      // Show static palette preview when idle.
      return STOP_COLORS.map((_, i) => i + 1);
    }
    const uniqueStops = [...new Set(placements.map((p) => p.delivery_stop))];
    return uniqueStops.sort((a, b) => a - b);
  }, [placements]);

  const isLive = placements.length > 0;

  return (
    <div style={styles.panel}>
      <div style={styles.title}>Delivery Stops</div>

      {stops.map((stop) => (
        <div key={stop} style={styles.row}>
          <div
            style={{ ...styles.swatch, background: getStopColor(stop) }}
            aria-hidden="true"
          />
          <span style={styles.label}>
            Stop {stop}
            {stop === Math.min(...stops) && isLive ? ' — nearest door' : ''}
            {stop === Math.max(...stops) && isLive && stops.length > 1
              ? ' — deepest'
              : ''}
          </span>
        </div>
      ))}

      <div style={styles.note}>
        {isLive
          ? 'Items nearest the door (stop 1) are unloaded first — LIFO order.'
          : 'Color palette preview — load a solution to see live stops.'}
      </div>
    </div>
  );
}
