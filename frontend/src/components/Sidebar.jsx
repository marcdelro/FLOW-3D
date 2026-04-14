/**
 * Sidebar.jsx
 *
 * Left sidebar with pill-tab navigation and per-tab content panels.
 * All shared state is owned by App.jsx and passed in as props.
 *
 * Tabs: Items | Route | Trucks | Options | Results
 */

import React, { useState } from 'react';
import FurnitureItemCard from './FurnitureItemCard.jsx';

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeId() {
  return Math.random().toString(36).slice(2, 9);
}

const TABS = ['Items', 'Route', 'Trucks', 'Options', 'Results'];

// Colors for new stops beyond the initial two
const STOP_PALETTE = [
  '#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6',
  '#ec4899', '#06b6d4', '#84cc16',
];

function nextStopColor(stops) {
  const used = new Set(stops.map((s) => s.color));
  for (const c of STOP_PALETTE) {
    if (!used.has(c)) return c;
  }
  return STOP_PALETTE[stops.length % STOP_PALETTE.length];
}

// ── Shared style atoms ────────────────────────────────────────────────────────

const s = {
  sidebar: {
    width: '300px',
    minWidth: '300px',
    height: '100%',
    background: '#ffffff',
    borderRight: '1px solid #e5e7eb',
    display: 'flex',
    flexDirection: 'column',
    fontFamily: 'system-ui, sans-serif',
    overflow: 'hidden',
  },
  tabBar: {
    display: 'flex',
    padding: '10px 8px 0',
    background: '#f9fafb',
    borderBottom: '1px solid #e5e7eb',
    gap: '1px',
    flexShrink: 0,
    flexWrap: 'wrap',
  },
  tabBtn: (active) => ({
    padding: '6px 10px',
    fontSize: '12px',
    fontWeight: active ? 600 : 400,
    borderRadius: '6px 6px 0 0',
    border: 'none',
    cursor: 'pointer',
    background: active ? '#ffffff' : 'transparent',
    color: active ? '#111827' : '#6b7280',
    boxShadow: active ? '0 -1px 3px rgba(0,0,0,0.08)' : 'none',
    transition: 'background 0.15s',
  }),
  body: {
    flex: 1,
    overflowY: 'auto',
    padding: '14px 12px',
  },
  sectionHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '10px',
  },
  sectionTitle: {
    fontSize: '14px',
    fontWeight: 700,
    color: '#111827',
  },
  iconRow: {
    display: 'flex',
    gap: '6px',
  },
  iconBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: '#9ca3af',
    padding: '2px',
    display: 'flex',
    alignItems: 'center',
  },
  buttonRow: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '8px',
    marginBottom: '8px',
  },
  outlineBtn: {
    border: '1px solid #d1d5db',
    borderRadius: '7px',
    padding: '7px 10px',
    fontSize: '12px',
    fontWeight: 500,
    background: '#ffffff',
    color: '#374151',
    cursor: 'pointer',
    textAlign: 'center',
  },
  helperText: {
    fontSize: '11px',
    color: '#9ca3af',
    marginBottom: '12px',
    lineHeight: 1.4,
  },
  label: {
    fontSize: '11px',
    color: '#6b7280',
    fontWeight: 500,
    marginBottom: '3px',
    display: 'block',
  },
  input: {
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    padding: '6px 8px',
    fontSize: '13px',
    width: '100%',
    boxSizing: 'border-box',
    outline: 'none',
    color: '#111827',
    background: '#fff',
  },
  select: {
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    padding: '6px 8px',
    fontSize: '13px',
    width: '100%',
    boxSizing: 'border-box',
    outline: 'none',
    color: '#111827',
    background: '#fff',
    cursor: 'pointer',
  },
  fieldGroup: {
    display: 'flex',
    flexDirection: 'column',
    marginBottom: '10px',
  },
  grid2: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '8px',
    marginBottom: '8px',
  },
  card: {
    background: '#ffffff',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    padding: '12px',
    marginBottom: '10px',
  },
  row: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  // Toggle switch
  toggleTrack: (on) => ({
    width: '38px',
    height: '22px',
    borderRadius: '11px',
    background: on ? '#2563eb' : '#d1d5db',
    position: 'relative',
    cursor: 'pointer',
    flexShrink: 0,
    transition: 'background 0.2s',
    border: 'none',
    outline: 'none',
  }),
  toggleThumb: (on) => ({
    position: 'absolute',
    top: '3px',
    left: on ? '18px' : '3px',
    width: '16px',
    height: '16px',
    borderRadius: '50%',
    background: '#ffffff',
    transition: 'left 0.2s',
    pointerEvents: 'none',
  }),
  sectionLabel: {
    fontSize: '10px',
    fontWeight: 700,
    color: '#9ca3af',
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    marginBottom: '8px',
    marginTop: '14px',
  },
  dot: (color) => ({
    width: '10px',
    height: '10px',
    borderRadius: '50%',
    background: color,
    flexShrink: 0,
  }),
  trashBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: '#ef4444',
    padding: '2px',
    display: 'flex',
    alignItems: 'center',
  },
  arrowBtn: {
    background: 'none',
    border: '1px solid #e5e7eb',
    borderRadius: '4px',
    cursor: 'pointer',
    color: '#6b7280',
    fontSize: '11px',
    padding: '1px 5px',
    lineHeight: 1,
  },
  badge: (color, bg) => ({
    fontSize: '10px',
    fontWeight: 600,
    color: color,
    background: bg,
    borderRadius: '10px',
    padding: '2px 7px',
    whiteSpace: 'nowrap',
  }),
  inputWithBadge: {
    display: 'flex',
    alignItems: 'center',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    overflow: 'hidden',
  },
  unitBadge: {
    padding: '0 8px',
    background: '#f3f4f6',
    color: '#6b7280',
    fontSize: '12px',
    height: '32px',
    display: 'flex',
    alignItems: 'center',
    borderLeft: '1px solid #d1d5db',
    flexShrink: 0,
  },
  inlineInput: {
    border: 'none',
    outline: 'none',
    padding: '6px 8px',
    fontSize: '13px',
    flex: 1,
    color: '#111827',
    background: '#fff',
    width: '100%',
    boxSizing: 'border-box',
  },
  darkBtn: {
    width: '100%',
    background: '#1f2937',
    color: '#ffffff',
    border: 'none',
    borderRadius: '8px',
    padding: '10px',
    fontSize: '13px',
    fontWeight: 600,
    cursor: 'pointer',
    marginTop: '16px',
    textAlign: 'center',
  },
  metricGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '8px',
    marginBottom: '12px',
  },
  metricCell: {
    background: '#f9fafb',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    padding: '10px',
    display: 'flex',
    flexDirection: 'column',
    gap: '3px',
  },
  metricVal: {
    fontSize: '18px',
    fontWeight: 700,
    color: '#111827',
  },
  metricLbl: {
    fontSize: '11px',
    color: '#6b7280',
  },
  progressBar: {
    height: '8px',
    borderRadius: '4px',
    background: '#e5e7eb',
    overflow: 'hidden',
    marginTop: '4px',
    marginBottom: '8px',
  },
  progressFill: (pct, color) => ({
    height: '100%',
    width: `${Math.min(100, Math.max(0, pct))}%`,
    background: color,
    borderRadius: '4px',
    transition: 'width 0.3s',
  }),
  itemRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '6px 0',
    borderBottom: '1px solid #f3f4f6',
  },
  stopRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 0',
    borderBottom: '1px solid #f3f4f6',
  },
};

// ── Toggle component ───────────────────────────────────────────────────────────

function Toggle({ on, onChange }) {
  return (
    <button
      style={s.toggleTrack(on)}
      onClick={() => onChange(!on)}
      role="switch"
      aria-checked={on}
    >
      <div style={s.toggleThumb(on)} />
    </button>
  );
}

// ── Trash icon ─────────────────────────────────────────────────────────────────

function TrashIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14H6L5 6" />
      <path d="M10 11v6M14 11v6" />
      <path d="M9 6V4h6v2" />
    </svg>
  );
}

// ── Items tab ─────────────────────────────────────────────────────────────────

function ItemsTab({ items, setItems, stops }) {
  function addItem() {
    setItems((prev) => [
      ...prev,
      {
        id: makeId(),
        type: 'Chair',
        quantity: 1,
        weight: 0,
        width: 0,
        height: 0,
        length: 0,
        stopId: '',
      },
    ]);
  }

  function removeItem(id) {
    setItems((prev) => prev.filter((item) => item.id !== id));
  }

  function updateItem(id, updated) {
    setItems((prev) => prev.map((item) => (item.id === id ? updated : item)));
  }

  return (
    <>
      <div style={s.sectionHeader}>
        <span style={s.sectionTitle}>Furniture Items</span>
        <div style={s.iconRow}>
          <button style={s.iconBtn} title="Filter">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
            </svg>
          </button>
          <button style={s.iconBtn} title="Copy">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
            </svg>
          </button>
        </div>
      </div>

      <div style={s.buttonRow}>
        <button style={s.outlineBtn} onClick={addItem}>+ Add Item</button>
        <button style={s.outlineBtn}>&#8593; Import CSV/JSON</button>
      </div>

      <p style={s.helperText}>CSV format: type, quantity, width, height, length, weight</p>

      {items.map((item, idx) => (
        <FurnitureItemCard
          key={item.id}
          item={item}
          index={idx}
          stops={stops}
          onChange={(updated) => updateItem(item.id, updated)}
          onRemove={() => removeItem(item.id)}
        />
      ))}
    </>
  );
}

// ── Route tab ─────────────────────────────────────────────────────────────────

function RouteTab({ stops, setStops, lifoEnabled, setLifoEnabled }) {
  function addStop() {
    const newId = stops.length > 0 ? Math.max(...stops.map((s) => s.id)) + 1 : 1;
    setStops((prev) => [
      ...prev,
      {
        id: newId,
        name: `Stop ${newId}`,
        address: '',
        color: nextStopColor(prev),
      },
    ]);
  }

  function removeStop(id) {
    setStops((prev) => prev.filter((s) => s.id !== id));
  }

  function moveStop(idx, dir) {
    setStops((prev) => {
      const arr = [...prev];
      const target = idx + dir;
      if (target < 0 || target >= arr.length) return prev;
      [arr[idx], arr[target]] = [arr[target], arr[idx]];
      return arr;
    });
  }

  function updateStop(id, field, value) {
    setStops((prev) => prev.map((s) => (s.id === id ? { ...s, [field]: value } : s)));
  }

  function stopBadgeLabel(idx, total) {
    if (idx === 0) return { label: '1st Delivery (loaded last)', color: '#dc2626', bg: '#fee2e2' };
    if (idx === total - 1) return { label: 'Last Delivery (loaded first)', color: '#2563eb', bg: '#dbeafe' };
    return { label: 'Middle Delivery', color: '#6b7280', bg: '#f3f4f6' };
  }

  return (
    <>
      <div style={s.sectionHeader}>
        <span style={s.sectionTitle}>Route Definition</span>
        <button style={s.outlineBtn} onClick={addStop}>+ Add Stop</button>
      </div>

      {/* LIFO Mode card */}
      <div style={s.card}>
        <div style={s.row}>
          <div>
            <div style={{ fontSize: '13px', fontWeight: 700, color: '#111827' }}>LIFO Mode</div>
            <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '2px' }}>
              Last In, First Out — items for Stop 1 loaded last
            </div>
          </div>
          <Toggle on={lifoEnabled} onChange={setLifoEnabled} />
        </div>
      </div>

      {/* LIFO info banner */}
      {lifoEnabled && (
        <div style={{
          background: '#fffbeb',
          border: '1px solid #fde68a',
          borderRadius: '7px',
          padding: '10px 12px',
          marginBottom: '12px',
          fontSize: '12px',
          color: '#92400e',
          display: 'flex',
          gap: '8px',
          alignItems: 'flex-start',
        }}>
          <span style={{ flexShrink: 0 }}>&#9888;</span>
          <span>LIFO active: Items for Stop 1 (first delivery) are packed last — closest to the truck door for easy unloading.</span>
        </div>
      )}

      <div style={s.sectionLabel}>Delivery Stops (Delivery Order)</div>

      {stops.map((stop, idx) => {
        const badge = stopBadgeLabel(idx, stops.length);
        return (
          <div key={stop.id} style={{ ...s.card, marginBottom: '8px' }}>
            {/* Stop header row */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <button style={s.arrowBtn} onClick={() => moveStop(idx, -1)} disabled={idx === 0}>&#8593;</button>
                <button style={s.arrowBtn} onClick={() => moveStop(idx, 1)} disabled={idx === stops.length - 1}>&#8595;</button>
              </div>
              <div style={s.dot(stop.color)} />
              <span style={{ fontSize: '13px', fontWeight: 700, color: '#111827', flex: 1 }}>
                Stop {idx + 1}
              </span>
              <span style={s.badge(badge.color, badge.bg)}>{badge.label}</span>
              <button style={s.trashBtn} onClick={() => removeStop(stop.id)}>
                <TrashIcon />
              </button>
            </div>
            {/* Inputs */}
            <div style={s.grid2}>
              <div>
                <label style={s.label}>Stop Name</label>
                <input
                  style={s.input}
                  value={stop.name}
                  onChange={(e) => updateStop(stop.id, 'name', e.target.value)}
                />
              </div>
              <div>
                <label style={s.label}>Address</label>
                <input
                  style={s.input}
                  value={stop.address}
                  onChange={(e) => updateStop(stop.id, 'address', e.target.value)}
                />
              </div>
            </div>
          </div>
        );
      })}

      {/* Loading Order summary */}
      <div style={s.sectionLabel}>Loading Order (LIFO)</div>
      <div style={{
        background: '#f9fafb',
        border: '1px solid #e5e7eb',
        borderRadius: '8px',
        padding: '10px 12px',
        marginBottom: '10px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '4px', marginBottom: '6px' }}>
          {[...stops].reverse().map((stop, idx) => (
            <React.Fragment key={stop.id}>
              <span style={{
                fontSize: '11px',
                fontWeight: 600,
                color: '#ffffff',
                background: stop.color,
                borderRadius: '10px',
                padding: '2px 8px',
              }}>
                {stop.name}
              </span>
              {idx < stops.length - 1 && (
                <span style={{ fontSize: '11px', color: '#9ca3af' }}>&#8594;</span>
              )}
            </React.Fragment>
          ))}
        </div>
        <div style={{ fontSize: '11px', color: '#6b7280' }}>
          Delivery order: {stops.map((s, i) => `${s.name}`).join(' \u2192 ')}
        </div>
      </div>
    </>
  );
}

// ── Trucks tab ────────────────────────────────────────────────────────────────

const VEHICLE_PRESETS = {
  Custom:         null,
  'Standard 20ft': { width: 234, height: 239, length: 590,  maxWeight: 21700, quantity: 1 },
  'Standard 40ft': { width: 235, height: 239, length: 1200, maxWeight: 26700, quantity: 1 },
};

function TrucksTab({ truck, setTruck }) {
  const [preset, setPreset] = useState('Custom');

  function handlePreset(name) {
    setPreset(name);
    if (VEHICLE_PRESETS[name]) {
      setTruck(VEHICLE_PRESETS[name]);
    }
  }

  function handleField(field, value) {
    setPreset('Custom');
    setTruck((prev) => ({ ...prev, [field]: Number(value) }));
  }

  return (
    <>
      <div style={s.sectionHeader}>
        <span style={s.sectionTitle}>Vehicle Configuration</span>
      </div>

      <div style={s.fieldGroup}>
        <label style={s.label}>Select Vehicle Type</label>
        <select style={s.select} value={preset} onChange={(e) => handlePreset(e.target.value)}>
          {Object.keys(VEHICLE_PRESETS).map((k) => (
            <option key={k} value={k}>{k}</option>
          ))}
        </select>
      </div>

      <div style={s.grid2}>
        <div>
          <label style={s.label}>Quantity</label>
          <input
            style={s.input}
            type="number"
            min="1"
            value={truck.quantity}
            onChange={(e) => handleField('quantity', e.target.value)}
          />
        </div>
        <div>
          <label style={s.label}>Max. Weight</label>
          <div style={s.inputWithBadge}>
            <input
              style={s.inlineInput}
              type="number"
              min="0"
              value={truck.maxWeight}
              onChange={(e) => handleField('maxWeight', e.target.value)}
            />
            <span style={s.unitBadge}>kg</span>
          </div>
        </div>
      </div>

      {[
        { field: 'width',  label: 'Width (X)',  unit: 'cm' },
        { field: 'height', label: 'Height (Y)', unit: 'cm' },
        { field: 'length', label: 'Length (Z)', unit: 'cm' },
      ].map(({ field, label, unit }) => (
        <div key={field} style={s.fieldGroup}>
          <label style={s.label}>{label}</label>
          <div style={s.inputWithBadge}>
            <input
              style={s.inlineInput}
              type="number"
              min="0"
              value={truck[field]}
              onChange={(e) => handleField(field, e.target.value)}
            />
            <span style={s.unitBadge}>{unit}</span>
          </div>
        </div>
      ))}
    </>
  );
}

// ── Options tab ───────────────────────────────────────────────────────────────

const CONSTRAINT_DEFS = [
  {
    key: 'lifo',
    icon: '\u{1F503}',
    title: 'Enforce LIFO (Last-In, First-Out)',
    desc: "Items for first stop are packed last — closest to the truck door for easy unloading",
    iconColor: '#2563eb',
    iconBg: '#dbeafe',
  },
  {
    key: 'orientation',
    icon: '\u267B',
    title: 'Enforce Orientation Rules',
    desc: "Prevent rotating items during packing — respects 'This Side Up' markings",
    iconColor: '#16a34a',
    iconBg: '#dcfce7',
  },
  {
    key: 'fragility',
    icon: '\u26A0',
    title: 'Enforce Fragility Rules',
    desc: 'Fragile items placed on top layer and never stacked upon by heavier items',
    iconColor: '#d97706',
    iconBg: '#fef3c7',
  },
  {
    key: 'stacking',
    icon: '\u{1F4E6}',
    title: 'Allow Stacking',
    desc: 'Enable multi-layer vertical stacking of compatible lightweight items',
    iconColor: '#7c3aed',
    iconBg: '#ede9fe',
  },
  {
    key: 'weightDist',
    icon: '\u2696',
    title: 'Weight Distribution',
    desc: 'Balance heavy items evenly across left/right truck floor',
    iconColor: '#db2777',
    iconBg: '#fce7f3',
  },
];

function OptionsTab({ constraints, setConstraints }) {
  function toggle(key) {
    setConstraints((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  return (
    <>
      <div style={s.sectionHeader}>
        <span style={s.sectionTitle}>Constraint Management</span>
      </div>
      <p style={{ fontSize: '12px', color: '#6b7280', marginTop: 0, marginBottom: '14px' }}>
        Rules applied during packing optimisation.
      </p>

      {CONSTRAINT_DEFS.map(({ key, icon, title, desc, iconColor, iconBg }) => (
        <div key={key} style={{ ...s.card, marginBottom: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              background: iconBg,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '16px',
              flexShrink: 0,
            }}>
              {icon}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '13px', fontWeight: 600, color: '#111827' }}>{title}</div>
              <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '2px', lineHeight: 1.4 }}>{desc}</div>
            </div>
            <Toggle on={constraints[key]} onChange={() => toggle(key)} />
          </div>
        </div>
      ))}

      <button style={s.darkBtn}>
        &#9889; Optimize Loading Plan
      </button>
      <p style={{ fontSize: '11px', color: '#9ca3af', textAlign: 'center', marginTop: '6px' }}>
        Runs Hybrid Switching Logic — auto-selects ILP or FFD solver
      </p>
    </>
  );
}

// ── Results tab ───────────────────────────────────────────────────────────────

function ResultsTab({ items, truck, stops, lifoEnabled }) {
  // Derived metrics
  const truckVol = (truck.width / 100) * (truck.height / 100) * (truck.length / 100); // m³
  const totalItemVol = items.reduce((acc, it) => {
    const qty = Number(it.quantity) || 1;
    const vol = (Number(it.width) / 100) * (Number(it.height) / 100) * (Number(it.length) / 100);
    return acc + qty * vol;
  }, 0);
  const totalWeight = items.reduce((acc, it) => acc + (Number(it.weight) || 0) * (Number(it.quantity) || 1), 0);

  const spaceUsedPct = truckVol > 0 ? Math.round((totalItemVol / truckVol) * 100) : 0;
  const weightUsedPct = truck.maxWeight > 0 ? Math.round((totalWeight / truck.maxWeight) * 100) : 0;

  function exportJSON() {
    const blob = new Blob([JSON.stringify({ truck, stops, items }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'flow3d-blueprint.json';
    a.click();
    URL.revokeObjectURL(url);
  }

  // Group items by stopId
  const stopMap = {};
  stops.forEach((st) => { stopMap[String(st.id)] = st; });
  const stopGroups = {};
  let unassignedCount = 0;
  items.forEach((it) => {
    const qty = Number(it.quantity) || 1;
    const w = Number(it.weight) || 0;
    if (!it.stopId) {
      unassignedCount += qty;
    } else {
      if (!stopGroups[it.stopId]) stopGroups[it.stopId] = { count: 0, kg: 0 };
      stopGroups[it.stopId].count += qty;
      stopGroups[it.stopId].kg += qty * w;
    }
  });

  return (
    <>
      {/* Header row */}
      <div style={{ ...s.sectionHeader, alignItems: 'flex-start' }}>
        <span style={s.sectionTitle}>Performance Metrics</span>
        <span style={s.badge('#2563eb', '#dbeafe')}>&#x1F52E; ILP (Exact) (auto)</span>
      </div>

      {/* 2x2 metrics grid */}
      <div style={s.metricGrid}>
        <div style={s.metricCell}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <div style={{ ...s.dot('#3b82f6'), width: '8px', height: '8px' }} />
            <span style={s.metricLbl}>Space Used</span>
          </div>
          <div style={s.metricVal}>{spaceUsedPct}%</div>
        </div>
        <div style={s.metricCell}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <div style={{ ...s.dot('#8b5cf6'), width: '8px', height: '8px' }} />
            <span style={s.metricLbl}>Weight Used</span>
          </div>
          <div style={s.metricVal}>{weightUsedPct}%</div>
        </div>
        <div style={s.metricCell}>
          <span style={s.metricLbl}>Total Items</span>
          <div style={s.metricVal}>{items.length}</div>
        </div>
        <div style={s.metricCell}>
          <span style={s.metricLbl}>Solver Time</span>
          <div style={s.metricVal}>0.15 s</div>
        </div>
      </div>

      {/* Weight utilization bar */}
      <div style={{ marginBottom: '12px' }}>
        <div style={{ ...s.row, marginBottom: '4px' }}>
          <span style={{ fontSize: '12px', color: '#374151', fontWeight: 500 }}>Weight Utilization</span>
          <span style={{ fontSize: '11px', color: '#6b7280' }}>
            {totalWeight.toLocaleString()} / {truck.maxWeight.toLocaleString()} kg
          </span>
        </div>
        <div style={s.progressBar}>
          <div style={s.progressFill(weightUsedPct, '#8b5cf6')} />
        </div>
      </div>

      {/* Volume + Packing row */}
      <div style={s.grid2}>
        <div style={s.metricCell}>
          <span style={s.metricLbl}>Volume Used</span>
          <div style={{ fontSize: '14px', fontWeight: 700, color: '#111827' }}>
            {totalItemVol.toFixed(2)} m&sup3;
          </div>
        </div>
        <div style={s.metricCell}>
          <span style={s.metricLbl}>Packing</span>
          <div style={{ fontSize: '14px', fontWeight: 700, color: '#16a34a' }}>100%</div>
        </div>
      </div>

      {/* LIFO card */}
      {lifoEnabled && (
        <div style={{ ...s.card, display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '8px' }}>
          <span style={{ fontSize: '13px', fontWeight: 600, color: '#111827' }}>LIFO</span>
          <span style={{ fontSize: '13px', fontWeight: 700, color: '#16a34a' }}>Pass</span>
        </div>
      )}

      {/* Itemized Loading List */}
      <div style={s.sectionLabel}>Itemized Loading List</div>
      <div style={{ ...s.row, marginBottom: '4px' }}>
        <span style={{ fontSize: '12px', fontWeight: 600, color: '#111827' }}>Itemized Loading List</span>
        <span style={{ fontSize: '11px', color: '#6b7280' }}>LIFO order</span>
      </div>
      <p style={{ fontSize: '11px', color: '#9ca3af', marginTop: 0, marginBottom: '8px', lineHeight: 1.4 }}>
        Load items in this exact sequence — Step 1 goes deepest into the truck.
      </p>
      {items.map((it, idx) => {
        const stopEntry = it.stopId ? stopMap[String(it.stopId)] : null;
        return (
          <div key={it.id} style={s.itemRow}>
            <span style={{ fontSize: '11px', color: '#9ca3af', minWidth: '30px' }}>
              #{String(idx + 1).padStart(3, '0')}
            </span>
            <span style={{ fontSize: '13px', fontWeight: 600, color: '#111827', flex: 1 }}>{it.type}</span>
            <span style={{ fontSize: '11px', color: '#6b7280', marginRight: '4px' }}>
              {it.width}&times;{it.height}&times;{it.length}&thinsp;cm &middot; {it.weight}&thinsp;kg
            </span>
            <span style={{ fontSize: '11px', color: '#6b7280' }}>&#8593;</span>
            {stopEntry ? (
              <span style={s.badge('#ffffff', stopEntry.color)}>{stopEntry.name}</span>
            ) : (
              <span style={s.badge('#6b7280', '#f3f4f6')}>Unassigned</span>
            )}
          </div>
        );
      })}

      {/* Stop Breakdown */}
      <div style={{ ...s.sectionLabel, marginTop: '16px' }}>Stop Breakdown</div>
      {stops.map((stop) => {
        const g = stopGroups[String(stop.id)] || { count: 0, kg: 0 };
        return (
          <div key={stop.id} style={s.stopRow}>
            <div style={s.dot(stop.color)} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '13px', fontWeight: 600, color: '#111827' }}>
                {stop.name} — {stop.address || 'No address'}
              </div>
              <div style={{ fontSize: '11px', color: '#9ca3af' }}>{g.count} items</div>
            </div>
            <div style={{ fontSize: '12px', color: '#374151', fontWeight: 500 }}>
              {g.kg.toLocaleString()} kg
            </div>
          </div>
        );
      })}
      <div style={{ fontSize: '12px', color: '#9ca3af', padding: '8px 0' }}>
        Unassigned items: {unassignedCount} items
      </div>

      {/* Export Options */}
      <div style={s.sectionLabel}>Export Options</div>
      <button style={{ ...s.outlineBtn, width: '100%', marginBottom: '8px', textAlign: 'left' }}>
        &#x1F4C4; Export Delivery Manifest (PDF)
      </button>
      <button
        style={{ ...s.outlineBtn, width: '100%', textAlign: 'left' }}
        onClick={exportJSON}
      >
        &#x1F4CB; Export 3D Blueprint (JSON)
      </button>
    </>
  );
}

// ── Sidebar root ──────────────────────────────────────────────────────────────

export default function Sidebar({
  items, setItems,
  stops, setStops, lifoEnabled, setLifoEnabled,
  truck, setTruck,
  constraints, setConstraints,
}) {
  const [activeTab, setActiveTab] = useState('Items');

  return (
    <aside style={s.sidebar}>
      <div style={s.tabBar}>
        {TABS.map((tab) => (
          <button
            key={tab}
            style={s.tabBtn(activeTab === tab)}
            onClick={() => setActiveTab(tab)}
          >
            {tab}
          </button>
        ))}
      </div>

      <div style={s.body}>
        {activeTab === 'Items' && (
          <ItemsTab items={items} setItems={setItems} stops={stops} />
        )}
        {activeTab === 'Route' && (
          <RouteTab
            stops={stops}
            setStops={setStops}
            lifoEnabled={lifoEnabled}
            setLifoEnabled={setLifoEnabled}
          />
        )}
        {activeTab === 'Trucks' && (
          <TrucksTab truck={truck} setTruck={setTruck} />
        )}
        {activeTab === 'Options' && (
          <OptionsTab constraints={constraints} setConstraints={setConstraints} />
        )}
        {activeTab === 'Results' && (
          <ResultsTab
            items={items}
            truck={truck}
            stops={stops}
            lifoEnabled={lifoEnabled}
          />
        )}
      </div>
    </aside>
  );
}
