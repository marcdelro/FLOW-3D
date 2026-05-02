# FLOW-3D — Claude Code Project Guide

## Before writing any files

Always read **@CLAUDE.md** and **@docs/Yukti_V2ThesisDocument.pdf** before creating or
modifying any file in this project. The thesis is the authoritative source for all
algorithm details, variable names, constraint formulas, and contract definitions.

## Project

- **Institution:** FEU Institute of Technology, BS Computer Science
- **Name:** FLOW-3D
- **Full title:** Routing-Aware 3D Furniture Logistics Simulator and Decision Support
  System Utilizing Integer Linear Programming and First-Fit Decreasing

FLOW-3D is a thesis-grade Decision Support System that generates LIFO-compliant 3D
truck-loading plans for Philippine furniture logistics. A hybrid engine dispatches to an
exact ILP solver (Gurobi Branch-and-Bound) for small manifests and a Route-Sequential
First-Fit Decreasing heuristic for large manifests. Every plan is then verified by an
independent ConstraintValidator before being returned to the frontend.

## Tech stack

- **Backend:** Python 3.10+, FastAPI, uvicorn, gurobipy (Gurobi 11), Celery, Redis,
  PostgreSQL, pytest, ruff
- **Frontend:** React 18, Vite, TypeScript, Three.js r165+, Tailwind CSS

## Commands (cross-platform — activate venv before backend commands)

- **build:** `cd frontend && npm run build`
- **test:** `cd backend && python -m pytest`
- **lint:** `cd backend && ruff check .`
- **dev (backend):** `cd backend && python -m uvicorn main:app --reload`
- **dev (frontend):** `cd frontend && npm run dev`

> Always invoke Python tools via `python -m <tool>` and Node env vars via `cross-env`
> so scripts behave identically on Windows and macOS.

## Variable naming — MANDATORY (must match thesis section 3.5.2.1 exactly)

| Kind          | Names                               |
| ------------- | ----------------------------------- |
| Positions     | `x_i`, `y_i`, `z_i` (never `pos_x`, `posX`, `position_x`) |
| Item dims     | `l_i`, `w_i`, `h_i` (never `length`, `width`, `height` as standalone vars) |
| Truck dims    | `L`, `W`, `H` (capitals only)       |
| Binary packed | `b_i`                               |
| Separation    | `s_ij_k` for `k = 1..6` (Big-M non-overlap) |
| Metrics       | `V_util` (float 0–1), `T_exec` (int, milliseconds) |

## JSON placement contract (every field name and type)

```
item_id:            str
x, y, z:            int  (millimetres)
w, l, h:            int  (millimetres)
orientation_index:  int  (0-5)
stop_id:            int
is_packed:          bool
```

## PackingPlan contract

```
placements:      List[Placement]
v_util:          float  (0.0 to 1.0)
t_exec_ms:       int
solver_mode:     "ILP" | "FFD"
unplaced_items:  List[str]
```

## Constraint reference (thesis section 3.5.2.1)

### B. Non-overlap Big-M (6 planes)

```
x_i + w_i <= x_j + M*(1 - s_ij1)
x_j + w_j <= x_i + M*(1 - s_ij2)
y_i + l_i <= y_j + M*(1 - s_ij3)
y_j + l_j <= y_i + M*(1 - s_ij4)
z_i + h_i <= z_j + M*(1 - s_ij5)
z_j + h_j <= z_i + M*(1 - s_ij6)
sum(s_ij_k for k = 1..6) >= b_i + b_j - 1
```

### C. Boundary

```
x_i + w_i <= W * b_i
y_i + l_i <= L * b_i
z_i + h_i <= H * b_i
```

### E. Route-Sequenced LIFO (Sequential Loading Constraint)

```
if stop_i > stop_j:  y_i + l_i <= y_j
```

Items destined for later stops must sit deeper along the Y-axis (y = 0 is the truck
rear; y = L is the loading door). Processing order therefore maps inversely to delivery
order.

### Orientation

The `side_up` flag restricts which `orientation_index` values (0–5) are admissible
for rigid items (e.g. refrigerators, wardrobes).

## Implementation extensions beyond thesis 3.5.2.1 A–E

The deployed ILP and FFD solvers honor three additional constraint blocks not
formalized in 3.5.2.1. Each is documented in full
(variables, formal constraints, citations, test coverage, and defense Q&A) in
**@docs/model_extensions.md** — read that file before modifying `_support()`,
`_weight()`, or `validate_no_stack_on_fragile()`.

- **Extension F — Vertical Support** (`ilp_solver.py::_support()`,
  `ffd_solver.py::_supported()`): single-supporter disjunction so packed items
  rest on the floor or on top of a containing supporter. Bortfeldt & Mack (2007).
- **Extension G — Fragile No-Stacking** (`sup_fragile_{i}_{j}` family,
  `validator.py::validate_no_stack_on_fragile()`): honours the
  `FurnitureItem.fragile` data-contract field by forbidding any item from
  using a fragile item as a supporter.
- **Truck Payload** (`ilp_solver.py::_weight()`,
  `validator.py::validate_weight()`): `Σ_i weight_kg_i · b_i ≤ payload_kg`.

Any new constraint that goes beyond 3.5.2.1 A–E **must** be added to
`docs/model_extensions.md` as a new section in the same format. A constraint in
the code without a corresponding section is a defense liability.

## Module separation rules (mandatory)

- `solver/` **never** imports from `api/` or `main.py`.
- `ConstraintValidator` lives in `core/` — called by the solver, never embedded in it.
- Frontend consumes `PackingPlan` JSON only — it never imports solver code.
- Every constraint function must cite its thesis section in its docstring.
- All file I/O must use `pathlib.Path()` — never hardcoded OS-specific slashes.

## Algorithmic pipeline

```
n = len(manifest.items)
if n <= SOLVER_THRESHOLD: ILPSolver  (exact, Branch-and-Bound via Gurobi)
else:                     FFDSolver  (heuristic, O(n^2), LIFO pre-sort)
always run ConstraintValidator.validate_all() after solve()
```

Time complexities (thesis section 3.5.2.4, Table 3.3):

- ILP path: `O(2^n)` — Branch-and-Bound, exponential.
- FFD path: `O(n^2)` — sort + greedy placement.
- LIFO check: `O(1)` per placement attempt.
- Non-overlap check: `O(n)` against already-placed items.
- Orientation check: `O(1)` boolean lookup.

## Cross-platform rules (must hold for every file and script)

- All Python file paths use `pathlib.Path()` — never hardcoded slashes.
- All file reads use `open(path, encoding="utf-8")` — never rely on OS default encoding.
- `package.json` scripts use `cross-env` for environment variables.
- Use `python -m uvicorn` and `python -m pytest` (works without PATH differences).
- Vite and Node tools use forward slashes natively.
- Redis: Windows members use Docker Desktop, macOS member uses `brew install redis`.
- Document both venv activation paths (`venv\Scripts\activate` / `source venv/bin/activate`).
