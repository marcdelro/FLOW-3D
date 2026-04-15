/**
 * Sidebar.jsx
 *
 * Left sidebar with pill-tab navigation and per-tab content panels.
 * All shared state is owned by App.jsx and passed in as props.
 * Themed via the `theme` prop (token object from theme.js) and `themeName`.
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

// ── Toggle component ──────────────────────────────────────────────────────────

function Toggle({ on, onChange, t }) {
  return (
    <button
      style={{
        width: '38px',
        height: '22px',
        borderRadius: '11px',
        background: on ? t.toggleOn : t.toggleOff,
        position: 'relative',
        cursor: 'pointer',
        flexShrink: 0,
        transition: 'background 0.2s',
        border: 'none',
        outline: 'none',
      }}
      onClick={() => onChange(!on)}
      role="switch"
      aria-checked={on}
    >
      <div style={{
        position: 'absolute',
        top: '3px',
        left: on ? '18px' : '3px',
        width: '16px',
        height: '16px',
        borderRadius: '50%',
        background: t.toggleThumb,
        transition: 'left 0.2s',
        pointerEvents: 'none',
      }} />
    </button>
  );
}

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

function ItemsTab({ items, setItems, stops, t }) {
  function addItem() {
    setItems((prev) => [
      ...prev,
      { id: makeId(), type: 'Chair', quantity: 1, weight: 0, width: 0, height: 0, length: 0, stopId: '' },
    ]);
  }

  function removeItem(id) {
    setItems((prev) => prev.filter((item) => item.id !== id));
  }

  function updateItem(id, updated) {
    setItems((prev) => prev.map((item) => (item.id === id ? updated : item)));
  }

  const sectionHeader = {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px',
  };
  const sectionTitle = { fontSize: '13px', fontWeight: 700, color: t.text };
  const iconBtn = { background: 'none', border: 'none', cursor: 'pointer', color: t.textMuted, padding: '2px', display: 'flex', alignItems: 'center', borderRadius: '4px' };
  const buttonRow = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '8px' };
  const outlineBtn = { border: `1px solid ${t.border}`, borderRadius: '8px', padding: '7px 10px', fontSize: '12px', fontWeight: 600, background: t.cardBg, color: t.textSecondary, cursor: 'pointer', textAlign: 'center', transition: 'background 0.15s, border-color 0.15s' };
  const helperText = { fontSize: '11px', color: t.textMuted, marginBottom: '12px', lineHeight: 1.4 };

  return (
    <>
      <div style={sectionHeader}>
        <span style={sectionTitle}>Furniture Items</span>
        <div style={{ display: 'flex', gap: '4px' }}>
          <button style={iconBtn} title="Filter">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
            </svg>
          </button>
          <button style={iconBtn} title="Copy">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
            </svg>
          </button>
        </div>
      </div>

      <div style={buttonRow}>
        <button style={outlineBtn} onClick={addItem}>+ Add Item</button>
        <button style={outlineBtn}>&#8593; Import CSV</button>
      </div>

      <p style={helperText}>CSV format: type, qty, width, height, length, weight</p>

      {items.map((item, idx) => (
        <FurnitureItemCard
          key={item.id}
          item={item}
          index={idx}
          stops={stops}
          onChange={(updated) => updateItem(item.id, updated)}
          onRemove={() => removeItem(item.id)}
          theme={t}
        />
      ))}
    </>
  );
}

// ── Route tab ─────────────────────────────────────────────────────────────────

function RouteTab({ stops, setStops, lifoEnabled, setLifoEnabled, t }) {
  function addStop() {
    const newId = stops.length > 0 ? Math.max(...stops.map((s) => s.id)) + 1 : 1;
    setStops((prev) => [
      ...prev,
      { id: newId, name: `Stop ${newId}`, address: '', color: nextStopColor(prev) },
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
    if (idx === 0) return { label: '1st Delivery', color: '#ef4444', bg: 'rgba(239,68,68,0.12)' };
    if (idx === total - 1) return { label: 'Last Delivery', color: '#3b82f6', bg: 'rgba(59,130,246,0.12)' };
    return { label: 'Middle', color: t.textMuted, bg: t.bgTertiary };
  }

  const sectionHeader = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' };
  const sectionTitle = { fontSize: '13px', fontWeight: 700, color: t.text };
  const outlineBtn = { border: `1px solid ${t.border}`, borderRadius: '8px', padding: '6px 12px', fontSize: '12px', fontWeight: 600, background: t.cardBg, color: t.textSecondary, cursor: 'pointer' };
  const card = { background: t.cardBg, border: `1px solid ${t.border}`, borderRadius: '10px', padding: '12px', marginBottom: '8px' };
  const label = { fontSize: '11px', color: t.textMuted, fontWeight: 500, marginBottom: '3px', display: 'block' };
  const input = { border: `1px solid ${t.border}`, borderRadius: '6px', padding: '6px 8px', fontSize: '12px', width: '100%', boxSizing: 'border-box', outline: 'none', color: t.text, background: t.inputBg };
  const sectionLabel = { fontSize: '10px', fontWeight: 700, color: t.textMuted, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '8px', marginTop: '14px' };
  const arrowBtn = { background: 'none', border: `1px solid ${t.border}`, borderRadius: '4px', cursor: 'pointer', color: t.textSecondary, fontSize: '11px', padding: '1px 5px', lineHeight: 1 };
  const trashBtn = { background: 'none', border: 'none', cursor: 'pointer', color: t.danger, padding: '2px', display: 'flex', alignItems: 'center' };

  return (
    <>
      <div style={sectionHeader}>
        <span style={sectionTitle}>Route Definition</span>
        <button style={outlineBtn} onClick={addStop}>+ Add Stop</button>
      </div>

      {/* LIFO Mode card */}
      <div style={card}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: '13px', fontWeight: 700, color: t.text }}>LIFO Mode</div>
            <div style={{ fontSize: '11px', color: t.textMuted, marginTop: '2px' }}>
              Last In, First Out — items for Stop 1 loaded last
            </div>
          </div>
          <Toggle on={lifoEnabled} onChange={setLifoEnabled} t={t} />
        </div>
      </div>

      {/* LIFO info banner */}
      {lifoEnabled && (
        <div style={{
          background: 'rgba(245,158,11,0.1)',
          border: '1px solid rgba(245,158,11,0.25)',
          borderRadius: '8px',
          padding: '10px 12px',
          marginBottom: '12px',
          fontSize: '12px',
          color: '#f59e0b',
          display: 'flex',
          gap: '8px',
          alignItems: 'flex-start',
        }}>
          <span style={{ flexShrink: 0 }}>&#9888;</span>
          <span>LIFO active: Stop 1 items packed last — closest to the truck door.</span>
        </div>
      )}

      <div style={sectionLabel}>Delivery Stops</div>

      {stops.map((stop, idx) => {
        const badge = stopBadgeLabel(idx, stops.length);
        return (
          <div key={stop.id} style={card}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <button style={arrowBtn} onClick={() => moveStop(idx, -1)} disabled={idx === 0}>&#8593;</button>
                <button style={arrowBtn} onClick={() => moveStop(idx, 1)} disabled={idx === stops.length - 1}>&#8595;</button>
              </div>
              <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: stop.color, flexShrink: 0, boxShadow: `0 0 4px ${stop.color}88` }} />
              <span style={{ fontSize: '13px', fontWeight: 700, color: t.text, flex: 1 }}>Stop {idx + 1}</span>
              <span style={{ fontSize: '10px', fontWeight: 600, color: badge.color, background: badge.bg, borderRadius: '10px', padding: '2px 7px' }}>{badge.label}</span>
              <button style={trashBtn} onClick={() => removeStop(stop.id)}><TrashIcon /></button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <div>
                <label style={label}>Stop Name</label>
                <input style={input} value={stop.name} onChange={(e) => updateStop(stop.id, 'name', e.target.value)} />
              </div>
              <div>
                <label style={label}>Address</label>
                <input style={input} value={stop.address} onChange={(e) => updateStop(stop.id, 'address', e.target.value)} />
              </div>
            </div>
          </div>
        );
      })}

      <div style={sectionLabel}>Loading Order (LIFO)</div>
      <div style={{ background: t.bgTertiary, border: `1px solid ${t.border}`, borderRadius: '8px', padding: '10px 12px', marginBottom: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '4px', marginBottom: '6px' }}>
          {[...stops].reverse().map((stop, idx) => (
            <React.Fragment key={stop.id}>
              <span style={{ fontSize: '11px', fontWeight: 600, color: '#fff', background: stop.color, borderRadius: '10px', padding: '2px 8px' }}>{stop.name}</span>
              {idx < stops.length - 1 && <span style={{ fontSize: '11px', color: t.textMuted }}>&#8594;</span>}
            </React.Fragment>
          ))}
        </div>
        <div style={{ fontSize: '11px', color: t.textMuted }}>
          Delivery order: {stops.map((s) => s.name).join(' \u2192 ')}
        </div>
      </div>
    </>
  );
}

// ── Trucks tab ────────────────────────────────────────────────────────────────

const VEHICLE_PRESETS = {
  Custom:           null,
  'Standard 20ft': { width: 234, height: 239, length: 590,  maxWeight: 21700, quantity: 1 },
  'Standard 40ft': { width: 235, height: 239, length: 1200, maxWeight: 26700, quantity: 1 },
};

function TrucksTab({ truck, setTruck, t }) {
  const [preset, setPreset] = useState('Custom');

  function handlePreset(name) {
    setPreset(name);
    if (VEHICLE_PRESETS[name]) setTruck(VEHICLE_PRESETS[name]);
  }

  function handleField(field, value) {
    setPreset('Custom');
    setTruck((prev) => ({ ...prev, [field]: Number(value) }));
  }

  const sectionTitle = { fontSize: '13px', fontWeight: 700, color: t.text };
  const label = { fontSize: '11px', color: t.textMuted, fontWeight: 500, marginBottom: '3px', display: 'block' };
  const input = { border: `1px solid ${t.border}`, borderRadius: '6px', padding: '6px 8px', fontSize: '12px', width: '100%', boxSizing: 'border-box', outline: 'none', color: t.text, background: t.inputBg };
  const select = { border: `1px solid ${t.border}`, borderRadius: '6px', padding: '6px 8px', fontSize: '12px', width: '100%', boxSizing: 'border-box', outline: 'none', color: t.text, background: t.inputBg, cursor: 'pointer' };
  const fieldGroup = { display: 'flex', flexDirection: 'column', marginBottom: '10px' };
  const inputWithBadge = { display: 'flex', alignItems: 'center', border: `1px solid ${t.border}`, borderRadius: '6px', overflow: 'hidden' };
  const inlineInput = { border: 'none', outline: 'none', padding: '6px 8px', fontSize: '12px', flex: 1, color: t.text, background: t.inputBg, width: '100%', boxSizing: 'border-box' };
  const unitBadge = { padding: '0 8px', background: t.unitBadgeBg, color: t.textMuted, fontSize: '11px', height: '32px', display: 'flex', alignItems: 'center', borderLeft: `1px solid ${t.border}`, flexShrink: 0 };

  return (
    <>
      <div style={{ marginBottom: '12px' }}>
        <span style={sectionTitle}>Vehicle Configuration</span>
      </div>

      <div style={fieldGroup}>
        <label style={label}>Select Vehicle Type</label>
        <select style={select} value={preset} onChange={(e) => handlePreset(e.target.value)}>
          {Object.keys(VEHICLE_PRESETS).map((k) => <option key={k} value={k}>{k}</option>)}
        </select>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '8px' }}>
        <div>
          <label style={label}>Quantity</label>
          <input style={input} type="number" min="1" value={truck.quantity} onChange={(e) => handleField('quantity', e.target.value)} />
        </div>
        <div>
          <label style={label}>Max. Weight</label>
          <div style={inputWithBadge}>
            <input style={inlineInput} type="number" min="0" value={truck.maxWeight} onChange={(e) => handleField('maxWeight', e.target.value)} />
            <span style={unitBadge}>kg</span>
          </div>
        </div>
      </div>

      {[
        { field: 'width',  label: 'Width (X)',  unit: 'cm' },
        { field: 'height', label: 'Height (Y)', unit: 'cm' },
        { field: 'length', label: 'Length (Z)', unit: 'cm' },
      ].map(({ field, label: lbl, unit }) => (
        <div key={field} style={fieldGroup}>
          <label style={label}>{lbl}</label>
          <div style={inputWithBadge}>
            <input style={inlineInput} type="number" min="0" value={truck[field]} onChange={(e) => handleField(field, e.target.value)} />
            <span style={unitBadge}>{unit}</span>
          </div>
        </div>
      ))}
    </>
  );
}

// ── Options tab ───────────────────────────────────────────────────────────────

const CONSTRAINT_DEFS = [
  { key: 'lifo',        icon: '\u{1F503}', title: 'Enforce LIFO',              desc: "Items for first stop packed last — closest to truck door", iconColor: '#3b82f6', iconBg: 'rgba(59,130,246,0.12)' },
  { key: 'orientation', icon: '\u267B',    title: 'Enforce Orientation Rules',  desc: "Prevent rotation — respects 'This Side Up' markings",      iconColor: '#10b981', iconBg: 'rgba(16,185,129,0.12)' },
  { key: 'fragility',   icon: '\u26A0',    title: 'Enforce Fragility Rules',    desc: 'Fragile items placed on top, never stacked upon',           iconColor: '#f59e0b', iconBg: 'rgba(245,158,11,0.12)'  },
  { key: 'stacking',    icon: '\u{1F4E6}', title: 'Allow Stacking',            desc: 'Enable multi-layer stacking of lightweight items',          iconColor: '#a78bfa', iconBg: 'rgba(167,139,250,0.12)' },
  { key: 'weightDist',  icon: '\u2696',    title: 'Weight Distribution',        desc: 'Balance heavy items evenly across left/right truck floor',  iconColor: '#f43f5e', iconBg: 'rgba(244,63,94,0.12)'   },
];

function OptionsTab({ constraints, setConstraints, t }) {
  function toggle(key) {
    setConstraints((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  const sectionTitle = { fontSize: '13px', fontWeight: 700, color: t.text };
  const card = { background: t.cardBg, border: `1px solid ${t.border}`, borderRadius: '10px', padding: '12px', marginBottom: '8px' };

  const optimizeBtn = {
    width: '100%',
    background: t.accent,
    color: '#ffffff',
    border: 'none',
    borderRadius: '10px',
    padding: '11px',
    fontSize: '13px',
    fontWeight: 700,
    cursor: 'pointer',
    marginTop: '16px',
    textAlign: 'center',
    boxShadow: `0 4px 16px ${t.accent}44`,
    transition: 'opacity 0.15s',
  };

  return (
    <>
      <div style={{ marginBottom: '4px' }}>
        <span style={sectionTitle}>Constraint Management</span>
      </div>
      <p style={{ fontSize: '12px', color: t.textMuted, marginTop: '4px', marginBottom: '14px' }}>
        Rules applied during packing optimisation.
      </p>

      {CONSTRAINT_DEFS.map(({ key, icon, title, desc, iconColor, iconBg }) => (
        <div key={key} style={card}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '15px', flexShrink: 0 }}>
              {icon}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '12px', fontWeight: 600, color: t.text }}>{title}</div>
              <div style={{ fontSize: '11px', color: t.textMuted, marginTop: '2px', lineHeight: 1.4 }}>{desc}</div>
            </div>
            <Toggle on={constraints[key]} onChange={() => toggle(key)} t={t} />
          </div>
        </div>
      ))}

      <button style={optimizeBtn} onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.85'; }} onMouseLeave={(e) => { e.currentTarget.style.opacity = '1'; }}>
        &#9889; Optimize Loading Plan
      </button>
      <p style={{ fontSize: '11px', color: t.textMuted, textAlign: 'center', marginTop: '6px' }}>
        Runs Hybrid Switching Logic — auto-selects ILP or FFD
      </p>
    </>
  );
}

// ── Results tab ───────────────────────────────────────────────────────────────

function ResultsTab({ items, truck, stops, lifoEnabled, t }) {
  const truckVol = (truck.width / 100) * (truck.height / 100) * (truck.length / 100);
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
    a.href = url; a.download = 'flow3d-blueprint.json'; a.click();
    URL.revokeObjectURL(url);
  }

  const stopMap = {};
  stops.forEach((st) => { stopMap[String(st.id)] = st; });
  const stopGroups = {};
  let unassignedCount = 0;
  items.forEach((it) => {
    const qty = Number(it.quantity) || 1;
    const w = Number(it.weight) || 0;
    if (!it.stopId) { unassignedCount += qty; }
    else {
      if (!stopGroups[it.stopId]) stopGroups[it.stopId] = { count: 0, kg: 0 };
      stopGroups[it.stopId].count += qty;
      stopGroups[it.stopId].kg += qty * w;
    }
  });

  const sectionTitle = { fontSize: '13px', fontWeight: 700, color: t.text };
  const sectionLabel = { fontSize: '10px', fontWeight: 700, color: t.textMuted, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '8px', marginTop: '14px' };
  const card = { background: t.cardBg, border: `1px solid ${t.border}`, borderRadius: '10px', padding: '12px', marginBottom: '8px' };
  const metricCell = { background: t.bgTertiary, border: `1px solid ${t.border}`, borderRadius: '8px', padding: '10px', display: 'flex', flexDirection: 'column', gap: '3px' };
  const metricVal = { fontSize: '18px', fontWeight: 800, color: t.text };
  const metricLbl = { fontSize: '11px', color: t.textMuted };
  const progressBar = { height: '6px', borderRadius: '3px', background: t.border, overflow: 'hidden', marginTop: '4px', marginBottom: '8px' };
  const outlineBtn = { border: `1px solid ${t.border}`, borderRadius: '8px', padding: '8px 10px', fontSize: '12px', fontWeight: 500, background: t.cardBg, color: t.textSecondary, cursor: 'pointer', textAlign: 'left', width: '100%', marginBottom: '8px' };

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '12px' }}>
        <span style={sectionTitle}>Performance Metrics</span>
        <span style={{ fontSize: '10px', fontWeight: 600, color: t.accent, background: t.accentBg, borderRadius: '10px', padding: '2px 7px' }}>ILP (auto)</span>
      </div>

      {/* 2x2 metric grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '12px' }}>
        <div style={metricCell}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#3b82f6' }} />
            <span style={metricLbl}>Space Used</span>
          </div>
          <div style={metricVal}>{spaceUsedPct}%</div>
        </div>
        <div style={metricCell}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#a78bfa' }} />
            <span style={metricLbl}>Weight Used</span>
          </div>
          <div style={metricVal}>{weightUsedPct}%</div>
        </div>
        <div style={metricCell}>
          <span style={metricLbl}>Total Items</span>
          <div style={metricVal}>{items.length}</div>
        </div>
        <div style={metricCell}>
          <span style={metricLbl}>Solver Time</span>
          <div style={metricVal}>0.15 s</div>
        </div>
      </div>

      {/* Weight bar */}
      <div style={{ marginBottom: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
          <span style={{ fontSize: '12px', color: t.textSecondary, fontWeight: 500 }}>Weight Utilization</span>
          <span style={{ fontSize: '11px', color: t.textMuted }}>{totalWeight.toLocaleString()} / {truck.maxWeight.toLocaleString()} kg</span>
        </div>
        <div style={progressBar}>
          <div style={{ height: '100%', width: `${Math.min(100, weightUsedPct)}%`, background: '#a78bfa', borderRadius: '3px', transition: 'width 0.3s' }} />
        </div>
      </div>

      {/* Volume + Packing */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '8px' }}>
        <div style={metricCell}>
          <span style={metricLbl}>Volume Used</span>
          <div style={{ fontSize: '14px', fontWeight: 700, color: t.text }}>{totalItemVol.toFixed(2)} m&sup3;</div>
        </div>
        <div style={metricCell}>
          <span style={metricLbl}>Packing</span>
          <div style={{ fontSize: '14px', fontWeight: 700, color: '#10b981' }}>100%</div>
        </div>
      </div>

      {/* LIFO */}
      {lifoEnabled && (
        <div style={{ ...card, display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '8px' }}>
          <span style={{ fontSize: '12px', fontWeight: 600, color: t.text }}>LIFO</span>
          <span style={{ fontSize: '12px', fontWeight: 700, color: '#10b981' }}>Pass</span>
        </div>
      )}

      {/* Itemized loading list */}
      <div style={sectionLabel}>Itemized Loading List</div>
      <p style={{ fontSize: '11px', color: t.textMuted, marginTop: 0, marginBottom: '8px', lineHeight: 1.4 }}>
        Load in this sequence — Step 1 goes deepest.
      </p>
      {items.map((it, idx) => {
        const stopEntry = it.stopId ? stopMap[String(it.stopId)] : null;
        return (
          <div key={it.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 0', borderBottom: `1px solid ${t.borderLight}` }}>
            <span style={{ fontSize: '11px', color: t.textMuted, minWidth: '30px' }}>#{String(idx + 1).padStart(3, '0')}</span>
            <span style={{ fontSize: '12px', fontWeight: 600, color: t.text, flex: 1 }}>{it.type}</span>
            <span style={{ fontSize: '11px', color: t.textMuted }}>
              {it.width}&times;{it.height}&times;{it.length}&thinsp;cm
            </span>
            {stopEntry
              ? <span style={{ fontSize: '10px', fontWeight: 600, color: '#fff', background: stopEntry.color, borderRadius: '10px', padding: '2px 7px' }}>{stopEntry.name}</span>
              : <span style={{ fontSize: '10px', fontWeight: 600, color: t.textMuted, background: t.bgTertiary, borderRadius: '10px', padding: '2px 7px' }}>Unassigned</span>
            }
          </div>
        );
      })}

      {/* Stop breakdown */}
      <div style={sectionLabel}>Stop Breakdown</div>
      {stops.map((stop) => {
        const g = stopGroups[String(stop.id)] || { count: 0, kg: 0 };
        return (
          <div key={stop.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 0', borderBottom: `1px solid ${t.borderLight}` }}>
            <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: stop.color, flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '12px', fontWeight: 600, color: t.text }}>{stop.name} — {stop.address || 'No address'}</div>
              <div style={{ fontSize: '11px', color: t.textMuted }}>{g.count} items</div>
            </div>
            <div style={{ fontSize: '12px', color: t.textSecondary, fontWeight: 500 }}>{g.kg.toLocaleString()} kg</div>
          </div>
        );
      })}
      <div style={{ fontSize: '12px', color: t.textMuted, padding: '8px 0' }}>Unassigned: {unassignedCount} items</div>

      {/* Export */}
      <div style={sectionLabel}>Export Options</div>
      <button style={outlineBtn}>&#x1F4C4; Export Delivery Manifest (PDF)</button>
      <button style={outlineBtn} onClick={exportJSON}>&#x1F4CB; Export 3D Blueprint (JSON)</button>
    </>
  );
}

// ── Sidebar root ──────────────────────────────────────────────────────────────

export default function Sidebar({
  items, setItems,
  stops, setStops, lifoEnabled, setLifoEnabled,
  truck, setTruck,
  constraints, setConstraints,
  theme: t,
  themeName,
}) {
  const [activeTab, setActiveTab] = useState('Items');
  const isDark = themeName === 'dark';

  const sidebar = {
    width: '300px',
    minWidth: '300px',
    height: '100%',
    background: t.sidebarBg,
    borderRight: `1px solid ${t.border}`,
    display: 'flex',
    flexDirection: 'column',
    fontFamily: "'Inter', system-ui, sans-serif",
    overflow: 'hidden',
    transition: 'background-color 0.3s ease',
  };

  const tabBar = {
    display: 'flex',
    padding: '8px 8px 0',
    background: t.tabBarBg,
    borderBottom: `1px solid ${t.border}`,
    gap: '2px',
    flexShrink: 0,
    flexWrap: 'wrap',
  };

  const body = {
    flex: 1,
    overflowY: 'auto',
    padding: '14px 12px',
    scrollbarWidth: 'thin',
    scrollbarColor: `${t.border} transparent`,
  };

  return (
    <aside style={sidebar}>
      <div style={tabBar}>
        {TABS.map((tab) => {
          const active = activeTab === tab;
          return (
            <button
              key={tab}
              style={{
                padding: '6px 10px',
                fontSize: '12px',
                fontWeight: active ? 700 : 400,
                borderRadius: '6px 6px 0 0',
                border: 'none',
                cursor: 'pointer',
                background: active ? t.tabActiveBg : 'transparent',
                color: active ? t.tabActiveText : t.tabInactiveText,
                boxShadow: active ? (isDark ? '0 -1px 0 rgba(255,255,255,0.05)' : '0 -1px 3px rgba(0,0,0,0.05)') : 'none',
                transition: 'background 0.15s, color 0.15s',
                borderBottom: active ? `2px solid ${t.accent}` : '2px solid transparent',
              }}
              onClick={() => setActiveTab(tab)}
            >
              {tab}
            </button>
          );
        })}
      </div>

      <div style={body}>
        {activeTab === 'Items' && <ItemsTab items={items} setItems={setItems} stops={stops} t={t} />}
        {activeTab === 'Route' && <RouteTab stops={stops} setStops={setStops} lifoEnabled={lifoEnabled} setLifoEnabled={setLifoEnabled} t={t} />}
        {activeTab === 'Trucks' && <TrucksTab truck={truck} setTruck={setTruck} t={t} />}
        {activeTab === 'Options' && <OptionsTab constraints={constraints} setConstraints={setConstraints} t={t} />}
        {activeTab === 'Results' && <ResultsTab items={items} truck={truck} stops={stops} lifoEnabled={lifoEnabled} t={t} />}
      </div>
    </aside>
  );
}
