import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

import type { PackingPlan } from "../types";

/** 1 Three.js unit = 10 mm — keeps the truck around 240 x 244 x 1360 units */
const MM_PER_UNIT = 10;

const STOP_COLORS: Record<number, number> = {
  1: 0xf0997b,
  2: 0x5dcaa5,
  3: 0xafa9ec,
};
const DEFAULT_COLOR = 0x888780;

function colorForStop(stop_id: number): number {
  return STOP_COLORS[stop_id] ?? DEFAULT_COLOR;
}

interface TruckViewerProps {
  plan: PackingPlan;
  truck: { W: number; L: number; H: number };
}

type ViewMode = "3d" | "exploded" | "labels";

export function TruckViewer({ plan, truck }: TruckViewerProps) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const [mode, setMode] = useState<ViewMode>("3d");

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const width = mount.clientWidth;
    const height = mount.clientHeight;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0b0d12);

    const camera = new THREE.PerspectiveCamera(45, width / height, 1, 10000);
    camera.position.set(-600, 600, 1400);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(width, height);
    mount.appendChild(renderer.domElement);

    const ambient = new THREE.AmbientLight(0xffffff, 0.7);
    const directional = new THREE.DirectionalLight(0xffffff, 0.6);
    directional.position.set(200, 400, 300);
    scene.add(ambient, directional);

    const truckW = truck.W / MM_PER_UNIT;
    const truckL = truck.L / MM_PER_UNIT;
    const truckH = truck.H / MM_PER_UNIT;

    const truckGeometry = new THREE.BoxGeometry(truckW, truckH, truckL);
    const truckEdges = new THREE.EdgesGeometry(truckGeometry);
    const truckWire = new THREE.LineSegments(
      truckEdges,
      new THREE.LineBasicMaterial({ color: 0x9aa3b2 }),
    );
    truckWire.position.set(truckW / 2, truckH / 2, truckL / 2);
    scene.add(truckWire);

    const itemGeometries: THREE.BoxGeometry[] = [];
    const itemMaterials: THREE.MeshLambertMaterial[] = [];

    for (const p of plan.placements) {
      const w = p.w / MM_PER_UNIT;
      const l = p.l / MM_PER_UNIT;
      const h = p.h / MM_PER_UNIT;
      const geom = new THREE.BoxGeometry(w, h, l);
      const mat = new THREE.MeshLambertMaterial({
        color: colorForStop(p.stop_id),
      });
      const mesh = new THREE.Mesh(geom, mat);
      const cx = p.x / MM_PER_UNIT + w / 2;
      const cy = p.z / MM_PER_UNIT + h / 2;
      const cz = p.y / MM_PER_UNIT + l / 2;
      mesh.position.set(cx, cy, cz);

      const edges = new THREE.LineSegments(
        new THREE.EdgesGeometry(geom),
        new THREE.LineBasicMaterial({ color: 0x1f2937 }),
      );
      edges.position.copy(mesh.position);

      scene.add(mesh, edges);
      itemGeometries.push(geom);
      itemMaterials.push(mat);
    }

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(truckW / 2, truckH / 2, truckL / 2);
    controls.update();

    let frameId = 0;
    const animate = () => {
      frameId = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    const handleResize = () => {
      const w = mount.clientWidth;
      const h = mount.clientHeight;
      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    window.addEventListener("resize", handleResize);

    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener("resize", handleResize);
      controls.dispose();
      for (const g of itemGeometries) g.dispose();
      for (const m of itemMaterials) m.dispose();
      truckGeometry.dispose();
      truckEdges.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === mount) {
        mount.removeChild(renderer.domElement);
      }
    };
  }, [plan, truck]);

  return (
    <div className="relative w-full h-full">
      <div className="absolute top-3 left-3 z-10 flex gap-2">
        {(["3d", "exploded", "labels"] as const).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={`px-3 py-1 text-xs rounded border border-gray-700 ${
              mode === m
                ? "bg-gray-200 text-gray-900"
                : "bg-gray-800 text-gray-200 hover:bg-gray-700"
            }`}
          >
            {m === "3d" ? "3D View" : m === "exploded" ? "Exploded" : "Labels"}
          </button>
        ))}
      </div>
      <div ref={mountRef} className="w-full h-full" />
    </div>
  );
}
