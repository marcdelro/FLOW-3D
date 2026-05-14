// Standalone verification for orientationQuaternion() in TruckViewer.tsx.
//
// For each orientation_index k = 0..5, the function should produce a
// quaternion that, when applied to a model whose pre-rotation AABB is the
// ORIGINAL item dims (w, h, l) along three.js axes (X, Y, Z), yields a
// rotated AABB matching the ILP/FFD effective dims:
//
//   ORIENTATION_PERMUTATIONS[k] applied to (w, l, h) → (w_eff, l_eff, h_eff)
//
// In three.js coords (X=W, Y=H, Z=L), the expected rotated AABB is
// (w_eff, h_eff, l_eff).
//
// Run:  node frontend/scripts/verify-orientation-quaternion.mjs

import * as THREE from "three";

// Mirror of ORIENTATION_PERMUTATIONS in backend/solver/ilp_solver.py.
const PERMUTATIONS = [
  [0, 1, 2], // 0 (w, l, h)
  [1, 0, 2], // 1 (l, w, h)
  [0, 2, 1], // 2 (w, h, l)
  [2, 1, 0], // 3 (h, l, w)
  [1, 2, 0], // 4 (l, h, w)
  [2, 0, 1], // 5 (h, w, l)
];

// Copy of orientationQuaternion() from TruckViewer.tsx.
function orientationQuaternion(idx) {
  const X = new THREE.Vector3(1, 0, 0);
  const Y = new THREE.Vector3(0, 1, 0);
  const Z = new THREE.Vector3(0, 0, 1);
  const q = new THREE.Quaternion();
  const tmp = new THREE.Quaternion();
  switch (idx) {
    case 0: break;
    case 1: q.setFromAxisAngle(Y, Math.PI / 2); break;
    case 2: q.setFromAxisAngle(X, Math.PI / 2); break;
    case 3: q.setFromAxisAngle(Z, Math.PI / 2); break;
    case 4:
      q.setFromAxisAngle(Y, Math.PI / 2);
      tmp.setFromAxisAngle(X, Math.PI / 2);
      q.premultiply(tmp);
      break;
    case 5:
      q.setFromAxisAngle(Z, Math.PI / 2);
      tmp.setFromAxisAngle(X, Math.PI / 2);
      q.premultiply(tmp);
      break;
  }
  return q;
}

// Use distinctive prime-ish dims so any swap is obvious.
const W = 7;  // width
const L = 13; // length
const H = 3;  // height
const dims = [W, L, H];

function rotatedAABB(idx) {
  // Pre-rotation AABB in three.js axes: x ∈ [0, W], y ∈ [0, H], z ∈ [0, L].
  const corners = [
    [0, 0, 0],
    [W, 0, 0],
    [0, H, 0],
    [0, 0, L],
    [W, H, 0],
    [W, 0, L],
    [0, H, L],
    [W, H, L],
  ];
  const q = orientationQuaternion(idx);
  // Rotate about the AABB center so the rotated shape is centered at the
  // same point and we can read sizes directly from min/max extents.
  const cx = W / 2, cy = H / 2, cz = L / 2;
  const xs = [], ys = [], zs = [];
  for (const [x, y, z] of corners) {
    const v = new THREE.Vector3(x - cx, y - cy, z - cz);
    v.applyQuaternion(q);
    xs.push(v.x);
    ys.push(v.y);
    zs.push(v.z);
  }
  const sx = Math.max(...xs) - Math.min(...xs);
  const sy = Math.max(...ys) - Math.min(...ys);
  const sz = Math.max(...zs) - Math.min(...zs);
  return [Math.round(sx), Math.round(sy), Math.round(sz)];
}

let failed = 0;
for (let k = 0; k < 6; k++) {
  const [a, b, c] = PERMUTATIONS[k];
  const expectedW_eff = dims[a];
  const expectedL_eff = dims[b];
  const expectedH_eff = dims[c];
  // three.js axes: (X=W_eff, Y=H_eff, Z=L_eff)
  const expected = [expectedW_eff, expectedH_eff, expectedL_eff];
  const actual = rotatedAABB(k);
  const ok = expected.every((v, i) => v === actual[i]);
  const tag = ok ? "PASS" : "FAIL";
  console.log(
    `[${tag}] idx=${k} perm=(${a},${b},${c})  ` +
    `expected (X,Y,Z)=${JSON.stringify(expected)}  actual=${JSON.stringify(actual)}`,
  );
  if (!ok) failed++;
}

if (failed > 0) {
  console.error(`\n${failed} of 6 orientations FAILED — quaternion math is wrong.`);
  process.exit(1);
}
console.log("\nAll 6 orientation quaternions produce the expected rotated AABB.");
