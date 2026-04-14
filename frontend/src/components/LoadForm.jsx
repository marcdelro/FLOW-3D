/**
 * LoadForm.jsx
 *
 * Form component for submitting a packing request to the FLOW-3D solver.
 *
 * Responsibilities:
 *   - Collect container dimensions (L, W, H in mm) from the user.
 *   - Collect a list of furniture items (item_id, l, w, h, delivery_stop,
 *     fragile, side_up) via a dynamic row editor or JSON paste.
 *   - Call postSolveRequest() from the API layer on submit.
 *   - Write the returned manifest into the Zustand store.
 *
 * Explicitly NOT responsible for:
 *   - Any solver logic.
 *   - Rendering Three.js objects.
 *   - Polling the backend.
 *
 * Architecture rule: this is the ONLY component that imports solverApi.js.
 * ContainerCanvas reads results from the store; it never calls the API.
 */

import React, { useState, useCallback } from 'react';
import useManifestStore from '../store/useManifestStore.js';
import { postSolveRequest } from '../api/solverApi.js';

// ── Default values ────────────────────────────────────────────────────────────

const DEFAULT_CONTAINER = { L: 6000, W: 2400, H: 2600 };

/** A blank item row template. */
const blankItem = () => ({
  item_id: '',
  l: '',
  w: '',
  h: '',
  delivery_stop: 1,
  fragile: false,
  side_up: false,
});

/**
 * Pre-populated item list that matches the sample manifest shipped in
 * src/data/sampleManifest.js.  When the backend is unreachable (or
 * VITE_USE_MOCK=true), the solver API returns that manifest regardless
 * of the form payload, so these defaults exist purely to give the user
 * a sensible starting point and avoid a blank "0 items" form on first
 * load.
 */
const DEFAULT_ITEMS = [
  { item_id: 'sofa-01',        l: 2000, w: 900, h: 800,  delivery_stop: 3, fragile: false, side_up: false },
  { item_id: 'wardrobe-01',    l: 1000, w: 600, h: 2000, delivery_stop: 3, fragile: false, side_up: false },
  { item_id: 'wardrobe-02',    l: 1000, w: 600, h: 2000, delivery_stop: 3, fragile: false, side_up: false },
  { item_id: 'dining-table-01',l: 1200, w: 800, h: 750,  delivery_stop: 2, fragile: false, side_up: false },
  { item_id: 'glass-table-01', l: 1200, w: 700, h: 750,  delivery_stop: 2, fragile: true,  side_up: true  },
  { item_id: 'chair-01',       l: 500,  w: 500, h: 900,  delivery_stop: 2, fragile: false, side_up: false },
  { item_id: 'chair-02',       l: 500,  w: 500, h: 900,  delivery_stop: 2, fragile: false, side_up: false },
  { item_id: 'chair-03',       l: 500,  w: 500, h: 900,  delivery_stop: 2, fragile: false, side_up: false },
  { item_id: 'chair-04',       l: 500,  w: 500, h: 900,  delivery_stop: 2, fragile: false, side_up: false },
  { item_id: 'box-01',         l: 400,  w: 400, h: 400,  delivery_stop: 1, fragile: false, side_up: false },
  { item_id: 'box-02',         l: 400,  w: 400, h: 400,  delivery_stop: 1, fragile: false, side_up: false },
  { item_id: 'box-03',         l: 400,  w: 400, h: 400,  delivery_stop: 1, fragile: false, side_up: false },
];

// ── Styles ────────────────────────────────────────────────────────────────────

const s = {
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    fontFamily: 'system-ui, sans-serif',
    fontSize: '13px',
    color: '#d1d5db',
  },
  section: {
    background: '#16181f',
    border: '1px solid #2a2d38',
    borderRadius: '8px',
    padding: '14px',
  },
  sectionTitle: {
    fontSize: '11px',
    fontWeight: 600,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    color: '#6b7280',
    marginBottom: '10px',
  },
  row: {
    display: 'flex',
    gap: '8px',
    alignItems: 'flex-end',
    marginBottom: '6px',
    flexWrap: 'wrap',
  },
  field: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    flex: '1 1 60px',
    minWidth: '50px',
  },
  label: {
    fontSize: '11px',
    color: '#6b7280',
  },
  input: {
    background: '#0d0f14',
    border: '1px solid #2a2d38',
    borderRadius: '5px',
    color: '#e0e0e0',
    padding: '5px 8px',
    fontSize: '13px',
    width: '100%',
    outline: 'none',
  },
  checkbox: {
    accentColor: '#3a7bd5',
  },
  checkRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '5px',
    marginTop: '2px',
    fontSize: '12px',
    color: '#9ca3af',
  },
  itemRow: {
    background: '#0d0f14',
    border: '1px solid #1f2229',
    borderRadius: '6px',
    padding: '8px',
    marginBottom: '6px',
    display: 'flex',
    gap: '6px',
    alignItems: 'flex-end',
    flexWrap: 'wrap',
  },
  removeBtn: {
    background: 'transparent',
    border: '1px solid #3f1111',
    borderRadius: '4px',
    color: '#f87171',
    cursor: 'pointer',
    padding: '4px 8px',
    fontSize: '12px',
    alignSelf: 'flex-end',
  },
  addBtn: {
    background: 'transparent',
    border: '1px dashed #2a2d38',
    borderRadius: '6px',
    color: '#6b7280',
    cursor: 'pointer',
    padding: '7px',
    width: '100%',
    fontSize: '12px',
    textAlign: 'center',
  },
  submitBtn: {
    background: '#1d4ed8',
    border: 'none',
    borderRadius: '6px',
    color: '#fff',
    cursor: 'pointer',
    padding: '10px',
    fontSize: '14px',
    fontWeight: 600,
    width: '100%',
    letterSpacing: '0.02em',
  },
  submitBtnDisabled: {
    background: '#1e2535',
    color: '#4b5563',
    cursor: 'not-allowed',
  },
  clearBtn: {
    background: 'transparent',
    border: '1px solid #2a2d38',
    borderRadius: '6px',
    color: '#6b7280',
    cursor: 'pointer',
    padding: '8px',
    fontSize: '13px',
    width: '100%',
  },
  error: {
    color: '#fca5a5',
    fontSize: '12px',
    background: '#3b1111',
    border: '1px solid #7f1d1d',
    borderRadius: '5px',
    padding: '8px 10px',
  },
};

// ── Sub-components ────────────────────────────────────────────────────────────

function Field({ label, children }) {
  return (
    <div style={s.field}>
      <label style={s.label}>{label}</label>
      {children}
    </div>
  );
}

function TextInput({ value, onChange, placeholder, type = 'number', min }) {
  return (
    <input
      style={s.input}
      type={type}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      min={min}
    />
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function LoadForm() {
  const setManifest  = useManifestStore((s) => s.setManifest);
  const clearManifest = useManifestStore((s) => s.clearManifest);
  const setStatus    = useManifestStore((s) => s.setStatus);
  const setError     = useManifestStore((s) => s.setError);
  const status       = useManifestStore((s) => s.status);

  const [container, setContainer] = useState({ ...DEFAULT_CONTAINER });
  const [items, setItems] = useState(DEFAULT_ITEMS);
  const [localError, setLocalError] = useState(null);

  const isLoading = status === 'loading';

  // ── Container field handlers ─────────────────────────────────────────────
  const setContainerField = useCallback((field) => (e) => {
    const val = parseInt(e.target.value, 10);
    setContainer((prev) => ({ ...prev, [field]: isNaN(val) ? '' : val }));
  }, []);

  // ── Item row handlers ────────────────────────────────────────────────────
  const updateItem = useCallback((idx, field, value) => {
    setItems((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], [field]: value };
      return next;
    });
  }, []);

  const addItem = useCallback(() => {
    setItems((prev) => [...prev, blankItem()]);
  }, []);

  const removeItem = useCallback((idx) => {
    setItems((prev) => prev.filter((_, i) => i !== idx));
  }, []);

  // ── Validation ───────────────────────────────────────────────────────────
  function validate() {
    const { L, W, H } = container;
    if (!L || !W || !H || L <= 0 || W <= 0 || H <= 0) {
      return 'Container dimensions must be positive integers (mm).';
    }
    if (items.length === 0) {
      return 'Add at least one item.';
    }
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      if (!it.item_id.trim()) return `Item ${i + 1}: item_id is required.`;
      if (!it.l || !it.w || !it.h || it.l <= 0 || it.w <= 0 || it.h <= 0) {
        return `Item ${i + 1} (${it.item_id || 'unnamed'}): l, w, h must be positive integers (mm).`;
      }
      if (!it.delivery_stop || it.delivery_stop < 1) {
        return `Item ${i + 1}: delivery_stop must be >= 1.`;
      }
    }
    return null;
  }

  // ── Submit ───────────────────────────────────────────────────────────────
  async function handleSubmit(e) {
    e.preventDefault();
    setLocalError(null);

    const validationError = validate();
    if (validationError) {
      setLocalError(validationError);
      return;
    }

    const payload = {
      container: {
        L: Number(container.L),
        W: Number(container.W),
        H: Number(container.H),
      },
      items: items.map((it) => ({
        item_id: it.item_id.trim(),
        l: Number(it.l),
        w: Number(it.w),
        h: Number(it.h),
        delivery_stop: Number(it.delivery_stop),
        fragile: Boolean(it.fragile),
        side_up: Boolean(it.side_up),
      })),
    };

    setStatus('loading');
    clearManifest();

    try {
      const manifest = await postSolveRequest(payload);
      setManifest(manifest);
    } catch (err) {
      setError(err.message);
      setLocalError(err.message);
    }
  }

  // ── Clear ────────────────────────────────────────────────────────────────
  function handleClear() {
    clearManifest();
    setItems(DEFAULT_ITEMS);
    setLocalError(null);
  }

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <form style={s.form} onSubmit={handleSubmit} noValidate>

      {/* Container dimensions */}
      <div style={s.section}>
        <div style={s.sectionTitle}>Container (mm)</div>
        <div style={s.row}>
          <Field label="Length L">
            <TextInput
              value={container.L}
              onChange={setContainerField('L')}
              placeholder="6000"
              min={1}
            />
          </Field>
          <Field label="Width W">
            <TextInput
              value={container.W}
              onChange={setContainerField('W')}
              placeholder="2400"
              min={1}
            />
          </Field>
          <Field label="Height H">
            <TextInput
              value={container.H}
              onChange={setContainerField('H')}
              placeholder="2600"
              min={1}
            />
          </Field>
        </div>
      </div>

      {/* Item list */}
      <div style={s.section}>
        <div style={s.sectionTitle}>Items ({items.length})</div>

        {items.map((item, idx) => (
          <div key={idx} style={s.itemRow}>
            <Field label="Item ID">
              <TextInput
                type="text"
                value={item.item_id}
                onChange={(e) => updateItem(idx, 'item_id', e.target.value)}
                placeholder={`item-${idx + 1}`}
              />
            </Field>
            <Field label="l (mm)">
              <TextInput
                value={item.l}
                onChange={(e) => updateItem(idx, 'l', parseInt(e.target.value, 10) || '')}
                placeholder="500"
                min={1}
              />
            </Field>
            <Field label="w (mm)">
              <TextInput
                value={item.w}
                onChange={(e) => updateItem(idx, 'w', parseInt(e.target.value, 10) || '')}
                placeholder="500"
                min={1}
              />
            </Field>
            <Field label="h (mm)">
              <TextInput
                value={item.h}
                onChange={(e) => updateItem(idx, 'h', parseInt(e.target.value, 10) || '')}
                placeholder="900"
                min={1}
              />
            </Field>
            <Field label="Stop">
              <TextInput
                value={item.delivery_stop}
                onChange={(e) => updateItem(idx, 'delivery_stop', parseInt(e.target.value, 10) || 1)}
                placeholder="1"
                min={1}
              />
            </Field>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignSelf: 'flex-end' }}>
              <label style={s.checkRow}>
                <input
                  type="checkbox"
                  style={s.checkbox}
                  checked={item.fragile}
                  onChange={(e) => updateItem(idx, 'fragile', e.target.checked)}
                />
                Fragile
              </label>
              <label style={s.checkRow}>
                <input
                  type="checkbox"
                  style={s.checkbox}
                  checked={item.side_up}
                  onChange={(e) => updateItem(idx, 'side_up', e.target.checked)}
                />
                Side-up
              </label>
            </div>
            {items.length > 1 && (
              <button
                type="button"
                style={s.removeBtn}
                onClick={() => removeItem(idx)}
                aria-label={`Remove item ${idx + 1}`}
              >
                Remove
              </button>
            )}
          </div>
        ))}

        <button type="button" style={s.addBtn} onClick={addItem}>
          + Add item
        </button>
      </div>

      {/* Validation / API errors */}
      {localError && <div style={s.error}>{localError}</div>}

      {/* Actions */}
      <button
        type="submit"
        style={isLoading ? { ...s.submitBtn, ...s.submitBtnDisabled } : s.submitBtn}
        disabled={isLoading}
      >
        {isLoading ? 'Solving\u2026' : 'Solve'}
      </button>

      <button type="button" style={s.clearBtn} onClick={handleClear} disabled={isLoading}>
        Clear
      </button>

    </form>
  );
}
