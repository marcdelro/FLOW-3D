/**
 * ContainerCanvas.jsx
 *
 * The Three.js rendering surface for FLOW-3D.
 *
 * Responsibilities (this component):
 *   - Mount a <div> that the Three.js renderer attaches its <canvas> to.
 *   - Read the placement manifest and container dims from the Zustand store.
 *   - Delegate all scene construction to the useThreeScene hook.
 *   - Show overlay UI (loading spinner, empty state) without coupling to
 *     solver or API logic.
 *
 * Explicitly NOT the responsibility of this component:
 *   - Fetching data from the backend.
 *   - Mutating solver inputs.
 *   - Anything outside the CLAUDE.md visualization scope.
 *
 * Architecture note: the canvas fills its parent container 100%.  The parent
 * (App.jsx) is responsible for sizing the panel via CSS.
 */

import React, { useRef } from 'react';
import useManifestStore from '../store/useManifestStore.js';
import { useThreeScene } from '../hooks/useThreeScene.js';

// ── Styles (inline, no external dependency) ──────────────────────────────────

const styles = {
  wrapper: {
    position: 'relative',
    width: '100%',
    height: '100%',
    background: '#111318',
    overflow: 'hidden',
  },
  mountTarget: {
    width: '100%',
    height: '100%',
  },
  overlay: {
    position: 'absolute',
    inset: 0,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '12px',
    pointerEvents: 'none',     // Let clicks pass through to OrbitControls.
    color: '#6b7280',
    fontSize: '14px',
    fontFamily: 'system-ui, sans-serif',
  },
  spinner: {
    width: '36px',
    height: '36px',
    border: '3px solid #2a2d38',
    borderTopColor: '#3a7bd5',
    borderRadius: '50%',
    animation: 'flow3d-spin 0.8s linear infinite',
  },
  errorBadge: {
    background: '#3b1111',
    border: '1px solid #7f1d1d',
    color: '#fca5a5',
    padding: '8px 14px',
    borderRadius: '6px',
    maxWidth: '320px',
    textAlign: 'center',
    lineHeight: 1.5,
  },
  statsBar: {
    position: 'absolute',
    bottom: '12px',
    left: '50%',
    transform: 'translateX(-50%)',
    display: 'flex',
    gap: '20px',
    background: 'rgba(17,19,24,0.82)',
    border: '1px solid #2a2d38',
    padding: '6px 16px',
    borderRadius: '20px',
    fontSize: '12px',
    color: '#9ca3af',
    pointerEvents: 'none',
  },
  statValue: {
    color: '#e0e0e0',
    fontVariantNumeric: 'tabular-nums',
  },
};

// Inject the keyframe animation once.
if (typeof document !== 'undefined') {
  const styleTag = document.createElement('style');
  styleTag.textContent = `@keyframes flow3d-spin { to { transform: rotate(360deg); } }`;
  document.head.appendChild(styleTag);
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function ContainerCanvas() {
  const mountRef = useRef(null);

  // Read-only access to the manifest store.  This component never writes.
  const container   = useManifestStore((s) => s.container);
  const placements  = useManifestStore((s) => s.placements);
  const utilization = useManifestStore((s) => s.utilization);
  const solverTimeMs = useManifestStore((s) => s.solverTimeMs);
  const status      = useManifestStore((s) => s.status);
  const errorMessage = useManifestStore((s) => s.errorMessage);

  // Delegate scene lifecycle to the hook — no Three.js code lives here.
  useThreeScene(mountRef, container, placements);

  // ── Overlay states ───────────────────────────────────────────────────────
  const isEmpty = !container && status === 'idle';
  const isLoading = status === 'loading';
  const isError = status === 'error';
  const hasStats = utilization !== null && solverTimeMs !== null;

  return (
    <div style={styles.wrapper}>
      {/* The renderer appends its <canvas> inside this div. */}
      <div ref={mountRef} style={styles.mountTarget} />

      {/* Empty state */}
      {isEmpty && (
        <div style={styles.overlay}>
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#3a7bd5" strokeWidth="1.5">
            <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
          </svg>
          <span>Configure container dimensions and items, then click Solve.</span>
        </div>
      )}

      {/* Loading spinner */}
      {isLoading && (
        <div style={styles.overlay}>
          <div style={styles.spinner} />
          <span>Solver running&hellip;</span>
        </div>
      )}

      {/* Error state */}
      {isError && (
        <div style={styles.overlay}>
          <div style={styles.errorBadge}>
            <strong>Solver error</strong><br />
            {errorMessage ?? 'An unknown error occurred.'}
          </div>
        </div>
      )}

      {/* Stats bar — shown after a successful solve */}
      {hasStats && (
        <div style={styles.statsBar}>
          <span>
            Utilization&nbsp;
            <span style={styles.statValue}>
              {(utilization * 100).toFixed(1)}%
            </span>
          </span>
          <span>
            Items&nbsp;
            <span style={styles.statValue}>{placements.length}</span>
          </span>
          <span>
            Solver&nbsp;
            <span style={styles.statValue}>{solverTimeMs} ms</span>
          </span>
        </div>
      )}
    </div>
  );
}
