import { useEffect, useRef } from "react";
import * as THREE from "three";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader.js";

import { resolvePreviewMeta } from "../data/modelCatalog";
import type { AxisUp } from "../data/modelCatalog";

/**
 * Mini 3D thumbnail for the AddItem form. Loads the resolved OBJ for a
 * `(prefix, variantIdx)` pair and renders it on a slowly-rotating turntable
 * so users can preview what they're adding without leaving the form.
 *
 * Falls back to a coloured cube when the prefix is unrecognised or the OBJ
 * fails to load — never throws, never blocks the form.
 */
interface ModelPreviewProps {
  prefix: string;
  variantIdx?: number;
  size?: number;
  lightMode?: boolean;
}

const previewCache = new Map<string, THREE.Group | null>();

function fitGroupToUnitCube(obj: THREE.Group, axisUp: AxisUp): void {
  obj.position.set(0, 0, 0);
  obj.rotation.set(0, 0, 0);
  obj.updateMatrixWorld(true);

  // Resolve "auto" against the model's *native* bounding box: ShapeNetSem
  // furniture is consistently authored Z-up, so when the native Z extent is
  // at least as large as the native Y extent we treat the model as Z-up and
  // rotate it onto Three.js's Y-up convention. Without this, chairs,
  // bookshelves, fridges, etc. render lying on their side in the preview.
  let resolved: "y" | "z" | "x";
  if (axisUp === "auto") {
    const native = new THREE.Box3().setFromObject(obj);
    if (native.isEmpty()) {
      resolved = "y";
    } else {
      const nSize = native.getSize(new THREE.Vector3());
      resolved = nSize.z >= nSize.y * 0.9 ? "z" : "y";
    }
  } else {
    resolved = axisUp;
  }

  if (resolved === "z")      obj.rotation.x = -Math.PI / 2;
  else if (resolved === "x") obj.rotation.z =  Math.PI / 2;
  obj.updateMatrixWorld(true);

  const box  = new THREE.Box3().setFromObject(obj);
  if (box.isEmpty()) return;
  const size = box.getSize(new THREE.Vector3());
  const max  = Math.max(size.x, size.y, size.z);
  if (max < 1e-6) return;
  const k = 1.6 / max;
  obj.scale.setScalar(k);
  obj.updateMatrixWorld(true);

  const placed = new THREE.Box3().setFromObject(obj);
  const center = placed.getCenter(new THREE.Vector3());
  obj.position.sub(center);
}

export function ModelPreview({
  prefix,
  variantIdx,
  size = 200,
  lightMode = false,
}: ModelPreviewProps) {
  const mountRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const meta = resolvePreviewMeta(prefix, variantIdx);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(lightMode ? 0xf1f5f9 : 0x0f172a);

    const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
    camera.position.set(2.4, 1.8, 2.4);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(size, size);
    mount.appendChild(renderer.domElement);

    scene.add(new THREE.AmbientLight(0xffffff, lightMode ? 1.0 : 0.7));
    const sun = new THREE.DirectionalLight(0xffffff, 0.7);
    sun.position.set(2, 3, 2);
    scene.add(sun);

    // Soft floor for spatial reference
    const floor = new THREE.Mesh(
      new THREE.CircleGeometry(1.4, 32),
      new THREE.MeshBasicMaterial({
        color: lightMode ? 0xcbd5e1 : 0x1e293b,
        transparent: true,
        opacity: 0.6,
      }),
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -0.85;
    scene.add(floor);

    const root = new THREE.Group();
    scene.add(root);

    let disposed = false;

    function placeFallback() {
      const geom = new THREE.BoxGeometry(1, 1, 1);
      const mat  = new THREE.MeshLambertMaterial({ color: 0x64748b });
      const mesh = new THREE.Mesh(geom, mat);
      root.add(mesh);
      root.userData.dispose = () => { geom.dispose(); mat.dispose(); };
    }

    function placeModel(group: THREE.Group, axisUp: AxisUp) {
      const clone = group.clone(true);
      fitGroupToUnitCube(clone, axisUp);
      const mats: THREE.Material[] = [];
      clone.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          const m = new THREE.MeshLambertMaterial({
            color: lightMode ? 0x64748b : 0x94a3b8,
          });
          child.material = m;
          mats.push(m);
        }
      });
      root.add(clone);
      root.userData.dispose = () => mats.forEach((m) => m.dispose());
    }

    if (!meta) {
      placeFallback();
    } else if (previewCache.has(meta.path)) {
      const cached = previewCache.get(meta.path);
      if (cached) placeModel(cached, meta.axisUp);
      else        placeFallback();
    } else {
      const loader = new OBJLoader();
      loader.loadAsync(meta.path)
        .then((g) => {
          previewCache.set(meta.path, g);
          if (disposed) return;
          placeModel(g, meta.axisUp);
        })
        .catch(() => {
          previewCache.set(meta.path, null);
          if (disposed) return;
          placeFallback();
        });
    }

    let frameId = 0;
    const start  = performance.now();
    function tick() {
      frameId = requestAnimationFrame(tick);
      const t = (performance.now() - start) / 1000;
      root.rotation.y = t * 0.6;
      renderer.render(scene, camera);
    }
    tick();

    return () => {
      disposed = true;
      cancelAnimationFrame(frameId);
      const dispose = root.userData.dispose as (() => void) | undefined;
      dispose?.();
      floor.geometry.dispose();
      (floor.material as THREE.Material).dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === mount) {
        mount.removeChild(renderer.domElement);
      }
    };
  }, [prefix, variantIdx, size, lightMode]);

  return (
    <div
      ref={mountRef}
      className={`rounded-lg overflow-hidden border ${lightMode ? "border-gray-300" : "border-gray-700"}`}
      style={{ width: size, height: size }}
    />
  );
}
