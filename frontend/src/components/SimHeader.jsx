/**
 * SimHeader.jsx
 *
 * Two-row header for the simulator dashboard.
 *
 * Row 1: logo/title (left) + nav actions (right, includes theme toggle).
 * Row 2: truck spec + stop indicators.
 *
 * Props:
 *   truck       — { width, height, length, maxWeight, quantity }
 *   stops       — [{ id, name, address, color }]
 *   lifoEnabled — boolean
 *   theme       — theme token object from theme.js
 *   themeName   — 'dark' | 'light'
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useThemeStore from '../store/themeStore.js';

function BoxIcon({ color }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
      <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
      <line x1="12" y1="22.08" x2="12" y2="12" />
    </svg>
  );
}

function MoonIcon({ color }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );
}

function SunIcon({ color }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="5" />
      <line x1="12" y1="1" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="23" />
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
      <line x1="1" y1="12" x2="3" y2="12" /><line x1="21" y1="12" x2="23" y2="12" />
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" /><line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
    </svg>
  );
}

export default function SimHeader({ truck, stops, lifoEnabled, onReset, onClearItems, theme: t, themeName }) {
  const navigate = useNavigate();
  const { toggleTheme } = useThemeStore();
  const isDark = themeName === 'dark';

  const [resetHover, setResetHover] = useState(false);
  const [clearHover, setClearHover] = useState(false);
  const [backHover, setBackHover] = useState(false);

  const { width = 240, height = 244, length = 1360 } = truck || {};
  const stopCount = stops ? stops.length : 0;

  const header = {
    flexShrink: 0,
    fontFamily: "'Inter', system-ui, sans-serif",
    transition: 'background-color 0.3s ease',
  };

  const row1 = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 18px',
    height: '54px',
    background: t.headerBg,
    borderBottom: `1px solid ${t.border}`,
    boxShadow: isDark ? '0 1px 0 rgba(255,255,255,0.03)' : t.shadowSm,
  };

  const logoGroup = {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  };

  const logoIconBox = {
    width: '32px',
    height: '32px',
    borderRadius: '8px',
    background: isDark ? '#1e2740' : '#eff6ff',
    border: `1px solid ${isDark ? '#2a3a5e' : '#bfdbfe'}`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  };

  const logoText = {
    fontSize: '14px',
    fontWeight: 800,
    color: t.text,
    letterSpacing: '-0.01em',
  };

  const logoBadge = {
    fontSize: '9px',
    fontWeight: 700,
    color: t.accent,
    background: t.accentBg,
    border: `1px solid ${isDark ? 'rgba(59,130,246,0.2)' : 'rgba(37,99,235,0.15)'}`,
    borderRadius: '6px',
    padding: '2px 6px',
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
  };

  const navGroup = {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  };

  const backBtn = {
    background: backHover ? t.bgHover : 'none',
    border: 'none',
    cursor: 'pointer',
    color: t.textSecondary,
    fontSize: '12px',
    fontWeight: 500,
    padding: '6px 10px',
    borderRadius: '7px',
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    transition: 'background 0.15s',
  };

  const clearBtn = {
    background: clearHover ? t.dangerBg : 'none',
    border: `1px solid ${clearHover ? t.danger : t.border}`,
    cursor: 'pointer',
    color: t.danger,
    fontSize: '12px',
    fontWeight: 500,
    padding: '5px 12px',
    borderRadius: '7px',
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    transition: 'background 0.15s, border-color 0.15s',
  };

  const resetBtn = {
    background: resetHover ? t.bgHover : 'none',
    border: `1px solid ${t.border}`,
    cursor: 'pointer',
    color: t.textSecondary,
    fontSize: '12px',
    fontWeight: 500,
    padding: '5px 12px',
    borderRadius: '7px',
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    transition: 'background 0.15s',
  };

  const themeToggleBtn = {
    background: isDark ? '#1c2333' : '#f1f5f9',
    border: `1px solid ${t.border}`,
    cursor: 'pointer',
    color: t.textSecondary,
    padding: '5px 10px',
    borderRadius: '7px',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '12px',
    fontWeight: 500,
    transition: 'background 0.15s',
  };

  const row2 = {
    display: 'flex',
    alignItems: 'center',
    padding: '0 18px',
    height: '34px',
    background: t.headerBgRow2,
    borderBottom: `1px solid ${t.border}`,
    gap: '16px',
  };

  const truckLabel = {
    fontSize: '11px',
    color: t.textSecondary,
    fontWeight: 500,
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  };

  const divider = {
    width: '1px',
    height: '12px',
    background: t.border,
    flexShrink: 0,
  };

  const stopGroup = {
    display: 'flex',
    alignItems: 'center',
    gap: '5px',
  };

  const stopLabel = {
    fontSize: '11px',
    color: t.textMuted,
  };

  const lifoBadge = {
    fontSize: '10px',
    fontWeight: 600,
    color: t.accent,
    background: t.accentBg,
    borderRadius: '5px',
    padding: '1px 6px',
    marginLeft: '4px',
  };

  return (
    <header style={header}>
      {/* Row 1 */}
      <div style={row1}>
        <div style={logoGroup}>
          <div style={logoIconBox}>
            <BoxIcon color={t.accent} />
          </div>
          <span style={logoText}>FLOW-3D</span>
          <span style={logoBadge}>Logistics DSS</span>
        </div>

        <div style={navGroup}>
          <button style={themeToggleBtn} onClick={toggleTheme} title={isDark ? 'Light mode' : 'Dark mode'}>
            {isDark ? <SunIcon color={t.textSecondary} /> : <MoonIcon color={t.textSecondary} />}
          </button>

          <button
            style={backBtn}
            onClick={() => navigate('/')}
            onMouseEnter={() => setBackHover(true)}
            onMouseLeave={() => setBackHover(false)}
          >
            &#8592; Back
          </button>

          <button
            style={clearBtn}
            onClick={onClearItems}
            onMouseEnter={() => setClearHover(true)}
            onMouseLeave={() => setClearHover(false)}
          >
            &#10005; Clear Items
          </button>

          <button
            style={resetBtn}
            onClick={onReset}
            onMouseEnter={() => setResetHover(true)}
            onMouseLeave={() => setResetHover(false)}
          >
            &#8635; Reset
          </button>
        </div>
      </div>

      {/* Row 2 */}
      <div style={row2}>
        <span style={truckLabel}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={t.textMuted} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="1" y="3" width="15" height="13" /><path d="M16 8h4l3 3v5h-7V8z" /><circle cx="5.5" cy="18.5" r="2.5" /><circle cx="18.5" cy="18.5" r="2.5" />
          </svg>
          {width} &times; {height} &times; {length} cm
        </span>

        <div style={divider} />

        <div style={stopGroup}>
          {stops && stops.map((stop) => (
            <div key={stop.id} style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: stop.color,
              boxShadow: `0 0 4px ${stop.color}88`,
            }} />
          ))}
          <span style={stopLabel}>
            {stopCount} stop{stopCount !== 1 ? 's' : ''}
          </span>
          {lifoEnabled && <span style={lifoBadge}>LIFO</span>}
        </div>
      </div>
    </header>
  );
}
