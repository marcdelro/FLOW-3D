/**
 * SimHeader.jsx
 *
 * Two-row header for the simulator dashboard.
 *
 * Row 1: logo/title (left) + nav actions (right).
 * Row 2: truck spec (from truck prop) + stop indicators (from stops prop).
 *
 * Props:
 *   truck       — { width, height, length, maxWeight, quantity }
 *   stops       — [{ id, name, address, color }]
 *   lifoEnabled — boolean
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';

const s = {
  header: {
    flexShrink: 0,
    fontFamily: 'system-ui, sans-serif',
  },
  row1: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 20px',
    height: '52px',
    background: '#ffffff',
    borderBottom: '1px solid #e5e7eb',
  },
  logoGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  logoText: {
    fontSize: '15px',
    fontWeight: 700,
    color: '#111827',
    letterSpacing: '-0.01em',
  },
  navGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  iconBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: '#6b7280',
    padding: '6px',
    display: 'flex',
    alignItems: 'center',
    borderRadius: '6px',
  },
  backBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: '#374151',
    fontSize: '13px',
    fontWeight: 500,
    padding: '6px 10px',
    borderRadius: '6px',
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
  },
  resetBtn: {
    background: 'none',
    border: '1px solid #d1d5db',
    cursor: 'pointer',
    color: '#374151',
    fontSize: '13px',
    fontWeight: 500,
    padding: '5px 12px',
    borderRadius: '7px',
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
  },
  clearItemsBtn: {
    background: '#ffffff',
    border: '1px solid #ef4444',
    cursor: 'pointer',
    color: '#ef4444',
    fontSize: '13px',
    fontWeight: 500,
    padding: '5px 12px',
    borderRadius: '7px',
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
  },
  row2: {
    display: 'flex',
    alignItems: 'center',
    padding: '0 20px',
    height: '36px',
    background: '#f9fafb',
    borderBottom: '1px solid #e5e7eb',
    gap: '16px',
  },
  truckLabel: {
    fontSize: '12px',
    color: '#374151',
    fontWeight: 500,
  },
  stopGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  dot: (color) => ({
    width: '9px',
    height: '9px',
    borderRadius: '50%',
    background: color,
  }),
  stopLabel: {
    fontSize: '12px',
    color: '#6b7280',
  },
};

function BoxIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#374151" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
      <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
      <line x1="12" y1="22.08" x2="12" y2="12" />
    </svg>
  );
}

function BookmarkIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
    </svg>
  );
}

export default function SimHeader({ truck, stops, lifoEnabled, onReset, onClearItems }) {
  const navigate = useNavigate();

  const { width = 240, height = 244, length = 1360 } = truck || {};
  const stopCount = stops ? stops.length : 0;

  return (
    <header style={s.header}>
      {/* Row 1 */}
      <div style={s.row1}>
        <div style={s.logoGroup}>
          <BoxIcon />
          <span style={s.logoText}>
            Routing-Aware 3D Furniture Logistics Simulator
          </span>
        </div>

        <div style={s.navGroup}>
          <button style={s.iconBtn} title="Bookmark">
            <BookmarkIcon />
          </button>
          <button style={s.backBtn} onClick={() => navigate('/')}>
            &#8592; Back
          </button>
          <button style={s.clearItemsBtn} onClick={onClearItems}>
            &#10005; Clear Items
          </button>
          <button style={s.resetBtn} onClick={onReset}>
            &#8635; Reset
          </button>
        </div>
      </div>

      {/* Row 2 — live truck dimensions + stop dots */}
      <div style={s.row2}>
        <span style={s.truckLabel}>
          Truck: {width} &times; {height} &times; {length} cm
        </span>
        <div style={s.stopGroup}>
          {stops && stops.map((stop) => (
            <div key={stop.id} style={s.dot(stop.color)} />
          ))}
          <span style={s.stopLabel}>
            {stopCount} stop{stopCount !== 1 ? 's' : ''}{lifoEnabled ? ' \u00b7 LIFO' : ''}
          </span>
        </div>
      </div>
    </header>
  );
}
