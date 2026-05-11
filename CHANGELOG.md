# FLOW-3D — Sprint Log & Changelog

Tracks all meaningful changes to the system by sprint. Update this file as part of
every commit that adds, removes, or changes a feature. Entries go under **Unreleased**
until the sprint is closed, then move to a dated sprint block.

---

## [Unreleased]

> Add new entries here as you work. Move to a sprint block when the sprint ends.

---

## Sprint 18 — 2026-05-11 · Manifest Form UX: Undo/Redo, Unit Conversion, and Delete Confirmation

**Goal:** Reduce user error and friction in the cargo manifest editor by adding a
30-entry undo/redo stack scoped to cargo-item mutations, a shared mm/cm/m/in dimension
unit toggle across both the Truck Specification and Cargo Items sections, and a
polished floating popover confirmation card that replaces the cramped inline delete strip.

### Added

**Frontend**
- `frontend/src/components/ManifestForm.tsx`: New `DimUnit` type (`"mm" | "cm" | "m" | "in"`),
  `UNIT_TO_MM` conversion table, `toDisplay(mm, unit)` (integer for mm/cm, 2 d.p. for m/in),
  and `fromDisplay(v, unit)` (`Math.max(1, Math.round(v * factor))`) helpers. All stored
  dimension values remain whole-mm integers; the conversion layer is purely presentational.
- `frontend/src/components/ManifestForm.tsx`: New `UnitToggle` pill component — four
  segmented buttons (`mm | cm | m | in`), shared `unit` state across both Truck Specification
  and Cargo Items sections so switching one updates both simultaneously. The active unit is
  reflected in section labels ("Width (cm)"), the Size column header, and the AddItemForm
  dimension label.
- `frontend/src/components/ManifestForm.tsx`: 30-entry undo/redo stack for cargo-item
  mutations. `itemHistory: useRef<FurnitureItem[][]>` holds snapshots; `historyIdx: useState`
  drives the undo/redo button disabled states and re-renders. `pushHistory(newItems)` slices
  any redo branch before appending and caps at 30 entries. History resets on file import.
  Undo (↺) and redo (↻) icon buttons (36×36 px) appear in the Cargo Items section header
  via the new `Section action` prop.
- `frontend/src/components/ManifestForm.tsx`: Keyboard shortcuts — Ctrl+Z undo, Ctrl+Y /
  Ctrl+Shift+Z redo, Escape dismisses pending delete. Implemented via a one-time
  `useEffect([], [])` handler that reads from `historyActionsRef.current` so it never
  captures stale closures.
- `frontend/src/components/ManifestForm.tsx`: Delete confirmation popover anchored above
  the trash button (`absolute bottom-full right-0 mb-2 w-44 rounded-xl shadow-xl border-2
  z-20`). Shows the item ID as a muted subtitle, "Remove this item?" with a red trash icon,
  and full-width stacked Delete (solid red) / Cancel (ghost) buttons. A rotated `w-3 h-3`
  caret diamond connects the card to the button. The trash button toggles the popover on
  re-click and turns red while the popover is open. The table container switches from
  `overflow-hidden` to `overflow-visible` while any popover is active so the card clears
  the rounded clip boundary.

### Changed

**Frontend**
- `frontend/src/components/ManifestForm.tsx::Section`: Add optional `action?: ReactNode`
  prop. When supplied, it renders beside the badge in the sticky header inside a
  `flex items-center gap-2` wrapper so undo/redo buttons and the item count coexist.
- `frontend/src/components/ManifestForm.tsx::AddItemForm`: Add `unit: DimUnit` prop.
  Dimension fields (`w`, `l`, `h`) display `toDisplay(value[k], unit)` and commit
  `fromDisplay(n, unit)` on change; `step` is 0.01 for m/in and 1 for mm/cm.
- `frontend/src/components/ManifestForm.tsx::commitAdd`: Both the edit path and the add
  path now capture `newItems` as an explicit variable before calling `setItems`, then
  immediately pass `newItems` to `pushHistory` so the snapshot is always consistent with
  what was written to state.
- `frontend/src/components/ManifestForm.tsx::startEdit`: Calls `setPendingDeleteIdx(null)`
  first so clicking a row to edit it dismisses any open delete confirmation.
- `frontend/src/components/ManifestForm.tsx`: Remove `deleteItem()` function. Replaced by
  `requestDelete(idx)` → `confirmDelete(idx)` → `cancelDelete()` flow; `confirmDelete`
  adjusts `editingIdx` and calls `pushHistory` so deletes are undoable.
- `frontend/src/components/ManifestForm.tsx`: Cargo table size column header updated to
  "Size ({unit})" and cell values updated to `toDisplay(item.w, unit)×…` with `font-mono`.
- `frontend/src/components/ManifestForm.tsx`: Table row tint extended — `bg-red-50` /
  `bg-red-950/30` when `pendingDeleteIdx === i`, taking priority over the blue edit tint.

---

## Sprint 17 — 2026-05-09 · Axle Balance Strategy, Explainability Panel, and Audit Fixes

**Goal:** Replace the redundant `balanced` DSS strategy (which collapsed to an
identical layout to Optimal at small `n` and to Optimal's own FFD fallback at
large `n`) with a physically distinct **Axle Balance** strategy that minimises
longitudinal centre-of-mass offset for LTO axle-weight compliance. Add a
sidebar Explainability tab so panel members can read why the engine picked a
solver and which constraints shaped the result. Land the audit follow-ups
identified after Sprint 16 (`Placement.model_variant` round-trip, weight/truck
guards, `failed_check` propagation through repair flow, fallback-geometry
warning chip).

### Added

**Backend**
- `backend/solver/ffd_solver.py::FFDSolver`: New `axle_balance: bool = False`
  flag. When set, Phase 3 (thesis section 3.5.2.2) walks every feasible
  candidate per orientation instead of breaking on first-fit, scoring each by
  `|new_y_cog - truck.L/2|` where `y_cog` is the cumulative weight-weighted
  longitudinal centroid of placed cargo. Picks the candidate that brings the
  centroid closest to the cargo-bay midpoint — a uniform-beam approximation
  for "front and rear axles equally loaded". Worst-case complexity stays
  O(n²); thesis 3.5.2.1 B/C/E + extensions F/G are still enforced.
- `backend/core/optimizer.py::OptimizationEngine`: New `_ffd_axle = FFDSolver(presort="weight", axle_balance=True)`
  solver instance, dispatched when `strategy="axle_balance"`. The
  weight-descending presort commits the heaviest items to their best
  y-positions first when they have the most influence on `y_cog`.
- `backend/core/optimizer.py::STRATEGY_RATIONALES["axle_balance"]`: New
  user-facing rationale string explaining the LTO-compliance motivation.
- `backend/api/models.py::Placement.model_variant`: New optional field. ILP
  and FFD solvers now copy `model_variant` from the input `FurnitureItem`
  into every emitted `Placement` so the 3D viewer renders the user's chosen
  catalog variant rather than a hash-derived default. Closes the regression
  flagged in the post-Sprint-16 audit.
- `backend/core/db.py::job_logs.failed_check`: New `String(32)` column.
  `ConstraintValidator.first_failing_check` labels (`"non_overlap"`,
  `"lifo"`, `"fragile_stacking"`, etc.) are now persisted alongside each
  failed solve so SQL aggregations like
  `SELECT failed_check, COUNT(*) FROM job_logs GROUP BY failed_check`
  yield meaningful constraint-failure breakdowns for the ANOVA section.
- `backend/tests/test_axle_balance.py`: 5 new tests — `axle_balance` strategy
  dispatches to FFD, plan carries the strategy-specific rationale, axle-aware
  picker brings y-CoG **strictly** closer to L/2 than first-fit FFD on a
  heavy-forward-biased manifest, all six constraint validators still pass,
  multi-stop LIFO ordering still respected after the picker runs.
- `backend/tests/test_smoke_audit_fixes.py`: 13 new tests covering Pydantic
  rejection of `w/l/h ≤ 0`, `weight_kg < 0`, and `TruckSpec` zero-dim inputs
  at the API boundary; `model_variant` round-trip on both ILP and FFD paths;
  `failed_check` propagation through the 422 response body and into
  `log_job` after Sprint 16's repair flow exhausts.

**Frontend**
- `frontend/src/components/Explainability.tsx` (new component): Sidebar panel
  with three sections — **Solver Dispatch** (strategy-specific rationale,
  Strategy → Solver mapping table with the active row highlighted, n-vs-
  threshold bar shown only for Optimal), **Performance Snapshot** (`V_util`,
  `T_exec`, packed/total cards), **Constraints in Effect** (LIFO stop count,
  fragile-item chips, payload-cap bar with binding-constraint commentary,
  unplaced-items explainer that adapts wording per solver mode).
- `frontend/src/App.tsx`: New "Explain" sidebar tab (third step in the
  workflow). Tab grid resized from 2 to 3 columns; tab typography tightened
  (`text-sm` titles, `text-xs` truncating subtitles, smaller step circles)
  to fit the 440-px sidebar. Disabled until at least one plan exists.
- `frontend/src/components/TruckViewer.tsx`: New amber warning chip in the
  top-right corner that surfaces every item rendered as placeholder geometry
  (3D model failed to resolve). Hover reveals the offending `item_id`s.
  Hidden when `fallbackItemIds` is empty. Catches silent rendering
  regressions that previously appeared as colored boxes with no warning.
- `frontend/src/data/planBuilder.ts::buildAxleBalancePlan`: Replaces
  `buildBalancedPlan`. Mock places items compactly LIFO, then translates
  the entire packing along Y by `(L/2 − cogY)` so the cumulative y-CoG
  sits at the cargo-bay midpoint. Produces a visually distinct centred
  layout even when the backend mock is in use.

**Config**
- `docker-compose.yml`: `GUROBI_LICENSE_PATH` environment variable now
  parameterises the host license path (mounted to `/opt/gurobi/gurobi.lic`
  inside backend + celery containers). Compose fails loudly if the env var
  is missing instead of silently mounting nothing. `GRB_LICENSE_FILE` set
  explicitly so gurobipy doesn't have to guess. New backend healthcheck on
  `/docs` so frontend `depends_on: condition: service_healthy` actually
  waits for FastAPI. New `pgdata` named volume so `job_logs` persist across
  `docker compose down`.
- `.env.example`: New `GUROBI_LICENSE_PATH` placeholder with platform
  examples. `USE_MOCK_SOLVER` comment now explains that
  `docker-compose.yml` overrides it to `False` regardless.

### Changed

**Backend**
- `backend/api/models.py::SolveStrategy`: Literal updated from
  `"optimal" | "balanced" | "stability"` to
  `"optimal" | "axle_balance" | "stability"`.
- `backend/api/models.py::FurnitureItem.weight_kg`: Added `ge=0.0` guard.
  Negative weights would have undercounted the payload check.
- `backend/api/models.py::TruckSpec`: Added `ge=1` to `W`, `L`, `H` and
  `gt=0.0` to `payload_kg`. Zero-dim trucks would have produced a divide-
  by-zero in `v_util` and a payload check that admitted any item.
- `backend/core/optimizer.py::OptimizationEngine`: `_ffd_volume` is now an
  internal-only fallback for the Optimal strategy when n exceeds
  `SOLVER_THRESHOLD` or Gurobi is unavailable. It is no longer exposed as a
  user-facing strategy.
- `backend/worker/tasks.py`: The repair-failure branch (`InfeasiblePackingException`
  handler from Sprint 16) now passes `failed_check=repair_exc.failed_check`
  to `log_job` so the constraint label is persisted alongside the failure
  row. Both initial and repair-failure log lines now include
  `failed_check=` in the structured-log message.
- `backend/tests/conftest.py`: `LIVE_PIPELINE_TESTS` extended with
  `test_smoke_audit_fixes.py` so the suite skips cleanly when Redis is not
  running on `localhost:6379`.
- `backend/tests/test_blackbox.py`: `_solve` default strategy and all
  `strategy="balanced"` references renamed to `strategy="axle_balance"`.
  `TestBBS09StandaloneFFDBaseline` test methods renamed to match. Unused
  `_BALANCED_RATIONALE_FRAGMENT` constant replaced with `_AXLE_RATIONALE_FRAGMENT`.

**Frontend**
- `frontend/src/types/index.ts::SolveStrategy`: Literal renamed.
- `frontend/src/api/client.ts::STRATEGIES`: Tuple updated to dispatch
  `axle_balance` instead of `balanced`.
- `frontend/src/components/Dashboard.tsx`: `STRATEGY_LABEL`,
  `STRATEGY_BADGE_DARK`, `STRATEGY_BADGE_LIGHT` keys renamed; "Axle Balance"
  reuses the teal palette previously used by Balanced.
- `frontend/src/components/PlanSelector.tsx`: `STRATEGY_NAMES` and
  `STRATEGY_BLURB` updated; new blurb reads "Distributes mass across both
  axles."
- `frontend/src/components/Explainability.tsx`: Strategy → Solver mapping
  table now shows "FFD with axle-aware best-fit — always" for the
  `axle_balance` row. Active strategy row highlighted with an `ACTIVE` chip
  + ring; threshold bar only renders for Optimal; non-Optimal strategies
  get a "SOLVER_THRESHOLD does not apply…" footnote so a panel member
  reading the table doesn't think the threshold gates this run.
- `frontend/src/data/mockPlan.ts`: `RATIONALES.balanced` and `mockPlanB`
  renamed to `axle_balance` so the static JSON-fixture path also produces
  the right strategy field.

### Removed

**Backend**
- `backend/core/optimizer.py`: The user-facing `balanced` strategy
  dispatch. The volume-desc FFD path it referenced still exists internally
  as the Optimal fallback for `n > SOLVER_THRESHOLD`.

### Notes

- **Breaking change (API contract):** API consumers sending
  `{"strategy": "balanced"}` will now receive HTTP 422
  (`SolveStrategy` literal no longer admits the value). The frontend ships
  in lockstep, so the live demo is unaffected. Bumping minor (0.x semver)
  rather than major because the project is pre-1.0 and the only consumer
  is the bundled frontend.
- **Operational note:** the new `failed_check` column requires recreating
  the `job_logs` table. Run `docker compose down -v` once after pulling
  this release so `metadata.create_all()` recreates the schema; otherwise
  `failed_check` inserts will silently fall through the try/except in
  `log_job`.
- **Defense Q&A material:** the central test
  `test_axle_balance_brings_cog_closer_to_centre` empirically demonstrates
  that the axle picker produces a strictly smaller |y_cog − L/2| than
  first-fit FFD on a heavy-forward-biased manifest. Quote this number to
  panel members asking "does the strategy actually do anything?"

---

## Sprint 16 — 2026-05-09 · Input Guards, Infeasibility Recovery, and Item 6 Completion

**Goal:** Close the last open item from the API skeleton checklist — add missing
`ge=1` dimension guards to `FurnitureItem`, implement `InfeasiblePackingException`,
and give `ConstraintValidator` a `repair()` method so the pipeline attempts recovery
before returning a 422.

### Added

**Backend**
- `backend/core/validator.py`: New `InfeasiblePackingException` exception class.
  Raised when `ConstraintValidator.repair()` exhausts all recovery options and
  cannot produce a valid plan. Carries the last attempted plan, truck, and
  `failed_check` label so the API layer can build a meaningful 422 response with
  `solver_mode` and failure report — satisfying the item-6 contract from the API
  skeleton spec.
- `backend/core/validator.py::ConstraintValidator.repair()`: New method. Given a
  failing `PackingPlan`, iteratively identifies the items responsible for each
  constraint violation and marks them `is_packed=False`, moving them to
  `unplaced_items`. Re-validates after each pass; returns the repaired plan as
  soon as it is clean. Raises `InfeasiblePackingException` if the plan cannot
  be made valid after exhausting all packed items. Handles all six constraint
  types: `boundary` (items outside truck dims), `orientation` (invalid
  `orientation_index`), `lifo` (later-stop items in front of earlier-stop items),
  `non_overlap` (overlapping pairs — unpacks the lower-priority item), `fragile_stacking`
  (items stacked above a fragile item's xy footprint), and `weight` (greedy removal
  of heaviest items until payload is within limit).
- `backend/core/validator.py`: Private helpers `_rebuild()` and `_offenders()`
  supporting `repair()` — `_rebuild` reconstructs a `PackingPlan` from a set of
  packed item IDs; `_offenders` returns the set of `item_id`s responsible for a
  named failing check.

### Changed

**Backend**
- `backend/api/models.py`: Add `ge=1` to `FurnitureItem.w`, `l`, and `h` fields.
  Zero-dimension items previously passed Pydantic validation silently and reached
  the solver, producing undefined behavior. Now rejected immediately at the API
  boundary with a 422 `ValidationError`. Closes the known gap surfaced by BB-E-01
  in Sprint 13's black-box test suite.
- `backend/worker/tasks.py`: On `PlanValidationError`, now attempts
  `ConstraintValidator.repair()` before giving up. If repair succeeds, the
  repaired plan is logged as `status: done` and returned to the frontend (with
  additional items in `unplaced_items`). If repair raises
  `InfeasiblePackingException`, logs `status: failed` and returns a 422 response
  with `solver_mode`, `failed_check`, and `detail` — matching the item-6 spec
  exactly. A `_validator = ConstraintValidator()` instance is now held at module
  level alongside `_engine`.

---

## Sprint 15 — 2026-05-09 · Frontend Layout Compaction and UX Polish

**Goal:** Compact the plan selector cards and dashboard panel to reduce visual bulk,
add auto-dismissing animation badges so notifications clear themselves, introduce a
dedicated full-width drop-zone import UI in the manifest form, remove the redundant
DOOR button, and fix the stop legend / playback bar overlap in animate mode.

### Added

**Frontend**
- `frontend/src/components/TruckViewer.tsx`: Add `showPlacingBadge` and
  `showLoadedBadge` state driven by `useEffect` — the "Placing" badge auto-dismisses
  2 s after the most-recent item change; the "All loaded" badge auto-dismisses 3 s
  after the animation sequence completes; both badges are cleared on plan reset via the
  existing `plan` dependency effect.
- `frontend/src/components/ManifestForm.tsx`: Add dedicated full-width dashed
  drop-zone below the action buttons row in the import bar — cloud-upload SVG, primary
  and secondary labels, and a supported-format line; activates with a `border-blue-500
  bg-blue-900/30` highlight on `isDragging`; clicking the drop zone opens the hidden
  file input identically to the "Import Manifest" button.

### Changed

**Frontend**
- `frontend/src/components/PlanSelector.tsx`: Compact plan cards — outer padding
  `py-5` → `py-4`, card padding `p-5` → `p-3`, card gap `gap-3` → `gap-2`, card list
  spacing `space-y-3` → `space-y-2`, utilization % `text-3xl` → `text-xl`, progress
  bar `h-3` → `h-2`, stat values `text-base` → `text-sm`, stat separator `pt-2` →
  `pt-1.5`; description text `text-base mt-1` → `text-sm mt-0.5`.
- `frontend/src/components/Dashboard.tsx`: Compact dashboard panel — `SectionHeader`
  `py-4` → `py-3`; `StatCard` `p-4` → `p-3` with value `text-2xl` → `text-xl` and
  unit `text-base` → `text-sm` and label `text-sm mt-2` → `text-xs mt-1.5`;
  performance body `py-5 space-y-5` → `py-4 space-y-3`; util block `p-4` → `p-3`
  with `text-4xl` → `text-3xl` (%) and bar `h-4` → `h-3` and m³ readout `text-base`
  → `text-sm`; stat card grid gap `gap-3` → `gap-2`; LIFO section body `py-5
  space-y-4` → `py-4 space-y-3`; LIFO instruction card `py-3.5` → `py-3`; stop card
  `p-5` → `p-3.5`; step circle `w-14 h-14 rounded-2xl text-2xl` → `w-10 h-10
  rounded-xl text-lg`; stop title `text-lg` → `text-base`; item count `text-3xl` →
  `text-xl`; item chips `text-base px-3 py-1.5` → `text-sm px-2.5 py-1`; unplaced
  section body `py-5` → `py-4` with card `p-4` → `p-3`.
- `frontend/src/components/ManifestForm.tsx`: Redesign template download button with
  `border-2` outline, a download-arrow SVG icon, "Download Template" label, and
  `.xlsx format` sub-label; restructure import bar to a `space-y-3` column with a
  `flex items-center gap-2` (no `flex-wrap`) buttons row above the drop zone so both
  buttons remain on one line.
- `frontend/src/components/ManifestForm.tsx`: Fix item name cell — remove
  `max-w-[160px] overflow-hidden`, switch inner div from `truncate text-base font-medium`
  to `break-all text-sm font-medium` so long item IDs wrap rather than clip; shrink
  Size column `w-32` → `w-28` and Actions column `w-24` → `w-20` to reclaim horizontal
  space.

### Fixed

**Frontend**
- `frontend/src/components/TruckViewer.tsx`: Fix stop legend overlapping the animate
  playback bar — offset class changed from `bottom-4` to `bottom-36` when
  `mode === "animate"` via a ternary so the legend clears the 112 px bar.
- `frontend/src/components/TruckViewer.tsx`: Fix animation badges persisting
  indefinitely — `showPlacingBadge` previously stayed visible on pause; `showLoadedBadge`
  previously stayed until a mode change; both now auto-dismiss via `setTimeout` with
  `clearTimeout` cleanup.

### Removed

**Frontend**
- `frontend/src/components/TruckViewer.tsx`: Remove the `← DOOR` button landmark
  (`absolute bottom-4 left-20`) — visually redundant with the "Front View" camera
  preset in the collapsed camera toolbar; in-scene door geometry (`doorSprite`,
  `doorMesh`, `doorFrame`) is preserved.

---

## Sprint 14 — 2026-05-07 · Frontend Camera Controls, Pan/Zoom, and Manifest UX Polish

**Goal:** Ship imperative camera navigation (preset views with animated lerp, D-pad pan,
zoom), collapse the camera panel behind a toggle button to free the truck's door corner,
fix the cargo table column clipping bug, and polish the row-delete interaction in the
manifest editor.

### Added

**Frontend**
- `frontend/src/components/TruckViewer.tsx`: Add `cameraRef`/`controlsRef` refs for
  imperative camera access outside the scene `useEffect`, enabling helper functions to
  modify the live camera without rebuilding the Three.js scene.
- `frontend/src/components/TruckViewer.tsx`: Add `animateCamera()` with a 30-frame cubic
  ease-out lerp `(1 − (1−f/30)³)` for smooth preset view transitions (Reset, Top, Front,
  Side); closure uses typed non-null consts to satisfy TypeScript's narrowing requirements.
- `frontend/src/components/TruckViewer.tsx`: Add `panCamera(dx, dy)` translating both
  `camera.position` and `controls.target` along the camera's world-space right/up matrix
  columns; step size is 8 % of `max(W, L, H)`.
- `frontend/src/components/TruckViewer.tsx`: Add `zoomCamera(inward)` moving the camera
  along the direction toward `controls.target`, clamped at 20-unit minimum distance; step
  size is 15 % of `max(W, L, H)`.
- `frontend/src/components/TruckViewer.tsx`: Add `CameraBtn` helper component — 44 × 44 px
  (WCAG 2.5.5 touch target), `flex-col` icon + `text-[10px]` label, `pressedKey` state
  delivers a 150 ms pressed flash on each pan/zoom action; inactive contrast raised to
  `text-slate-700` (light) / `text-gray-200` (dark) for WCAG AA compliance.
- `frontend/src/components/TruckViewer.tsx`: Collapsed camera toolbar — camera-icon toggle
  button (44 px permanent canvas footprint) reveals PAN D-pad + Zoom stack + VIEW presets
  via `max-h-[600px] opacity-100` slide animation (`transition-all duration-200`); `PAN`
  and `VIEW` section labels added for group separation; `camOpen: boolean` state tracks
  open/closed.
- `frontend/src/components/TruckViewer.tsx`: DOOR orientation label separated from camera
  controls to `absolute bottom-4 left-20 z-10` as a standalone spatial landmark — no
  longer shares a container with navigation controls.
- `frontend/src/components/ManifestForm.tsx`: Add `deleteItem(idx)` adjusting `editingIdx`
  downward when a row at an index below the active editing index is deleted, preventing
  index drift on in-place edits.

### Changed

**Frontend**
- `frontend/src/components/ManifestForm.tsx`: Switch cargo table from `table-layout: auto`
  to `table-fixed` with explicit column widths (Size `w-32`, Stop `w-12`, Actions `w-24`)
  — fixes trash button clipping caused by `whitespace-nowrap` content in the Size column
  forcing the table wider than its `overflow-hidden` container.
- `frontend/src/components/ManifestForm.tsx`: Fold `side_up` / `boxed` / `fragile` attribute
  badges from a dedicated Notes column into the Item name cell as `text-[10px]` sub-badges;
  remove the Notes column, reclaiming its width for the Actions column.
- `frontend/src/components/ManifestForm.tsx`: Replace ✕ icon delete button with a trash SVG;
  button is `disabled` and `opacity-30` when its row is actively being edited, preventing
  accidental deletion of the item currently in the edit form.

---

## Sprint 13 — 2026-05-06 · White-Box and Black-Box Test Suites with ANOVA Benchmark Data

**Goal:** Establish comprehensive test coverage for the hybrid solver pipeline — white-box
unit tests verifying internal constraint logic, black-box integration tests exercising
`OptimizationEngine` as an opaque input/output boundary, and ANOVA benchmark data
collection supporting thesis section 3.6.

### Added

**Tests**
- `backend/tests/test_whitebox.py`: New file. 39 unit tests in 6 groups (WB-LIFO,
  WB-OVERLAP, WB-ORIENTATION, WB-BOUNDARY, WB-HYBRID, WB-VUTIL) verifying internal
  constraint logic across `ConstraintValidator`, `FFDSolver`, and `OptimizationEngine`.
  `USE_MOCK_SOLVER` patched to `False` throughout; `_GUROBI_AVAILABLE` monkeypatched in
  WB-HYBRID tests to decouple routing assertions from licence availability.
  - **WB-LIFO** (7 tests): `validate_lifo()`, `FFDSolver._lifo_ok()`,
    `_lifo_presort()` — touching boundary `y_i + l_i = y_j` valid; strict violation
    detected; same-stop items unrestricted; presort places highest `stop_id` items
    first with volume-desc as secondary key.
    Thesis ref: section 3.5.2.1 E — Route-Sequenced LIFO.
  - **WB-OVERLAP** (6 tests): `validate_non_overlap()`, `FFDSolver._collides()` —
    Big-M 6-plane separation verified plane-by-plane; shared face (touching) accepted;
    overlapping pair rejected.
    Thesis ref: section 3.5.2.1 B — Non-overlap Big-M.
  - **WB-ORIENTATION** (6 tests): `_candidate_orientations()` — `side_up=False` yields
    all 6 permutations of `(w_i, l_i, h_i)`; `side_up=True` restricts to
    `UPRIGHT_ORIENTATIONS = {0, 1}` so `h_i` stays on the truck z-axis.
    Thesis ref: section 3.5.2.1 D — Rigid Orientation.
  - **WB-BOUNDARY** (8 tests): `validate_boundary()` and FFD `_greedy_placement()`
    direct calls — items fitting exactly at the truck wall pack; items exceeding all
    truck dimensions in every orientation land in `unplaced_items`.
    Thesis ref: section 3.5.2.1 C — Boundary.
  - **WB-HYBRID** (7 tests): `get_active_algorithm()` — `n ≤ SOLVER_THRESHOLD` with
    Gurobi available → `"ILP"`; `n > threshold` → `"FFD"`; `"stability"` and
    `"balanced"` strategies always route to FFD; fallback to FFD when Gurobi
    unavailable.
    Thesis ref: section 3.5.2.3 — hybrid dispatcher.
  - **WB-VUTIL** (5 tests): `FFDSolver.solve()` `V_util` formula verified against
    manual calculation; unpacked items excluded from numerator; empty manifest → 0.0;
    full-truck packing approaches 1.0.
    Thesis ref: section 3.5.2.1 A — Objective.
- `backend/tests/test_blackbox.py`: New file. 35 tests treating
  `OptimizationEngine.optimize()` as an opaque input/output boundary; no internal state
  is read.
  - **BB-S-01..09** (functional): single-item packing; multi-stop LIFO ordering
    (`y_i + l_i ≤ y_j` verified on outputs only); oversized item in `unplaced_items`;
    `side_up` items at `orientation_index ∈ {0, 1}`; `"balanced"` and `"stability"`
    strategies yield `solver_mode = "FFD"`; fragile item not used as supporter
    (Extension G); `V_util ∈ [0, 1]`; `n = 19` routes to ILP (gated by
    `_GUROBI_ILP_CAPABLE` probe); `n = 25` routes to FFD.
  - **BB-E-01..04** (error): zero-dimension `FurnitureItem.l = 0` and `w = 0`
    intentionally fail — documents the missing `ge=1` validator on `FurnitureItem.w`,
    `l`, `h` as a known data-contract gap (2 failing tests, tracked below); missing
    `stop_id` raises `pydantic.ValidationError`; payload overload lands items in
    `unplaced_items`; all-oversized manifest returns empty `placements`.
  - `_GUROBI_ILP_CAPABLE` probe: 2001-variable `BINARY` model constructed at collection
    time to detect Gurobi size-limited free licence — `_GUROBI_AVAILABLE` alone cannot
    distinguish size-limited from full-capacity licences; ILP-gated tests skip on
    size-limited installations with a diagnostic reason.
- `benchmark/`: ANOVA benchmark output data. `benchmark_full.json` (1.1 MB) captures
  per-trial `solver_mode`, `n_items`, `V_util`, and `t_exec_ms` for n ∈ {4–24}; raw
  data for the two-way ANOVA (solver_mode × n_items) required by thesis section 3.6.
  Thesis ref: section 3.6 — ANOVA benchmarking.

### Changed

**Frontend**
- `frontend/src/api/client.ts`: Switch mock-mode import from `{ mockPlan, mockPlans }`
  (`../data/mockPlan`) to `{ buildPlansFromRequest }` (`../data/planBuilder`); aligns
  the mock path with the `planBuilder` module introduced in Sprint 9.

### Known gaps surfaced

- `backend/api/models.py`: `FurnitureItem.w`, `l`, `h` carry no `ge=1` Pydantic
  validator — zero-dimension items do not raise `ValidationError` at input time and
  produce undefined solver behavior. Fix: `Field(..., ge=1)` on all three fields.
  Two BB-E-01 tests intentionally fail to keep this gap visible until the fix lands.

---

## Sprint 12 — 2026-05-04 · Frontend UX Polish — Typography, NumberInput, and Step Navigation

**Goal:** Scale up the UI's visual hierarchy (larger text, more padding, border-2
throughout), replace raw `<input type="number">` elements with a controlled
`NumberInput` that handles mid-edit backspace without snap-back, introduce
`CheckboxRow` cards with descriptions for the handling flags, and rebuild the
sidebar navigation as numbered step tabs with subtitles.

### Added

**Frontend**
- `frontend/src/components/ManifestForm.tsx`: New `NumberInput` component — holds
  its own string state so the user can backspace to empty mid-edit without the field
  snapping back to a fallback value; commits a parsed `int` or `float` to `onChange`
  only when the text parses cleanly; resets to `min` (or 1 when `min === 0`) on blur.
  Replaces all raw `<input type="number">` elements in `AddItemForm` for `w`, `l`,
  `h`, `weight_kg`, and `quantity` fields.
- `frontend/src/components/ManifestForm.tsx`: New `CheckboxRow` component — a
  bordered card with a title and description line; `warn=true` switches to amber
  accent for the Fragile flag. Replaces the three inline checkbox+label pairs for
  Side Up, Boxed, and Fragile, each now carrying a one-line description of what the
  flag does for the solver or viewer.
- `frontend/src/App.tsx`: New `HelpCard` component — numbered step card (circle
  number, title, body) used in the three-column onboarding grid on the empty state.
  Replaces the old `StrategyCard` chips.

### Changed

**Frontend**
- `frontend/src/App.tsx`: Default `lightMode` switched to `true` (light theme on
  first load); sidebar width 400 → 440 px; navigation tabs redesigned as two large
  numbered step buttons with `step / title / subtitle` layout and a border-bottom-4
  active indicator; `StrategyCard` / `EmptyState` components removed in favour of
  inline `HelpCard` grid; loading spinner enlarged (w-16, border-4); error banner
  rebuilt with an SVG alert icon and a title+body layout; fallback error message
  changed to a user-friendly sentence. `sideBg`, `sideBorder`, `headerBg`, `shell`
  theme token variables centralize all conditional class lookups.
- `frontend/src/components/Dashboard.tsx`: `SectionHeader` gains an optional `hint`
  subtitle prop, displayed in muted text below the title; `StatCard` enlarged to
  `text-2xl` font, more padding, and an explicit border; utilization bar percentage
  is now colored with the bar color (`#16a34a` green / `#d97706` amber / `#dc2626`
  red, replacing the old teal/amber/coral values for WCAG-AA contrast), and shows
  a `packedVolM3` (m³) readout next to the percentage; LIFO stop cards display
  "Step N · Stop N" in the card header and use a w-14 h-14 step counter; item
  chips use an explicit white background in light mode (`bg-white`); unplaced-items
  section adds a triangle warning SVG icon beside the count sentence; strategy
  badges gain border classes for both dark and light themes.
- `frontend/src/components/ManifestForm.tsx`: Dimension fields labeled Width /
  Length / Height instead of bare `W (mm)` / `L (mm)` / `H (mm)`; quantity field
  hidden during edit mode (only shown when adding new items); `Section` component
  gains an optional `hint` subtitle (Truck Specification, Delivery Stops, Cargo
  Items all receive hints); drag-drop overlay rebuilt with an SVG upload icon and
  larger text; edit form auto-scrolls into view on open via `editFormRef`; import
  bar drag-leave logic corrected to use `e.currentTarget.contains(relatedTarget)`
  so the overlay does not flicker when hovering child elements; `inputCls` and
  `labelCls` scaled up to `text-base` / `border-2` / `rounded-lg`.
- `frontend/src/components/PlanSelector.tsx`, `frontend/src/components/TruckViewer.tsx`,
  `frontend/src/index.css`: matching spacing uplift (px-5/py-5, gap-3), border-2
  thickness, and font-size scale for visual consistency across all panels.

### Removed

**Frontend**
- `frontend/src/App.tsx`: `EmptyState` component — functionality merged into the
  main `App` return with `HelpCard` grid.
- `frontend/src/App.tsx`: `StrategyCard` and `TONE_CLASSES` — replaced by the
  simpler `HelpCard` which documents the workflow steps instead of the solver
  strategy names.

---

## Sprint 11 — 2026-05-02 · Fragile No-Stacking and Model Extensions Documentation

**Goal:** Honour the `FurnitureItem.fragile` data contract end-to-end across the
ILP solver, the FFD heuristic, and the post-solve validator, and lock the
panel-facing documentation for every implementation extension that goes beyond
thesis 3.5.2.1 A–E into a single authoritative reference.

### Added

**Backend**
- `backend/solver/ilp_solver.py::_support()`: New `sup_fragile_{i}_{j}`
  constraint family. For every ordered pair `(i, j)` with `items[j].fragile == True`
  fix `u_{i,j} = 0`, removing fragile items from every other item's support
  disjunction. Combined with the unique-support equality
  `floor_i + Σ_{j≠i} u_{i,j} = b_i`, this routes any item that would otherwise
  rest on `j` onto the floor or a non-fragile supporter, or leaves it unpacked
  (`b_i = 0`). Strictly tightening — removes only physically invalid optima.
  Implementation extension beyond thesis 3.5.2.1 A–E (Extension G); see
  `docs/model_extensions.md`.
- `backend/core/validator.py::validate_no_stack_on_fragile()`: New post-solve
  predicate. For every placed pair `(a, b)` with `b.fragile == True`, rejects
  the plan when `a.z >= b.z + b.h` and the xy footprints of `a` and `b`
  overlap. Strictly stronger than the support-level ILP/FFD constraints — acts
  as the AbstractSolver template-method safety net for any future regression
  on either solver path. Wired into `validate_all` and surfaces as
  `"fragile_stacking"` from `first_failing_check` so `PlanValidationError`
  carries a meaningful diagnostic. O(n²).

**Docs**
- `docs/model_extensions.md`: New authoritative reference for every
  implementation extension that goes beyond thesis 3.5.2.1 A–E. Documents
  Extension F (Vertical Support, Bortfeldt & Mack 2007), Extension G
  (Fragile No-Stacking), and the Truck Payload extension. Each section covers
  added decision variables, formal constraints, citations, cycle-freedom
  proofs, test coverage tables, and a Defense Q&A block. Required reading per
  CLAUDE.md before modifying `_support()`, `_weight()`, or
  `validate_no_stack_on_fragile()`.
- `CLAUDE.md`: New "Implementation extensions beyond thesis 3.5.2.1 A–E"
  section linking the three deployed extensions to their reference
  implementations and to `docs/model_extensions.md`. Adds the rule that any
  new constraint beyond 3.5.2.1 A–E must be documented in
  `model_extensions.md` as a new section — a constraint in the code without a
  corresponding section is a defense liability.

**Tests**
- `backend/tests/test_ilp_solver.py`: New file. Pure-Python helper coverage
  (`ORIENTATION_PERMUTATIONS`, `UPRIGHT_ORIENTATIONS`, `_min_effective_dims`
  for both `side_up=True` and free orientation, mock-mode short-circuit) plus
  Gurobi-gated end-to-end tests crafted to isolate one thesis 3.5.2.1
  constraint per case: boundary (single fitting item, oversize item),
  orientation (`side_up` keeps `h` on z), LIFO (later stops deeper in y),
  payload (overload excludes at least one item), non-overlap, fragile
  supporter refusal (Extension G), and full-validator agreement. 13 tests.
- `backend/tests/test_validator.py`: Add 4 fragile-predicate tests
  (`test_fragile_rejects_stacked_load`, `test_fragile_allows_side_by_side`,
  `test_fragile_allows_load_below`, `test_validate_all_flags_fragile_stacking`)
  exercising `validate_no_stack_on_fragile` and the `"fragile_stacking"` label.
- `backend/tests/test_ffd_solver.py`: Extend `test_supported_rejects_unsupported_overhang`
  with a `fragile_ids` case (perfectly contained fragile base must still
  refuse to support); add `test_ffd_does_not_stack_on_fragile_item`
  end-to-end — narrow truck forces a same-column choice, fragile mirror
  packs and crate appears in `unplaced_items`.

### Changed

**Backend**
- `backend/solver/ffd_solver.py::_supported()`: New optional `fragile_ids`
  parameter. When provided, any candidate placed supporter `p` whose
  `p.item_id` appears in `fragile_ids` is excluded even with perfect xy
  containment. `_greedy_placement` collects `fragile_ids` from the manifest
  once and threads it through every supported-check call. Brings the FFD
  path to parity with the ILP `sup_fragile_*` family so SOLVER_THRESHOLD
  switching is contract-stable.
- `backend/core/validator.py`: Extend `validate_all` and
  `first_failing_check` to call `validate_no_stack_on_fragile` whenever the
  optional `items` list is provided.
- `backend/tests/test_smoke.py`: Update `POST /api/solve` assertion from
  HTTP 200 to HTTP 202 to match the async job-creation semantics already
  enforced by the API surface. Aligns the smoke test with the live contract.

---

## Sprint 10 — 2026-05-02 · Vertical Stacking, FFD Support Parity, and Empirical Threshold Benchmark

**Goal:** Replace the ILP single-layer floor lock with a rigorous vertical-stacking
support disjunction, bring the FFD solver to parity by rejecting mid-air placements,
and produce the empirical data required by thesis section 3.5.2.3 to justify the
hybrid-switching threshold θ.

### Added

**Backend**
- `backend/solver/ilp_solver.py::_support()`: New single-supporter disjunction
  (implementation extension beyond thesis 3.5.2.1 A–E; load-bearing motivation from
  thesis introduction). Adds `floor[i] ∈ {0,1}` and `u[i,j] ∈ {0,1}` binary variables
  per item. Enforces `floor_i + Σ_{j≠i} u_{i,j} = b_i` (unique support per packed item);
  when `u_{i,j} = 1`: vertical contact `z_i = z_j + h_eff_j` and xy-footprint containment
  of `i` within `j`. Bortfeldt & Mack (2007) single-supporter simplification — rules out
  spanning two adjacent bases but keeps the O(n²) binary count tractable in the ILP
  regime (n ≤ 20).
- `backend/solver/ffd_solver.py::_supported()`: New static helper mirroring ILP's
  single-supporter rule for the greedy walk — accepts `z == 0` outright; otherwise
  requires an already-placed item `p` with `p.z + p.h == z` whose xy footprint fully
  contains the candidate's footprint. Wired into `_greedy_placement()` after
  `_lifo_ok()` so FFD rejects mid-air placements. Both solver paths now enforce
  identical support physics.
- `backend/benchmarks/threshold_bench.py`: New benchmark harness — generates seeded
  synthetic furniture manifests at n ∈ {4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24},
  runs 3 trials per size against both ILP (60 s Gurobi TimeLimit) and FFD, records
  median and max `t_exec_ms` and median `V_util`, and emits a Markdown report with
  per-budget theta recommendations and a caveats section.
  Thesis ref: section 3.5.2.3 — empirical threshold justification
- `docs/benchmarks/threshold_bench_2026-05-02.md`: Pilot benchmark results. ILP median
  1.7 s / max 1.9 s at n = 20 (current `SOLVER_THRESHOLD = 20`); `V_util` 0.143 vs FFD
  0.118 confirming ILP adds density at the threshold boundary. Per-budget recommended θ:
  1 s → 16, 5 s+ → 24. Caveats section flags 3-trial variance, low-density synthetic
  items (3–22 % V_util), post-support ILP cost, and demo-machine re-run requirement.
  Thesis ref: section 3.5.2.3 — empirical threshold justification

**Tests**
- `backend/tests/test_ffd_solver.py`: Add `test_every_placement_has_floor_or_supporter`
  — heterogeneous 5-item manifest, asserts every `p.z > 0` placement has a single placed
  item whose top surface meets `p.z` and whose xy footprint contains `p`'s.
- `backend/tests/test_ffd_solver.py`: Add `test_supported_rejects_unsupported_overhang`
  — direct unit test of `FFDSolver._supported()` covering floor acceptance, exact-fit
  containment, x-axis overhang rejection, and wrong-z gap rejection.
- `backend/tests/test_integration_solve.py`: Add Gurobi-gated
  `test_ilp_supports_vertical_stacking` — footprint-tight 1×1×2 m truck forces two
  same-stop 1×1×0.5 m boxes to stack; asserts `z_top == z_base + h_base` and
  full xy-containment hold on the returned `PackingPlan`.

### Changed

**Backend**
- `backend/solver/ilp_solver.py::_variable_domains()`: Remove `z_i = 0` floor lock
  (single-layer ground packing temporary fix from Sprint 9). `z` upper bound is now
  `max(0, H - h_min_eff)` per item, matching the x and y tightening already in place.
  Items can now be placed at any supported height within the truck boundary.
  Thesis ref: section 3.5.2.1 D — variable domains

---

## Sprint 9 — 2026-05-01 · Light Mode, Manifest Import, Model Preview, and ILP Floor Lock

**Goal:** Land full light-mode support across the dashboard, ship Excel/JSON
manifest import with quantity + boxed/fragile item flags, add a hover 3D
preview to the AddItem form, harden the dev pipeline (Postgres + Vite polling),
and lock the ILP solver to single-layer ground packing so items no longer
float inside the truck.

### Added

**Backend**
- `backend/api/models.py`: Add `model_variant: int | None`, `boxed: bool`, and
  `fragile: bool` fields to `FurnitureItem`. `boxed` triggers a cardboard wrapper
  in the viewer; `fragile` is reserved for the no-stack support disjunction
  scheduled with the proper 3DBPP support constraint.

**Frontend**
- `frontend/src/components/ModelPreview.tsx`: New mini Three.js turntable
  (140-200 px) for the AddItem form. Resolves `(prefix, variantIdx)` against
  `resolvePreviewMeta()`, loads the OBJ via `OBJLoader`, fits to a unit cube,
  and rotates slowly. Auto-detects ShapeNetSem Z-up convention from the native
  bounding box (`nSize.z >= nSize.y * 0.9`) and applies `-π/2` X rotation so
  chairs, bookshelves, and wardrobes preview upright instead of on their side.
  Module-level `previewCache: Map<string, THREE.Group | null>` shares loaded
  groups across renders and caches load failures as `null`.
- `frontend/src/data/manifestImport.ts`: New module — `importManifestFile(file)`
  parses Excel (`.xlsx`/`.xls`) via `xlsx` SheetJS and JSON manifests into
  `{ truck, stops, items }`; recognises sheets named `Truck`, `Stops`, `Items`.
  `downloadManifestTemplate()` exports a 3-sheet Excel template for users.
- `frontend/src/components/ManifestForm.tsx`: Drag-and-drop file overlay over
  the manifest editor; "Import Manifest" + "Template" buttons; AddItem form
  extended with quantity (auto-incrementing `_NN` suffix replication), boxed +
  fragile checkboxes, and an inline `<ModelPreview>` thumbnail that switches
  on hover/selection of furniture type and variant; items table renders BOX
  and FRG badges; restored the missing `prefixOf()` helper used by the edit flow.
- `frontend/src/types/index.ts`: Add optional `boxed?: boolean` and
  `fragile?: boolean` on `FurnitureItem`, mirroring the backend Pydantic fields.
- `frontend/src/components/TruckViewer.tsx`: Render a brown cardboard wrapper
  (`0xc69c6d`) around `boxed` items and a red wireframe halo around `fragile`
  items via a per-item `itemMeta: Map<item_id, {boxed, fragile}>` derived from
  the new `items` prop. Tooltip shows BOXED / FRAGILE badges. Labels upgraded
  to a 512×80 canvas with 34 px bold text on a rounded pill background and
  110×22 sprite scale for legibility on both themes; all `/90` `/95` `/97`
  `/98` `/99` opacity modifiers replaced with solid colours.
- `frontend/src/components/Dashboard.tsx`: Add `STRATEGY_BADGE_LIGHT` palette
  and thread `lightMode` into the previously-missed "Why This Plan"
  `SectionHeader`; replace alpha-hex `STOP_STYLE` (`#F0997B0f` etc.) with
  fully-opaque colours so the load-order legend and unplaced-items section
  stay readable on white.
- `frontend/src/data/modelCatalog.ts`: Export `resolvePreviewMeta(prefix,
  variantIdx)` returning `{ path, axisUp }` for `ModelPreview`; mark
  refrigerator/fridge defaults as `fragile: true`.
- `frontend/src/App.tsx`: Add `solveItems` state and pass `items={solveItems}`
  to `<TruckViewer>` so the viewer can read per-item `boxed` / `fragile`.
- `frontend/src/App.tsx`: Add conditional classes for every hardcoded dark
  element (logo text, version badge, tabs, `V_util` badge, error banner,
  loading text, empty state); inline `EmptyState` so `lightMode` is in scope;
  replace the emoji `🌙/☀️` toggle with a borderless SVG moon + sun pill where
  the active icon renders at full opacity and the inactive one at 35 %; thread
  `lightMode` to `PlanSelector` and `Dashboard`.
- `frontend/src/components/Dashboard.tsx`: Add `lightMode` to `DashboardProps`,
  `SectionHeader`, and `StatCard`; per-stop palette extended with `bgLight`
  and `borderLight`; LIFO load-sequence redesigned with numbered step-counter
  cards, a "Loading order — rear to door" instruction card, and an annotated
  REAR → DOOR gradient bar.
  Thesis ref: section 3.5.2.1 E — Route-Sequenced LIFO (step counter reflects `stop_id` load order)
- `frontend/src/components/PlanSelector.tsx`: Add `lightMode`; card background,
  border, hover state, solver-mode badge, progress-bar track, and all
  label/value text classes are now theme-conditional.
- `frontend/src/components/ManifestForm.tsx`: Update theme helpers
  (`bg2 → slate-100`, `muted → text-gray-700` in light mode); `lightMode` prop
  on `AddItemForm`; `1.5 px solid rgba(0,0,0,0.18)` stop-badge outline in
  light mode; fix table row hover (`hover:bg-slate-100` / `hover:bg-gray-800/30`).
- `frontend/src/data/modelCatalog.ts`: Add `CATALOG_FOLDER_MAP` — maps 25
  virtual catalog keys to their physical `/public/models/` subdirectory;
  splits the 9-key shared CATALOG into 25 non-overlapping per-prefix keys,
  eliminating variant semantic mismatch (the "Sofa" picker no longer shows
  "Sectional" OBJ variants); `CATALOG_AXIS_UP` and `PREFIX_TO_FOLDER`
  updated to match.
- `frontend/public/models/Bunk_Bed/`: Add second loft-bed OBJ model
  (`1101146651cd32a1bd09c0f277d16187`, 96 KB) from the furniture_extracted
  ShapeNetSem dataset (original tag: "LoftBed"); registered in
  `CATALOG["Bunk_Bed"]` as "Loft Poster" — Bunk Bed picker now has two variants.
- `frontend/src/data/planBuilder.ts`: Mock plan builder for `VITE_USE_MOCK` mode.

**Config & Tooling**
- `docker-compose.yml`: Add `db` service (`postgres:16-alpine`) with
  `pg_isready` healthcheck and a `DATABASE_URL=postgresql://flow3d:flow3d@db/flow3d`
  env var on both the `backend` and `celery` services; `depends_on` extended
  with `db: service_healthy` so the API and worker start only after Postgres
  accepts connections. Fixes the `psycopg2.OperationalError: Connection refused`
  on `localhost:5432` that blocked live-mode bring-up.
- `frontend/vite.config.ts`: Bind dev server to `0.0.0.0:5173` and enable
  `server.watch.usePolling = true` (`interval: 300`) so Windows hosts running
  Vite inside Docker pick up file edits — inotify events do not propagate
  across the host → container volume mount.
- `frontend/package.json`: Add `xlsx ^0.18.5` for Excel manifest parsing.

### Fixed

**Backend**
- `backend/solver/ilp_solver.py::_variable_domains()`: Lock `z_i = 0` for every
  item (single-layer ground packing). Previously `z_ubs` was set to
  `max(0, H - h_min)` and nothing in the boundary or non-overlap blocks pulled
  items down, so the ILP would leave packed items floating mid-air. The proper
  3DBPP support constraint requires a disjunction binding each `z_i` to either
  `0` or the top face of a supporting item — out of scope for this milestone
  and tracked for a follow-up.
  Thesis ref: section 3.5.2.1 D — variable domains (single-layer simplification)

---

## Sprint 8 — 2026-04-29 · True 3-Strategy DSS Plan Diversity and Playwright Smoke Harness

**Goal:** Replace the three-identical-plan output with three structurally distinct
packing plans — each driven by a different DSS objective (optimal utilization,
balanced speed, transit stability) — and add a Playwright browser smoke harness
that verifies the UI end-to-end in mock mode.

### Added

**Backend**
- `backend/api/models.py`: Add `SolveStrategy = Literal["optimal","balanced","stability"]`
  type alias; add `strategy` and `rationale` fields to `SolveRequest` and `PackingPlan`
  with safe defaults (`"optimal"` / `""`) so existing fixtures and tests remain valid.
- `backend/core/optimizer.py`: Extend `OptimizationEngine.optimize()` with a
  `strategy: SolveStrategy` parameter and `STRATEGY_RATIONALES` dict; dispatch
  `"optimal"` → ILP (auto-degrades to FFD-volume without Gurobi), `"balanced"` →
  FFD volume-desc, `"stability"` → FFD weight-desc; stamp `strategy` and `rationale`
  on every returned `PackingPlan`.
- `backend/solver/ffd_solver.py`: Add `FFDSolver(presort="volume" | "weight")`
  constructor; weight-desc presort key `(-stop_id, -weight_kg, -volume)` places the
  heaviest items first within each `stop_id` group, lowering the center of gravity
  for transit stability without changing `V_util`.
  Thesis ref: section 3.5.2.2 — Route-Sequential FFD Phase 1 presort variants

**Frontend**
- `frontend/src/types/index.ts`: Add `SolveStrategy` type; add `strategy` and
  `rationale` fields to `PackingPlan`; add optional `strategy` to `SolveRequest`.
- `frontend/src/api/client.ts`: `fetchSolutions()` now fires 3 parallel
  `POST /api/solve` requests with `STRATEGIES = ["optimal","balanced","stability"]`
  instead of 3 identical requests — each plan is structurally distinct in real mode.
- `frontend/src/components/Dashboard.tsx`: Add "Why This Plan" section rendering
  a colour-coded strategy badge (violet/teal/amber) and the full rationale paragraph
  above Performance metrics when a plan is selected.
- `frontend/src/components/PlanSelector.tsx`: Replace `solver_mode`-derived card
  label with `STRATEGY_NAMES` map (Optimal / Balanced / Stability).
- `frontend/src/data/mockPlan.ts`: Stamp all 3 mock plans with `strategy` and
  `rationale` fields matching the live backend contract; Plan C `t_exec_ms`
  corrected from 15 ms to 18 ms.
- `frontend/src/App.tsx`: Replace generic feature chips on empty state with
  `StrategyCard` components (violet Optimal, teal Balanced, amber Stability)
  advertising each decision criterion; updated copy to reference "different decision
  criterion" instead of "3 alternative plans".

**Config & Tooling**
- `frontend/e2e/strategies.spec.ts`: Playwright smoke test covering empty-state
  strategy cards, 3-plan output with per-card strategy labels, rationale text
  switching on card click, `ILP`/`FFD` solver-mode badges, and unplaced-items
  section visibility for Plan C.
- `frontend/playwright.config.ts`: Playwright config with Chromium, `webServer`
  block that boots Vite in mock mode via `cross-env VITE_USE_MOCK=true` on port 5174,
  `reuseExistingServer` for local dev, traces and screenshots retained on failure.
- `frontend/package.json`: Add `@playwright/test` devDependency; add `npm run e2e`
  and `npm run e2e:ui` scripts.
- `.gitignore`: Add `playwright-report/`, `test-results/`, and `.claude/*.lock`.

### Changed

**Backend**
- `backend/worker/tasks.py`: Thread `request.strategy` through to
  `OptimizationEngine.optimize()` so each Celery job respects its per-request
  strategy.
- `backend/core/optimizer.py`: `OptimizationEngine` now instantiates two `FFDSolver`
  instances (`_ffd_volume` and `_ffd_weight`) instead of one, owned for their
  respective strategy paths.

---

## Sprint 7 — 2026-04-28 · Unified Pre-Push Gate and Docker Compose Dev Pipeline

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

## Sprint 6 — 2026-04-28 · 3D Furniture Models, Animate Mode, and Manifest UX

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

## Sprint 5 — 2026-04-27 · Async Pipeline, Payload Constraint, and Live Demo Bring-up

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

## Sprint 4 — 2026-04-25 · FFD Heuristic, Post-Solve Safety Net, and Template Method

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

## Sprint 3 — 2026-04-24 · Live ILP Model and ConstraintValidator

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
  items by descending `stop_id` (highest loaded first, sits deepest / nearest rear);
  colour-coded `V_util` progress bar (green ≥ 70 %, amber ≥ 40 %, red below); ILP/FFD
  solver mode badge; amber callout for `unplaced_items`.
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
