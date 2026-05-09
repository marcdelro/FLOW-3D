import type React from "react";
import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader.js";

import type { FurnitureItem, PackingPlan, Placement } from "../types";
import { resolveModelMeta } from "../data/modelCatalog";
import type { AxisUp } from "../data/modelCatalog";

// ── Constants ─────────────────────────────────────────────────────────────────

/** 1 Three.js unit = 10 mm → truck ≈ 240 × 244 × 1360 units */
const MM_PER_UNIT = 10;

/** Stop colours — index 0 = stop_id 1 */
const STOP_PALETTE: number[] = [
  0xf0997b, // stop 1 — warm orange (nearest door)
  0x5dcaa5, // stop 2 — teal
  0xafa9ec, // stop 3 — soft purple
  0x60a5fa, // stop 4 — blue
  0xfbbf24, // stop 5 — amber
  0xf472b6, // stop 6 — pink
  0x34d399, // stop 7 — emerald
];
const FALLBACK_COLOR = 0x888780;

function colorForStop(stop_id: number): number {
  return STOP_PALETTE[(stop_id - 1) % STOP_PALETTE.length] ?? FALLBACK_COLOR;
}

function hexCss(n: number): string {
  return `#${n.toString(16).padStart(6, "0")}`;
}

/** Render item_id text as a billboard sprite above the item. */
function makeTextSprite(text: string, lightMode?: boolean): THREE.Sprite {
  const canvas = document.createElement("canvas");
  canvas.width  = 512;
  canvas.height = 80;
  const ctx = canvas.getContext("2d")!;

  // Rounded pill background with strong border for readability on both themes
  const bgColor  = lightMode ? "rgba(255,255,255,0.98)" : "rgba(8,10,20,0.97)";
  const bdrColor = lightMode ? "rgba(71,85,105,0.75)"   : "rgba(148,163,184,0.55)";
  ctx.fillStyle = bgColor;
  ctx.beginPath();
  ctx.roundRect(4, 4, canvas.width - 8, canvas.height - 8, 12);
  ctx.fill();
  ctx.strokeStyle = bdrColor;
  ctx.lineWidth = 3;
  ctx.stroke();

  // Bold label — white on dark, near-black on light
  ctx.font = "bold 34px 'Segoe UI', system-ui, sans-serif";
  ctx.textBaseline = "middle";
  ctx.textAlign = "left";
  ctx.fillStyle = lightMode ? "#0f172a" : "#ffffff";
  const label = text.length > 22 ? text.slice(0, 20) + "…" : text;
  ctx.fillText(label, 18, canvas.height / 2);

  const texture = new THREE.CanvasTexture(canvas);
  const mat = new THREE.SpriteMaterial({
    map: texture,
    depthTest: false,
    sizeAttenuation: true,
  });
  const sprite = new THREE.Sprite(mat);
  sprite.scale.set(110, 22, 1);
  return sprite;
}

/**
 * Scale and orient a loaded OBJ group so its bounding box exactly fills
 * (w_mm × h_mm × l_mm) in Three.js space (X = truck width, Y = up, Z = truck depth).
 * After the call, the bbox min-corner sits at world origin so the caller can
 * position by adding the placement corner (p.x/10, p.z/10, p.y/10 + zOffset).
 */
function fitModelToBox(
  obj: THREE.Group,
  w_mm: number,
  l_mm: number,
  h_mm: number,
  axisUp: AxisUp = "auto",
): void {
  obj.position.set(0, 0, 0);
  obj.rotation.set(0, 0, 0);
  obj.scale.set(1, 1, 1);
  obj.updateMatrixWorld(true);

  const raw = new THREE.Box3().setFromObject(obj);
  if (raw.isEmpty()) return;

  const size = raw.getSize(new THREE.Vector3());
  if (size.x < 1e-6 || size.y < 1e-6 || size.z < 1e-6) return;

  const tW = w_mm / MM_PER_UNIT;
  const tH = h_mm / MM_PER_UNIT;
  const tL = l_mm / MM_PER_UNIT;

  const resolved: "y" | "z" | "x" =
    axisUp === "auto"
      ? (h_mm >= w_mm && h_mm >= l_mm && size.z > size.y * 1.2 ? "z" : "y")
      : axisUp;

  let sx: number, sy: number, sz: number;

  if (resolved === "z") {
    obj.rotation.x = -Math.PI / 2;
    sx = tW / size.x;
    sz = tH / size.z;
    sy = tL / size.y;
  } else if (resolved === "x") {
    obj.rotation.z = Math.PI / 2;
    sx = tH / size.x;
    sy = tW / size.y;
    sz = tL / size.z;
  } else {
    sx = tW / size.x;
    sy = tH / size.y;
    sz = tL / size.z;
  }

  obj.scale.set(sx, sy, sz);
  obj.updateMatrixWorld(true);

  const placed = new THREE.Box3().setFromObject(obj);
  const mn = placed.min;
  obj.position.set(-mn.x, -mn.y, -mn.z);
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface TruckViewerProps {
  plan:      PackingPlan;
  truck:     { W: number; L: number; H: number };
  /** Original input items — used to look up boxed/fragile metadata for visualization. */
  items?:    FurnitureItem[];
  lightMode?: boolean;
}

type ViewMode = "3d" | "exploded" | "labels" | "animate";

interface TooltipState {
  placement: Placement;
  meta?:     { boxed?: boolean; fragile?: boolean };
  x: number;
  y: number;
  mountWidth: number;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function TruckViewer({ plan, truck, items = [], lightMode = false }: TruckViewerProps) {
  // item_id → input metadata so we can render boxed wrappers / fragile decals
  // without round-tripping the data through the solver.
  const itemMeta = new Map<string, { boxed?: boolean; fragile?: boolean }>();
  for (const it of items) itemMeta.set(it.item_id, { boxed: it.boxed, fragile: it.fragile });
  const mountRef        = useRef<HTMLDivElement | null>(null);
  const cameraPosRef    = useRef(new THREE.Vector3(-600, 600, 1400));
  const cameraTargetRef = useRef<THREE.Vector3 | null>(null);

  const modelCacheRef = useRef<Map<string, THREE.Group | null>>(new Map());
  const cameraRef     = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef   = useRef<OrbitControls | null>(null);

  const [mode, setMode]           = useState<ViewMode>("3d");
  const [tooltip, setTooltip]     = useState<TooltipState | null>(null);
  const [modelsVersion, setModelsVersion] = useState(0);
  const [activeView,    setActiveView]    = useState<"reset" | "top" | "front" | "side" | null>(null);
  const [pressedKey,    setPressedKey]    = useState<string | null>(null);
  const [camOpen,       setCamOpen]       = useState(false);

  // ── Animation state ────────────────────────────────────────────────────────
  const [animStep,         setAnimStep]         = useState(0);
  const [isPlaying,        setIsPlaying]        = useState(false);
  const [animSpeed,        setAnimSpeed]        = useState(900);
  const [showPlacingBadge, setShowPlacingBadge] = useState(false);
  const [showLoadedBadge,  setShowLoadedBadge]  = useState(false);

  const packed      = plan.placements.filter((p) => p.is_packed);
  const uniqueStops = [...new Set(packed.map((p) => p.stop_id))].sort((a, b) => a - b);

  const animSorted = [...packed].sort((a, b) => b.stop_id - a.stop_id);
  const displayItems = mode === "animate" ? animSorted.slice(0, animStep) : packed;
  const latestItem   = mode === "animate" && animStep > 0
    ? animSorted[animStep - 1]
    : null;

  useEffect(() => {
    setAnimStep(0);
    setIsPlaying(false);
    setShowPlacingBadge(false);
    setShowLoadedBadge(false);
  }, [plan]);

  // Auto-dismiss the "Placing" badge 2 s after the last item change.
  useEffect(() => {
    if (!latestItem) return;
    setShowPlacingBadge(true);
    const id = setTimeout(() => setShowPlacingBadge(false), 2000);
    return () => clearTimeout(id);
  }, [latestItem]);

  // Auto-dismiss the "All loaded" badge 3 s after it first appears.
  useEffect(() => {
    if (animStep >= animSorted.length && animSorted.length > 0) {
      setShowLoadedBadge(true);
      const id = setTimeout(() => setShowLoadedBadge(false), 3000);
      return () => clearTimeout(id);
    }
    setShowLoadedBadge(false);
  }, [animStep, animSorted.length]);

  useEffect(() => {
    if (!isPlaying || mode !== "animate") return;
    if (animStep >= animSorted.length) { setIsPlaying(false); return; }
    const id = setTimeout(() => setAnimStep((s) => s + 1), animSpeed);
    return () => clearTimeout(id);
  }, [isPlaying, animStep, animSorted.length, animSpeed, mode]);

  // ── Model loading effect ───────────────────────────────────────────────────
  useEffect(() => {
    const loader  = new OBJLoader();
    const toLoad: string[] = [];

    for (const p of packed) {
      const metaDefault = resolveModelMeta(p.item_id);
      const metaVariant = resolveModelMeta(p.item_id, p.model_variant);

      for (const meta of [metaDefault, metaVariant]) {
        if (meta && !modelCacheRef.current.has(meta.path)) {
          modelCacheRef.current.set(meta.path, null);
          toLoad.push(meta.path);
        }
      }
    }

    if (toLoad.length === 0) return;

    let cancelled = false;

    Promise.all(
      toLoad.map((path) =>
        loader
          .loadAsync(path)
          .then((obj) => [path, obj] as const)
          .catch(() => [path, null] as const),
      ),
    ).then((entries) => {
      if (cancelled) return;
      for (const [path, obj] of entries) {
        modelCacheRef.current.set(path, obj);
      }
      setModelsVersion((v) => v + 1);
    });

    return () => {
      cancelled = true;
      for (const path of toLoad) {
        if (modelCacheRef.current.get(path) === null) {
          modelCacheRef.current.delete(path);
        }
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plan]);

  // ── Scene / renderer effect ────────────────────────────────────────────────
  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const width  = mount.clientWidth  || 800;
    const height = mount.clientHeight || 600;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(lightMode ? 0xf3f4f6 : 0x0b0d12);

    const camera = new THREE.PerspectiveCamera(45, width / height, 1, 20000);
    camera.position.copy(cameraPosRef.current);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    mount.appendChild(renderer.domElement);

    // ── Lighting ───────────────────────────────────────────────────────────
    scene.add(new THREE.AmbientLight(0xffffff, lightMode ? 1.2 : 0.9));
    const sun = new THREE.DirectionalLight(0xffffff, 0.65);
    sun.position.set(400, 800, 600);
    scene.add(sun);
    const fill = new THREE.DirectionalLight(0x8fa0c8, 0.25);
    fill.position.set(-300, 100, -500);
    scene.add(fill);

    const truckW = truck.W / MM_PER_UNIT;
    const truckL = truck.L / MM_PER_UNIT;
    const truckH = truck.H / MM_PER_UNIT;

    // ── Floor grid ─────────────────────────────────────────────────────────
    const gridHelper = new THREE.GridHelper(
      Math.max(truckW, truckL) * 1.5,
      20,
      lightMode ? 0xcbd5e1 : 0x1e2533,
      lightMode ? 0xbfc9d6 : 0x1a2030,
    );
    gridHelper.position.set(truckW / 2, -0.3, truckL / 2);
    scene.add(gridHelper);

    // ── Truck interior floor ───────────────────────────────────────────────
    const floorGeo = new THREE.PlaneGeometry(truckW, truckL);
    const floorMat = new THREE.MeshBasicMaterial({
      color: lightMode ? 0xdde1ea : 0x111827,
      transparent: true,
      opacity: 0.45,
      side: THREE.DoubleSide,
    });
    const floorMesh = new THREE.Mesh(floorGeo, floorMat);
    floorMesh.rotation.x = -Math.PI / 2;
    floorMesh.position.set(truckW / 2, 0.1, truckL / 2);
    scene.add(floorMesh);

    // ── Truck wireframe ────────────────────────────────────────────────────
    const truckGeo     = new THREE.BoxGeometry(truckW, truckH, truckL);
    const truckEdgeGeo = new THREE.EdgesGeometry(truckGeo);
    const truckWire    = new THREE.LineSegments(
      truckEdgeGeo,
      new THREE.LineBasicMaterial({ color: lightMode ? 0x94a3b8 : 0x2d3748 }),
    );
    truckWire.position.set(truckW / 2, truckH / 2, truckL / 2);
    scene.add(truckWire);

    // ── Door face — stronger tint at z = truckL (thesis: y = L is loading door) ─
    const doorGeo = new THREE.PlaneGeometry(truckW, truckH);
    const doorMat = new THREE.MeshBasicMaterial({
      color: 0x1e3a5f, transparent: true, opacity: 0.28, side: THREE.DoubleSide,
    });
    const doorMesh = new THREE.Mesh(doorGeo, doorMat);
    doorMesh.position.set(truckW / 2, truckH / 2, truckL);
    scene.add(doorMesh);

    // Door frame — bright blue edge outline
    const doorFrameGeo = new THREE.EdgesGeometry(new THREE.PlaneGeometry(truckW, truckH));
    const doorFrameMat = new THREE.LineBasicMaterial({ color: 0x3b82f6, transparent: true, opacity: 0.7 });
    const doorFrame = new THREE.LineSegments(doorFrameGeo, doorFrameMat);
    doorFrame.position.set(truckW / 2, truckH / 2, truckL);
    scene.add(doorFrame);

    // Door centre split line (vertical — suggests double doors)
    const splitPoints = [
      new THREE.Vector3(truckW / 2, 0, truckL),
      new THREE.Vector3(truckW / 2, truckH, truckL),
    ];
    const splitGeo = new THREE.BufferGeometry().setFromPoints(splitPoints);
    const splitMat = new THREE.LineBasicMaterial({ color: 0x3b82f6, transparent: true, opacity: 0.45 });
    scene.add(new THREE.Line(splitGeo, splitMat));

    // Door label sprite
    const doorSprite = makeTextSprite("DOOR →", lightMode);
    doorSprite.position.set(truckW / 2, truckH + 10, truckL);
    doorSprite.scale.set(60, 14, 1);
    scene.add(doorSprite);

    // ── Exploded-view offset ───────────────────────────────────────────────
    const stopOrder = [...new Set(packed.map((p) => p.stop_id))].sort((a, b) => b - a);
    const EXPLODE_GAP = 120;

    // ── Disposal lists ─────────────────────────────────────────────────────
    const geos: THREE.BufferGeometry[] = [truckGeo, truckEdgeGeo, floorGeo, doorGeo, doorFrameGeo, splitGeo];
    const mats: THREE.Material[]       = [floorMat, truckWire.material as THREE.Material, doorMat, doorFrameMat, splitMat];
    const spriteMats: THREE.SpriteMaterial[] = [doorSprite.material as THREE.SpriteMaterial];

    // ── Item meshes for raycasting ─────────────────────────────────────────
    const itemMeshes: THREE.Mesh[] = [];

    // ── Render each visible item ───────────────────────────────────────────
    for (let i = 0; i < displayItems.length; i++) {
      const p        = displayItems[i];
      const isLatest = p === latestItem;

      const w = p.w / MM_PER_UNIT;
      const l = p.l / MM_PER_UNIT;
      const h = p.h / MM_PER_UNIT;

      const stopIdx = stopOrder.indexOf(p.stop_id);
      const zOffset = mode === "exploded" ? stopIdx * EXPLODE_GAP : 0;

      const cx = p.x / MM_PER_UNIT + w / 2;
      const cy = p.z / MM_PER_UNIT + h / 2;
      const cz = p.y / MM_PER_UNIT + l / 2 + zOffset;

      const color   = colorForStop(p.stop_id);
      const opacity = mode === "labels"   ? 0.65
                    : mode === "animate" && !isLatest ? 0.50
                    : 0.88;
      const outlineColor   = isLatest ? 0x60a5fa : 0x0b0d12;
      const outlineOpacity = isLatest ? 0.90    : 0.45;

      const meta        = resolveModelMeta(p.item_id, p.model_variant);
      const cachedModel = meta !== null ? modelCacheRef.current.get(meta.path) : undefined;
      const hasModel    = cachedModel !== null && cachedModel !== undefined;

      let useModel = false;
      let clone: THREE.Group | null = null;

      if (hasModel) {
        clone = (cachedModel as THREE.Group).clone(true);
        fitModelToBox(clone, p.w, p.l, p.h, meta!.axisUp);
        const cloneBbox = new THREE.Box3().setFromObject(clone);
        useModel = !cloneBbox.isEmpty();
      }

      if (useModel && clone) {
        // ── 3D model path ────────────────────────────────────────────────
        clone.position.add(new THREE.Vector3(
          p.x / MM_PER_UNIT,
          p.z / MM_PER_UNIT,
          p.y / MM_PER_UNIT + zOffset,
        ));

        clone.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            const mat = new THREE.MeshLambertMaterial({ color, transparent: true, opacity });
            child.material = mat;
            mats.push(mat);
            child.userData = { placement: p };
            itemMeshes.push(child);
          }
        });

        scene.add(clone);

        const eGeo  = new THREE.BoxGeometry(w, h, l);
        const eEdge = new THREE.EdgesGeometry(eGeo);
        const eMat  = new THREE.LineBasicMaterial({ color: outlineColor, transparent: true, opacity: outlineOpacity });
        geos.push(eGeo, eEdge);
        mats.push(eMat);
        const edges = new THREE.LineSegments(eEdge, eMat);
        edges.position.set(cx, cy, cz);
        scene.add(edges);

      } else {
        // ── Fallback: coloured box (model not loaded or geometry invalid) ─
        const geom = new THREE.BoxGeometry(w, h, l);
        geos.push(geom);

        const mat = new THREE.MeshLambertMaterial({ color, transparent: true, opacity });
        mats.push(mat);

        const mesh = new THREE.Mesh(geom, mat);
        mesh.position.set(cx, cy, cz);
        mesh.userData = { placement: p };
        scene.add(mesh);
        itemMeshes.push(mesh);

        const eGeo = new THREE.EdgesGeometry(geom);
        const eMat = new THREE.LineBasicMaterial({ color: outlineColor, transparent: true, opacity: outlineOpacity });
        geos.push(eGeo);
        mats.push(eMat);
        const edges = new THREE.LineSegments(eGeo, eMat);
        edges.position.copy(mesh.position);
        scene.add(edges);
      }

      // ── Boxed wrapper — translucent cardboard-coloured shell over the model ─
      const flags = itemMeta.get(p.item_id);
      if (flags?.boxed) {
        const boxGeom = new THREE.BoxGeometry(w * 1.02, h * 1.02, l * 1.02);
        const boxMat  = new THREE.MeshLambertMaterial({
          color: 0xc69c6d,         // cardboard brown
          transparent: true,
          opacity: 0.32,
          depthWrite: false,
        });
        const boxMesh = new THREE.Mesh(boxGeom, boxMat);
        boxMesh.position.set(cx, cy, cz);
        scene.add(boxMesh);
        geos.push(boxGeom);
        mats.push(boxMat);

        // Cardboard seam edges so the box is legible at a glance
        const seamGeo = new THREE.EdgesGeometry(boxGeom);
        const seamMat = new THREE.LineBasicMaterial({ color: 0x8b5a2b, transparent: true, opacity: 0.7 });
        const seam    = new THREE.LineSegments(seamGeo, seamMat);
        seam.position.set(cx, cy, cz);
        scene.add(seam);
        geos.push(seamGeo);
        mats.push(seamMat);
      }

      // ── Fragile decal — bright red outline + sprite tag ───────────────────
      if (flags?.fragile) {
        const fragileGeo = new THREE.EdgesGeometry(new THREE.BoxGeometry(w * 1.04, h * 1.04, l * 1.04));
        const fragileMat = new THREE.LineBasicMaterial({ color: 0xef4444, transparent: true, opacity: 0.85 });
        const fragileWire = new THREE.LineSegments(fragileGeo, fragileMat);
        fragileWire.position.set(cx, cy, cz);
        scene.add(fragileWire);
        geos.push(fragileGeo);
        mats.push(fragileMat);
      }

      // ── Label sprite ─────────────────────────────────────────────────────
      if (mode === "labels") {
        const sprite = makeTextSprite(p.item_id, lightMode);
        sprite.position.set(cx, cy + h / 2 + 7, cz);
        scene.add(sprite);
        spriteMats.push(sprite.material as THREE.SpriteMaterial);
      }
    }

    // ── Orbit controls ─────────────────────────────────────────────────────
    const defaultTarget = new THREE.Vector3(truckW / 2, truckH / 2, truckL / 2);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.copy(cameraTargetRef.current ?? defaultTarget);
    controls.enableDamping = true;
    controls.dampingFactor = 0.07;
    controls.update();
    cameraRef.current   = camera;
    controlsRef.current = controls;

    // ── Render loop ────────────────────────────────────────────────────────
    let frameId = 0;
    function animate() {
      frameId = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    }
    animate();

    // ── Resize handler ─────────────────────────────────────────────────────
    function handleResize() {
      const w = mount!.clientWidth;
      const h = mount!.clientHeight;
      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    }
    window.addEventListener("resize", handleResize);

    // ── Hover / raycasting ─────────────────────────────────────────────────
    const raycaster = new THREE.Raycaster();
    const mouse     = new THREE.Vector2();

    function handleMouseMove(e: MouseEvent) {
      const rect = mount!.getBoundingClientRect();
      mouse.x =  ((e.clientX - rect.left)  / rect.width)  * 2 - 1;
      mouse.y = -((e.clientY - rect.top)   / rect.height) * 2 + 1;
      raycaster.setFromCamera(mouse, camera);
      const hits = raycaster.intersectObjects(itemMeshes, false);
      if (hits.length > 0) {
        const placement = hits[0].object.userData.placement as Placement;
        setTooltip({
          placement,
          meta: itemMeta.get(placement.item_id),
          x: e.clientX - rect.left,
          y: e.clientY - rect.top,
          mountWidth: rect.width,
        });
      } else {
        setTooltip(null);
      }
    }

    function handleMouseLeave() { setTooltip(null); }

    mount.addEventListener("mousemove", handleMouseMove);
    mount.addEventListener("mouseleave", handleMouseLeave);

    // ── Cleanup ────────────────────────────────────────────────────────────
    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener("resize", handleResize);
      mount.removeEventListener("mousemove", handleMouseMove);
      mount.removeEventListener("mouseleave", handleMouseLeave);
      cameraPosRef.current.copy(camera.position);
      cameraTargetRef.current = controls.target.clone();
      cameraRef.current   = null;
      controlsRef.current = null;
      controls.dispose();
      for (const g of geos)        g.dispose();
      for (const m of mats)        m.dispose();
      for (const sm of spriteMats) { sm.map?.dispose(); sm.dispose(); }
      renderer.dispose();
      if (renderer.domElement.parentNode === mount) {
        mount.removeChild(renderer.domElement);
      }
      setTooltip(null);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plan, truck, mode, modelsVersion, animStep, lightMode, items]);

  const tW = truck.W / MM_PER_UNIT;
  const tL = truck.L / MM_PER_UNIT;
  const tH = truck.H / MM_PER_UNIT;

  function animateCamera(toPos: THREE.Vector3, toTarget: THREE.Vector3) {
    const cam  = cameraRef.current;
    const ctrl = controlsRef.current;
    if (!cam || !ctrl) return;
    // Assign to non-nullable typed consts so the inner closure is type-safe.
    const safeCam: THREE.PerspectiveCamera = cam;
    const safeCtrl: OrbitControls         = ctrl;
    const fromPos    = safeCam.position.clone();
    const fromTarget = safeCtrl.target.clone();
    let f = 0;
    function tick() {
      if (!cameraRef.current) return;
      f++;
      const t = 1 - (1 - f / 30) ** 3;
      safeCam.position.lerpVectors(fromPos, toPos, t);
      safeCtrl.target.lerpVectors(fromTarget, toTarget, t);
      safeCtrl.update();
      if (f < 30) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  function panCamera(dx: number, dy: number) {
    const cam  = cameraRef.current;
    const ctrl = controlsRef.current;
    if (!cam || !ctrl) return;
    const step  = Math.max(tW, tL, tH) * 0.08;
    const right = new THREE.Vector3().setFromMatrixColumn(cam.matrixWorld, 0);
    const upVec = new THREE.Vector3().setFromMatrixColumn(cam.matrixWorld, 1);
    const delta = right.multiplyScalar(dx * step).add(upVec.multiplyScalar(dy * step));
    cam.position.add(delta);
    ctrl.target.add(delta);
    ctrl.update();
  }

  function zoomCamera(inward: boolean) {
    const cam  = cameraRef.current;
    const ctrl = controlsRef.current;
    if (!cam || !ctrl) return;
    const step  = Math.max(tW, tL, tH) * 0.15;
    const dir   = new THREE.Vector3().subVectors(ctrl.target, cam.position).normalize();
    const sign  = inward ? 1 : -1;
    const newPos = cam.position.clone().addScaledVector(dir, sign * step);
    if (newPos.distanceTo(ctrl.target) < 20) return;
    cam.position.copy(newPos);
    ctrl.update();
  }

  return (
    <div className="relative w-full h-full">

      {/* ── View-mode buttons ── */}
      <div className="absolute top-4 left-4 z-10 flex gap-2">
        {(["3d", "exploded", "labels", "animate"] as const).map((m) => {
          const label = m === "3d" ? "3D" : m === "exploded" ? "Exploded" : m === "labels" ? "Labels" : "▶ Animate";
          return (
            <button
              key={m}
              onClick={() => {
                if (m === "animate" && mode !== "animate") {
                  setAnimStep(0);
                  setIsPlaying(true);
                } else if (m !== "animate") {
                  setIsPlaying(false);
                }
                setMode(m);
              }}
              className={`px-4 py-2.5 text-base font-semibold rounded-xl border-2 transition-colors ${
                mode === m
                  ? "bg-blue-600 border-blue-700 text-white shadow-md"
                  : lightMode
                    ? "bg-white border-slate-300 text-slate-700 hover:bg-slate-50 hover:border-slate-400"
                    : "bg-gray-900 border-gray-600 text-gray-200 hover:bg-gray-800 hover:border-gray-500"
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>

      {/* ── Animate: currently-placing badge (top-center) ── */}
      {mode === "animate" && showPlacingBadge && latestItem && (
        <div className={`absolute top-4 left-1/2 -translate-x-1/2 z-10 flex items-center gap-3 border-2 rounded-xl px-4 py-2.5 pointer-events-none shadow-md ${lightMode ? "bg-white border-slate-300" : "bg-gray-900 border-gray-600"}`}>
          <span className={`text-base font-medium ${lightMode ? "text-slate-600" : "text-gray-400"}`}>Placing:</span>
          <span className={`text-base font-bold ${lightMode ? "text-slate-900" : "text-white"}`}>{latestItem.item_id}</span>
          <span
            className="text-sm font-bold px-2.5 py-1 rounded-lg text-gray-950"
            style={{
              backgroundColor: hexCss(colorForStop(latestItem.stop_id)),
            }}
          >
            Stop {latestItem.stop_id}
          </span>
        </div>
      )}
      {mode === "animate" && animStep === 0 && (
        <div className={`absolute top-4 left-1/2 -translate-x-1/2 z-10 border-2 rounded-xl px-4 py-2.5 pointer-events-none shadow-md ${lightMode ? "bg-white border-slate-300" : "bg-gray-900 border-gray-600"}`}>
          <span className={`text-base font-semibold ${lightMode ? "text-slate-700" : "text-gray-300"}`}>Press play to begin loading sequence</span>
        </div>
      )}
      {mode === "animate" && showLoadedBadge && (
        <div className={`absolute top-4 left-1/2 -translate-x-1/2 z-10 border-2 rounded-xl px-4 py-2.5 pointer-events-none shadow-md ${lightMode ? "bg-green-50 border-green-400" : "bg-green-950/70 border-green-700"}`}>
          <span className={`text-base font-bold ${lightMode ? "text-green-800" : "text-green-300"}`}>
            All {animSorted.length} items loaded
          </span>
        </div>
      )}

      {/* ── Animate: playback controls (bottom-center) — large touch targets ── */}
      {mode === "animate" && (
        <div className={`absolute bottom-14 left-1/2 -translate-x-1/2 z-10 flex items-center gap-2 border-2 rounded-2xl px-4 py-3 shadow-2xl ${lightMode ? "bg-white border-slate-300" : "bg-gray-900 border-gray-700"}`}>
          <PlaybackBtn
            onClick={() => { setAnimStep(0); setIsPlaying(false); }}
            title="Go back to the start"
            lightMode={lightMode}
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M6 6h2v12H6zM9.5 12l8.5 6V6z"/></svg>
          </PlaybackBtn>
          <PlaybackBtn
            onClick={() => { setIsPlaying(false); setAnimStep((s) => Math.max(0, s - 1)); }}
            title="Previous item"
            lightMode={lightMode}
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
          </PlaybackBtn>
          <button
            onClick={() => {
              if (animStep >= animSorted.length) { setAnimStep(0); setIsPlaying(true); }
              else setIsPlaying((p) => !p);
            }}
            className="w-12 h-12 rounded-full bg-blue-600 hover:bg-blue-700 flex items-center justify-center text-white transition-colors shrink-0 shadow-md"
            title={isPlaying ? "Pause" : "Play"}
            aria-label={isPlaying ? "Pause" : "Play"}
          >
            {isPlaying ? (
              <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor"><path d="M6 4h4v16H6zM14 4h4v16h-4z"/></svg>
            ) : (
              <svg className="w-6 h-6 ml-0.5" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
            )}
          </button>
          <PlaybackBtn
            onClick={() => { setIsPlaying(false); setAnimStep((s) => Math.min(animSorted.length, s + 1)); }}
            title="Next item"
            lightMode={lightMode}
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
          </PlaybackBtn>
          <PlaybackBtn
            onClick={() => { setIsPlaying(false); setAnimStep(animSorted.length); }}
            title="Show every item"
            lightMode={lightMode}
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M16 6h2v12h-2zM6 6l8.5 6L6 18z"/></svg>
          </PlaybackBtn>

          <div className={`w-px h-7 mx-1 ${lightMode ? "bg-slate-300" : "bg-gray-700"}`} />

          <input
            type="range"
            min={0}
            max={animSorted.length}
            value={animStep}
            onChange={(e) => { setIsPlaying(false); setAnimStep(parseInt(e.target.value)); }}
            className="w-32 accent-blue-600 cursor-pointer"
            aria-label="Loading progress"
          />
          <span className={`text-base font-bold min-w-[48px] text-center ${lightMode ? "text-slate-800" : "text-gray-200"}`}>
            {animStep}/{animSorted.length}
          </span>

          <div className={`w-px h-7 mx-1 ${lightMode ? "bg-slate-300" : "bg-gray-700"}`} />

          <label className={`text-sm font-medium ${lightMode ? "text-slate-600" : "text-gray-400"}`}>
            Speed
          </label>
          <select
            value={animSpeed}
            onChange={(e) => setAnimSpeed(parseInt(e.target.value))}
            className={`text-base font-semibold rounded-lg px-3 py-1.5 cursor-pointer border-2 ${lightMode ? "bg-white border-slate-300 text-slate-800" : "bg-gray-800 border-gray-700 text-gray-200"}`}
          >
            <option value={1500}>Slow</option>
            <option value={900}>Normal</option>
            <option value={400}>Fast</option>
          </select>
        </div>
      )}

      {/* ── Stop legend (bottom-right) — bigger and clearer ── */}
      <div className={`absolute ${mode === "animate" ? "bottom-36" : "bottom-4"} right-4 z-10 border-2 rounded-2xl px-4 py-3 space-y-2 min-w-[170px] shadow-md ${lightMode ? "bg-white border-slate-300" : "bg-gray-950 border-gray-700"}`}>
        <div className={`text-sm font-bold uppercase tracking-wider mb-2 ${lightMode ? "text-slate-600" : "text-gray-400"}`}>
          Load Order
        </div>
        {uniqueStops
          .slice()
          .reverse()
          .map((sid, i, arr) => (
            <div key={sid} className="flex items-center gap-2.5">
              <span
                className="w-5 h-5 rounded-md shrink-0 shadow-sm"
                style={{ backgroundColor: hexCss(colorForStop(sid)) }}
              />
              <span className={`text-base font-semibold ${lightMode ? "text-slate-800" : "text-gray-100"}`}>Stop {sid}</span>
              {i === 0 && <span className={`text-sm ${lightMode ? "text-slate-500" : "text-gray-500"}`}>(rear)</span>}
              {i === arr.length - 1 && arr.length > 1 && (
                <span className={`text-sm ${lightMode ? "text-slate-500" : "text-gray-500"}`}>(door)</span>
              )}
            </div>
          ))}
      </div>


      {/* ── Camera controls — collapsed toolbar, 44 px footprint when closed ── */}
      <div className="absolute bottom-4 left-4 z-10 flex flex-col items-start gap-2">

        {/* Expandable panel — slides up from the toggle button */}
        <div className={`transition-all duration-200 overflow-hidden ${camOpen ? "max-h-[600px] opacity-100" : "max-h-0 opacity-0"}`}>
          <div className="flex flex-col items-start gap-3 pb-2">

            {/* PAN section */}
            <div className="flex flex-col items-start gap-1">
              <span className={`text-[9px] uppercase tracking-widest font-bold pl-1 ${lightMode ? "text-slate-500" : "text-gray-400"}`}>PAN</span>
              <div className="flex gap-2 items-end">
                <div className={`grid grid-cols-3 gap-1 border-2 rounded-xl p-1 shadow-md ${lightMode ? "bg-white border-gray-300" : "bg-gray-900 border-gray-700"}`}>
                  <div />
                  <CameraBtn title="Pan Up" active={pressedKey === "Pan Up"} lightMode={lightMode} onClick={() => { panCamera(0, 1); setPressedKey("Pan Up"); setTimeout(() => setPressedKey(null), 150); }}>
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="18 15 12 9 6 15"/>
                    </svg>
                    <span className={`text-[10px] font-semibold leading-tight ${lightMode ? "text-slate-700" : "text-gray-200"}`}>Up</span>
                  </CameraBtn>
                  <div />
                  <CameraBtn title="Pan Left" active={pressedKey === "Pan Left"} lightMode={lightMode} onClick={() => { panCamera(-1, 0); setPressedKey("Pan Left"); setTimeout(() => setPressedKey(null), 150); }}>
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="15 18 9 12 15 6"/>
                    </svg>
                    <span className={`text-[10px] font-semibold leading-tight ${lightMode ? "text-slate-700" : "text-gray-200"}`}>Left</span>
                  </CameraBtn>
                  <div />
                  <CameraBtn title="Pan Right" active={pressedKey === "Pan Right"} lightMode={lightMode} onClick={() => { panCamera(1, 0); setPressedKey("Pan Right"); setTimeout(() => setPressedKey(null), 150); }}>
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="9 18 15 12 9 6"/>
                    </svg>
                    <span className={`text-[10px] font-semibold leading-tight ${lightMode ? "text-slate-700" : "text-gray-200"}`}>Right</span>
                  </CameraBtn>
                  <div />
                  <CameraBtn title="Pan Down" active={pressedKey === "Pan Down"} lightMode={lightMode} onClick={() => { panCamera(0, -1); setPressedKey("Pan Down"); setTimeout(() => setPressedKey(null), 150); }}>
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="6 9 12 15 18 9"/>
                    </svg>
                    <span className={`text-[10px] font-semibold leading-tight ${lightMode ? "text-slate-700" : "text-gray-200"}`}>Down</span>
                  </CameraBtn>
                  <div />
                </div>

                <div className={`flex flex-col gap-1 border-2 rounded-xl p-1 shadow-md ${lightMode ? "bg-white border-gray-300" : "bg-gray-900 border-gray-700"}`}>
                  <CameraBtn title="Zoom In" active={pressedKey === "Zoom In"} lightMode={lightMode} onClick={() => { zoomCamera(true); setPressedKey("Zoom In"); setTimeout(() => setPressedKey(null), 150); }}>
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="11" cy="11" r="7"/>
                      <line x1="16.5" y1="16.5" x2="21" y2="21"/>
                      <line x1="11" y1="8" x2="11" y2="14"/>
                      <line x1="8" y1="11" x2="14" y2="11"/>
                    </svg>
                    <span className={`text-[10px] font-semibold leading-tight ${lightMode ? "text-slate-700" : "text-gray-200"}`}>Zoom In</span>
                  </CameraBtn>
                  <CameraBtn title="Zoom Out" active={pressedKey === "Zoom Out"} lightMode={lightMode} onClick={() => { zoomCamera(false); setPressedKey("Zoom Out"); setTimeout(() => setPressedKey(null), 150); }}>
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="11" cy="11" r="7"/>
                      <line x1="16.5" y1="16.5" x2="21" y2="21"/>
                      <line x1="8" y1="11" x2="14" y2="11"/>
                    </svg>
                    <span className={`text-[10px] font-semibold leading-tight ${lightMode ? "text-slate-700" : "text-gray-200"}`}>Zoom Out</span>
                  </CameraBtn>
                </div>
              </div>
            </div>

            {/* VIEW section */}
            <div className="flex flex-col items-start gap-1">
              <span className={`text-[9px] uppercase tracking-widest font-bold pl-1 ${lightMode ? "text-slate-500" : "text-gray-400"}`}>VIEW</span>
              <div className={`flex gap-1 border-2 rounded-xl p-1 shadow-md ${lightMode ? "bg-white border-gray-300" : "bg-gray-900 border-gray-700"}`}>
                <CameraBtn title="Reset View" active={activeView === "reset"} lightMode={lightMode} onClick={() => {
                  setActiveView("reset");
                  animateCamera(
                    new THREE.Vector3(-600, 600, 1400),
                    new THREE.Vector3(tW / 2, tH / 2, tL / 2),
                  );
                }}>
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
                    <path d="M3 3v5h5"/>
                  </svg>
                </CameraBtn>
                <CameraBtn title="Top View" active={activeView === "top"} lightMode={lightMode} onClick={() => {
                  setActiveView("top");
                  animateCamera(
                    new THREE.Vector3(tW / 2, tH * 4.5, tL / 2),
                    new THREE.Vector3(tW / 2, 0, tL / 2),
                  );
                }}>
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="4" y="13" width="16" height="8" rx="1"/>
                    <line x1="12" y1="2" x2="12" y2="12"/>
                    <polyline points="9 9 12 12 15 9"/>
                  </svg>
                </CameraBtn>
                <CameraBtn title="Front View" active={activeView === "front"} lightMode={lightMode} onClick={() => {
                  setActiveView("front");
                  animateCamera(
                    new THREE.Vector3(tW / 2, tH / 2, tL + Math.max(tW, tH) * 2.5),
                    new THREE.Vector3(tW / 2, tH / 2, tL / 2),
                  );
                }}>
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="5" y="4" width="14" height="16" rx="1"/>
                    <line x1="1" y1="12" x2="4" y2="12"/>
                    <polyline points="3 9 5 12 3 15"/>
                  </svg>
                </CameraBtn>
                <CameraBtn title="Side View" active={activeView === "side"} lightMode={lightMode} onClick={() => {
                  setActiveView("side");
                  animateCamera(
                    new THREE.Vector3(tW + Math.max(tW, tH) * 2.5, tH / 2, tL / 2),
                    new THREE.Vector3(tW / 2, tH / 2, tL / 2),
                  );
                }}>
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="4" y="4" width="14" height="16" rx="1"/>
                    <line x1="19" y1="12" x2="23" y2="12"/>
                    <polyline points="21 9 23 12 21 15"/>
                  </svg>
                </CameraBtn>
              </div>
            </div>

          </div>
        </div>

        {/* Toggle button — always visible, 44 px, anchors the panel */}
        <button
          onClick={() => setCamOpen((v) => !v)}
          title={camOpen ? "Close camera controls" : "Open camera controls"}
          aria-label={camOpen ? "Close camera controls" : "Open camera controls"}
          className={`w-11 h-11 rounded-xl border-2 flex items-center justify-center shadow-md transition-colors ${
            camOpen
              ? "bg-blue-600 border-blue-700 text-white"
              : lightMode
                ? "bg-white border-gray-300 text-slate-700 hover:bg-gray-100"
                : "bg-gray-900 border-gray-700 text-gray-200 hover:bg-gray-800"
          }`}
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M23 7l-7 5 7 5V7z"/>
            <rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>
          </svg>
        </button>

      </div>

      {/* ── Hover tooltip ── */}
      {tooltip && (
        <ItemTooltip
          placement={tooltip.placement}
          meta={tooltip.meta}
          x={tooltip.x}
          y={tooltip.y}
          mountWidth={tooltip.mountWidth}
          lightMode={lightMode}
        />
      )}

      <div ref={mountRef} className="w-full h-full" />
    </div>
  );
}

// ── Playback button helper ──────────────────────────────────────────────────

function PlaybackBtn({
  onClick,
  title,
  lightMode,
  children,
}: {
  onClick: () => void;
  title: string;
  lightMode?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      aria-label={title}
      className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors ${
        lightMode
          ? "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
          : "text-gray-400 hover:text-gray-100 hover:bg-gray-800"
      }`}
    >
      {children}
    </button>
  );
}

// ── Camera-view button helper ──────────────────────────────────────────────────

function CameraBtn({
  onClick,
  title,
  active,
  lightMode,
  children,
}: {
  onClick: () => void;
  title: string;
  active: boolean;
  lightMode?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      aria-label={title}
      className={`w-11 h-11 rounded-lg flex flex-col items-center justify-center gap-0.5 transition-colors ${
        active
          ? "bg-blue-600 text-white"
          : lightMode
            ? "text-slate-700 hover:bg-gray-100"
            : "text-gray-200 hover:bg-gray-800"
      }`}
    >
      {children}
    </button>
  );
}

// ── Tooltip sub-component ─────────────────────────────────────────────────────

function ItemTooltip({
  placement: p,
  meta,
  x,
  y,
  mountWidth,
  lightMode = false,
}: {
  placement: Placement;
  meta?: { boxed?: boolean; fragile?: boolean };
  x: number;
  y: number;
  mountWidth: number;
  lightMode?: boolean;
}) {
  const flipLeft = x > mountWidth * 0.6;
  const color = `#${(STOP_PALETTE[(p.stop_id - 1) % STOP_PALETTE.length] ?? FALLBACK_COLOR)
    .toString(16)
    .padStart(6, "0")}`;

  return (
    <div
      className="absolute z-20 pointer-events-none"
      style={{
        left:      flipLeft ? x - 12 : x + 14,
        top:       Math.max(8, y - 8),
        transform: flipLeft ? "translateX(-100%)" : "none",
      }}
    >
      <div className={`border-2 rounded-2xl px-4 py-3.5 shadow-2xl min-w-[230px] ${lightMode ? "bg-white border-slate-300" : "bg-gray-900 border-gray-600"}`}>
        <div className={`font-bold text-base mb-3 truncate max-w-[260px] ${lightMode ? "text-slate-900" : "text-white"}`}>
          {p.item_id}
        </div>

        <div className="space-y-2 text-sm">
          <div className="flex justify-between gap-4">
            <span className={lightMode ? "text-slate-600" : "text-gray-400"}>W × L × H</span>
            <span className={`font-mono ${lightMode ? "text-slate-900" : "text-gray-100"}`}>
              {p.w} × {p.l} × {p.h}
              <span className={`ml-1 ${lightMode ? "text-slate-500" : "text-gray-500"}`}>mm</span>
            </span>
          </div>

          <div className="flex justify-between gap-4">
            <span className={lightMode ? "text-slate-600" : "text-gray-400"}>Volume</span>
            <span className={`font-mono ${lightMode ? "text-slate-900" : "text-gray-100"}`}>
              {((p.w * p.l * p.h) / 1e9).toFixed(3)}
              <span className={`ml-1 ${lightMode ? "text-slate-500" : "text-gray-500"}`}>m³</span>
            </span>
          </div>

          <div className="flex justify-between gap-4">
            <span className={lightMode ? "text-slate-600" : "text-gray-400"}>Position</span>
            <span className={`font-mono ${lightMode ? "text-slate-900" : "text-gray-100"}`}>
              ({p.x}, {p.y}, {p.z})
            </span>
          </div>

          <div className="flex justify-between gap-4">
            <span className={lightMode ? "text-slate-600" : "text-gray-400"}>Orientation</span>
            <span className={`font-mono ${lightMode ? "text-slate-900" : "text-gray-100"}`}>
              #{p.orientation_index}
            </span>
          </div>

          {(meta?.boxed || meta?.fragile) && (
            <div className="flex items-center gap-2 pt-1">
              {meta.boxed && (
                <span className={`text-xs font-bold px-2 py-1 rounded ${
                  lightMode
                    ? "bg-blue-100 text-blue-800 border border-blue-300"
                    : "bg-blue-950 text-blue-200 border border-blue-800"
                }`}>BOXED</span>
              )}
              {meta.fragile && (
                <span className={`text-xs font-bold px-2 py-1 rounded ${
                  lightMode
                    ? "bg-amber-100 text-amber-800 border border-amber-300"
                    : "bg-amber-950 text-amber-200 border border-amber-800"
                }`}>FRAGILE</span>
              )}
            </div>
          )}

          <div className={`border-t-2 pt-2.5 mt-2.5 ${lightMode ? "border-slate-200" : "border-gray-700"}`}>
            <div className="flex items-center gap-2">
              <span
                className="w-4 h-4 rounded shrink-0"
                style={{ backgroundColor: color }}
              />
              <span className="text-base font-bold" style={{ color }}>Stop {p.stop_id}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
