/**
 * App.jsx
 *
 * Top-level layout for FLOW-3D — redesigned dashboard.
 *
 * Layout:
 *   ┌─────────────────────────────────┐
 *   │         SimHeader (two rows)    │  ← full width, fixed height
 *   ├──────────────┬──────────────────┤
 *   │   Sidebar    │  SimulatorCanvas │
 *   │   (~300 px)  │  (flex: 1)      │
 *   └──────────────┴──────────────────┘
 *
 * All shared state lives here and is passed as props into Sidebar and
 * SimulatorCanvas.  App.jsx owns no solver logic, API calls, or Three.js code.
 * Theme is read from themeStore and propagated via the `theme` prop pattern.
 */

import React, { useState, useEffect } from 'react';
import SimHeader from './components/SimHeader.jsx';
import Sidebar from './components/Sidebar.jsx';
import SimulatorCanvas from './components/SimulatorCanvas.jsx';
import useThemeStore from './store/themeStore.js';
import { getTheme } from './theme.js';

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeId() {
  return Math.random().toString(36).slice(2, 9);
}

// ── Initial state ─────────────────────────────────────────────────────────────

const INITIAL_ITEMS = [
  {
    id: makeId(),
    type: 'Chair',
    quantity: 1,
    weight: 50,
    width: 90,
    height: 85,
    length: 90,
    stopId: '',
  },
  {
    id: makeId(),
    type: 'Dining Table',
    quantity: 1,
    weight: 50,
    width: 180,
    height: 75,
    length: 90,
    stopId: '',
  },
];

const INITIAL_STOPS = [
  { id: 1, name: 'Stop 1', address: 'Warehouse A', color: '#ef4444' },
  { id: 2, name: 'Stop 2', address: 'Customer B',  color: '#3b82f6' },
];

const INITIAL_TRUCK = {
  width: 240,
  height: 244,
  length: 1360,
  maxWeight: 20000,
  quantity: 1,
};

const INITIAL_CONSTRAINTS = {
  lifo: true,
  orientation: false,
  fragility: false,
  stacking: false,
  weightDist: false,
};

// ── Component ─────────────────────────────────────────────────────────────────

export default function App() {
  const { theme } = useThemeStore();
  const t = getTheme(theme);

  // Apply body background for the dashboard
  useEffect(() => {
    document.body.style.background = t.canvasBg;
    document.body.style.color = t.text;
    return () => {
      document.body.style.background = '';
      document.body.style.color = '';
    };
  }, [t.canvasBg, t.text]);

  // -- Truck config --
  const [truck, setTruck] = useState(INITIAL_TRUCK);

  // -- Route --
  const [stops, setStops] = useState(INITIAL_STOPS);
  const [lifoEnabled, setLifoEnabled] = useState(true);

  // -- Items --
  const [items, setItems] = useState(INITIAL_ITEMS);

  // -- Solver constraints --
  const [constraints, setConstraints] = useState(INITIAL_CONSTRAINTS);

  // -- Canvas view mode --
  const [viewMode, setViewMode] = useState('3d');

  // -- Header actions --
  const handleReset = () => {
    setItems(INITIAL_ITEMS);
    setTruck(INITIAL_TRUCK);
    setStops(INITIAL_STOPS);
    setLifoEnabled(true);
    setConstraints(INITIAL_CONSTRAINTS);
    setViewMode('3d');
  };

  const handleClearItems = () => setItems([]);

  const shell = {
    display: 'flex',
    flexDirection: 'column',
    width: '100%',
    height: '100%',
    fontFamily: "'Inter', system-ui, sans-serif",
    overflow: 'hidden',
    background: t.canvasBg,
    transition: 'background-color 0.3s ease',
  };

  const body = {
    display: 'flex',
    flex: 1,
    overflow: 'hidden',
  };

  const canvasPanel = {
    flex: 1,
    position: 'relative',
    overflow: 'hidden',
    background: t.canvasBg,
  };

  return (
    <div style={shell}>
      <SimHeader
        truck={truck}
        stops={stops}
        lifoEnabled={lifoEnabled}
        onReset={handleReset}
        onClearItems={handleClearItems}
        theme={t}
        themeName={theme}
      />

      <div style={body}>
        <Sidebar
          items={items}
          setItems={setItems}
          stops={stops}
          setStops={setStops}
          lifoEnabled={lifoEnabled}
          setLifoEnabled={setLifoEnabled}
          truck={truck}
          setTruck={setTruck}
          constraints={constraints}
          setConstraints={setConstraints}
          theme={t}
          themeName={theme}
        />

        <main style={canvasPanel}>
          <SimulatorCanvas
            viewMode={viewMode}
            setViewMode={setViewMode}
            items={items}
            truck={truck}
            stops={stops}
          />
        </main>
      </div>
    </div>
  );
}
