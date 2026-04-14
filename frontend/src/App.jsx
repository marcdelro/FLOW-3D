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
 *   │   (~290 px)  │  (flex: 1)      │
 *   └──────────────┴──────────────────┘
 *
 * All shared state lives here and is passed as props into Sidebar and
 * SimulatorCanvas.  App.jsx owns no solver logic, API calls, or Three.js code.
 */

import React, { useState } from 'react';
import SimHeader from './components/SimHeader.jsx';
import Sidebar from './components/Sidebar.jsx';
import SimulatorCanvas from './components/SimulatorCanvas.jsx';

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

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = {
  shell: {
    display: 'flex',
    flexDirection: 'column',
    width: '100%',
    height: '100%',
    fontFamily: 'system-ui, sans-serif',
    overflow: 'hidden',
    background: '#f9fafb',
  },
  body: {
    display: 'flex',
    flex: 1,
    overflow: 'hidden',
  },
  canvasPanel: {
    flex: 1,
    position: 'relative',
    overflow: 'hidden',
  },
};

// ── Component ─────────────────────────────────────────────────────────────────

export default function App() {
  // -- Truck config (Trucks tab) --
  const [truck, setTruck] = useState({
    width: 240,
    height: 244,
    length: 1360,
    maxWeight: 20000,
    quantity: 1,
  });

  // -- Route (Route tab) --
  const [stops, setStops] = useState(INITIAL_STOPS);
  const [lifoEnabled, setLifoEnabled] = useState(true);

  // -- Items (shared between Items tab and canvas) --
  const [items, setItems] = useState(INITIAL_ITEMS);

  // -- Solver constraints (Options tab) --
  const [constraints, setConstraints] = useState({
    lifo: true,
    orientation: false,
    fragility: false,
    stacking: false,
    weightDist: false,
  });

  // -- Canvas view mode --
  const [viewMode, setViewMode] = useState('3d'); // '3d' | 'exploded' | 'labels' | 'play'

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

  return (
    <div style={styles.shell}>
      <SimHeader
        truck={truck}
        stops={stops}
        lifoEnabled={lifoEnabled}
        onReset={handleReset}
        onClearItems={handleClearItems}
      />

      <div style={styles.body}>
        <Sidebar
          // Items tab
          items={items}
          setItems={setItems}
          // Route tab
          stops={stops}
          setStops={setStops}
          lifoEnabled={lifoEnabled}
          setLifoEnabled={setLifoEnabled}
          // Trucks tab
          truck={truck}
          setTruck={setTruck}
          // Options tab
          constraints={constraints}
          setConstraints={setConstraints}
        />

        <main style={styles.canvasPanel}>
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
