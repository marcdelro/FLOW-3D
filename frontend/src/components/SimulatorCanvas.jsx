/**
 * SimulatorCanvas.jsx
 *
 * Three.js canvas for the FLOW-3D dashboard.
 *
 * Scene responsibilities (CLAUDE.md visualization scope):
 *   - Truck wireframe box from live `truck` prop (cm -> metres / 100)
 *   - Furniture bounding boxes from live `items` prop, colored by stop
 *   - Grid floor
 *   - Ambient + directional lighting
 *   - OrbitControls
 *
 * View modes (controlled by `viewMode` prop from App.jsx):
 *   '3d'       — solid colored boxes + BoxHelper outlines
 *   'exploded' — same items spread outward from truck centre (lerp animation)
 *   'labels'   — normal positions + CSS2DRenderer stop labels + stop legend overlay
 *   'play'     — items animate sliding into the truck one-by-one from outside
 *
 * Architectural constraints (CLAUDE.md):
 *   - No solver imports, no HTTP calls.
 *   - All Three.js lifecycle confined to useEffect; no scene state in React render.
 *   - Geometries, materials, CSS2DRenderer disposed on every scene rebuild.
 *   - requestAnimationFrame loop cancelled on cleanup.
 *
 * Props:
 *   viewMode    — '3d' | 'exploded' | 'labels' | 'play'
 *   setViewMode — setter
 *   items       — [{id, type, quantity, weight, width, height, length, stopId}]
 *   truck       — {width, height, length, maxWeight, quantity}  (cm)
 *   stops       — [{id, name, address, color}]
 */

import React, { useRef, useEffect, useState, useCallback } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { CSS2DRenderer, CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer.js';

// ── Constants ─────────────────────────────────────────────────────────────────

const BG_COLOR = 0xe3d5c1;
const UNASSIGNED_COLOR = '#a0522d'; // brown fallback for unassigned items
const ITEM_GAP = 0.05; // gap between items along Z axis (metres)

// ── Styles ────────────────────────────────────────────────────────────────────

const s = {
  wrapper: {
    position: 'relative',
    width: '100%',
    height: '100%',
    background: '#E3D5C1',
    overflow: 'hidden',
  },
  mount: {
    width: '100%',
    height: '100%',
    display: 'block',
    position: 'absolute',
    top: 0,
    left: 0,
  },
  // Bottom-left view mode pill toggle
  viewToggle: {
    position: 'absolute',
    bottom: '20px',
    left: '20px',
    display: 'flex',
    alignItems: 'center',
    background: '#1f2937',
    borderRadius: '30px',
    padding: '4px',
    gap: '2px',
    zIndex: 10,
  },
  viewBtn: (active) => ({
    padding: '6px 14px',
    borderRadius: '24px',
    border: 'none',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: active ? 600 : 400,
    background: active ? '#374151' : 'transparent',
    color: active ? '#ffffff' : '#9ca3af',
    transition: 'background 0.15s',
    fontFamily: 'system-ui, sans-serif',
  }),
  // Top-right View Controls card
  viewCard: {
    position: 'absolute',
    top: '16px',
    right: '16px',
    background: '#ffffff',
    borderRadius: '10px',
    boxShadow: '0 4px 16px rgba(0,0,0,0.14)',
    padding: '14px',
    width: '190px',
    fontFamily: 'system-ui, sans-serif',
    zIndex: 10,
  },
  cardTitle: {
    fontSize: '12px',
    fontWeight: 700,
    color: '#111827',
    marginBottom: '8px',
  },
  ilpRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    marginBottom: '10px',
  },
  ilpDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    background: '#3b82f6',
    flexShrink: 0,
  },
  ilpText: {
    fontSize: '11px',
    color: '#22c55e',
  },
  dragRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '10px',
  },
  dragLabel: {
    fontSize: '12px',
    color: '#374151',
  },
  miniPill: {
    display: 'flex',
    background: '#f3f4f6',
    borderRadius: '20px',
    padding: '2px',
    gap: '1px',
  },
  miniPillBtn: (active) => ({
    padding: '3px 10px',
    borderRadius: '16px',
    border: 'none',
    cursor: 'pointer',
    fontSize: '11px',
    background: active ? '#1f2937' : 'transparent',
    color: active ? '#ffffff' : '#6b7280',
    fontFamily: 'system-ui, sans-serif',
  }),
  resetViewBtn: {
    display: 'block',
    width: '100%',
    padding: '5px',
    marginBottom: '10px',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    background: '#fff',
    fontSize: '12px',
    color: '#374151',
    cursor: 'pointer',
    textAlign: 'center',
    fontFamily: 'system-ui, sans-serif',
  },
  zoomRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '10px',
  },
  zoomLabel: {
    fontSize: '12px',
    color: '#374151',
  },
  zoomControls: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  zoomBtn: {
    width: '22px',
    height: '22px',
    borderRadius: '50%',
    border: '1px solid #d1d5db',
    background: '#fff',
    cursor: 'pointer',
    fontSize: '14px',
    lineHeight: '20px',
    textAlign: 'center',
    color: '#374151',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: 'system-ui, sans-serif',
  },
  zoomValue: {
    fontSize: '12px',
    color: '#374151',
    minWidth: '36px',
    textAlign: 'center',
  },
  instructionList: {
    listStyle: 'none',
    margin: 0,
    padding: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: '3px',
  },
  instructionItem: {
    fontSize: '11px',
    color: '#9ca3af',
  },
  fab: {
    position: 'absolute',
    bottom: '20px',
    right: '20px',
    width: '42px',
    height: '42px',
    borderRadius: '50%',
    background: '#1f2937',
    border: 'none',
    cursor: 'pointer',
    color: '#ffffff',
    fontSize: '18px',
    fontWeight: 700,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 2px 10px rgba(0,0,0,0.25)',
    fontFamily: 'system-ui, sans-serif',
    zIndex: 10,
  },
  // Stop legend overlay (labels mode)
  legend: {
    position: 'absolute',
    top: '16px',
    left: '16px',
    background: 'rgba(255,255,255,0.92)',
    borderRadius: '8px',
    boxShadow: '0 2px 10px rgba(0,0,0,0.12)',
    padding: '10px 14px',
    fontFamily: 'system-ui, sans-serif',
    zIndex: 10,
    minWidth: '120px',
  },
  legendTitle: {
    fontSize: '11px',
    fontWeight: 700,
    color: '#374151',
    marginBottom: '6px',
  },
  legendRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    marginBottom: '4px',
  },
  legendDot: (color) => ({
    width: '9px',
    height: '9px',
    borderRadius: '50%',
    background: color,
    flexShrink: 0,
  }),
  legendLabel: {
    fontSize: '11px',
    color: '#374151',
  },
};

// ── Utility: hex string -> THREE.Color ────────────────────────────────────────

function hexToThreeColor(hex) {
  return new THREE.Color(hex);
}

// ── Scene builder ─────────────────────────────────────────────────────────────
// Returns { dispose, sceneRef, cameraRef, controlsRef, css2dRendererRef,
//           meshRefs, targetPositions, currentPositions }
//
// `meshRefs` is an array of THREE.Mesh, one per item.
// `targetPositions`  — { normal: Vector3, exploded: Vector3, play: Vector3 (offscreen) }
// `currentPositions` — mutable array of Vector3 (lerp state for exploded/play modes)

function buildScene({
  mount,
  items,
  truck,
  stops,
  viewMode,
  onCameraZoomChange,
}) {
  const W = mount.clientWidth;
  const H = mount.clientHeight;

  // Truck dimensions in metres (cm / 100)
  const TL = (Number(truck.length) || 1360) / 100; // Z axis
  const TH = (Number(truck.height) || 244)  / 100; // Y axis
  const TW = (Number(truck.width)  || 240)  / 100; // X axis

  // ── Renderer ───────────────────────────────────────────────────────────────
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(W, H);
  renderer.setClearColor(BG_COLOR);
  mount.appendChild(renderer.domElement);

  // ── CSS2DRenderer (for labels mode) ───────────────────────────────────────
  const css2dRenderer = new CSS2DRenderer();
  css2dRenderer.setSize(W, H);
  css2dRenderer.domElement.style.position = 'absolute';
  css2dRenderer.domElement.style.top = '0';
  css2dRenderer.domElement.style.left = '0';
  css2dRenderer.domElement.style.pointerEvents = 'none';
  mount.appendChild(css2dRenderer.domElement);

  // ── Scene ──────────────────────────────────────────────────────────────────
  const scene = new THREE.Scene();

  // ── Camera ─────────────────────────────────────────────────────────────────
  const camera = new THREE.PerspectiveCamera(45, W / H, 0.1, 400);
  camera.position.set(TL * 0.6, TH * 2, TL * 0.7);
  camera.lookAt(0, 0, 0);

  // ── OrbitControls ──────────────────────────────────────────────────────────
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.target.set(0, 0, 0);
  controls.update();

  // Emit zoom % to React on any camera change
  controls.addEventListener('change', () => {
    onCameraZoomChange(Math.round(camera.zoom * 100));
  });

  // ── Lighting ───────────────────────────────────────────────────────────────
  const ambient = new THREE.AmbientLight(0xffffff, 0.7);
  scene.add(ambient);
  const dirLight = new THREE.DirectionalLight(0xffffff, 0.9);
  dirLight.position.set(TL * 0.5, TH * 3, TL * 0.5);
  scene.add(dirLight);

  // ── Truck wireframe ────────────────────────────────────────────────────────
  // BoxGeometry is centred at origin.  Truck spans:
  //   x: [-TW/2, TW/2], y: [-TH/2, TH/2], z: [-TL/2, TL/2]
  const truckGeo = new THREE.BoxGeometry(TW, TH, TL);
  const truckFillMat = new THREE.MeshBasicMaterial({
    color: 0xff6b35,
    transparent: true,
    opacity: 0.04,
    side: THREE.BackSide,
  });
  const truckFillMesh = new THREE.Mesh(truckGeo, truckFillMat);
  scene.add(truckFillMesh);
  const edgesGeo = new THREE.EdgesGeometry(truckGeo);
  const edgesMat = new THREE.LineBasicMaterial({ color: 0xc0440a });
  const truckWireframe = new THREE.LineSegments(edgesGeo, edgesMat);
  scene.add(truckWireframe);

  // ── Grid floor ─────────────────────────────────────────────────────────────
  const gridDivisions = Math.max(10, Math.round(TL * 2));
  const grid = new THREE.GridHelper(TL, gridDivisions, 0xaaaaaa, 0xcccccc);
  grid.position.y = -TH / 2;
  scene.add(grid);

  // ── Stop color lookup ──────────────────────────────────────────────────────
  const stopColorMap = {};
  stops.forEach((st) => { stopColorMap[String(st.id)] = st.color; });

  // ── Item boxes ─────────────────────────────────────────────────────────────
  // Items are placed sequentially along the Z axis (truck length), starting
  // from -TL/2 (rear / deepest) advancing toward +TL/2 (door).
  // x_i = 0 (centred on truck width axis)
  // y_i = -TH/2 + h_i/2 (resting on floor)
  // z_i = accumulated along Z

  const itemObjects = []; // { geo, mat, mesh, helper, labelObj?, normalPos, explodedPos }
  let zCursor = -TL / 2;

  // Expand items by quantity: item with qty=3 produces three independent box entries.
  // Each copy shares the same dimensions, color, and stop assignment but occupies its
  // own sequential z_i slot along the truck length axis.
  const expandedItems = items.flatMap((item) =>
    Array.from({ length: Number(item.quantity) || 1 }, (_, i) => ({ ...item, _copyIndex: i }))
  );

  expandedItems.forEach((item) => {
    // Dimensions l_i (Z), w_i (X), h_i (Y) in metres
    const l_i = Math.max(0.01, (Number(item.length) || 10) / 100); // along Z (truck length)
    const w_i = Math.max(0.01, (Number(item.width)  || 10) / 100); // along X (truck width)
    const h_i = Math.max(0.01, (Number(item.height) || 10) / 100); // along Y (truck height)

    // x_i, y_i, z_i — item centre position (CLAUDE.md naming)
    const x_i = 0;
    const y_i = -TH / 2 + h_i / 2;
    const z_i = zCursor + l_i / 2;
    zCursor += l_i + ITEM_GAP;

    // Color from stop assignment
    const colorHex = item.stopId ? (stopColorMap[String(item.stopId)] || UNASSIGNED_COLOR) : UNASSIGNED_COLOR;

    const geo = new THREE.BoxGeometry(w_i, h_i, l_i);
    const mat = new THREE.MeshLambertMaterial({ color: hexToThreeColor(colorHex) });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x_i, y_i, z_i);
    scene.add(mesh);

    const helper = new THREE.BoxHelper(mesh, new THREE.Color(colorHex).multiplyScalar(0.6));
    scene.add(helper);

    // Normal position (used as lerp target in all non-play modes)
    const normalPos = new THREE.Vector3(x_i, y_i, z_i);

    // Exploded position — placeholder; will be overwritten after all items are built.
    // Set to normalPos temporarily so the array slot exists.
    const explodedPos = normalPos.clone();

    // Play-mode start position — far outside truck along X
    const playStartPos = new THREE.Vector3(-TL * 2, y_i, z_i);

    // CSS2D label (attached regardless; visibility toggled by hiding the element)
    const labelDiv = document.createElement('div');
    labelDiv.style.cssText = [
      'background:rgba(255,255,255,0.9)',
      'border:1px solid #d1d5db',
      'border-radius:4px',
      'padding:2px 6px',
      'font-size:10px',
      'font-family:system-ui,sans-serif',
      'color:#111827',
      'pointer-events:none',
      'white-space:nowrap',
    ].join(';');

    const stopEntry = stops.find((st) => String(st.id) === String(item.stopId));
    labelDiv.textContent = stopEntry ? stopEntry.name : 'Unassigned';
    if (stopEntry) {
      labelDiv.style.borderLeft = `3px solid ${stopEntry.color}`;
    }

    const labelObj = new CSS2DObject(labelDiv);
    // Position label above the centre of the mesh
    labelObj.position.set(0, h_i / 2 + 0.1, 0);
    labelObj.visible = false; // hidden by default; shown in labels mode
    mesh.add(labelObj);

    itemObjects.push({
      geo,
      mat,
      mesh,
      helper,
      labelObj,
      labelDiv,
      normalPos,
      explodedPos,
      playStartPos,
      // Current animated position — starts at normal
      currentPos: normalPos.clone(),
    });
  });

  // ── Exploded positions: row laid out in front of truck along +X ───────────
  // Items are positioned outside the +X face of the truck with a fixed gap
  // between each, resting on the floor (y = h_i/2), centered in Z.
  // EXPLODE_GAP is in metres; TW/2 is the +X face of the truck.
  const EXPLODE_GAP = 0.15;
  {
    let xCursor = TW / 2 + EXPLODE_GAP;
    itemObjects.forEach((obj) => {
      // w_i is the X extent of the item (BoxGeometry first arg)
      const iw = obj.geo.parameters.width;  // BoxGeometry: width = w_i (X)
      const ih = obj.geo.parameters.height; // BoxGeometry: height = h_i (Y)
      obj.explodedPos.set(
        xCursor + iw / 2,    // item centre on X axis
        -TH / 2 + ih / 2,   // resting on the same floor plane as inside the truck
        0                    // centred in Z
      );
      xCursor += iw + EXPLODE_GAP;
    });
  }

  // ── Animation loop state ───────────────────────────────────────────────────
  let animId;
  let currentViewMode = viewMode;

  // Play mode animation state
  let playStartTime = null;
  let playActive = false;
  const PLAY_ITEM_DURATION = 400; // ms per item slide-in

  // Explode lerp state — tracks whether we are expanding or contracted
  // We store the "blend" factor (0 = normal, 1 = exploded) and lerp it
  let explodeBlend = viewMode === 'exploded' ? 1 : 0;
  const EXPLODE_SPEED = 3; // blend units per second

  function setViewModeInternal(mode) {
    currentViewMode = mode;
    if (mode === 'play') {
      // Reset all items to off-screen start
      itemObjects.forEach((obj) => {
        obj.mesh.position.copy(obj.playStartPos);
        obj.helper.update();
      });
      playStartTime = null;
      playActive = true;
    }
    if (mode !== 'play') {
      playActive = false;
    }
    // Labels visibility
    itemObjects.forEach((obj) => {
      obj.labelObj.visible = (mode === 'labels');
    });
    css2dRenderer.domElement.style.display = (mode === 'labels') ? 'block' : 'none';
  }

  // Apply initial view mode
  setViewModeInternal(viewMode);

  function animate(timestamp) {
    animId = requestAnimationFrame(animate);
    const dt = 0.016; // approximate; sufficient for lerp

    if (currentViewMode === 'exploded') {
      explodeBlend = Math.min(1, explodeBlend + EXPLODE_SPEED * dt);
      itemObjects.forEach((obj) => {
        obj.mesh.position.lerpVectors(obj.normalPos, obj.explodedPos, explodeBlend);
        obj.helper.update();
      });
    } else if (currentViewMode === '3d' || currentViewMode === 'labels') {
      explodeBlend = Math.max(0, explodeBlend - EXPLODE_SPEED * dt);
      itemObjects.forEach((obj) => {
        obj.mesh.position.lerpVectors(obj.normalPos, obj.explodedPos, explodeBlend);
        obj.helper.update();
      });
    } else if (currentViewMode === 'play' && playActive) {
      if (playStartTime === null) playStartTime = timestamp;
      const elapsed = timestamp - playStartTime;

      let allDone = true;
      itemObjects.forEach((obj, idx) => {
        const itemStart = idx * PLAY_ITEM_DURATION;
        const itemEnd   = itemStart + PLAY_ITEM_DURATION;
        if (elapsed < itemStart) {
          // Not yet started — keep at off-screen position
          obj.mesh.position.copy(obj.playStartPos);
          allDone = false;
        } else if (elapsed >= itemEnd) {
          // Finished — snap to final position
          obj.mesh.position.copy(obj.normalPos);
        } else {
          // Animating — lerp
          const t = (elapsed - itemStart) / PLAY_ITEM_DURATION;
          obj.mesh.position.lerpVectors(obj.playStartPos, obj.normalPos, t);
          allDone = false;
        }
        obj.helper.update();
      });

      if (allDone) {
        playActive = false;
      }
    }

    controls.update();
    renderer.render(scene, camera);
    if (currentViewMode === 'labels') {
      css2dRenderer.render(scene, camera);
    }
  }
  animate(0);

  // ── Resize handler ─────────────────────────────────────────────────────────
  function onResize() {
    const w = mount.clientWidth;
    const h = mount.clientHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
    css2dRenderer.setSize(w, h);
  }
  window.addEventListener('resize', onResize);

  // ── Dispose ────────────────────────────────────────────────────────────────
  function dispose() {
    cancelAnimationFrame(animId);
    window.removeEventListener('resize', onResize);
    controls.dispose();

    itemObjects.forEach(({ geo, mat, helper }) => {
      geo.dispose();
      mat.dispose();
      helper.geometry.dispose();
      helper.material.dispose();
    });

    truckGeo.dispose();
    truckFillMat.dispose();
    edgesGeo.dispose();
    edgesMat.dispose();
    grid.geometry.dispose();
    grid.material.dispose();

    renderer.dispose();
    if (mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement);
    if (mount.contains(css2dRenderer.domElement)) mount.removeChild(css2dRenderer.domElement);
  }

  return {
    dispose,
    camera,
    controls,
    setViewModeInternal,
  };
}

// ── View mode labels ───────────────────────────────────────────────────────────

const VIEW_MODES = [
  { key: '3d',       label: '3D View' },
  { key: 'exploded', label: 'Exploded' },
  { key: 'labels',   label: 'Labels' },
  { key: 'play',     label: '\u25B6 Play' },
];

// ── Component ─────────────────────────────────────────────────────────────────

export default function SimulatorCanvas({ viewMode, setViewMode, items, truck, stops }) {
  const mountRef      = useRef(null);
  const sceneApiRef   = useRef(null); // { dispose, camera, controls, setViewModeInternal }

  const [zoomPct, setZoomPct]         = useState(100);
  const [interactionLabel, setInteractionLabel] = useState('Idle');
  const mouseStateRef = useRef({ leftDown: false, rightDown: false, moving: false });

  // ── Scene lifecycle ─────────────────────────────────────────────────────────
  // Rebuild scene when items, truck dimensions, or stops change.
  // viewMode changes are handled reactively via setViewModeInternal (no rebuild).
  useEffect(() => {
    if (!mountRef.current) return;

    // Dispose previous scene
    if (sceneApiRef.current) {
      sceneApiRef.current.dispose();
      sceneApiRef.current = null;
    }

    const api = buildScene({
      mount: mountRef.current,
      items: items || [],
      truck: truck || { width: 240, height: 244, length: 1360, maxWeight: 20000, quantity: 1 },
      stops: stops || [],
      viewMode: viewMode,
      onCameraZoomChange: setZoomPct,
    });
    sceneApiRef.current = api;

    // ── Mouse interaction label listeners ───────────────────────────────────
    // Attached to the mount div so events only fire within the canvas bounds.
    const container = mountRef.current;

    const updateLabel = () => {
      const s = mouseStateRef.current;
      if (s.leftDown && s.moving)       setInteractionLabel('Orbiting');
      else if (s.rightDown && s.moving) setInteractionLabel('Panning');
      else                              setInteractionLabel('Idle');
    };

    const onMouseDown = (e) => {
      if (e.button === 0) mouseStateRef.current.leftDown  = true;
      if (e.button === 2) mouseStateRef.current.rightDown = true;
      updateLabel();
    };
    const onMouseUp = (e) => {
      if (e.button === 0) mouseStateRef.current.leftDown  = false;
      if (e.button === 2) mouseStateRef.current.rightDown = false;
      mouseStateRef.current.moving = false;
      updateLabel();
    };
    const onMouseMove = () => {
      if (mouseStateRef.current.leftDown || mouseStateRef.current.rightDown) {
        mouseStateRef.current.moving = true;
        updateLabel();
      }
    };

    container.addEventListener('mousedown', onMouseDown);
    container.addEventListener('mouseup',   onMouseUp);
    container.addEventListener('mousemove', onMouseMove);

    return () => {
      container.removeEventListener('mousedown', onMouseDown);
      container.removeEventListener('mouseup',   onMouseUp);
      container.removeEventListener('mousemove', onMouseMove);

      if (sceneApiRef.current) {
        sceneApiRef.current.dispose();
        sceneApiRef.current = null;
      }
    };
    // Intentionally exclude viewMode from deps — mode changes go through setViewModeInternal
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, truck, stops]);

  // Propagate viewMode changes into the running scene without rebuilding
  useEffect(() => {
    if (sceneApiRef.current) {
      sceneApiRef.current.setViewModeInternal(viewMode);
    }
  }, [viewMode]);

  // ── Camera controls ─────────────────────────────────────────────────────────

  function handleResetView() {
    if (sceneApiRef.current) {
      sceneApiRef.current.controls.reset();
    }
  }

  function handleZoomIn() {
    if (!sceneApiRef.current) return;
    const cam = sceneApiRef.current.camera;
    cam.zoom = Math.min(cam.zoom * 1.1, 10);
    cam.updateProjectionMatrix();
    setZoomPct(Math.round(cam.zoom * 100));
  }

  function handleZoomOut() {
    if (!sceneApiRef.current) return;
    const cam = sceneApiRef.current.camera;
    cam.zoom = Math.max(cam.zoom * 0.9, 0.1);
    cam.updateProjectionMatrix();
    setZoomPct(Math.round(cam.zoom * 100));
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div style={s.wrapper}>
      {/* Three.js + CSS2DRenderer mount point */}
      <div ref={mountRef} style={s.mount} />

      {/* Stop legend overlay — only in labels mode */}
      {viewMode === 'labels' && stops && stops.length > 0 && (
        <div style={s.legend}>
          <div style={s.legendTitle}>Delivery Stops</div>
          {stops.map((stop, idx) => (
            <div key={stop.id} style={s.legendRow}>
              <div style={s.legendDot(stop.color)} />
              <span style={s.legendLabel}>Stop {idx + 1} — {stop.name}</span>
            </div>
          ))}
          <div style={s.legendRow}>
            <div style={s.legendDot(UNASSIGNED_COLOR)} />
            <span style={s.legendLabel}>Unassigned</span>
          </div>
        </div>
      )}

      {/* Bottom-left: view mode pill toggle */}
      <div style={s.viewToggle}>
        {VIEW_MODES.map(({ key, label }) => (
          <button
            key={key}
            style={s.viewBtn(viewMode === key)}
            onClick={() => setViewMode(key)}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Top-right: View Controls floating card */}
      <div style={s.viewCard}>
        <div style={s.cardTitle}>View Controls</div>

        <div style={s.ilpRow}>
          <div style={s.ilpDot} />
          <span style={s.ilpText}>ILP active</span>
        </div>

        <div style={{ marginBottom: 8 }}>
          <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 4 }}>Drag Mode</div>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            background: interactionLabel === 'Idle' ? '#f3f4f6' : '#111827',
            color: interactionLabel === 'Idle' ? '#6b7280' : '#ffffff',
            borderRadius: 20, padding: '4px 12px', fontSize: 12, fontWeight: 600,
            transition: 'background 0.15s, color 0.15s',
          }}>
            <span style={{
              width: 7, height: 7, borderRadius: '50%',
              background: interactionLabel === 'Orbiting' ? '#3b82f6'
                        : interactionLabel === 'Panning'  ? '#f59e0b'
                        : '#9ca3af',
              display: 'inline-block',
            }} />
            {interactionLabel}
          </div>
        </div>

        <button style={s.resetViewBtn} onClick={handleResetView}>
          &#8635; Reset View
        </button>

        <div style={s.zoomRow}>
          <span style={s.zoomLabel}>Zoom</span>
          <div style={s.zoomControls}>
            <button style={s.zoomBtn} onClick={handleZoomOut}>&minus;</button>
            <span style={s.zoomValue}>{zoomPct}%</span>
            <button style={s.zoomBtn} onClick={handleZoomIn}>+</button>
          </div>
        </div>

        <ul style={s.instructionList}>
          <li style={s.instructionItem}>&#10012; Drag to orbit</li>
          <li style={s.instructionItem}>&#x293F; Right-click to pan</li>
          <li style={s.instructionItem}>&#9678; Scroll to zoom</li>
        </ul>
      </div>

      {/* Bottom-right: FAB */}
      <button style={s.fab} title="Help">?</button>
    </div>
  );
}
