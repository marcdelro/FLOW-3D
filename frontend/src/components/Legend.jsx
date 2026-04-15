/**
 * Legend.jsx
 *
 * Color legend panel for LIFO delivery-stop visualization.
 * Themed via themeStore (reads directly — no prop drilling needed since
 * this component sits inside the Three.js canvas overlay, not the sidebar).
 *
 * Reads from the Zustand manifest store (delivery_stop values only).
 * Makes no API calls and contains no Three.js code.
 */

import React, { useMemo } from 'react';
import useManifestStore from '../store/useManifestStore.js';
import useThemeStore from '../store/themeStore.js';
import { getTheme } from '../theme.js';
import { STOP_COLORS, getStopColor } from '../utils/stopColors.js';

export default function Legend() {
  const placements = useManifestStore((s) => s.placements);
  const { theme: themeName } = useThemeStore();
  const t = getTheme(themeName);
  const isDark = themeName === 'dark';

  const stops = useMemo(() => {
    if (placements.length === 0) {
      return STOP_COLORS.map((_, i) => i + 1);
    }
    const uniqueStops = [...new Set(placements.map((p) => p.delivery_stop))];
    return uniqueStops.sort((a, b) => a - b);
  }, [placements]);

  const isLive = placements.length > 0;

  const panel = {
    background: isDark ? 'rgba(22,27,39,0.92)' : 'rgba(255,255,255,0.92)',
    border: `1px solid ${t.border}`,
    borderRadius: '10px',
    padding: '14px',
    fontSize: '12px',
    color: t.textSecondary,
    fontFamily: "'Inter', system-ui, sans-serif",
    backdropFilter: 'blur(8px)',
    boxShadow: t.shadowMd,
    transition: 'background 0.3s ease',
  };

  const title = {
    fontSize: '10px',
    fontWeight: 700,
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
    color: t.textMuted,
    marginBottom: '10px',
  };

  const row = {
    display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px',
  };

  const swatch = {
    width: '12px', height: '12px', borderRadius: '3px', flexShrink: 0,
    border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'}`,
  };

  const note = {
    marginTop: '8px', fontSize: '11px', color: t.textMuted, lineHeight: 1.4,
  };

  return (
    <div style={panel}>
      <div style={title}>Delivery Stops</div>
      {stops.map((stop) => (
        <div key={stop} style={row}>
          <div style={{ ...swatch, background: getStopColor(stop) }} aria-hidden="true" />
          <span style={{ color: t.textSecondary }}>
            Stop {stop}
            {stop === Math.min(...stops) && isLive ? ' — nearest door' : ''}
            {stop === Math.max(...stops) && isLive && stops.length > 1 ? ' — deepest' : ''}
          </span>
        </div>
      ))}
      <div style={note}>
        {isLive
          ? 'Stop 1 items are unloaded first — LIFO order.'
          : 'Load a solution to see live stops.'}
      </div>
    </div>
  );
}
