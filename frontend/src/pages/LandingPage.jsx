/**
 * LandingPage.jsx
 *
 * Entry point shown to the user before the simulator dashboard.
 * Layout: nav → announcement pill → hero heading → subtitle → CTA → stats → dashboard preview.
 * Fully themed via themeStore + theme tokens. Supports dark/light toggle.
 * All styling is inline — no external CSS files or utility frameworks.
 */

import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import useThemeStore from '../store/themeStore.js';
import { getTheme } from '../theme.js';

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

// ── Dashboard Preview mock ────────────────────────────────────────────────────
// Pure HTML/CSS — no Three.js. Renders a flat visual representation of the
// FLOW-3D simulator UI: SimHeader, Sidebar, Canvas area with SVG isometric
// wireframe container and colored item boxes, legend, and view-mode buttons.

const STOP_COLORS = [
  '#ef4444', // stop 1 — nearest door
  '#f97316', // stop 2
  '#eab308', // stop 3
  '#22c55e', // stop 4
];

// Sidebar furniture rows shown in the mock
const MOCK_ITEMS = [
  { label: 'Sofa 3-Seater', dims: '1800 × 900 × 850mm', stop: 1 },
  { label: 'Dining Table', dims: '1400 × 800 × 750mm', stop: 2 },
  { label: 'Wardrobe (2-door)', dims: '900 × 500 × 1900mm', stop: 2 },
  { label: 'Coffee Table', dims: '600 × 400 × 450mm', stop: 3 },
  { label: 'Bookshelf', dims: '800 × 300 × 1600mm', stop: 4 },
];

// SVG perspective wireframe container with colored furniture boxes drawn inside.
// Replicates the actual Three.js viewport appearance: warm beige background,
// receding perspective grid floor, orange-red container wireframe, dark-brown
// furniture boxes in the back-right region.
function IsometricContainer() {
  // SVG viewport — wider to match the widescreen canvas feel
  const VW = 420;
  const VH = 220;

  // ── Perspective projection helpers ────────────────────────────────────────
  // Vanishing point is high-center; camera sits front-left elevated.
  // All world coords: x = right, y = up, z = depth (positive = away from viewer).
  // Container world size (arbitrary units): 10 wide, 4 tall, 28 deep.
  const vp = { x: 310, y: 52 }; // vanishing point (px)

  // Project a 3-D point [wx, wy, wz] to SVG 2-D pixel.
  // Uses a simple two-point perspective approximation tuned for this layout.
  function proj(wx, wy, wz) {
    // Horizontal: left edge at sx=30, right edge at sx=390 when wz=0; recede to vp.x
    const baseX = 30 + wx * 36;
    const px = baseX + (vp.x - baseX) * (wz / 32);
    // Vertical: floor at sy=190, ceiling at sy=190-wy*32; recede upward to vp.y
    const baseY = 190 - wy * 32;
    const py = baseY + (vp.y - baseY) * (wz / 32);
    return [px, py];
  }

  function pts(...coords) {
    return coords.map(([wx, wy, wz]) => proj(wx, wy, wz).join(',')).join(' ');
  }

  // Container corners — 10 wide (x: 0..10), 4 tall (y: 0..4), 28 deep (z: 0..28)
  // Front face at z=0, back face at z=28
  const cfl  = proj(0,  0, 0);   // front-bottom-left
  const cfr  = proj(10, 0, 0);   // front-bottom-right
  const cftl = proj(0,  4, 0);   // front-top-left
  const cftr = proj(10, 4, 0);   // front-top-right
  const cbl  = proj(0,  0, 28);  // back-bottom-left
  const cbr  = proj(10, 0, 28);  // back-bottom-right
  const cbtl = proj(0,  4, 28);  // back-top-left
  const cbtr = proj(10, 4, 28);  // back-top-right

  const cStroke = '#cc5500';

  // ── Furniture boxes (back-right region) ────────────────────────────────────
  // Each box defined by [x0,y0,z0] origin + [dx,dy,dz] size in world units.
  // Rendered as three visible faces: front (z=z0), top (y=y0+dy), left (x=x0).
  // Colors are dark brown, no stop-color coding needed for layout fidelity.
  const furnitureItems = [
    // Large box — far back-right, tall (wardrobe-ish)
    { o: [6.5, 0, 20], s: [2.8, 3.8, 3.2], color: '#5a3e28' },
    // Medium box — back-center (dining table)
    { o: [3.5, 0, 22], s: [3.2, 2.0, 3.5], color: '#6b4a30' },
    // Small box — back-left, shorter (coffee table)
    { o: [1.0, 0, 24], s: [2.0, 1.4, 2.5], color: '#7a5538' },
  ];

  function renderBox({ o: [x0, y0, z0], s: [dx, dy, dz], color }) {
    // Front face (z = z0)
    const frontPts = pts([x0, y0, z0], [x0+dx, y0, z0], [x0+dx, y0+dy, z0], [x0, y0+dy, z0]);
    // Top face (y = y0+dy)
    const topPts   = pts([x0, y0+dy, z0], [x0+dx, y0+dy, z0], [x0+dx, y0+dy, z0+dz], [x0, y0+dy, z0+dz]);
    // Right face (x = x0+dx)
    const rightPts = pts([x0+dx, y0, z0], [x0+dx, y0, z0+dz], [x0+dx, y0+dy, z0+dz], [x0+dx, y0+dy, z0]);
    return (
      <g key={`${x0},${z0}`}>
        <polygon points={frontPts} fill={color} fillOpacity="0.85" stroke={color} strokeWidth="0.6" />
        <polygon points={topPts}   fill={color} fillOpacity="0.55" stroke={color} strokeWidth="0.6" />
        <polygon points={rightPts} fill={color} fillOpacity="0.65" stroke={color} strokeWidth="0.6" />
      </g>
    );
  }

  // ── Floor perspective grid ──────────────────────────────────────────────────
  // Draw lines at integer x-values and at several z-values receding to vp.
  const gridColor = 'rgba(180,160,120,0.45)';
  const gridLines = [];
  // x-lines (run front-to-back)
  for (let x = 0; x <= 10; x += 2) {
    const [x1, y1] = proj(x, 0, 0);
    const [x2, y2] = proj(x, 0, 28);
    gridLines.push(<line key={`gx${x}`} x1={x1} y1={y1} x2={x2} y2={y2} stroke={gridColor} strokeWidth="0.7" />);
  }
  // z-lines (run left-to-right at depth intervals)
  for (let z = 0; z <= 28; z += 4) {
    const [x1, y1] = proj(0,  0, z);
    const [x2, y2] = proj(10, 0, z);
    gridLines.push(<line key={`gz${z}`} x1={x1} y1={y1} x2={x2} y2={y2} stroke={gridColor} strokeWidth="0.7" />);
  }

  return (
    <svg
      width={VW}
      height={VH}
      viewBox={`0 0 ${VW} ${VH}`}
      style={{ display: 'block', overflow: 'visible' }}
    >
      {/* Floor grid — behind everything */}
      <g>{gridLines}</g>

      {/* Furniture boxes — behind container wireframe */}
      {furnitureItems.map(renderBox)}

      {/* Container wireframe */}
      <g stroke={cStroke} strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
        {/* Front face */}
        <polygon points={[cfl, cfr, cftr, cftl].map(p => p.join(',')).join(' ')} />
        {/* Top face */}
        <polygon points={[cftl, cftr, cbtr, cbtl].map(p => p.join(',')).join(' ')} />
        {/* Right face */}
        <polygon points={[cfr, cbr, cbtr, cftr].map(p => p.join(',')).join(' ')} />
        {/* Back face edges (dashed — partially hidden) */}
        <line x1={cbl[0]} y1={cbl[1]} x2={cbr[0]} y2={cbr[1]} strokeDasharray="4 3" strokeOpacity="0.45" />
        <line x1={cbl[0]} y1={cbl[1]} x2={cbtl[0]} y2={cbtl[1]} strokeDasharray="4 3" strokeOpacity="0.45" />
        {/* Left face bottom edge (dashed) */}
        <line x1={cfl[0]} y1={cfl[1]} x2={cbl[0]} y2={cbl[1]} strokeDasharray="4 3" strokeOpacity="0.45" />
        {/* Left face vertical back (dashed) */}
        <line x1={cbtl[0]} y1={cbtl[1]} x2={cbtr[0]} y2={cbtr[1]} strokeDasharray="4 3" strokeOpacity="0.45" />
      </g>
    </svg>
  );
}

function DashboardPreview() {
  // Fixed palette matching the actual running simulator visual exactly.
  // Canvas: warm beige. Chrome (header/sidebar): dark panels.
  const mockCanvasBg = '#f0ebe0';  // warm beige viewport background
  const mockHeader = '#161b27';
  const mockSidebar = '#161b27';
  const mockBorder = '#2a3347';
  const mockText = '#e8eaf0';
  const mockTextSec = '#94a3b8';
  const mockTextMuted = '#4b5a72';
  const mockAccent = '#3b82f6';
  const mockTabBar = '#111520';

  return (
    <div style={{
      width: '100%',
      maxWidth: '880px',
      borderRadius: '14px',
      overflow: 'hidden',
      border: `1px solid #2a3347`,
      boxShadow: '0 32px 80px rgba(0,0,0,0.7), 0 0 0 1px rgba(59,130,246,0.08)',
      background: mockHeader,
      fontFamily: "'Inter', system-ui, sans-serif",
      userSelect: 'none',
    }}>
      {/* ── Browser chrome bar ─────────────────────────────────────── */}
      <div style={{
        background: '#0a0d12',
        borderBottom: `1px solid ${mockBorder}`,
        padding: '10px 16px',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
      }}>
        {/* Traffic lights */}
        <div style={{ display: 'flex', gap: '6px' }}>
          {['#ef4444', '#f59e0b', '#22c55e'].map((c) => (
            <div key={c} style={{ width: 10, height: 10, borderRadius: '50%', background: c, opacity: 0.8 }} />
          ))}
        </div>
        {/* Address bar */}
        <div style={{
          flex: 1,
          background: '#1c2333',
          border: `1px solid ${mockBorder}`,
          borderRadius: '6px',
          padding: '4px 12px',
          fontSize: '11px',
          color: mockTextMuted,
          maxWidth: '320px',
          margin: '0 auto',
          textAlign: 'center',
        }}>
          localhost:5173/dashboard
        </div>
        <div style={{ width: 60 }} />
      </div>

      {/* ── SimHeader ──────────────────────────────────────────────── */}
      {/* Matches actual header: FLOW-3D logo left, breadcrumb center, action buttons right */}
      <div style={{
        background: mockHeader,
        borderBottom: `1px solid ${mockBorder}`,
        padding: '7px 14px',
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
      }}>
        {/* Logo mark + wordmark */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginRight: '6px', flexShrink: 0 }}>
          <div style={{
            width: 24, height: 24,
            borderRadius: '5px',
            background: 'rgba(59,130,246,0.15)',
            border: '1px solid rgba(59,130,246,0.3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={mockAccent} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
            </svg>
          </div>
          <span style={{ fontSize: '12px', fontWeight: 800, color: mockText, letterSpacing: '-0.01em' }}>FLOW-3D</span>
        </div>

        {/* Breadcrumb separator */}
        <span style={{ color: mockTextMuted, fontSize: '11px', opacity: 0.5 }}>/</span>

        {/* Container dimension breadcrumb */}
        <span style={{
          fontSize: '10px',
          fontWeight: 600,
          color: mockTextSec,
          background: 'rgba(255,255,255,0.05)',
          border: `1px solid ${mockBorder}`,
          borderRadius: '5px',
          padding: '2px 8px',
          fontFamily: 'monospace',
          letterSpacing: '0.02em',
        }}>
          240 &times; 244 &times; 1360 cm
        </span>

        <div style={{ flex: 1 }} />

        {/* Action buttons: Save, Copy Share, Reset */}
        {['Save', 'Copy Share', 'Reset'].map((label, i) => (
          <div key={label} style={{
            fontSize: '10px',
            fontWeight: 600,
            color: i === 2 ? '#f87171' : mockTextSec,
            background: i === 2 ? 'rgba(239,68,68,0.08)' : '#1c2333',
            border: `1px solid ${i === 2 ? 'rgba(239,68,68,0.3)' : mockBorder}`,
            borderRadius: '6px',
            padding: '3px 9px',
            cursor: 'default',
            flexShrink: 0,
          }}>
            {label}
          </div>
        ))}
      </div>

      {/* ── Main body: sidebar + canvas ──────────────────────────────── */}
      <div style={{ display: 'flex', height: '300px' }}>

        {/* Sidebar */}
        <div style={{
          width: '200px',
          flexShrink: 0,
          background: mockSidebar,
          borderRight: `1px solid ${mockBorder}`,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}>
          {/* Tab bar */}
          <div style={{
            background: mockTabBar,
            borderBottom: `1px solid ${mockBorder}`,
            display: 'flex',
            fontSize: '10px',
            fontWeight: 600,
          }}>
            {['Items', 'Route', 'Trucks', 'Results'].map((tab, i) => (
              <div key={tab} style={{
                padding: '7px 9px',
                color: i === 0 ? mockText : mockTextMuted,
                borderBottom: i === 0 ? `2px solid ${mockAccent}` : '2px solid transparent',
                cursor: 'default',
                whiteSpace: 'nowrap',
              }}>
                {tab}
              </div>
            ))}
          </div>

          {/* Furniture item cards with collapse arrows */}
          <div style={{ padding: '6px 0', flex: 1, overflow: 'hidden' }}>
            {[
              { label: 'Chair', dims: '500 × 500 × 900mm', stop: 1 },
              { label: 'Dining Table', dims: '1400 × 800 × 750mm', stop: 2 },
              { label: 'Wardrobe', dims: '900 × 500 × 1900mm', stop: 2 },
              { label: 'Coffee Table', dims: '600 × 400 × 450mm', stop: 3 },
              { label: 'Bookshelf', dims: '800 × 300 × 1600mm', stop: 4 },
            ].map((item, i) => (
              <div key={i} style={{
                padding: '5px 10px',
                borderBottom: `1px solid ${mockBorder}`,
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                background: i === 0 ? 'rgba(59,130,246,0.07)' : 'transparent',
              }}>
                {/* Collapse arrow */}
                <span style={{ fontSize: '8px', color: mockTextMuted, flexShrink: 0, marginRight: '1px' }}>&#9658;</span>
                {/* Color dot */}
                <div style={{
                  width: 7, height: 7,
                  borderRadius: '50%',
                  background: STOP_COLORS[item.stop - 1],
                  flexShrink: 0,
                }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '10px', fontWeight: 600, color: mockText, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {item.label}
                  </div>
                  <div style={{ fontSize: '8.5px', color: mockTextMuted, marginTop: '1px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {item.dims}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Dimension input fields at bottom */}
          <div style={{ padding: '8px 10px', borderTop: `1px solid ${mockBorder}` }}>
            <div style={{ fontSize: '9px', color: mockTextMuted, marginBottom: '5px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Container Dims</div>
            {[['L', '1360'], ['W', '244'], ['H', '240']].map(([axis, val]) => (
              <div key={axis} style={{ display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '3px' }}>
                <span style={{ fontSize: '9px', color: mockTextMuted, width: '10px' }}>{axis}</span>
                <div style={{
                  flex: 1,
                  background: '#1c2333',
                  border: `1px solid ${mockBorder}`,
                  borderRadius: '4px',
                  padding: '2px 6px',
                  fontSize: '9px',
                  color: mockTextSec,
                  fontFamily: 'monospace',
                }}>
                  {val} cm
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Canvas area — warm beige background matching actual Three.js viewport */}
        <div style={{
          flex: 1,
          background: mockCanvasBg,
          position: 'relative',
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          {/* Perspective container SVG */}
          <IsometricContainer />

          {/* View Controls panel — top right, white floating panel */}
          <div style={{
            position: 'absolute',
            top: '10px',
            right: '10px',
            background: 'rgba(255,255,255,0.92)',
            border: '1px solid rgba(0,0,0,0.12)',
            borderRadius: '7px',
            padding: '7px 10px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            minWidth: '110px',
          }}>
            <div style={{ fontSize: '9px', fontWeight: 700, color: '#444', marginBottom: '6px', letterSpacing: '0.04em' }}>View Controls</div>
            {/* 3D radio selected */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '4px' }}>
              <div style={{
                width: 9, height: 9, borderRadius: '50%',
                border: '2px solid #3b82f6',
                background: '#3b82f6',
                flexShrink: 0,
              }} />
              <span style={{ fontSize: '9px', color: '#333', fontWeight: 600 }}>3D</span>
            </div>
            {/* Checkboxes */}
            {['Render Axes', 'Render Floor'].map((label, i) => (
              <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '5px', marginBottom: i === 0 ? '3px' : 0 }}>
                <div style={{
                  width: 9, height: 9,
                  border: '1.5px solid #999',
                  borderRadius: '2px',
                  background: i === 1 ? '#3b82f6' : 'transparent',
                  flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {i === 1 && <span style={{ color: '#fff', fontSize: '7px', lineHeight: 1 }}>&#10003;</span>}
                </div>
                <span style={{ fontSize: '9px', color: '#555' }}>{label}</span>
              </div>
            ))}
          </div>

          {/* Bottom toolbar — 3D View / Top View / Front View / + */}
          <div style={{
            position: 'absolute',
            bottom: '10px',
            left: '50%',
            transform: 'translateX(-50%)',
            display: 'flex',
            gap: '2px',
            background: 'rgba(255,255,255,0.88)',
            border: '1px solid rgba(0,0,0,0.12)',
            borderRadius: '7px',
            padding: '3px 5px',
            boxShadow: '0 2px 6px rgba(0,0,0,0.1)',
          }}>
            {[['3D View', true], ['Top View', false], ['Front View', false]].map(([label, active]) => (
              <div key={label} style={{
                fontSize: '9px',
                fontWeight: active ? 700 : 500,
                padding: '3px 8px',
                borderRadius: '5px',
                color: active ? '#fff' : '#555',
                background: active ? '#3b82f6' : 'transparent',
                cursor: 'default',
                whiteSpace: 'nowrap',
              }}>
                {label}
              </div>
            ))}
            <div style={{
              width: 22, height: 22,
              borderRadius: '5px',
              background: 'rgba(0,0,0,0.06)',
              border: '1px solid rgba(0,0,0,0.1)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '13px',
              color: '#555',
              cursor: 'default',
              marginLeft: '2px',
            }}>+</div>
          </div>
        </div>
      </div>

      {/* ── Status bar ─────────────────────────────────────────────── */}
      <div style={{
        background: '#0a0d12',
        borderTop: `1px solid ${mockBorder}`,
        padding: '5px 14px',
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        fontSize: '9px',
        color: mockTextMuted,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e' }} />
          <span>Solver ready</span>
        </div>
        <span>Phase 1: ILP &middot; Phase 2: FFD</span>
        <span>T_exec: 0.83s</span>
        <div style={{ flex: 1 }} />
        <span>Three.js r165</span>
      </div>
    </div>
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

  // ── Nav ────────────────────────────────────────────────────────────────────

  const nav = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '18px 48px',
    position: 'relative',
    zIndex: 10,
    borderBottom: `1px solid ${isDark ? 'rgba(42,51,71,0.6)' : t.border}`,
  };

  const logoGroup = {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  };

  const logoIconWrap = {
    width: '38px',
    height: '38px',
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

  // Nav center links
  const navLinks = {
    display: 'flex',
    alignItems: 'center',
    gap: '32px',
  };

  const navLink = {
    fontSize: '13px',
    fontWeight: 500,
    color: t.textSecondary,
    textDecoration: 'none',
    cursor: 'default',
    transition: 'color 0.15s',
  };

  const themeToggleBtn = {
    background: isDark ? '#1e2536' : '#ffffff',
    border: `1px solid ${t.border}`,
    borderRadius: '10px',
    cursor: 'pointer',
    padding: '7px 13px',
    display: 'flex',
    alignItems: 'center',
    gap: '7px',
    fontSize: '13px',
    fontWeight: 500,
    color: t.textSecondary,
    boxShadow: t.shadowSm,
    transition: 'background 0.2s',
  };

  // ── Hero ───────────────────────────────────────────────────────────────────

  const hero = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center',
    padding: '56px 40px 36px',
    position: 'relative',
    zIndex: 10,
    gap: '20px',
  };

  const announcementPill = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    background: isDark ? 'rgba(15,17,23,0.8)' : 'rgba(255,255,255,0.9)',
    border: `1px solid ${isDark ? 'rgba(59,130,246,0.3)' : 'rgba(37,99,235,0.25)'}`,
    borderRadius: '999px',
    padding: '5px 14px 5px 8px',
    fontSize: '12px',
    fontWeight: 500,
    color: isDark ? '#94a3b8' : '#475569',
    boxShadow: isDark ? '0 0 20px rgba(59,130,246,0.08)' : 'none',
  };

  const pillDot = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: isDark ? 'rgba(59,130,246,0.15)' : 'rgba(37,99,235,0.1)',
    border: `1px solid ${isDark ? 'rgba(59,130,246,0.35)' : 'rgba(37,99,235,0.25)'}`,
    borderRadius: '999px',
    padding: '2px 8px',
    fontSize: '11px',
    fontWeight: 700,
    color: isDark ? '#60a5fa' : '#2563eb',
    marginRight: '4px',
  };

  const heading = {
    fontSize: 'clamp(32px, 5.5vw, 58px)',
    fontWeight: 900,
    lineHeight: 1.08,
    margin: 0,
    maxWidth: '760px',
    letterSpacing: '-0.035em',
  };

  const headingLine1 = {
    color: t.text,
    display: 'block',
  };

  const headingLine2 = {
    backgroundImage: isDark
      ? 'linear-gradient(135deg, #60a5fa 0%, #818cf8 55%, #a78bfa 100%)'
      : 'linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)',
    backgroundColor: 'transparent',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
    color: 'transparent',
    display: 'block',
  };

  const subtitle = {
    fontSize: '17px',
    color: t.textSecondary,
    lineHeight: 1.7,
    maxWidth: '560px',
    margin: 0,
  };

  // CTA: white background with dark text (inverted vs classic blue button)
  const ctaBtn = {
    padding: '14px 38px',
    fontSize: '15px',
    fontWeight: 700,
    color: '#0f1117',
    background: '#ffffff',
    border: 'none',
    borderRadius: '12px',
    cursor: 'pointer',
    letterSpacing: '0.01em',
    boxShadow: '0 4px 20px rgba(0,0,0,0.25), 0 1px 0 rgba(255,255,255,0.15) inset',
    transition: 'transform 0.15s, box-shadow 0.15s',
    marginTop: '4px',
  };

  const statsRow = {
    display: 'flex',
    alignItems: 'center',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: '20px',
    fontSize: '12px',
    color: t.textMuted,
    marginTop: '2px',
  };

  const statDivider = {
    width: '1px',
    height: '12px',
    background: t.border,
  };

  // ── Preview section ────────────────────────────────────────────────────────

  const previewSection = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '8px 40px 72px',
    position: 'relative',
    zIndex: 10,
    gap: '0px',
  };

  // Radial glow behind the preview frame (like the SaaS template)
  const previewGlow = {
    position: 'absolute',
    top: '-60px',
    left: '50%',
    transform: 'translateX(-50%)',
    width: '900px',
    height: '500px',
    borderRadius: '50%',
    background: isDark
      ? 'radial-gradient(ellipse, rgba(59,130,246,0.12) 0%, rgba(99,102,241,0.06) 40%, transparent 70%)'
      : 'radial-gradient(ellipse, rgba(37,99,235,0.07) 0%, transparent 70%)',
    pointerEvents: 'none',
  };

  return (
    <div style={page}>
      {/* Animated background */}
      <DotGrid theme={theme} />

      {/* Subtle top radial vignette */}
      <div style={{
        position: 'absolute',
        inset: 0,
        background: isDark
          ? 'radial-gradient(ellipse 80% 50% at 50% 0%, rgba(59,130,246,0.06) 0%, transparent 65%)'
          : 'radial-gradient(ellipse 80% 50% at 50% 0%, rgba(37,99,235,0.04) 0%, transparent 65%)',
        pointerEvents: 'none',
        zIndex: 1,
      }} />

      {/* Nav bar */}
      <nav style={nav}>
        {/* Left: Logo */}
        <div style={logoGroup}>
          <div style={logoIconWrap}>
            <LogoIcon stroke={t.accent} />
          </div>
          <div>
            <div style={logoTitle}>FLOW-3D</div>
          </div>
          <span style={logoBadge}>DSS</span>
        </div>

        {/* Center: Nav links */}
        <div style={navLinks}>
          <span style={navLink}>Overview</span>
          <span style={navLink}>Algorithm</span>
          <span style={navLink}>Visualizer</span>
          <span style={navLink}>Docs</span>
        </div>

        {/* Right: Theme toggle */}
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
        {/* Announcement pill */}
        <div style={announcementPill}>
          <span style={pillDot}>New</span>
          Matheuristic 3D Bin Packing &nbsp;&middot;&nbsp; Now with LIFO constraints
          <span style={{ marginLeft: '4px', color: isDark ? '#60a5fa' : '#2563eb', fontWeight: 600 }}>&rarr;</span>
        </div>

        {/* Heading */}
        <h1 style={heading}>
          <span style={headingLine1}>3D Furniture Loading,</span>
          <span style={headingLine2}>Optimized Automatically</span>
        </h1>

        {/* Subtitle */}
        <p style={subtitle}>
          Hybrid ILP + FFD bin-packing with LIFO routing constraints. Pack a full truck
          manifest in seconds, then explore every item in an interactive 3D viewer.
        </p>

        {/* CTA */}
        <button
          style={ctaBtn}
          onClick={() => navigate('/dashboard')}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = '0 8px 32px rgba(0,0,0,0.35)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.25), 0 1px 0 rgba(255,255,255,0.15) inset';
          }}
        >
          Open Dashboard &rarr;
        </button>

        {/* Stats row */}
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

      {/* Dashboard preview */}
      <div style={previewSection}>
        <div style={{ position: 'relative', width: '100%', display: 'flex', justifyContent: 'center' }}>
          <div style={previewGlow} />
          <DashboardPreview />
        </div>
      </div>
    </div>
  );
}
