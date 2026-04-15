/**
 * FurnitureItemCard.jsx
 *
 * Reusable card for a single furniture item in the sidebar Items tab.
 * Accepts item data and callbacks from parent — owns no state itself.
 * Themed via the `theme` prop (token object from theme.js).
 *
 * Props:
 *   item    — { id, type, quantity, weight, width, height, length, stopId }
 *   index   — position index (for dot color)
 *   stops   — [{ id, name, color }] — drives the "Assign to Stop" dropdown
 *   onChange — (updatedItem) => void
 *   onRemove — () => void
 *   theme   — theme token object
 */

import React from 'react';

const ITEM_TYPES = [
  'Chair', 'Dining Table', 'Sofa', 'Wardrobe', 'Desk', 'Bookshelf', 'Bed', 'Box',
];

const DOT_COLORS = ['#f59e0b', '#10b981', '#3b82f6', '#a78bfa', '#f43f5e'];

export default function FurnitureItemCard({ item, index, stops, onChange, onRemove, theme: t }) {
  const dotColor = DOT_COLORS[index % DOT_COLORS.length];

  // Fallback for when theme is not yet passed (defensive)
  const border = t ? t.border : '#e5e7eb';
  const cardBg = t ? t.cardBg : '#ffffff';
  const textColor = t ? t.text : '#111827';
  const textMuted = t ? t.textMuted : '#6b7280';
  const inputBg = t ? t.inputBg : '#ffffff';
  const danger = t ? t.danger : '#ef4444';

  function handleField(field, value) {
    onChange({ ...item, [field]: value });
  }

  const card = {
    background: cardBg,
    border: `1px solid ${border}`,
    borderRadius: '10px',
    padding: '12px',
    marginBottom: '10px',
    fontFamily: "'Inter', system-ui, sans-serif",
    transition: 'background 0.2s, border-color 0.2s',
  };

  const headerRow = {
    display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px',
  };

  const select = {
    flex: 1, border: `1px solid ${border}`, borderRadius: '6px', padding: '5px 8px',
    fontSize: '12px', background: inputBg, color: textColor, cursor: 'pointer', outline: 'none',
  };

  const trashBtn = {
    background: 'none', border: 'none', cursor: 'pointer', padding: '4px', color: danger,
    display: 'flex', alignItems: 'center', flexShrink: 0, borderRadius: '4px',
  };

  const grid2 = {
    display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '8px',
  };

  const fieldGroup = {
    display: 'flex', flexDirection: 'column', gap: '3px',
  };

  const label = {
    fontSize: '11px', color: textMuted, fontWeight: 500,
  };

  const input = {
    border: `1px solid ${border}`, borderRadius: '6px', padding: '5px 8px',
    fontSize: '12px', width: '100%', boxSizing: 'border-box', outline: 'none',
    color: textColor, background: inputBg,
  };

  return (
    <div style={card}>
      {/* Header: dot + type select + trash */}
      <div style={headerRow}>
        <div style={{ width: '11px', height: '11px', borderRadius: '50%', background: dotColor, flexShrink: 0, boxShadow: `0 0 4px ${dotColor}88` }} />
        <select style={select} value={item.type} onChange={(e) => handleField('type', e.target.value)}>
          {ITEM_TYPES.map((ty) => <option key={ty} value={ty}>{ty}</option>)}
        </select>
        <button style={trashBtn} onClick={onRemove} title="Remove item">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14H6L5 6" />
            <path d="M10 11v6M14 11v6" /><path d="M9 6V4h6v2" />
          </svg>
        </button>
      </div>

      {/* Quantity + Weight */}
      <div style={grid2}>
        <div style={fieldGroup}>
          <label style={label}>Quantity</label>
          <input style={input} type="number" min="1" value={item.quantity} onChange={(e) => handleField('quantity', e.target.value)} />
        </div>
        <div style={fieldGroup}>
          <label style={label}>Weight (kg)</label>
          <input style={input} type="number" min="0" value={item.weight} onChange={(e) => handleField('weight', e.target.value)} />
        </div>
      </div>

      {/* Width + Height */}
      <div style={grid2}>
        <div style={fieldGroup}>
          <label style={label}>Width (cm)</label>
          <input style={input} type="number" min="0" value={item.width} onChange={(e) => handleField('width', e.target.value)} />
        </div>
        <div style={fieldGroup}>
          <label style={label}>Height (cm)</label>
          <input style={input} type="number" min="0" value={item.height} onChange={(e) => handleField('height', e.target.value)} />
        </div>
      </div>

      {/* Length */}
      <div style={{ marginBottom: '8px' }}>
        <div style={fieldGroup}>
          <label style={label}>Length (cm)</label>
          <input style={input} type="number" min="0" value={item.length} onChange={(e) => handleField('length', e.target.value)} />
        </div>
      </div>

      {/* Assign to Stop */}
      <div style={fieldGroup}>
        <label style={label}>Assign to Stop</label>
        <select style={{ ...select, width: '100%', flex: 'unset' }} value={item.stopId || ''} onChange={(e) => handleField('stopId', e.target.value)}>
          <option value="">No stop assigned</option>
          {(stops || []).map((st, idx) => (
            <option key={st.id} value={String(st.id)}>Stop {idx + 1} — {st.name}</option>
          ))}
        </select>
      </div>
    </div>
  );
}
