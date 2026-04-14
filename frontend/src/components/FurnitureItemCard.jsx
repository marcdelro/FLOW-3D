/**
 * FurnitureItemCard.jsx
 *
 * Reusable card for a single furniture item in the sidebar Items tab.
 * Accepts item data and callbacks from parent — owns no state itself.
 *
 * Props:
 *   item    — { id, type, quantity, weight, width, height, length, stopId }
 *   index   — position index (for dot color)
 *   stops   — [{ id, name, color }] — drives the "Assign to Stop" dropdown
 *   onChange — (updatedItem) => void
 *   onRemove — () => void
 */

import React from 'react';

const ITEM_TYPES = [
  'Chair',
  'Dining Table',
  'Sofa',
  'Wardrobe',
  'Desk',
  'Bookshelf',
  'Bed',
  'Box',
];

// Dot colors cycle by item index for visual variety.
const DOT_COLORS = ['#d97706', '#92400e', '#b45309', '#78350f', '#a16207'];

const s = {
  card: {
    background: '#ffffff',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    padding: '12px',
    marginBottom: '10px',
    fontFamily: 'system-ui, sans-serif',
  },
  headerRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '10px',
  },
  dot: {
    width: '12px',
    height: '12px',
    borderRadius: '50%',
    flexShrink: 0,
  },
  select: {
    flex: 1,
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    padding: '5px 8px',
    fontSize: '13px',
    background: '#fff',
    color: '#111827',
    cursor: 'pointer',
    outline: 'none',
  },
  trashBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: '4px',
    color: '#ef4444',
    display: 'flex',
    alignItems: 'center',
    flexShrink: 0,
    borderRadius: '4px',
  },
  grid2: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '8px',
    marginBottom: '8px',
  },
  fieldGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '3px',
  },
  label: {
    fontSize: '11px',
    color: '#6b7280',
    fontWeight: 500,
  },
  input: {
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    padding: '5px 8px',
    fontSize: '13px',
    width: '100%',
    boxSizing: 'border-box',
    outline: 'none',
    color: '#111827',
  },
  fullField: {
    marginBottom: '8px',
  },
};

export default function FurnitureItemCard({ item, index, stops, onChange, onRemove }) {
  const dotColor = DOT_COLORS[index % DOT_COLORS.length];

  function handleField(field, value) {
    onChange({ ...item, [field]: value });
  }

  return (
    <div style={s.card}>
      {/* Header: dot + name select + trash */}
      <div style={s.headerRow}>
        <div style={{ ...s.dot, background: dotColor }} />
        <select
          style={s.select}
          value={item.type}
          onChange={(e) => handleField('type', e.target.value)}
        >
          {ITEM_TYPES.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
        <button style={s.trashBtn} onClick={onRemove} title="Remove item">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6l-1 14H6L5 6" />
            <path d="M10 11v6M14 11v6" />
            <path d="M9 6V4h6v2" />
          </svg>
        </button>
      </div>

      {/* Quantity + Weight */}
      <div style={s.grid2}>
        <div style={s.fieldGroup}>
          <label style={s.label}>Quantity</label>
          <input
            style={s.input}
            type="number"
            min="1"
            value={item.quantity}
            onChange={(e) => handleField('quantity', e.target.value)}
          />
        </div>
        <div style={s.fieldGroup}>
          <label style={s.label}>Weight (kg)</label>
          <input
            style={s.input}
            type="number"
            min="0"
            value={item.weight}
            onChange={(e) => handleField('weight', e.target.value)}
          />
        </div>
      </div>

      {/* Width + Height */}
      <div style={s.grid2}>
        <div style={s.fieldGroup}>
          <label style={s.label}>Width (cm)</label>
          <input
            style={s.input}
            type="number"
            min="0"
            value={item.width}
            onChange={(e) => handleField('width', e.target.value)}
          />
        </div>
        <div style={s.fieldGroup}>
          <label style={s.label}>Height (cm)</label>
          <input
            style={s.input}
            type="number"
            min="0"
            value={item.height}
            onChange={(e) => handleField('height', e.target.value)}
          />
        </div>
      </div>

      {/* Length */}
      <div style={s.fullField}>
        <div style={s.fieldGroup}>
          <label style={s.label}>Length (cm)</label>
          <input
            style={s.input}
            type="number"
            min="0"
            value={item.length}
            onChange={(e) => handleField('length', e.target.value)}
          />
        </div>
      </div>

      {/* Assign to Stop — driven by live stops array */}
      <div style={s.fieldGroup}>
        <label style={s.label}>Assign to Stop</label>
        <select
          style={{ ...s.select, width: '100%' }}
          value={item.stopId || ''}
          onChange={(e) => handleField('stopId', e.target.value)}
        >
          <option value="">No stop assigned</option>
          {(stops || []).map((st, idx) => (
            <option key={st.id} value={String(st.id)}>
              Stop {idx + 1} — {st.name}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
