# FLOW-3D — Sprint Log & Changelog

Tracks all meaningful changes to the system by sprint. Update this file as part of
every commit that adds, removes, or changes a feature. Entries go under **Unreleased**
until the sprint is closed, then move to a dated sprint block.

---

## [Unreleased]

> Add new entries here as you work. Move to a sprint block when the sprint ends.

---

## Sprint 6 — 2026-04-28 · Unified Pre-Push Gate and Docker Compose Dev Pipeline

**Goal:** Consolidate the two-step pre-push gate into a single `/ship` slash
command with a mode flag, and containerize the full live pipeline
(Redis + FastAPI + Celery + Vite) into a one-command `docker compose up`
workflow so members no longer juggle four terminals.

### Added

**Config & Tooling**
- `.claude/commands/ship.md`: New unified slash command — `/ship` (commit
  mode) runs gitignore audit, lint, tests, type check, secret/conflict/
  large-file scans, and emits a ready-to-copy conventional commit message;
  `/ship release` adds Sprint-aware `CHANGELOG.md` regeneration and a
  semver tag proposal.
- `docker-compose.yml`: New stack — `redis:7-alpine` with healthcheck,
  FastAPI on `:8000`, Celery worker on `--pool=solo`, Vite dev server on
  `:5173`; bind mounts on `./backend` and `./frontend` preserve hot
  reload; `depends_on: service_healthy` ensures the broker is up before
  the api and worker start.
- `backend/Dockerfile`, `backend/.dockerignore`: Containerize FastAPI and
  Celery on `python:3.11-slim` with `libpq-dev` for `psycopg2-binary`;
  the same image is reused by both the `backend` and `celery` compose
  services with a different `command`.
- `frontend/Dockerfile`, `frontend/.dockerignore`: Containerize the Vite
  dev server on `node:20-alpine`, bound to `0.0.0.0:5173` so the host
  browser can reach it from `http://localhost:5173`.

### Changed

**Config & Docs**
- `README.md`: Replace `/check-git-push` and `/update-changelog`
  references with the unified `/ship` command (commit + release modes).
- `.gitignore`: Add `gurobi.lic` so WLS / named-user license files are
  never committed when mounted into containers via docker-compose.
- `backend/api/routes.py`, `backend/main.py`, `backend/api/models.py`:
  Drop unused imports surfaced by `ruff check`.
- `.gitignore`: Add `.env.local` and `scratch_*.py` so the
  `VITE_USE_MOCK=false` override and ad-hoc scratch scripts never reach
  the remote.

### Removed

**Config & Tooling**
- `.claude/commands/check-git-push.md`: Superseded by `/ship`
  (commit mode).
- `.claude/commands/update-changelog.md`: Superseded by `/ship release`.

---

## Sprint 5 — 2026-04-28 · 3D Furniture Models, Animate Mode, and Manifest UX

**Goal:** Render ShapeNetSem 3D furniture meshes in the loading viewer, add LIFO
animate-mode playback, replace the free-text item input with a structured furniture
dropdown, and provide one-click JSON plan export.

### Added

**Frontend**
- `frontend/src/data/modelCatalog.ts`: New module — exports `FURNITURE_OPTIONS`
  (grouped dropdown data for all 8 furniture categories), `FURNITURE_DEFAULTS`
  (auto-fills `w_i`, `l_i`, `h_i`, `weight_kg`, and `side_up` per furniture prefix),
  and `resolveModelPath()` (maps `item_id` prefix → ShapeNetSem OBJ path under
  `/models/`; numeric suffix cycles through the available model files for each category).
- `frontend/public/models/`: 41 ShapeNetSem OBJ mesh files across 8 categories
  (Bed, Bookshelf, Chair, Desk, Refrigerator, Sofa\_Couch, Table, Wardrobe\_Cabinet);
  served statically by Vite and the production build at `/models/<Category>/<id>.obj`.
- `frontend/src/components/TruckViewer.tsx`: `"▶ Animate"` view mode — packed items
  sorted by descending `stop_id` (LIFO load order) and revealed one at a time via
  `animStep` / `isPlaying` / `animSpeed` state machine and `setTimeout` playback loop;
  most-recently-placed item highlighted with a blue (`0x60a5fa`) edge outline and full
  opacity while older items dim to 50 %; playback controls bar with ⏮⏪▶⏩⏭, a
  progress slider, step counter, and Slow / Normal / Fast speed selector.
  Thesis ref: section 3.5.2.1 E — Route-Sequenced LIFO (animate sort by `stop_id` desc)
- `frontend/src/components/Dashboard.tsx`: `downloadPlan()` function and "Export JSON"
  button in the Performance section header; triggers a browser file-save of the full
  `PackingPlan` as `flow3d_{solver_mode}_{timestamp}.json`.

### Changed

**Frontend**
- `frontend/src/components/TruckViewer.tsx`: `OBJLoader` integration — loads
  ShapeNetSem OBJ models into a persistent `modelCacheRef` (Map keyed by path); each
  loaded `THREE.Group` is deep-cloned per placement and scaled by `fitModelToBox()` to
  exact `w_i × h_i × l_i` dimensions before being positioned at the placement centre
  `(cx, cy, cz)`; falls back to `BoxGeometry` when a model is unavailable or the
  `item_id` prefix is unrecognised.
- `frontend/src/components/ManifestForm.tsx`: Replace free-text `item_id` input with
  a categorized `<optgroup>` dropdown; selecting a furniture type auto-generates the
  smallest unused numeric suffix ID (e.g. `sofa_02`) and pre-fills `w_i`, `l_i`, `h_i`,
  `weight_kg`, and `side_up` from `FURNITURE_DEFAULTS`; cargo item list now starts
  empty — items are added exclusively through user action.

### Fixed

**Frontend**
- `frontend/src/components/TruckViewer.tsx`: Fix React 18 Strict Mode double-invoke
  bug — the `cancelled` cleanup flag prevented OBJ models from ever loading by marking
  all paths as in-flight (`null`) during the first effect run and then returning early on
  the remount because the cache already contained those entries; cleanup now deletes
  in-flight (`null`) cache entries so the remounted effect starts a fresh
  `OBJLoader.loadAsync` request.

---

## Sprint 4 — 2026-04-27 · Async Pipeline, Payload Constraint, and Live Demo Bring-up

**Goal:** Wire the FastAPI ↔ Celery ↔ Redis ↔ PostgreSQL async pipeline end-to-end,
add the missing payload-weight constraint to both solvers and the independent
validator, and document the live bring-up procedure so the full stack can be
demonstrated outside of mock mode.

### Added

**Backend**
- `backend/worker/celery_app.py`, `backend/worker/tasks.py`: Implement Celery + Redis
  async job queue — `solve_task` runs the full solver pipeline (ILP/FFD +
  ConstraintValidator) asynchronously; enqueued via `apply_async()` and results stored
  in Redis; task config enables JSON serialization, 3600-second result retention, and
  started tracking for polling.
- `backend/core/db.py`: Implement SQLAlchemy job logging to PostgreSQL — `job_logs`
  table captures `job_id`, `solver_mode`, `n_items`, `V_util`, `T_exec`, `status`,
  `error`, and `created_at` for every solve job (success or failure); used for ANOVA
  benchmarking. DB errors are swallowed gracefully so logging never crashes the solve
  pipeline; `create_tables()` runs at app startup via lifespan.
  Thesis ref: section 3.6 — ANOVA benchmarking
- `backend/solver/ilp_solver.py::_weight()`: Implement payload-capacity constraint
  `Σ weight_kg_i · b_i ≤ payload_kg`; linear in `b_i` so it adds no integer
  variables; skipped silently when `payload_kg ≤ 0` (treated as "no payload limit
  configured"). Wired into `_solve()` between `_lifo()` and `_symmetry_breaking()`.
  Thesis ref: section 3.5.2.1 — payload constraint
- `backend/solver/ffd_solver.py::_greedy_placement()`: Add running `placed_weight`
  counter that rejects items whose `weight_kg` would breach `truck.payload_kg`
  before any geometry / corner-candidate iteration is attempted; failed items are
  appended to `unplaced_items`.
  Thesis ref: section 3.5.2.1 — payload constraint
- `backend/core/validator.py::validate_weight()`: New post-solve check —
  `Σ weight_kg_i · b_i ≤ payload_kg` over `is_packed=True` placements; manifest-
  aware because `Placement` does not carry `weight_kg`. O(n).
  Thesis ref: section 3.5.2.1 — payload constraint
- `backend/tests/test_validator.py`: Add 4 pytest cases covering payload overload
  rejection, under-payload acceptance, unpacked-ignored behaviour, and
  `validate_all` / `first_failing_check` returning `"weight"` when the cap is
  violated.
- `backend/tests/conftest.py::pytest_collection_modifyitems`: Skip
  `test_integration_solve.py` and `test_smoke.py` cleanly when localhost:6379 is
  unreachable, with a clear "start Redis to run live tests" reason. Suite stays
  green on dev machines without Docker; live tests execute as written when Redis
  is up.

**Frontend**
- `frontend/.env.local.example`: New template — copy to `.env.local` to set
  `VITE_USE_MOCK=false` and `VITE_API_URL=http://localhost:8000`. Vite picks
  `.env.local` up automatically and it is git-ignored by default.

**Config & Tooling**
- `README.md`: Add "Celery worker" section with the Windows-specific
  `--pool=solo` requirement (default prefork pool needs `fork()`); add
  "End-to-end live demo" section listing the 5-step bring-up order
  (Redis → Postgres → uvicorn → Celery worker → Vite) plus a `curl` health
  check covering POST `/api/solve` and GET `/api/result/{job_id}`.

### Changed

**Backend**
- `backend/api/routes.py`: Convert POST/GET endpoints to async Celery queue pattern —
  `POST /api/solve` now returns HTTP 202 (Accepted) with `job_id` in <100 ms instead
  of blocking; `GET /api/result/{job_id}` polls Celery's AsyncResult backend, returning
  `status: pending` while running, `status: done` with full plan on success, or HTTP
  422 with `failed_check` detail when ConstraintValidator fails; adds 422 error
  response for infeasible plans and unexpected task crashes.
- `backend/main.py`: Add FastAPI lifespan context manager — calls
  `core.db.create_tables()` at startup so PostgreSQL schema is initialized before
  the first request.
- `backend/core/validator.py::validate_all()`, `first_failing_check()`: Add optional
  `items: List[FurnitureItem]` parameter. Weight check is run last and only when
  the manifest is supplied; placement-only callers (e.g. fixture-loading tests)
  can omit `items` and the weight check is skipped.
- `backend/solver/base.py::AbstractSolver.solve()`: Thread `items` through to
  `first_failing_check` so the post-solve safety net always exercises the weight
  check on real solver output.
- `backend/requirements.txt`: Add `sqlalchemy` dependency (was missing but required
  by `core/db.py`).
- `backend/tests/test_integration_solve.py`: Fix imports (`_engine` now imported
  from `worker.tasks`, not `api.routes`); update POST status code assertion
  from `200` to `202`.

**Frontend**
- `frontend/src/api/client.ts::fetchSolution()`: Replace the infinite `while(true)`
  poll loop with a 60-second deadline (`POLL_TIMEOUT_MS`); throws a diagnostic
  error pointing at the Celery worker as the likely culprit when the deadline
  passes. Previous behaviour spun the UI forever if the broker stalled.

**Config & Tooling**
- Fix unused TypeScript and Python imports flagged by `tsc` and `ruff`; add
  `.env.local` to `.gitignore` so Vite's local environment override file is not
  accidentally staged.

---

## Sprint 3 — 2026-04-25 · FFD Heuristic, Post-Solve Safety Net, and Template Method

**Goal:** Ship the live Route-Sequential FFD heuristic (thesis 3.5.2.2), convert
`AbstractSolver.solve()` into a post-solve safety-net template method, and confirm the
full pipeline (FFD → ConstraintValidator → PackingPlan) through the smoke test suite.

### Added

**Backend**
- `backend/solver/base.py`: Convert `AbstractSolver.solve()` into a template
  method — runs the subclass `_solve()` then auto-invokes
  `ConstraintValidator.validate_all()`; raises `PlanValidationError`
  (carrying the failed plan, truck, and failing-check name) when any of the
  four thesis 3.5.2.1 constraints (B, C, E, Rigid Orientation) is violated.
  Solvers can no longer hand an unchecked `PackingPlan` to the API layer.
- `backend/core/validator.py`: Add `PlanValidationError` exception and
  `ConstraintValidator.first_failing_check()` helper that returns the name
  of the first failing check (`non_overlap`, `boundary`, `orientation`,
  `lifo`) or `None` when the plan is clean — used by the safety net in
  `AbstractSolver.solve()`.
- `backend/solver/ffd_solver.py`: Implement live Route-Sequential FFD
  heuristic — `_lifo_presort()` orders items by `(-stop_id, -volume)` so
  the deepest-stop, largest items are placed first; `_greedy_placement()`
  walks corner-derived candidate coordinates in `(y, x, z)` ascending order
  and accepts the first that satisfies boundary, orientation, non-overlap,
  and LIFO; orientation enumeration honours `side_up` via
  `UPRIGHT_ORIENTATIONS`. Items that fail every candidate land in
  `unplaced_items`. Worst case O(n²) per thesis Table 3.3.
  Thesis ref: section 3.5.2.2
- `backend/tests/test_ffd_solver.py`: Add 4 pytest cases for the live FFD
  path — LIFO pre-sort ordering, end-to-end `_solve()` produces a plan that
  passes `validate_all()`, oversized items land in `unplaced_items`, and
  `side_up` items keep `h_i` along the truck z-axis (orientation in `{0, 1}`).
- `backend/tests/test_integration_solve.py`: End-to-end integration test for
  the full solver pipeline (ILP and FFD paths, ConstraintValidator pass);
  automatically skipped when Redis is unreachable on localhost:6379 (skip
  logic added to `conftest.py` in Sprint 4).

### Changed

**Backend**
- `backend/solver/ilp_solver.py`: Expose Gurobi solver parameters (time limit,
  MIP gap) via application settings; tighten decision-variable upper bounds for
  `x_i`, `y_i`, `z_i` to `W`, `L`, `H` respectively, reducing the Branch-and-Bound
  search space.
  Thesis ref: section 3.5.2.1 D — variable domains
- `backend/solver/ilp_solver.py`, `backend/solver/ffd_solver.py`: Rename
  the override `solve()` → `_solve()` to match the new template-method
  contract in `AbstractSolver`. Public `solve()` is unchanged from the
  caller's perspective.
- `backend/core/optimizer.py`: Drop the redundant
  `ConstraintValidator.validate_all()` call — validation is now enforced
  one layer down inside `AbstractSolver.solve()`, so
  `OptimizationEngine.optimize()` simply dispatches and returns.
- `.gitignore`: Add `scratch_*.py` pattern to exclude local experimental
  scripts from version control.

---

## Sprint 2 — 2026-04-24 · Live ILP Model and ConstraintValidator

**Goal:** Implement the complete Gurobi ILP formulation (constraints A–E plus Rigid
Orientation) and the independent ConstraintValidator, replacing all solver stubs with
production-ready code.

### Added

**Backend**
- `backend/solver/ilp_solver.py`: Implement live Gurobi ILP model — `_variable_domains()`
  defines `b_i ∈ {0,1}`, `s_ij,k ∈ {0,1}` (k=1..6), and integer-mm coordinates
  `x_i, y_i, z_i ≥ 0` bounded by `W`, `L`, `H`.
  Thesis ref: section 3.5.2.1 D
- `backend/solver/ilp_solver.py`: Implement `_boundary()` — enforces `x_i+w_i ≤ W·b_i`,
  `y_i+l_i ≤ L·b_i`, `z_i+h_i ≤ H·b_i`; unpacked items (`b_i=0`) are pinned to the
  origin because `w_i`, `l_i`, `h_i` are strictly positive.
  Thesis ref: section 3.5.2.1 C
- `backend/solver/ilp_solver.py`: Implement `_non_overlap()` — Big-M disjunctive
  separation across 6 spatial planes using axis-specific constants `M_x=W`, `M_y=L`,
  `M_z=H` (tighter LP relaxation than a single global M); adds activation constraint
  `∑s_ij,k ≥ b_i + b_j − 1`.
  Thesis ref: section 3.5.2.1 B
- `backend/solver/ilp_solver.py`: Implement `_lifo()` — Sequential Loading Constraint
  `y_i + l_i ≤ y_j + L·(2 − b_i − b_j)` for every ordered pair where
  `stop_i > stop_j`; the `L·(2 − b_i − b_j)` slack gate ensures unpacked items do
  not pin packed items' `y_i` coordinates.
  Thesis ref: section 3.5.2.1 E
- `backend/solver/ilp_solver.py`: Implement Rigid Orientation (`_orientation()`) —
  adds 6 binary variables `o_i,k` per item; `∑o_i,k = b_i` selects exactly one
  orientation when packed; `side_up=True` restricts `o_i,k` to upright set `{0,1}`
  (original `h_i` stays along truck z-axis). `_effective_dims()` linearizes the
  6-permutation `ORIENTATION_PERMUTATIONS` table so `w_eff`, `l_eff`, `h_eff` replace
  constants in `_boundary()`, `_non_overlap()`, and `_lifo()`.
  Thesis ref: section 3.5.2.1 (Rigid Orientation)
- `backend/solver/ilp_solver.py`: Implement `_objective()` — maximizes
  `V_util = ∑(v_i · b_i) / (W·L·H)`; denominator is a positive constant so the
  numerator is maximized directly; coefficients are normalised to `[0,1]` to avoid
  Gurobi large-coefficient numerical warnings.
  Thesis ref: section 3.5.2.1 A
- `backend/solver/ilp_solver.py`: Implement `_extract_plan()` — reads `b_i.X`,
  `o_i,k.X`, and `x_i/y_i/z_i.X` from the solved model; emits actual
  `orientation_index` and effective `(w, l, h)` on each `Placement` so downstream
  consumers (frontend, validator) need no re-computation.
- `backend/core/validator.py`: Implement `validate_non_overlap()` — O(n²) pairwise
  scan over packed placements; passes when at least one of the six axis-aligned
  separation conditions holds for every pair.
  Thesis ref: section 3.5.2.1 B
- `backend/core/validator.py`: Implement `validate_boundary()` — rejects any packed
  placement where `x_i < 0`, or `x_i+w_i > W`, `y_i+l_i > L`, `z_i+h_i > H`.
  Thesis ref: section 3.5.2.1 C
- `backend/core/validator.py`: Implement `validate_lifo()` — O(n²) check that every
  packed pair with `stop_i > stop_j` satisfies `y_i + l_i ≤ y_j`.
  Thesis ref: section 3.5.2.1 E
- `backend/core/validator.py`: Implement `validate_orientation()` — asserts
  `orientation_index ∈ [0,5]` for every placement; `side_up` upright enforcement is
  delegated to the solver's `_orientation()` constraints (the placement-only view
  cannot recover the manifest `side_up` flag).
  Thesis ref: section 3.5.2.1 (Rigid Orientation)
- `backend/tests/test_validator.py`: Add 9 pytest cases for `ConstraintValidator` —
  covers happy path (mockPlan.json passes all checks), targeted failures for each of
  the four check types, touching-face boundary for non-overlap, and the rule that
  unpacked placements are skipped by all spatial checks.

### Changed

- `README.md`: Expand cross-platform setup instructions; updated with latest project
  structure and development workflow details.

---

## Sprint 2 — 2026-04-27 · Frontend UI — Manifest Form, 3D Hover, Multi-Plan Comparison

**Goal:** Deliver a fully interactive frontend: a complete cargo manifest input form,
hover tooltips on 3D-packed items, and a three-plan comparison selector so users can
evaluate trade-offs between ILP and FFD solver outputs.

### Added

**Frontend**
- `frontend/src/components/ManifestForm.tsx` — new full manifest input component with
  truck spec editor, stops editor, and per-item add/validate/delete; pre-populated with
  5 furniture items across 3 delivery stops for thesis demo.
- `frontend/src/components/PlanSelector.tsx` — new 3-card comparison panel showing
  `V_util` colour bar, packed/total count, `T_exec`, and solver mode badge for each
  alternative plan; selected card highlighted with a blue ring.
- `frontend/src/components/TruckViewer.tsx` — `THREE.Raycaster` `mousemove` handler;
  each item mesh stores its `Placement` in `mesh.userData`; renders an `ItemTooltip`
  overlay showing `item_id`, `w_i × l_i × h_i`, volume (m³), position (`x_i`, `y_i`,
  `z_i`), `orientation_index`, and `stop_id` colour dot; tooltip auto-flips left when
  cursor is past 60 % of canvas width.
  Thesis ref: section 3.5.2.1 — Placement contract (`x_i`, `y_i`, `z_i`, `w_i`,
  `l_i`, `h_i`, `orientation_index`, `stop_id`)
- `frontend/src/components/TruckViewer.tsx` — camera position and `OrbitControls`
  target persisted in `useRef` across scene rebuilds so orbit state survives
  3D ↔ Exploded ↔ Labels mode switches.
- `frontend/src/components/Dashboard.tsx` — LIFO load-sequence panel groups packed
  items by descending `stop_id` (highest loaded first, sits nearest rear); colour-coded
  `V_util` progress bar (green ≥ 70 %, amber ≥ 40 %, red below); ILP/FFD solver mode
  badge; amber callout for `unplaced_items`.
  Thesis ref: section 3.5.2.1 E — Route-Sequenced LIFO (`stop_i > stop_j → y_i + l_i ≤ y_j`)
- `frontend/src/api/client.ts` — `fetchSolutions(request): Promise<PackingPlan[]>`
  returns 3 alternative plans; real mode makes 3 parallel requests, mock mode returns
  `mockPlans` array.
- `frontend/src/data/mockPlan.ts` — added `mockPlanB` (FFD, `V_util` 0.41, `T_exec`
  23 ms, right-shifted layout) and `mockPlanC` (FFD, `V_util` 0.39, `T_exec` 15 ms,
  `bookshelf_01` unplaced) exported as `mockPlans: PackingPlan[]`.
- `frontend/src/App.tsx` — replaced single `plan: PackingPlan | null` state with
  `plans: PackingPlan[]` and `selectedIdx: number`; wires `fetchSolutions`; mounts
  `PlanSelector` above `Dashboard` in Results tab; loading copy updated to reflect
  "Generating 3 alternative plans".

---

## Sprint 1 — 2026-04-24 · Project Bootstrap

**Goal:** Establish the full project scaffold so all members can run the system locally
and put developer tooling (pre-push gate, changelog, slash commands) in place.

### Added

**Backend**
- `backend/solver/ilp_solver.py` — ILPSolver using Gurobi Branch-and-Bound (exact,
  O(2^n)); enforces non-overlap Big-M constraints (`s_ij_k`, k=1..6) and route-sequenced
  LIFO (`y_i + l_i <= y_j` when `stop_i > stop_j`).
  Thesis ref: section 3.5.2.1 B, E
- `backend/solver/ffd_solver.py` — FFDSolver using Route-Sequential First-Fit
  Decreasing (heuristic, O(n²)); items pre-sorted by descending stop order before
  placement to maintain LIFO along the Y-axis.
  Thesis ref: section 3.5.2.1 E
- `backend/core/validator.py` — ConstraintValidator scaffold: stub methods for
  non-overlap Big-M (`s_ij_k`, k=1..6), boundary conditions (`x_i+w_i ≤ W`,
  `y_i+l_i ≤ L`, `z_i+h_i ≤ H`), orientation admissibility, and route-sequenced
  LIFO (all returning `True` pending implementation).
  Thesis ref: section 3.5.2.1 B, C, E
- `backend/core/optimizer.py` — hybrid dispatch: routes to ILPSolver when
  `n ≤ SOLVER_THRESHOLD`, FFDSolver otherwise; always calls
  `ConstraintValidator.validate_all()` on the result.
- `backend/api/models.py` — Pydantic models implementing the full Placement and
  PackingPlan contracts (`item_id`, `x`, `y`, `z`, `w`, `l`, `h`,
  `orientation_index`, `stop_id`, `is_packed`, `v_util`, `t_exec_ms`, `solver_mode`,
  `unplaced_items`).
- `backend/api/routes.py` — FastAPI routes exposing the solver pipeline to the frontend.
- `backend/tests/test_smoke.py` — smoke tests covering both ILP and FFD solver paths.
- `backend/requirements.txt`, `ruff.toml`, `pytest.ini`, `settings.py` — backend
  dependency manifest, linter config, test config, and environment settings.

**Frontend**
- `frontend/src/components/TruckViewer.tsx` — Three.js r165+ interactive 3D truck
  loading viewer; renders each Placement using `x`, `y`, `z`, `w`, `l`, `h` coordinates
  (millimetres) and colour-codes items by `stop_id`.
- `frontend/src/components/Dashboard.tsx` — control panel displaying `v_util`,
  `t_exec_ms`, `solver_mode`, and the list of `unplaced_items` from PackingPlan.
- `frontend/src/api/client.ts` — typed API client consuming PackingPlan JSON from the
  FastAPI backend.
- `frontend/src/types/index.ts` — TypeScript interfaces mirroring the Placement and
  PackingPlan contracts.
- `frontend/src/data/mockPlan.ts` — mock PackingPlan for offline frontend development.
- `docs/mockPlan.json` — reference sample PackingPlan JSON used for manual testing.

**Config & Tooling**
- `CLAUDE.md` — project guide covering mandatory variable naming (`x_i`, `l_i`, `w_i`,
  `h_i`, `V_util`, `s_ij_k`, `b_i`, `L`, `W`, `H`, `T_exec`), JSON placement contract,
  constraint reference, module separation rules, and cross-platform commands.
- `.env.example` — environment variable template (`USE_MOCK_SOLVER`, `SOLVER_THRESHOLD`,
  `REDIS_URL`, `DATABASE_URL`, `GUROBI_LICENSE_FILE`).
- `.gitignore` — ignores `venv/`, `__pycache__/`, `*.pyc`, `node_modules/`, `dist/`,
  `.vite/`, Gurobi artefacts (`gurobi.log`, `*.rlp`), OS noise, and
  `.claude/settings.local.json`.
- `.claude/commands/check-git-push.md` — `/check-git-push` slash command: five-phase
  pre-push gate covering .gitignore audit, lint, tests, type check, secret scan,
  conflict markers, large-file check, and commit message generation.
- `.claude/commands/update-changelog.md` — `/update-changelog` slash command: reads
  git log, classifies commits by conventional-commit type, updates CHANGELOG.md sprint
  blocks, and proposes a semver git tag.
- `CHANGELOG.md` — this file; sprint log and developer changelog.

### Changed

- `README.md` — expanded with cross-platform setup instructions for backend (Windows
  and macOS venv activation), frontend (Node/npm), and Redis (Docker on Windows,
  Homebrew on macOS).

---

<!--
  SPRINT TEMPLATE — copy this block for each new sprint
  -------------------------------------------------------

## Sprint N — YYYY-MM-DD · <Sprint Goal>

**Goal:** One sentence describing what this sprint was meant to deliver.

### Added

**Backend**
-

**Frontend**
-

**Config & Tooling**
-

### Changed
-

### Fixed
-

### Removed
-

-->
