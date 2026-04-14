# CLAUDE.md — FLOW-3D Architectural Context

This file is the authoritative system-level context for all AI-assisted code generation,
debugging, and architectural decisions in this repository. Keep it up to date as the stack
and design evolve.

---

## Project Overview & Goals

**Acronym:** FLOW-3D
**Full Title:** Routing-Aware 3D Furniture Logistics Simulator and Decision Support System
Utilizing Integer Linear Programming and First-Fit Decreasing

**Domain:** 3D Bin Packing Problem (3DBPP) tailored for Philippine Furniture Logistics

FLOW-3D is a **Decision Support System (DSS)** designed to assist logistics coordinators in
optimally loading furniture items into cargo containers or delivery vehicles. The system
pursues two primary objectives:

| Objective | Symbol | Description |
|---|---|---|
| Maximize Volumetric Utilization | $V_{util}$ | Pack the highest possible fraction of available container volume |
| Minimize Solver Execution Time | $T_{exec}$ | Return a loading blueprint fast enough for real-world dispatch workflows |

The output is an interactive **3D loading blueprint** rendered in the browser, showing the
exact position and orientation of every item inside the container.

---

## Tech Stack

> Fill in the exact versions once chosen. Do not assume a stack until these are set.

| Layer | Technology | Notes |
|---|---|---|
| Backend — Solver | `<!-- e.g., Python 3.12 + FastAPI + Gurobi 11 -->` | Hosts ILP engine and FFD heuristic |
| Backend — API | `<!-- e.g., FastAPI / Flask / Django REST -->` | Exposes `/solve` and `/status` endpoints |
| ILP Solver Library | `<!-- e.g., Gurobi, CPLEX, OR-Tools, PuLP -->` | Must support MIP with linearized spatial constraints |
| Frontend | `<!-- e.g., React 18 + Vite -->` | Consumes solver API, drives the 3D canvas |
| 3D Rendering | `<!-- e.g., Three.js r165 -->` | Renders bounding boxes and furniture meshes |
| State Management | `<!-- e.g., Zustand, Redux, Pinia -->` | Holds container manifest and solver result |
| Build / Test | `<!-- e.g., pytest, vitest, ruff, ESLint -->` | Add exact commands once chosen |

### Commands (fill in once stack is established)

```
build:   <!-- e.g., npm run build / make / cargo build -->
test:    <!-- e.g., pytest / npm test -->
lint:    <!-- e.g., ruff check . / npm run lint -->
dev:     <!-- e.g., uvicorn main:app --reload / npm run dev -->
```

### Required Environment Variables

```
<!-- e.g.,
GUROBI_LICENSE_FILE=...
API_BASE_URL=...
-->
```

---

## Algorithmic Pipeline — Matheuristic Two-Phase Sequence

FLOW-3D uses a **Matheuristic** combining an exact ILP solver with a fast FFD heuristic.
The two phases are strictly sequential; the FFD engine consumes the residual space produced
by the ILP engine.

```
┌─────────────────────────────────────────────────────────────────────┐
│  INPUT: Container dimensions + Item manifest (geometry, priority,   │
│         fragility, orientation flags, delivery sequence)            │
└────────────────────────┬────────────────────────────────────────────┘
                         │
              ┌──────────▼──────────┐
              │   PHASE 1 — ILP     │  ← exact, constraint-heavy
              │   Engine            │
              └──────────┬──────────┘
                         │  outputs: fixed placements for priority items
                         │           + residual free-space regions
              ┌──────────▼──────────┐
              │   PHASE 2 — FFD     │  ← heuristic, fast
              │   Engine            │
              └──────────┬──────────┘
                         │  outputs: placements for standard/filler items
                         │
              ┌──────────▼──────────┐
              │  COMBINED SOLUTION  │
              │  (JSON placement    │
              │   manifest)         │
              └──────────┬──────────┘
                         │
              ┌──────────▼──────────┐
              │  Three.js           │
              │  Visualization      │
              └─────────────────────┘
```

### Phase 1 — ILP Engine

**Purpose:** Optimally place items that are complex, fragile, or high-priority.

**Constraints enforced:**

1. **Non-Overlap** — No two items may occupy overlapping 3D regions. Enforced with
   big-M linearization or spatial disjunctive constraints.
2. **Orientation / Side-Up Flags** — Certain furniture (e.g., glass-top tables, sofas)
   carries a `side_up` flag that restricts the set of valid rotation orientations to
   those where the fragile face remains upward.
3. **LIFO Routing Constraints** — Items with an earlier delivery stop must be loaded
   last (closest to the door). The ILP encodes the delivery sequence as a partial order
   over container depth positions.
4. **Container Boundary** — All item extents must lie strictly within the container
   bounding box.

**Output contract (to Phase 2):**
- A list of `(item_id, x, y, z, rotation_matrix)` placements for all Phase 1 items.
- A list of axis-aligned **residual space** regions (free cuboid sub-volumes).

### Phase 2 — FFD Engine

**Purpose:** Rapidly pack the residual space left by Phase 1 with smaller, standard-sized
boxes and filler items using a First-Fit Decreasing heuristic.

**Algorithm:**
1. Sort remaining items by volume descending (the "decreasing" step).
2. For each item, iterate through residual regions in order; place in the first region
   where the item fits (the "first-fit" step).
3. Update residual regions after each placement (guillotine or maximal-rectangle split).

**Constraints relaxed vs. Phase 1:** LIFO depth ordering is only a soft preference for
Phase 2 items; hard LIFO enforcement applies to Phase 1 items only.

### Hand-off Contract

The solver module must expose a clean interface so the two phases are independently
testable and replaceable:

```
# Pseudocode — exact signatures depend on chosen language/framework
phase1_result = ilp_engine.solve(container, priority_items)
phase2_result = ffd_engine.solve(phase1_result.residual_regions, standard_items)
manifest      = merge(phase1_result.placements, phase2_result.placements)
```

Never let Phase 1 and Phase 2 logic bleed into each other's modules.

---

## Visualization

- Use **Three.js** (or equivalent) to render the container as a wireframe box.
- Each placed item is represented first as a **bounding box** (colored by delivery stop
  or fragility), then optionally replaced with a **3D furniture mesh** if an asset is
  available.
- The visualization layer is read-only with respect to solver state: it consumes the
  JSON placement manifest; it never mutates solver inputs.
- Keep the 3D canvas module strictly separate from solver logic. No solver calls inside
  render loops.

**Performance rules for the 3D canvas:**
- Merge static geometries into `BufferGeometry` instances; avoid per-frame object
  creation.
- Use instanced rendering (`InstancedMesh`) for repeated furniture models.
- Cap the scene update rate; do not re-render on every solver polling tick.
- Dispose of geometries and materials when the solution is replaced.

---

## Coding Standards

### Mathematical Precision
- All spatial coordinates and dimensions are stored as exact rational values or
  fixed-point integers (millimetres preferred). Never use floating-point for
  constraint coefficients in the ILP formulation.
- Variable names must mirror the mathematical notation in the project's formal spec:
  `x_i`, `y_i`, `z_i` for item positions; `l_i`, `w_i`, `h_i` for item dimensions;
  `L`, `W`, `H` for container dimensions.

### Modular Separation (mandatory)
| Module boundary | Rule |
|---|---|
| Solver ↔ API | Solver returns a pure data structure (JSON-serializable). No HTTP concerns inside solver code. |
| ILP ↔ FFD | Each phase is an independent module with a documented input/output contract. |
| Solver ↔ Visualization | The frontend receives only the placement manifest. It never imports or calls solver code. |
| Constraints ↔ Objective | Constraint definitions and the objective function must be in separate, named functions/methods. |

### General
- Every public function that encodes a mathematical constraint must cite the
  corresponding constraint number from the formal model in its docstring/comment.
- Do not add speculative abstractions. Build for the constraints that exist today.
- Tests for the solver must use deterministic, small instances with known optimal
  solutions so correctness can be verified analytically.

---

## Important Terminology

**Matheuristic**
A hybrid optimization method that combines an exact mathematical programming solver
(here, ILP) with a fast metaheuristic or heuristic (here, FFD). The ILP handles the
hard, high-stakes subproblem; the heuristic handles the remainder cheaply.

**LIFO (Last-In, First-Out)**
A routing constraint that reflects multi-stop delivery sequences. An item destined for
stop *k* must be loaded *after* (i.e., deeper in the container than) items destined for
stop *k+1, k+2, …*. This ensures that the truck door is never blocked by items not yet
due for unloading.

**Residual Space**
The set of free, axis-aligned cuboid sub-volumes that remain inside the container after
Phase 1 placements are fixed. These are the regions Phase 2 is permitted to fill.
Residual regions must be non-overlapping and must not intersect any Phase 1 item.

**Side-Up Flag**
A per-item boolean attribute indicating that the item has a mandatory upward-facing
orientation (e.g., a glass-top table). When set, only rotations that preserve the
designated face as the top face are permitted in the ILP orientation constraint set.

**$V_{util}$ (Volumetric Utilization)**
$$V_{util} = \frac{\sum_{i \in \text{placed}} l_i \cdot w_i \cdot h_i}{L \cdot W \cdot H}$$
The primary objective to maximize.

**$T_{exec}$ (Solver Execution Time)**
Wall-clock time from solver invocation to delivery of the placement manifest. A key
secondary objective; the matheuristic architecture exists specifically to keep this low.

---

## When the Stack Is Finalized, Add Here

- Exact build, test, lint, and dev-server commands
- Environment variable names and example values
- ILP solver license setup instructions
- Deployment / containerization notes (Docker, cloud, etc.)
- Link to formal mathematical model document (if separate)
