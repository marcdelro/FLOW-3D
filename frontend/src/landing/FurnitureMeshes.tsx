import * as THREE from "three";

export type FurnitureKind =
  | "sofa"
  | "diningChair"
  | "wardrobe"
  | "refrigerator"
  | "bedframe"
  | "sideTable";

export type FurnitureDims = { l: number; w: number; h: number };

// Real-world dims (millimetres). Used for label chips + authentic proportions.
export const FURNITURE_DIMS: Record<FurnitureKind, FurnitureDims> = {
  sofa: { l: 2000, w: 900, h: 850 },
  diningChair: { l: 450, w: 500, h: 900 },
  wardrobe: { l: 1800, w: 600, h: 2100 },
  refrigerator: { l: 700, w: 700, h: 1800 },
  bedframe: { l: 2100, w: 1500, h: 400 },
  sideTable: { l: 500, w: 500, h: 550 },
};

export const FURNITURE_LABEL: Record<FurnitureKind, string> = {
  sofa: "Sofa",
  diningChair: "Dining chair",
  wardrobe: "Wardrobe",
  refrigerator: "Refrigerator",
  bedframe: "Bed frame",
  sideTable: "Side table",
};

// Match the 21st.dev reference aesthetic: dark translucent body + cyan edge glow.
const TINT: Record<FurnitureKind, string> = {
  sofa: "#1c2742",
  diningChair: "#231b2f",
  wardrobe: "#162234",
  refrigerator: "#1a2532",
  bedframe: "#1f1929",
  sideTable: "#22253a",
};

const EMISSIVE: Record<FurnitureKind, string> = {
  sofa: "#3b82f6",
  diningChair: "#a78bfa",
  wardrobe: "#06b6d4",
  refrigerator: "#22d3ee",
  bedframe: "#f472b6",
  sideTable: "#fbbf24",
};

// Shared materials — created once and reused. The big perf win.
const BASE_MATS: Record<FurnitureKind, THREE.MeshStandardMaterial> = Object.fromEntries(
  (Object.keys(TINT) as FurnitureKind[]).map((k) => [
    k,
    new THREE.MeshStandardMaterial({
      color: TINT[k],
      roughness: 0.45,
      metalness: 0.15,
      emissive: EMISSIVE[k],
      emissiveIntensity: 0.08,
      transparent: true,
      opacity: 0.85,
    }),
  ]),
) as Record<FurnitureKind, THREE.MeshStandardMaterial>;

const EDGE_MATS: Record<FurnitureKind, THREE.LineBasicMaterial> = Object.fromEntries(
  (Object.keys(EMISSIVE) as FurnitureKind[]).map((k) => [
    k,
    new THREE.LineBasicMaterial({ color: EMISSIVE[k], transparent: true, opacity: 0.85 }),
  ]),
) as Record<FurnitureKind, THREE.LineBasicMaterial>;

const FRAGILE_MAT = new THREE.MeshStandardMaterial({
  color: "#2a1e3d",
  roughness: 0.4,
  metalness: 0.2,
  emissive: "#c084fc",
  emissiveIntensity: 0.18,
  transparent: true,
  opacity: 0.88,
});

const FRAGILE_EDGE = new THREE.LineBasicMaterial({
  color: "#e9d5ff",
  transparent: true,
  opacity: 0.95,
});

// Cache geometries + edges per kind so every instance shares the same buffers.
type GeoCache = { geo: THREE.BoxGeometry; edges: THREE.EdgesGeometry };
const GEO_CACHE = new Map<string, GeoCache>();

function getBox(W: number, H: number, L: number): GeoCache {
  const key = `${W.toFixed(3)}_${H.toFixed(3)}_${L.toFixed(3)}`;
  const cached = GEO_CACHE.get(key);
  if (cached) return cached;
  const geo = new THREE.BoxGeometry(W, H, L);
  const edges = new THREE.EdgesGeometry(geo);
  const entry = { geo, edges };
  GEO_CACHE.set(key, entry);
  return entry;
}

const mm = (v: number) => v / 1000;

type Props = { kind: FurnitureKind; fragile?: boolean };

/**
 * Each piece = 1-2 primitive boxes with a cyan/emissive edge overlay so it reads
 * as a glowing translucent shape (the 21st.dev "interactive boxes" aesthetic),
 * while keeping the rough furniture silhouette.
 */
export function FurnitureMesh({ kind, fragile = false }: Props) {
  const { l, w, h } = FURNITURE_DIMS[kind];
  const W = mm(w), L = mm(l), H = mm(h);
  const bodyMat = fragile ? FRAGILE_MAT : BASE_MATS[kind];
  const edgeMat = fragile ? FRAGILE_EDGE : EDGE_MATS[kind];

  switch (kind) {
    case "sofa":
      return (
        <>
          <Glow size={[W, H * 0.9, L]} y={H * 0.45} bodyMat={bodyMat} edgeMat={edgeMat} />
          <Glow size={[W, H * 0.6, L * 0.18]} y={H * 0.7} z={-L * 0.41} bodyMat={bodyMat} edgeMat={edgeMat} />
        </>
      );
    case "wardrobe":
      return <Glow size={[W, H, L]} y={H / 2} bodyMat={bodyMat} edgeMat={edgeMat} />;
    case "refrigerator":
      return <Glow size={[W, H, L]} y={H / 2} bodyMat={bodyMat} edgeMat={edgeMat} />;
    case "bedframe":
      return (
        <>
          <Glow size={[W, H, L]} y={H * 0.5} bodyMat={bodyMat} edgeMat={edgeMat} />
          <Glow size={[W, H * 2, L * 0.04]} y={H * 1.5} z={-L * 0.48} bodyMat={bodyMat} edgeMat={edgeMat} />
        </>
      );
    case "sideTable":
      return <Glow size={[W, H, L]} y={H / 2} bodyMat={bodyMat} edgeMat={edgeMat} />;
    case "diningChair":
      return (
        <>
          <Glow size={[W, H * 0.55, L]} y={H * 0.5} bodyMat={bodyMat} edgeMat={edgeMat} />
          <Glow size={[W, H * 0.55, L * 0.12]} y={H * 0.78} z={-L * 0.42} bodyMat={bodyMat} edgeMat={edgeMat} />
        </>
      );
  }
}

function Glow({
  size,
  y,
  x = 0,
  z = 0,
  bodyMat,
  edgeMat,
}: {
  size: [number, number, number];
  y: number;
  x?: number;
  z?: number;
  bodyMat: THREE.Material;
  edgeMat: THREE.LineBasicMaterial;
}) {
  const { geo, edges } = getBox(size[0], size[1], size[2]);
  return (
    <group position={[x, y, z]}>
      <mesh geometry={geo} material={bodyMat} />
      <lineSegments geometry={edges} material={edgeMat} />
    </group>
  );
}
