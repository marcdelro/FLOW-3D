/**
 * LandingPage.jsx
 *
 * Entry point shown to the user before the simulator dashboard.
 * All styling is inline — no external CSS files or utility frameworks.
 *
 * The dot-grid background is produced with a repeating radial-gradient
 * SVG data URI so it works in every modern browser without an extra asset.
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';

// ── Feature card data ─────────────────────────────────────────────────────────

const FEATURE_CARDS = [
  {
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="7" width="20" height="14" rx="2" />
        <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" />
        <line x1="12" y1="12" x2="12" y2="16" />
        <line x1="10" y1="14" x2="14" y2="14" />
      </svg>
    ),
    title: '8 Furniture Types',
    description: 'Configure sofas, wardrobes, desks, chairs and more with CSV/JSON import',
    bg: '#eff6ff',
    border: '#bfdbfe',
  },
  {
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 12h18" />
        <path d="M3 6l9-3 9 3" />
        <path d="M3 18l9 3 9-3" />
        <path d="M12 3v18" />
      </svg>
    ),
    title: 'Route-Aware LIFO',
    description: 'Multi-stop routes with LIFO packing order — items for Stop 1 loaded last',
    bg: '#f0fdf4',
    border: '#bbf7d0',
  },
  {
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#ea580c" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
      </svg>
    ),
    title: '3D Visualisation',
    description: 'Interactive 3D view with Normal, Exploded, and Labels display modes',
    bg: '#fff7ed',
    border: '#fed7aa',
  },
  {
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3" />
        <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
        <path d="M4.93 4.93a10 10 0 0 0 0 14.14" />
        <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
        <path d="M8.46 8.46a5 5 0 0 0 0 7.07" />
      </svg>
    ),
    title: 'Hybrid Algorithm',
    description: 'Auto-switches between ILP (optimal) and FFD (fast) based on manifest size',
    bg: '#faf5ff',
    border: '#e9d5ff',
  },
  {
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="20" x2="18" y2="10" />
        <line x1="12" y1="20" x2="12" y2="4" />
        <line x1="6" y1="20" x2="6" y2="14" />
      </svg>
    ),
    title: 'Performance Metrics',
    description: 'Live volumetric utilisation, packing success rate, and computation time',
    bg: '#fff1f2',
    border: '#fecdd3',
  },
  {
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#0d9488" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      </svg>
    ),
    title: 'Constraint Engine',
    description: 'LIFO, stacking rules, orientation lock and weight distribution controls',
    bg: '#f0fdfa',
    border: '#99f6e4',
  },
];

// ── Styles ────────────────────────────────────────────────────────────────────

const DOT_GRID_BG =
  "radial-gradient(circle, #94a3b8 1px, transparent 1px)";

const styles = {
  page: {
    minHeight: '100vh',
    width: '100%',
    backgroundColor: '#f1f5f9',
    backgroundImage: DOT_GRID_BG,
    backgroundSize: '24px 24px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: 'system-ui, -apple-system, sans-serif',
    padding: '48px 24px',
    boxSizing: 'border-box',
  },
  inner: {
    maxWidth: '800px',
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '20px',
    textAlign: 'center',
  },
  iconWrapper: {
    width: '72px',
    height: '72px',
    borderRadius: '18px',
    background: '#1e293b',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 4px 16px rgba(0,0,0,0.18)',
  },
  welcomeLabel: {
    fontSize: '12px',
    fontWeight: 600,
    letterSpacing: '0.18em',
    color: '#64748b',
    textTransform: 'uppercase',
    marginTop: '4px',
  },
  heading: {
    fontSize: '36px',
    fontWeight: 800,
    color: '#0f172a',
    lineHeight: 1.2,
    margin: 0,
    maxWidth: '640px',
  },
  subtitle: {
    fontSize: '15px',
    color: '#475569',
    lineHeight: 1.65,
    maxWidth: '580px',
    margin: 0,
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '14px',
    width: '100%',
    marginTop: '8px',
  },
  card: (bg, border) => ({
    backgroundColor: bg,
    border: `1px solid ${border}`,
    borderRadius: '12px',
    padding: '20px 18px',
    textAlign: 'left',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  }),
  cardTitle: {
    fontSize: '14px',
    fontWeight: 700,
    color: '#0f172a',
    margin: 0,
  },
  cardDesc: {
    fontSize: '13px',
    color: '#475569',
    lineHeight: 1.55,
    margin: 0,
  },
  launchBtn: {
    marginTop: '12px',
    padding: '14px 40px',
    fontSize: '15px',
    fontWeight: 700,
    color: '#f8fafc',
    background: '#0f172a',
    border: 'none',
    borderRadius: '999px',
    cursor: 'pointer',
    letterSpacing: '0.02em',
    boxShadow: '0 2px 8px rgba(0,0,0,0.22)',
    transition: 'background 0.15s',
  },
};

// ── Component ─────────────────────────────────────────────────────────────────

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div style={styles.page}>
      <div style={styles.inner}>
        {/* Top icon */}
        <div style={styles.iconWrapper}>
          <svg width="38" height="38" viewBox="0 0 24 24" fill="none" stroke="#e2e8f0" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
            <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
            <line x1="12" y1="22.08" x2="12" y2="12" />
          </svg>
        </div>

        {/* Label */}
        <p style={styles.welcomeLabel}>Welcome To</p>

        {/* Heading */}
        <h1 style={styles.heading}>
          Routing-Aware 3D Furniture Logistics Simulator
        </h1>

        {/* Subtitle */}
        <p style={styles.subtitle}>
          A Decision Support System for hybrid bin-packing with ILP/FFD algorithms,
          LIFO routing constraints, and interactive 3D truck visualisation.
        </p>

        {/* Feature cards */}
        <div style={styles.grid}>
          {FEATURE_CARDS.map((card) => (
            <div key={card.title} style={styles.card(card.bg, card.border)}>
              {card.icon}
              <p style={styles.cardTitle}>{card.title}</p>
              <p style={styles.cardDesc}>{card.description}</p>
            </div>
          ))}
        </div>

        {/* Launch button */}
        <button
          style={styles.launchBtn}
          onClick={() => navigate('/dashboard')}
          onMouseEnter={(e) => { e.currentTarget.style.background = '#1e293b'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = '#0f172a'; }}
        >
          Launch Simulator &gt;
        </button>
      </div>
    </div>
  );
}
