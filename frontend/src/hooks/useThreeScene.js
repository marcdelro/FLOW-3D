/**
 * useThreeScene.js
 *
 * Custom React hook that owns the entire Three.js scene lifecycle:
 * init → build container wireframe → place items → animate → dispose.
 *
 * Design decisions:
 * - All Three.js state lives inside this hook's closure, never in React state.
 *   React state triggers re-renders; Three.js scene mutations do not need to.
 * - The hook receives the placement manifest as arguments (read from Zustand
 *   by the parent component) — it never reads from the store or fetches data.
 * - InstancedMesh is used when 3 or more items share the same (l, w, h)
 *   dimensions, reducing draw calls from N to 1 per geometry type.
 * - Geometries and materials are disposed on every solution replacement to
 *   prevent WebGL memory leaks (CLAUDE.md performance rule).
 * - The render loop is capped at 30 fps via a time-delta gate so we do not
 *   waste GPU cycles when the scene is idle.
 *
 * Coordinate mapping (CLAUDE.md):
 *   Three.js X ← mm x_i  (length axis, left→right)
 *   Three.js Y ← mm y_i  (height axis, bottom→top)
 *   Three.js Z ← mm z_i  (depth axis,  front→back / door→wall)
 * All values are passed to Three.js as-is (mm as world units). At a container
 * scale of ~6 000 mm the numbers are well within float32 precision limits.
 */

import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { STOP_COLORS, getStopColor } from '../utils/stopColors.js';

// ── Constants ────────────────────────────────────────────────────────────────

/** Target frame interval in ms (≈30 fps). */
const FRAME_INTERVAL_MS = 1000 / 30;

/** Opacity for item bounding-box faces (semi-transparent fill). */
const ITEM_FACE_OPACITY = 0.18;

/** Minimum number of items with identical dims to use InstancedMesh. */
const INSTANCED_THRESHOLD = 3;

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Build a key string that identifies items with identical dimensions so we
 * can group them for InstancedMesh batching.
 *
 * @param {object} p - Placement entry.
 * @returns {string}
 */
function dimKey(p) {
  return `${p.l}x${p.w}x${p.h}`;
}

/**
 * Create the container wireframe LineSegments object.
 * The box is positioned so its origin is at (0,0,0) and extends to (L, H, W)
 * in Three.js space.
 *
 * @param {object} container - { L, W, H } in mm.
 * @returns {THREE.LineSegments}
 */
function buildContainerWireframe(container) {
  const { L, W, H } = container;
  // BoxGeometry is centred at origin; shift so the floor corner sits at (0,0,0).
  const geo = new THREE.BoxGeometry(L, H, W);
  geo.translate(L / 2, H / 2, W / 2);
  const mat = new THREE.LineBasicMaterial({ color: 0x44aaff, linewidth: 1 });
  const wireframe = new THREE.WireframeGeometry(geo);
  const lines = new THREE.LineSegments(wireframe, mat);
  // Keep references for disposal.
  lines.userData.disposables = [geo, wireframe, mat];
  return lines;
}

/**
 * Group placements by their dimension key for InstancedMesh batching.
 *
 * @param {Array} placements
 * @returns {Map<string, Array>} - dim key → [placement, ...]
 */
function groupByDimensions(placements) {
  const groups = new Map();
  for (const p of placements) {
    const key = dimKey(p);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(p);
  }
  return groups;
}

/**
 * Build Three.js objects for all placements.
 * Returns a flat array of THREE.Object3D instances added to the scene,
 * plus a list of disposables (geometries + materials) for cleanup.
 *
 * Uses InstancedMesh when a dimension group has >= INSTANCED_THRESHOLD items,
 * falling back to individual Mesh objects otherwise.
 *
 * @param {Array}  placements  - Manifest placement array.
 * @param {object} container   - { L, W, H }.
 * @returns {{ objects: THREE.Object3D[], disposables: THREE.BufferGeometry[]|THREE.Material[] }}
 */
function buildItemObjects(placements, container) {
  const objects = [];
  const disposables = [];

  const groups = groupByDimensions(placements);
  const dummy = new THREE.Object3D();

  for (const [key, items] of groups) {
    const { l, w, h } = items[0]; // All items in this group share these dims.

    // ── Shared geometry for this dimension group ──────────────────────────
    // BoxGeometry centred at origin; we translate per-instance via matrix.
    const boxGeo = new THREE.BoxGeometry(l, h, w);
    disposables.push(boxGeo);

    if (items.length >= INSTANCED_THRESHOLD) {
      // ── InstancedMesh path: one draw call for all items in this group ──
      // Each delivery stop may have a different color, so we store per-instance
      // color via InstancedMesh.setColorAt().
      const mat = new THREE.MeshLambertMaterial({
        transparent: true,
        opacity: ITEM_FACE_OPACITY,
        side: THREE.DoubleSide,
      });
      disposables.push(mat);

      const mesh = new THREE.InstancedMesh(boxGeo, mat, items.length);
      mesh.instanceColor = new THREE.InstancedBufferAttribute(
        new Float32Array(items.length * 3),
        3
      );

      const edgeMat = new THREE.LineBasicMaterial({ vertexColors: true });
      disposables.push(edgeMat);

      // Build a shared EdgeGeometry for the wireframe outline of each instance.
      // Three.js InstancedMesh does not natively instance line geometry, so we
      // create individual LineSegments for the outlines and batch the faces.
      const edgeGeo = new THREE.EdgesGeometry(boxGeo);
      disposables.push(edgeGeo);

      const color = new THREE.Color();

      items.forEach((p, idx) => {
        // Position: place the centre of the box at (x + l/2, y + h/2, z + w/2).
        dummy.position.set(p.x + l / 2, p.y + h / 2, p.z + w / 2);
        dummy.updateMatrix();
        mesh.setMatrixAt(idx, dummy.matrix);

        color.set(getStopColor(p.delivery_stop));
        mesh.setColorAt(idx, color);

        // Per-instance edge lines (not instanced, but there are few unique dims).
        const edgeLineMat = new THREE.LineBasicMaterial({
          color: getStopColor(p.delivery_stop),
          linewidth: 1,
        });
        disposables.push(edgeLineMat);
        const edgeLines = new THREE.LineSegments(edgeGeo, edgeLineMat);
        edgeLines.position.set(p.x + l / 2, p.y + h / 2, p.z + w / 2);
        edgeLines.userData.itemId = p.item_id;
        edgeLines.userData.deliveryStop = p.delivery_stop;
        objects.push(edgeLines);
      });

      mesh.instanceMatrix.needsUpdate = true;
      mesh.instanceColor.needsUpdate = true;
      mesh.userData.dimKey = key;
      objects.push(mesh);
    } else {
      // ── Individual Mesh path: used for unique or rare dimension groups ──
      for (const p of items) {
        const stopColor = getStopColor(p.delivery_stop);

        // Semi-transparent face mesh.
        const faceMat = new THREE.MeshLambertMaterial({
          color: stopColor,
          transparent: true,
          opacity: ITEM_FACE_OPACITY,
          side: THREE.DoubleSide,
        });
        disposables.push(faceMat);
        const faceMesh = new THREE.Mesh(boxGeo, faceMat);
        faceMesh.position.set(p.x + l / 2, p.y + h / 2, p.z + w / 2);
        faceMesh.userData.itemId = p.item_id;
        faceMesh.userData.deliveryStop = p.delivery_stop;
        objects.push(faceMesh);

        // Opaque edge outline.
        const edgeGeo = new THREE.EdgesGeometry(boxGeo);
        disposables.push(edgeGeo);
        const edgeMat = new THREE.LineBasicMaterial({ color: stopColor });
        disposables.push(edgeMat);
        const edges = new THREE.LineSegments(edgeGeo, edgeMat);
        edges.position.set(p.x + l / 2, p.y + h / 2, p.z + w / 2);
        objects.push(edges);
      }
    }
  }

  return { objects, disposables };
}

// ── Hook ─────────────────────────────────────────────────────────────────────

/**
 * useThreeScene
 *
 * @param {React.RefObject<HTMLDivElement>} mountRef - DOM node the canvas attaches to.
 * @param {object|null}  container   - { L, W, H } in mm, or null when no solution.
 * @param {Array}        placements  - Placement manifest array (may be empty).
 * @returns {void}
 */
export function useThreeScene(mountRef, container, placements) {
  // Refs that persist across renders without triggering re-renders.
  const rendererRef = useRef(null);
  const sceneRef    = useRef(null);
  const cameraRef   = useRef(null);
  const controlsRef = useRef(null);
  const rafRef      = useRef(null);
  const lastFrameRef = useRef(0);

  // Track objects added for the current solution so we can dispose them cleanly.
  const solutionObjectsRef  = useRef([]);
  const solutionDisposables = useRef([]);

  // ── Scene initialisation (runs once on mount) ────────────────────────────
  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    renderer.setClearColor(0x111318, 1);
    mount.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Scene
    const scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0x111318, 15000, 60000);
    sceneRef.current = scene;

    // Camera — perspective, positioned at a comfortable isometric-ish angle.
    const aspect = mount.clientWidth / mount.clientHeight;
    const camera = new THREE.PerspectiveCamera(45, aspect, 1, 100000);
    camera.position.set(8000, 6000, 12000);
    camera.lookAt(3000, 1300, 1200);
    cameraRef.current = camera;

    // Lights
    const ambient = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambient);
    const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
    dirLight.position.set(5000, 10000, 7000);
    scene.add(dirLight);
    const fillLight = new THREE.DirectionalLight(0x8899bb, 0.4);
    fillLight.position.set(-5000, 2000, -3000);
    scene.add(fillLight);

    // OrbitControls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.minDistance = 500;
    controls.maxDistance = 80000;
    controlsRef.current = controls;

    // Capped render loop — only render when damping is active or controls moved.
    function animate(now) {
      rafRef.current = requestAnimationFrame(animate);
      if (now - lastFrameRef.current < FRAME_INTERVAL_MS) return;
      lastFrameRef.current = now;
      controls.update();
      renderer.render(scene, camera);
    }
    rafRef.current = requestAnimationFrame(animate);

    // Resize handler
    function onResize() {
      if (!mount) return;
      const w = mount.clientWidth;
      const h = mount.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    }
    const resizeObserver = new ResizeObserver(onResize);
    resizeObserver.observe(mount);

    return () => {
      // ── Full scene teardown on unmount ───────────────────────────────
      cancelAnimationFrame(rafRef.current);
      resizeObserver.disconnect();
      controls.dispose();
      renderer.dispose();
      if (mount.contains(renderer.domElement)) {
        mount.removeChild(renderer.domElement);
      }
    };
  }, []); // Intentionally empty — runs once.

  // ── Solution update (runs when placements or container changes) ──────────
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;

    // ── Disposal of the previous solution ────────────────────────────────
    for (const obj of solutionObjectsRef.current) {
      scene.remove(obj);
    }
    for (const resource of solutionDisposables.current) {
      resource.dispose?.();
    }
    solutionObjectsRef.current = [];
    solutionDisposables.current = [];

    if (!container || placements.length === 0) return;

    // ── Container wireframe ───────────────────────────────────────────────
    const containerLines = buildContainerWireframe(container);
    scene.add(containerLines);
    solutionObjectsRef.current.push(containerLines);
    solutionDisposables.current.push(...containerLines.userData.disposables);

    // ── Item bounding boxes ───────────────────────────────────────────────
    const { objects, disposables } = buildItemObjects(placements, container);
    for (const obj of objects) scene.add(obj);
    solutionObjectsRef.current.push(...objects);
    solutionDisposables.current.push(...disposables);

    // Reframe the camera so the full container is visible.
    const camera = cameraRef.current;
    const controls = controlsRef.current;
    if (camera && controls) {
      const { L, W, H } = container;
      const centre = new THREE.Vector3(L / 2, H / 2, W / 2);
      controls.target.copy(centre);
      camera.position.set(L * 1.4, H * 1.6, W * 2.2);
      camera.lookAt(centre);
      controls.update();
    }
  }, [container, placements]);
}
