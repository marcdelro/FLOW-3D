import { Html } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { useMemo, useRef, useState } from "react";
import * as THREE from "three";

import {
  FURNITURE_DIMS,
  FURNITURE_LABEL,
  type FurnitureKind,
  FurnitureMesh,
} from "./FurnitureMeshes";

// Grid layout — tuned so the camera frames it nicely at fov=35.
const COLS = 7;
const ROWS = 5;
const CELL_X = 1.55;
const CELL_Z = 1.55;
const HIT_RADIUS = 3.2;     // how far the proximity wave reaches
const MAX_LIFT = 0.8;       // how high a piece rises directly under the cursor
const TILT_STRENGTH = 0.18; // radians of tilt away from cursor

const KINDS: FurnitureKind[] = [
  "sofa",
  "wardrobe",
  "refrigerator",
  "bedframe",
  "diningChair",
  "sideTable",
];

type GridItem = {
  id: string;
  kind: FurnitureKind;
  x: number;
  z: number;
  rotY: number;
  fragile: boolean;
};

function seeded(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
}

function buildGrid(): GridItem[] {
  const rand = seeded(7);
  const items: GridItem[] = [];
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const kind = KINDS[(r * 3 + c * 5 + Math.floor(rand() * 6)) % KINDS.length];
      const rotY = Math.floor(rand() * 4) * (Math.PI / 2);
      const fragile = rand() < 0.12;
      items.push({
        id: `${r}-${c}`,
        kind,
        x: (c - (COLS - 1) / 2) * CELL_X,
        z: (r - (ROWS - 1) / 2) * CELL_Z,
        rotY,
        fragile,
      });
    }
  }
  return items;
}

const GROUND_PLANE = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);

export function TruckScene() {
  const grid = useMemo(buildGrid, []);
  const [labelId, setLabelId] = useState<string | null>(null);

  const itemRefs = useRef<(THREE.Group | null)[]>([]);
  const lifts = useRef<Float32Array>(new Float32Array(grid.length));
  const hit = useRef(new THREE.Vector3(0, 0, 0));
  const hasPointer = useRef(false);

  const { camera, raycaster, pointer } = useThree();

  useFrame((_, delta) => {
    if (hasPointer.current) {
      raycaster.setFromCamera(pointer, camera);
      const tmp = new THREE.Vector3();
      if (raycaster.ray.intersectPlane(GROUND_PLANE, tmp)) {
        hit.current.copy(tmp);
      }
    }
    const hx = hit.current.x;
    const hz = hit.current.z;
    const k = 1 - Math.exp(-delta * 11);
    let topIdx = -1;
    let topLift = 0.18; // threshold for showing the label

    for (let i = 0; i < grid.length; i++) {
      const g = grid[i];
      const dx = g.x - hx;
      const dz = g.z - hz;
      const dist = Math.sqrt(dx * dx + dz * dz);
      const norm = Math.max(0, 1 - dist / HIT_RADIUS);
      const targetLift = hasPointer.current ? norm * norm * MAX_LIFT : 0;
      lifts.current[i] += (targetLift - lifts.current[i]) * k;

      const ref = itemRefs.current[i];
      if (ref) {
        ref.position.y = lifts.current[i];
        // Tilt away from cursor when lifted. dx/dz are away-direction.
        const lift = lifts.current[i];
        const tiltMag = (lift / MAX_LIFT) * TILT_STRENGTH;
        ref.rotation.x = -dz / Math.max(dist, 0.001) * tiltMag;
        ref.rotation.z = dx / Math.max(dist, 0.001) * tiltMag;
      }

      if (lifts.current[i] > topLift) {
        topLift = lifts.current[i];
        topIdx = i;
      }
    }

    const nextId = topIdx >= 0 ? grid[topIdx].id : null;
    if (nextId !== labelId) setLabelId(nextId);
  });

  return (
    <>
      <ambientLight intensity={0.55} />
      <directionalLight position={[6, 10, 4]} intensity={0.95} />
      <directionalLight position={[-6, 4, -5]} intensity={0.35} color="#88aaff" />
      <pointLight position={[0, 5, 0]} intensity={0.55} color="#7dd3fc" distance={14} />

      <GridFloor />

      {/* Invisible pointer-capture plane (used as raycast target). */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0.0005, 0]}
        onPointerOver={() => (hasPointer.current = true)}
        onPointerOut={() => (hasPointer.current = false)}
        onPointerMove={() => (hasPointer.current = true)}
      >
        <planeGeometry args={[40, 40]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>

      {grid.map((g, i) => (
        <group
          key={g.id}
          position={[g.x, 0, g.z]}
          rotation={[0, g.rotY, 0]}
          ref={(el) => {
            itemRefs.current[i] = el;
          }}
        >
          <FurnitureMesh kind={g.kind} fragile={g.fragile} />
          {labelId === g.id && <Label item={g} />}
        </group>
      ))}
    </>
  );
}

function Label({ item }: { item: GridItem }) {
  const dims = FURNITURE_DIMS[item.kind];
  const liftY = dims.h / 1000 + 0.35;
  return (
    <Html
      position={[0, liftY, 0]}
      center
      distanceFactor={7}
      style={{ pointerEvents: "none", userSelect: "none" }}
    >
      <div className="whitespace-nowrap rounded-full border border-cyan-300/40 bg-[#0b0d12]/85 px-3 py-1.5 text-xs font-medium text-cyan-100 shadow-[0_0_20px_rgba(125,211,252,0.25)] backdrop-blur">
        <span className="text-white">{FURNITURE_LABEL[item.kind]}</span>
        <span className="mx-2 text-white/30">·</span>
        <span className="text-white/70">
          {dims.l}×{dims.w}×{dims.h}mm
        </span>
        {item.fragile && (
          <>
            <span className="mx-2 text-white/30">·</span>
            <span className="text-fuchsia-300">Fragile</span>
          </>
        )}
      </div>
    </Html>
  );
}

function GridFloor() {
  const grid = useMemo(() => {
    return new THREE.GridHelper(28, 28, "#1f2a3a", "#141a24");
  }, []);
  return (
    <>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]} receiveShadow>
        <planeGeometry args={[60, 60]} />
        <meshStandardMaterial color="#0a0e16" roughness={1} />
      </mesh>
      <primitive object={grid} />
    </>
  );
}
