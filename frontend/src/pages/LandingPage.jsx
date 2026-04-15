/**
 * LandingPage.jsx
 *
 * Entry point shown to the user before the simulator dashboard.
 * Fully themed via themeStore + theme tokens. Supports dark/light toggle.
 * All styling is inline — no external CSS files or utility frameworks.
 */

import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import useThemeStore from '../store/themeStore.js';
import { getTheme } from '../theme.js';

// ── Feature card data ─────────────────────────────────────────────────────────

const FEATURE_CARDS = [
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
        <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
        <line x1="12" y1="22.08" x2="12" y2="12" />
      </svg>
    ),
    accent: '#3b82f6',
    accentBg: 'rgba(59,130,246,0.12)',
    title: 'ILP Solver',
    description: 'Exact Integer Linear Programming places priority and fragile items with provably optimal positioning.',
  },
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 12h18" /><path d="M3 6l9-3 9 3" /><path d="M3 18l9 3 9-3" /><path d="M12 3v18" />
      </svg>
    ),
    accent: '#10b981',
    accentBg: 'rgba(16,185,129,0.12)',
    title: 'FFD Heuristic',
    description: 'First-Fit Decreasing fills residual space in milliseconds — scales to large manifests without solver overhead.',
  },
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <path d="M12 8v4l3 3" />
      </svg>
    ),
    accent: '#a78bfa',
    accentBg: 'rgba(167,139,250,0.12)',
    title: '3D Visualisation',
    description: 'Interactive Three.js canvas renders every bounding box. Switch between Normal, Exploded, and Label modes.',
  },
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M1 3h15v13H1z" /><path d="M16 8h4l3 3v5h-7V8z" /><circle cx="5.5" cy="18.5" r="2.5" /><circle cx="18.5" cy="18.5" r="2.5" />
      </svg>
    ),
    accent: '#f59e0b',
    accentBg: 'rgba(245,158,11,0.12)',
    title: 'Route-Aware LIFO',
    description: 'Multi-stop delivery sequences enforced as hard constraints — Stop 1 items always nearest the truck door.',
  },
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#f43f5e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" />
      </svg>
    ),
    accent: '#f43f5e',
    accentBg: 'rgba(244,63,94,0.12)',
    title: 'Performance Metrics',
    description: 'Live volumetric utilisation, weight distribution, packing success rate, and solver execution time.',
  },
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#06b6d4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      </svg>
    ),
    accent: '#06b6d4',
    accentBg: 'rgba(6,182,212,0.12)',
    title: 'Constraint Engine',
    description: 'LIFO ordering, side-up fragility flags, stacking rules, and weight distribution — all in one constraint layer.',
  },
];

// ── Moon / Sun icons ──────────────────────────────────────────────────────────

function MoonIcon({ color }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );
}

function SunIcon({ color }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="5" />
      <line x1="12" y1="1" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="23" />
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
      <line x1="1" y1="12" x2="3" y2="12" /><line x1="21" y1="12" x2="23" y2="12" />
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" /><line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
    </svg>
  );
}

// ── Logo icon ─────────────────────────────────────────────────────────────────

function LogoIcon({ stroke }) {
  return (
    <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
      <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
      <line x1="12" y1="22.08" x2="12" y2="12" />
    </svg>
  );
}

// ── Animated dot-grid canvas ──────────────────────────────────────────────────

function DotGrid({ theme }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    let animFrame;
    let t = 0;

    const SPACING = 30;
    const DOT_R = 1.2;
    const WAVE_AMP = 0.55;
    const WAVE_FREQ = 0.08;
    const WAVE_SPEED = 0.018;

    const dotColor = theme === 'dark' ? 'rgba(148,163,184,' : 'rgba(100,116,139,';

    function resize() {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    }

    function draw() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const cols = Math.ceil(canvas.width / SPACING) + 1;
      const rows = Math.ceil(canvas.height / SPACING) + 1;

      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const x = c * SPACING;
          const y = r * SPACING;
          const wave = Math.sin(c * WAVE_FREQ + t) * Math.cos(r * WAVE_FREQ * 0.7 + t * 0.6);
          const alpha = (WAVE_AMP + wave * 0.4).toFixed(2);
          ctx.beginPath();
          ctx.arc(x, y, DOT_R, 0, Math.PI * 2);
          ctx.fillStyle = dotColor + alpha + ')';
          ctx.fill();
        }
      }

      t += WAVE_SPEED;
      animFrame = requestAnimationFrame(draw);
    }

    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    resize();
    draw();

    return () => {
      cancelAnimationFrame(animFrame);
      ro.disconnect();
    };
  }, [theme]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
      }}
    />
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function LandingPage() {
  const navigate = useNavigate();
  const { theme, toggleTheme } = useThemeStore();
  const t = getTheme(theme);
  const isDark = theme === 'dark';

  // Apply body background for the landing page
  useEffect(() => {
    document.body.style.background = t.bg;
    return () => { document.body.style.background = ''; };
  }, [t.bg]);

  const page = {
    minHeight: '100vh',
    width: '100%',
    backgroundColor: t.bg,
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
    fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
    overflow: 'hidden',
    transition: 'background-color 0.3s ease',
    color: t.text,
  };

  const nav = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '20px 40px',
    position: 'relative',
    zIndex: 10,
  };

  const logoGroup = {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  };

  const logoIconWrap = {
    width: '40px',
    height: '40px',
    borderRadius: '10px',
    background: isDark ? '#1e2740' : '#eff6ff',
    border: `1px solid ${isDark ? '#2a3a5e' : '#bfdbfe'}`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  };

  const logoTitle = {
    fontSize: '15px',
    fontWeight: 800,
    color: t.text,
    letterSpacing: '-0.02em',
  };

  const logoBadge = {
    fontSize: '10px',
    fontWeight: 600,
    letterSpacing: '0.1em',
    color: t.accent,
    background: t.accentBg,
    borderRadius: '6px',
    padding: '2px 7px',
    textTransform: 'uppercase',
  };

  const themeToggleBtn = {
    background: isDark ? '#1e2536' : '#ffffff',
    border: `1px solid ${t.border}`,
    borderRadius: '10px',
    cursor: 'pointer',
    padding: '8px 14px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '13px',
    fontWeight: 500,
    color: t.textSecondary,
    boxShadow: t.shadowSm,
    transition: 'background 0.2s',
  };

  const hero = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center',
    padding: '60px 40px 40px',
    position: 'relative',
    zIndex: 10,
    gap: '20px',
  };

  const eyebrowPill = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    background: t.accentBg,
    border: `1px solid ${isDark ? 'rgba(59,130,246,0.25)' : 'rgba(37,99,235,0.2)'}`,
    borderRadius: '999px',
    padding: '6px 16px',
    fontSize: '12px',
    fontWeight: 600,
    color: t.accent,
    letterSpacing: '0.04em',
    textTransform: 'uppercase',
  };

  const heading = {
    fontSize: 'clamp(30px, 5vw, 52px)',
    fontWeight: 900,
    color: t.text,
    lineHeight: 1.1,
    margin: 0,
    maxWidth: '720px',
    letterSpacing: '-0.03em',
  };

  const headingAccent = {
    background: isDark
      ? 'linear-gradient(135deg, #60a5fa, #818cf8)'
      : 'linear-gradient(135deg, #2563eb, #7c3aed)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
    color: 'transparent',
    transition: 'none',
    display: 'inline-block',
  };

  const subtitle = {
    fontSize: '17px',
    color: t.textSecondary,
    lineHeight: 1.7,
    maxWidth: '600px',
    margin: 0,
  };

  const ctaGroup = {
    display: 'flex',
    alignItems: 'center',
    gap: '14px',
    marginTop: '8px',
  };

  const ctaBtn = {
    padding: '14px 36px',
    fontSize: '15px',
    fontWeight: 700,
    color: '#ffffff',
    background: isDark
      ? 'linear-gradient(135deg, #3b82f6, #6366f1)'
      : 'linear-gradient(135deg, #2563eb, #7c3aed)',
    border: 'none',
    borderRadius: '12px',
    cursor: 'pointer',
    letterSpacing: '0.01em',
    boxShadow: isDark
      ? '0 4px 20px rgba(99,102,241,0.45), 0 1px 0 rgba(255,255,255,0.1) inset'
      : '0 4px 20px rgba(37,99,235,0.35)',
    transition: 'transform 0.15s, box-shadow 0.15s',
  };

  const statsRow = {
    display: 'flex',
    alignItems: 'center',
    gap: '28px',
    fontSize: '13px',
    color: t.textMuted,
    marginTop: '4px',
  };

  const statDivider = {
    width: '1px',
    height: '14px',
    background: t.border,
  };

  const gridSection = {
    padding: '0 40px 60px',
    position: 'relative',
    zIndex: 10,
    maxWidth: '1100px',
    margin: '0 auto',
    width: '100%',
    boxSizing: 'border-box',
  };

  const gridLabel = {
    textAlign: 'center',
    fontSize: '12px',
    fontWeight: 700,
    letterSpacing: '0.12em',
    color: t.textMuted,
    textTransform: 'uppercase',
    marginBottom: '32px',
  };

  const grid = {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '16px',
  };

  return (
    <div style={page}>
      {/* Animated background */}
      <DotGrid theme={theme} />

      {/* Subtle gradient vignette */}
      <div style={{
        position: 'absolute',
        inset: 0,
        background: isDark
          ? 'radial-gradient(ellipse 80% 60% at 50% 0%, rgba(59,130,246,0.07) 0%, transparent 70%)'
          : 'radial-gradient(ellipse 80% 60% at 50% 0%, rgba(37,99,235,0.05) 0%, transparent 70%)',
        pointerEvents: 'none',
        zIndex: 1,
      }} />

      {/* Nav bar */}
      <nav style={nav}>
        <div style={logoGroup}>
          <div style={logoIconWrap}>
            <LogoIcon stroke={t.accent} />
          </div>
          <div>
            <div style={logoTitle}>FLOW-3D</div>
          </div>
          <span style={logoBadge}>DSS</span>
        </div>

        <button
          style={themeToggleBtn}
          onClick={toggleTheme}
          title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {isDark ? <SunIcon color={t.textSecondary} /> : <MoonIcon color={t.textSecondary} />}
          <span>{isDark ? 'Light' : 'Dark'}</span>
        </button>
      </nav>

      {/* Hero */}
      <section style={hero}>
        <div style={eyebrowPill}>
          <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: t.accent, display: 'inline-block' }} />
          Decision Support System &nbsp;&middot;&nbsp; Philippine Furniture Logistics
        </div>

        <h1 style={heading}>
          <span>3D Furniture Loading,</span>
          <br />
          <span style={headingAccent}>Optimised Automatically</span>
        </h1>

        <p style={subtitle}>
          Hybrid ILP + FFD bin-packing with LIFO routing constraints. Pack a full truck
          manifest in seconds — then explore it in an interactive 3D viewer.
        </p>

        <div style={ctaGroup}>
          <button
            style={ctaBtn}
            onClick={() => navigate('/dashboard')}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = isDark
                ? '0 8px 28px rgba(99,102,241,0.55)'
                : '0 8px 28px rgba(37,99,235,0.45)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = isDark
                ? '0 4px 20px rgba(99,102,241,0.45)'
                : '0 4px 20px rgba(37,99,235,0.35)';
            }}
          >
            Open Dashboard &rarr;
          </button>
        </div>

        <div style={statsRow}>
          <span>8 furniture types</span>
          <div style={statDivider} />
          <span>Up to 8 delivery stops</span>
          <div style={statDivider} />
          <span>ILP + FFD hybrid</span>
          <div style={statDivider} />
          <span>Three.js 3D viewer</span>
        </div>
      </section>

      {/* Feature grid */}
      <div style={{ display: 'flex', justifyContent: 'center', flex: 1 }}>
        <div style={gridSection}>
          <p style={gridLabel}>Core Capabilities</p>
          <div style={grid}>
            {FEATURE_CARDS.map((card) => (
              <FeatureCard key={card.title} card={card} t={t} isDark={isDark} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Feature card sub-component ────────────────────────────────────────────────

function FeatureCard({ card, t, isDark }) {
  const [hovered, setHovered] = React.useState(false);

  const cardStyle = {
    background: hovered
      ? (isDark ? '#1e2740' : '#f8faff')
      : (isDark ? '#161b27' : '#ffffff'),
    border: `1px solid ${hovered ? card.accent + '55' : t.border}`,
    borderRadius: '14px',
    padding: '22px 20px',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    cursor: 'default',
    transition: 'background 0.2s, border-color 0.2s, box-shadow 0.2s',
    boxShadow: hovered ? `0 4px 24px ${card.accent}22` : t.shadowSm,
  };

  const iconWrap = {
    width: '40px',
    height: '40px',
    borderRadius: '10px',
    background: hovered ? card.accentBg : (isDark ? '#1c2333' : '#f8fafc'),
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'background 0.2s',
    flexShrink: 0,
  };

  return (
    <div
      style={cardStyle}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div style={iconWrap}>{card.icon}</div>
      <div>
        <p style={{ fontSize: '14px', fontWeight: 700, color: t.text, margin: '0 0 6px 0' }}>
          {card.title}
        </p>
        <p style={{ fontSize: '13px', color: t.textSecondary, lineHeight: 1.6, margin: 0 }}>
          {card.description}
        </p>
      </div>
    </div>
  );
}
