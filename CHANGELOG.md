# FLOW-3D — Sprint Log & Changelog

Tracks all meaningful changes to the system by sprint. Update this file as part of
every commit that adds, removes, or changes a feature. Entries go under **Unreleased**
until the sprint is closed, then move to a dated sprint block.

---

## [Unreleased]

> Add new entries here as you work. Move to a sprint block when the sprint ends.

---

## Sprint 27 — 2026-05-15 · Baseline Solver, Success Rate Metric, and Per-Axle Load Visualisation

**Goal:** Make the axle-balance strategy *visibly* and *verifiably* correct (per-axle load schematic + post-solve `compute_axle_loads()` + variance test), expose a `success_rate` metric on every plan, and add a naive-first-fit `BaselineSolver` as the thesis comparison baseline so users can see what the route-aware solvers actually contribute.

### Added

**Backend**
- `backend/api/models.py`: `PackingPlan.success_rate: float ∈ [0, 1]` (default `1.0`) — share of input items the plan actually packed `(n − len(unplaced_items)) / n`. Populated uniformly by `AbstractSolver.solve()` so every solver mode reports the same metric.
- `backend/api/models.py`: `SolveStrategy` literal gains `"baseline"`; `PackingPlan.solver_mode` literal gains `"BASELINE"`.
- `backend/solver/baseline_solver.py`: New `BaselineSolver` — naive first-fit in input order with no LIFO presort, no orientation enumeration (always `orientation_index = 0`), no vertical support / fragile guard. Enforces only boundary, non-overlap and payload (geometric / regulatory invariants). Override of `solve()` skips `ConstraintValidator.validate_all()` so the deliberately LIFO-violating plan is not rejected. Used as the thesis comparison baseline so the gap in `V_util` / `success_rate` against the route-aware strategies quantifies what those solvers actually contribute.
- `backend/core/optimizer.py`: `OptimizationEngine` dispatches `strategy="baseline"` to `BaselineSolver`; `STRATEGY_RATIONALES["baseline"]` describes the comparison-only intent.
- `backend/core/validator.py`: `ConstraintValidator.compute_axle_loads(plan, items, truck) -> list[float]` mirrors the simply-supported lever rule used in `FFDSolver._distribute_to_axles()` so per-axle loads can be verified post-solve and visualised in the UI.
- `backend/tests/test_baseline_solver.py`: Six tests covering dispatch wiring, geometric invariants, `success_rate` consistency, `orientation_index == 0`, and `baseline.v_util ≤ optimal.v_util` on a multi-stop manifest.
- `backend/tests/test_axle_balance.py::test_axle_balance_strategy_minimises_per_axle_variance`: Asserts the Axle Balance plan produces strictly lower per-axle load variance than Stability (and ≤ Optimal) on a forward-biased manifest — empirical proof that axle balance is actually balancing the axles.

**Frontend**
- `frontend/src/components/Explainability.tsx`: New `AxleLoadCard` SVG schematic in the Metrics sub-tab. Renders the cargo bay as a side-view rectangle with N axle triangles at `y_k = L · k / (N − 1)`, draws a per-axle load bar inside the bay, and reports total / mean / variance below. Mirrors `ConstraintValidator.compute_axle_loads()` so what the UI shows is what the solver scored against.
- `frontend/src/api/client.ts`, `frontend/src/data/planBuilder.ts`: Solve pipeline now fetches four plans (`optimal`, `axle_balance`, `stability`, `baseline`); mock pipeline gains `buildBaselinePlan()` that mirrors the backend baseline algorithm.

### Changed

**Frontend**
- `frontend/src/types/index.ts`: `SolveStrategy` adds `"baseline"`; `PackingPlan.solver_mode` adds `"BASELINE"`; `PackingPlan.success_rate: number` added.
- `frontend/src/components/PlanSelector.tsx`: Renders a 4th plan card "Baseline (Naive)" with a slate solver-mode badge and an added `Success` stat column (`Math.round(success_rate × 100) + "%"`).
- `frontend/src/components/Dashboard.tsx`: Stat grid expands to four cards — adds a `Success Rate` card and handles the `BASELINE` solver-mode badge styling.
- `frontend/src/components/Explainability.tsx`: Dispatch / Metrics tabs surface the baseline strategy (rationale, badge, success-rate stat, strategy-mapping table row).

---

## Sprint 26 — 2026-05-14 · Multi-Axle Balance, Orientation-Stable Rendering, and RQ3 t-Test Documentation

**Goal:** Generalise the axle-balance FFD heuristic to honour the truck's real axle count, kill the visual "dimensions change between plans" regression caused by the 3D viewer non-uniformly scaling models into rotated AABBs, declutter the top-right overlay (duplicate Save State + preview-toast overlap), and add a one-sample *t*-test to the RQ3 chapter that turns the FFD bounded-execution-time claim into an inferential result.

### Added

**Backend**
- `backend/api/models.py`: Added `axle_count: int = Field(2, ge=2, le=6)` to `TruckSpec`. Defaults to 2 so existing fixtures keep working.
- `backend/tests/test_axle_balance.py::test_axle_balance_uses_truck_axle_count`: Locks in that a 3-axle truck and a 2-axle truck both produce feasible plans under the new variance-based scoring on a shared manifest.

**Frontend**
- `frontend/scripts/verify-orientation-quaternion.mjs`: Standalone Node script that asserts each of the 6 `orientationQuaternion(idx)` values produces the rotated AABB demanded by `ORIENTATION_PERMUTATIONS[idx]`. Run via `node frontend/scripts/verify-orientation-quaternion.mjs`.

**Docs**
- `docs/chapter4_rq3.md`, `docs/chapter4_rq3.docx`: New subsection **4.3.5.1 One-Sample *t*-Test on FFD Bounded Execution Time** testing H₀: μ ≥ 100 ms against H₁: μ < 100 ms (Nielsen interactive-response threshold) on the 11 per-size FFD median observations from §4.3.5. Reports *t*(10) = −348.0, *p* < 0.0001, Cohen's *d* ≈ −104.9 → reject H₀; elevates the bounded-execution-time claim of RQ3 from a descriptive observation to an inferential statement.
- `docs/chapter4_rq1.md`, `docs/chapter4_rq1.docx`: RQ1 chapter draft added alongside RQ3.

### Changed

**Backend**
- `backend/solver/ffd_solver.py`: Rewrote the `axle_balance` candidate-scoring rule from "minimise `|y_CoG − L/2|`" (a 2-axle midpoint approximation) to "minimise the variance of per-axle loads" across `truck.axle_count` axles. Axles are modelled as end-supported equispaced beam reactions at `y_k = L · k / (N − 1)`, and each item's weight is split between its two adjacent axles by the simply-supported lever rule (`_distribute_to_axles()` helper). For `N = 2` this collapses to the previous behaviour; for `N = 3` (tridem 10-wheelers) the middle axle now picks up its proper share. Worst-case complexity stays `O(n²)`.

**Frontend**
- `frontend/src/components/TruckViewer.tsx`: 3D models are now fitted to the **original** item dimensions (looked up from the `items` prop) and rotated according to `orientation_index` via a new `orientationQuaternion()` helper, rather than being non-uniformly scaled to fill the rotated AABB. Previously, a solver-selected orientation (commonly `1`, the 90° width↔length swap) stretched the geometry into a different aspect ratio, visually changing the model's proportions across plans. The hover tooltip now reports the original `W × L × H` (with a secondary "Rotated AABB" row when `orientation_index ≠ 0`) so the displayed measurements stay constant regardless of solver mode (optimal / axle_balance / stability).
- `frontend/src/App.tsx`: Removed the duplicate "Save State" button in the top-right overlay — only one button (grouped with Log Out) now renders. The preview-mode toast ("Preview only — click Solve Packing Plan…") was moved from `top-4 left-4` to `bottom-6 left-1/2 -translate-x-1/2` (bottom-center) so it no longer overlaps the 3D / Exploded / Labels / Animate view-mode buttons inside `TruckViewer`.
- `frontend/src/types/index.ts`, `frontend/src/components/ManifestForm.tsx`: Added `axle_count` to the `TruckSpec` interface and tagged each preset with its real-world axle count (4-wheelers → 2, 10-wheeler tridem → 3).

---

## Sprint 25 — 2026-05-13 · Compact Items Table, Quantity Editing, and Admin Deactivation Guard

**Goal:** Reduce visual clutter in the cargo manifest by collapsing repeated same-prefix
items into a single compact row with a quantity display; add an always-visible quantity
edit button so users can correct quantities without deleting and re-adding items; and
tighten the admin panel so administrator accounts cannot be accidentally deactivated.

### Added

**Frontend**
- `frontend/src/components/ManifestForm.tsx`: `pendingQtyEdit` state
  (`{ firstIdx, indices, prefix, newQty } | null`) and `applyQtyEdit()` function for
  in-place quantity editing. `applyQtyEdit` handles both decrease (removes trailing
  group members in descending index order, adjusts `editingIdx`) and increase (generates
  new siblings with unique `_NN` suffixes by scanning all current item IDs before
  allocation, inserts after the last group member).
- `frontend/src/components/ManifestForm.tsx`: `×N` quantity button in the Actions column
  — always visible for every group regardless of quantity (visible even when N=1 to make
  the control discoverable). Opens a `NumberInput` popover (min 1, max 99) anchored above
  the button. Toggling the button closes the popover without applying. Mutual exclusion
  with the delete popover (`requestDelete` clears `pendingQtyEdit`; qty button clears
  `pendingDeleteIdx`).

### Changed

**Frontend**
- `frontend/src/components/ManifestForm.tsx`: Items table tbody now uses an IIFE
  `(() => { ... })()` to group consecutive items sharing the same `prefixOf(item_id)`
  prefix into a single row. Display name shows `group.prefix` for multi-item groups and
  the full `item_id` for singles; the `title` attribute on the cell lists all `item_id`s
  in the group on hover. Bulk delete: `requestDelete(g.indices[0])` sets
  `pendingDeleteIdx` to the first group index; `confirmDelete` detects group size and
  removes all indices in one `filter` pass.
- `frontend/src/components/ManifestForm.tsx`: Table wrapper `overflow-hidden` →
  `overflow-visible` while either `pendingDeleteIdx !== null` or
  `pendingQtyEdit !== null` so both popovers clear the rounded clip boundary.
- `frontend/src/components/ManifestForm.tsx`: Actions column header widened `w-24` →
  `w-28` to accommodate the three-button layout (×N qty, pencil edit, trash delete).
- `frontend/src/App.tsx`: Top-right viewer overlay refactored from a flat flex row into
  a `flex-col items-end` column — buttons row (Save State + Log Out) sits on top;
  two notification banners stack below it. **Solve error banner** moved from the sidebar
  bottom into the overlay as a floating card with a dismiss (×) button and
  `setError(null)` on click. **Unplaced items banner** added (amber) — appears whenever
  `selectedPlan.unplaced_items.length > 0` and lists each unplaced `item_id` as a
  `font-mono` chip so the user sees at a glance which items the solver could not fit.

**Backend**
- `backend/api/admin_routes.py`: Deactivation guard changed from
  `target["id"] == admin["id"]` (self-deactivation check) to
  `target["role"] == "admin"` (role-based check) — any admin account is now protected
  from deactivation, not just the currently signed-in admin.

**Frontend**
- `frontend/src/pages/AdminDashboard.tsx`: Deactivate button and confirm popover
  wrapped in `{u.role !== "admin" && (...)}` so the control is hidden entirely for
  admin-role rows; comment updated from `{/* Deactivate with confirm popover */}` to
  `{/* Deactivate — hidden for admin accounts */}`.

---

## Sprint 24 — 2026-05-14 · Scrollless Results/Explain Sub-Tabs and In-App Help & Feedback

**Goal:** Cut the vertical scrolling out of the Results and Explainability panels
by splitting each into a sticky sub-tab strip, and add a floating Help button in
the simulator that bundles a detailed user guide with a "Send Feedback" contact
form so users can report bugs and request features without leaving the app.

### Added

**Frontend**
- `frontend/src/components/HelpModal.tsx`: New theme-aware support modal opened
  from the simulator's top-right toolbar. Two primary tabs — **User Guide** and
  **Send Feedback**. The Guide has a left-rail navigation with seven sections:
  Quick Start (workflow overview + solver pipeline), Manifest Tab (truck spec,
  stops, items, side-up / boxed / fragile flags, undo/redo, import/export), Results
  Tab (Plan Selector + Overview / Sequence / Issues sub-tabs), Explain Tab
  (Dispatch / Metrics / Constraints sub-tabs), 3D Viewer (mouse + touch controls,
  camera toolbar with PAN D-pad / Zoom / VIEW presets, animate-mode LIFO playback,
  stop colors, fragile decals, fallback-geometry chip), Keyboard Shortcuts (Ctrl+Z,
  Ctrl+Y, Ctrl+Shift+Z, Esc), and Tips &amp; FAQ ("why is my item unplaced",
  "why FFD over ILP", "how to share a plan", operational LTO/LTFRB reminder).
  Send Feedback reuses `landing/ContactForm` so messages reach the thesis team
  via `mailto:yuktingyukti143@gmail.com` from inside the simulator.
- `frontend/src/App.tsx`: New floating **Help** button (question-mark icon, blue
  accent) added to the top-right overlay beside Save State / Log Out; opens
  `HelpModal` via a new `showHelpModal` state slot.

### Changed

**Frontend**
- `frontend/src/components/Dashboard.tsx`: Refactored from a stacked-section
  layout (Why This Plan + Performance + LIFO Load Sequence + Unplaced Items, all
  scrolled vertically) to a sticky 3-tab strip — **Overview** (rationale chip +
  `V_util` bar + `T_exec` / solver / packed stat cards + Export-JSON button all
  on one screen), **Sequence** (compact rear-to-door direction guide on top,
  per-stop cards below), **Issues** (only rendered when `plan.unplaced_items` is
  non-empty; tab itself is hidden otherwise). Tab strip uses `sticky top-0` so
  it stays visible while scrolling within a single tab; `SectionHeader` component
  removed (no longer needed). Stat-card sizing tightened (`text-2xl` → `text-xl`,
  `p-4` → `p-3`) so the Overview tab fits the sidebar without scroll for typical
  plans.
- `frontend/src/components/Explainability.tsx`: Refactored from three stacked
  sections (Solver Dispatch + Performance Snapshot + Constraints in Effect) to
  a sticky 3-tab strip — **Dispatch** (decision banner with solver mode + the
  Strategy → Solver mapping table with the `ACTIVE` chip and `n` vs
  `SOLVER_THRESHOLD` bar for the Optimal strategy), **Metrics** (`V_util`,
  `T_exec`, Packed cards plus a "What these numbers mean" legend), **Constraints**
  (Route-Sequenced LIFO, Fragile No-Stacking with fragile-item chips, Truck
  Payload bar with binding-constraint commentary, and the unplaced explainer
  card). Tab strip uses `sticky top-0` and matches the Dashboard sub-tab
  styling for visual continuity.
- `frontend/src/landing/FAQ.tsx`: Trimmed the "Is FLOW-3D free?" answer to drop
  the trailing sentence about production-account pricing announcements, keeping
  the answer focused on the current pilot status.

---

## Sprint 23 — 2026-05-14 · Zod + React Hook Form Validation Migration

**Goal:** Replace all ad-hoc `useState`-based form validation across the frontend
with a unified Zod + React Hook Form layer — centralised schema library, reusable
accessible field wrapper, and per-field on-touch error display — and fix nav text
visibility on the light pastel hero.

### Added

**Frontend**
- `frontend/src/lib/formSchemas.ts`: New centralised Zod schema library —
  `loginSchema`, `registerSchema`, `changePasswordSchema`, `contactSchema`,
  `addUserSchema`, and `editUserSchema`. `personNameSchema` accepts Unicode letters,
  hyphens, apostrophes, and periods (matches Philippine name conventions).
  `registerSchema` and `changePasswordSchema` use Zod `.refine()` for cross-field
  password-match validation attached to the `confirm` / `confirmPassword` path so
  the error surfaces under the correct field. `editUserSchema.password` accepts a
  blank string (keep existing) or enforces ≥ 6 characters via a single `.refine()`
  to avoid a second error message.
- `frontend/src/components/forms/FormField.tsx`: New shared `FormField` label + error
  wrapper — renders accessible `role="alert"` error paragraphs with an inline SVG
  warning icon; `aria-invalid` / `aria-describedby` wiring standardised across all
  call sites. Exports `inputClass(invalid, extra?)` for dark-theme inputs and
  `adminInputClass(invalid, lightMode)` for the theme-aware admin dashboard inputs.

### Changed

**Frontend**
- `frontend/src/pages/Login.tsx`: Replaced manual `useState` for field values,
  dirty tracking, and error state with `useForm<LoginInput>({ resolver:
  zodResolver(loginSchema), mode: "onTouched" })`; server errors kept in a separate
  `serverError` state with a 5 s auto-dismiss timer so they do not interfere with
  field-level validation; `register("username", { onChange: clearServerError })` and
  `register("password", { onChange: clearServerError })` clear the server error banner
  on re-type.
- `frontend/src/pages/Register.tsx`: Replaced the `validate()` guard function and
  four `useState` slots with `useForm<RegisterInput>`; cross-field password match
  is enforced by Zod `.refine()` so "Passwords do not match" surfaces under the
  Confirm Password field on blur without additional state.
- `frontend/src/pages/ChangePassword.tsx`: Replaced `newPassword` / `confirmPassword`
  length and match `useState` checks with `useForm<ChangePasswordInput>`; show/hide
  toggle preserved via a single `showPw` state shared across both inputs.
- `frontend/src/landing/ContactForm.tsx`: Replaced five-field manual validation
  (`required` + email regex) with `useForm<ContactInput>({ resolver:
  zodResolver(contactSchema), mode: "onTouched" })`; message field now enforces
  10–2000 character range; submit still fires `window.location.href = mailto:...`
  with prefilled subject and body — no backend SMTP required.
- `frontend/src/pages/AdminDashboard.tsx`: Add-user and edit-user modals fully
  migrated from raw `addUsername / addPassword / addError / addSaving` and
  `editUsername / editPassword / editRole / editError / editSaving` `useState` slots
  to `addForm = useForm<AddUserInput>()` and `editForm = useForm<EditUserInput>()`.
  Role segmented toggle controlled via `editForm.setValue("role", r, { shouldDirty:
  true })` + `editForm.watch("role")` since no native `<input>` is registered for it.
  `openAdd()` calls `addForm.reset({ username: "", password: "" })`; `openEdit(u)`
  calls `editForm.reset({ username: u.username, password: "", role: u.role })` so
  stale values from a previous modal open never bleed through. Submit handlers
  accept `(values: AddUserInput)` / `(values: EditUserInput)` directly from
  `handleSubmit`.
- `frontend/src/landing/Nav.tsx`: Fix nav text visibility on the light pastel hero —
  `atTop = !scrolled` boolean serves two complete style sets: when unscrolled
  (`atTop = true`) the bar uses `bg-white/30 backdrop-blur border-slate-900/[0.07]`
  with `text-slate-700 / text-slate-900` links and a `!bg-slate-900 !text-white`
  Sign In button; when scrolled, the existing dark `bg-[#0b0d12]/70 backdrop-blur-xl`
  glass with `text-gray-300 / text-white` and the default blue Sign In button are
  restored. Mobile hamburger and avatar pill adapt accordingly.
- `frontend/package.json`: Added production dependencies `react-hook-form ^7.75.0`,
  `@hookform/resolvers ^5.2.2`, and `zod ^4.4.3`.

---

## Sprint 22 — 2026-05-14 · Legal Modals, Contact Form, and Hero Redesign with Truck Illustration

**Goal:** Add interactive Privacy Policy (R.A. 10173 compliant) and Terms of Service
modals to the footer, replace dead-anchor contact link with a working contact form that
sends to the thesis team, remove the Project footer column, and redesign the landing
hero with a light pastel background, warm glow cursor, and a decorative SVG truck
illustration that shows LIFO-ordered furniture inside the cargo box.

### Added

**Frontend**
- `frontend/src/landing/Modal.tsx`: New reusable overlay modal — Escape key + backdrop
  click to dismiss; `document.body.overflow` scroll-lock while open; accessible
  `role="dialog"` `aria-modal` with configurable `size="md" | "lg"`.
- `frontend/src/landing/PrivacyPolicy.tsx`: Full R.A. 10173 (Data Privacy Act of 2012,
  Philippines) compliant disclosure — seven sections covering account data (username /
  email / hashed password), manifest data, contact email correspondence, cookies /
  local storage (session token + UI preference flags), aggregated anonymised analytics,
  lawful basis (consent + performance of service + legitimate academic interest), all six
  NPC data-subject rights (access, correct, object, erasure, portability, NPC complaint),
  retention, sharing/disclosure, cookie behaviour, and DPO contact at yuktingyukti143@gmail.com.
- `frontend/src/landing/TermsOfService.tsx`: 13-section Terms of Service — eligibility
  (18+), accurate input obligation, acceptable-use prohibitions (reverse-engineering,
  illegal goods transport, DoS, misrepresentation of advisory output), advisory-output
  safety clauses (LTO/LTFRB/DOTr compliance, physical load verification), IP ownership
  (thesis team + FEU Institute of Technology), service availability ("as is"), Philippine
  law liability cap, suspension/termination, governing law (Republic of the Philippines /
  Metro Manila courts), change notification policy, and contact.
- `frontend/src/landing/ContactForm.tsx`: First Name / Last Name / Email / Message form
  with client-side validation (all fields required, email format check); submit opens
  the user's mail client via `mailto:yuktingyukti143@gmail.com` with subject
  `"FLOW-3D Contact — <Name>"` and body pre-filled; confirmation screen shown after the
  mailto link fires.
- `frontend/src/landing/TruckIllustration.tsx`: Decorative SVG truck with a cut-away
  cargo box — refrigerator (stop 3, rear of truck), sofa (stop 2), chair (stop 1, near
  door), and floor lamp arranged in LIFO delivery order; stop-badge circles on each item;
  spinning wheel spokes (animated when `animated={true}`); dashed route arrow with
  colored stop waypoints above the cab; soft pulsing glow halo; responsive via
  `compact` prop for mobile layout.

### Changed

**Frontend**
- `frontend/src/landing/Footer.tsx`: Removed "Project" column (About the thesis / Panel
  / Contact). Renamed "Privacy" → "Privacy Policy" and "Terms" → "Terms of Service".
  All three legal/contact entries are now `<button>` elements that open the respective
  modal via `useState<ModalKey>` instead of dead `href="#"` anchors. Contact moved into
  the Product column. Grid changed from `md:grid-cols-5` to `md:grid-cols-4`.
- `frontend/src/landing/Hero.tsx`: Replaced dark `#0b0d12` background with a
  `linear-gradient(135deg, #fef3ec → #fde7d8 → #e7f0ff → #dbe9ff → #c7defc)` soft
  peach → cream → sky → indigo pastel gradient; retuned pointer-aware spotlight to a
  warm amber + sky radial gradient with `mix-blend-mode: multiply` so the glow reads
  against the light surface (cursor tracking via `--mx`/`--my` CSS vars updated through
  `requestAnimationFrame` unchanged); added a third violet pulsing orb; updated grid
  hairlines from `rgba(255,255,255,0.45)` to `rgba(30,41,59,0.6)` for readability on
  the light background; headline text changed from `text-white` to `text-slate-900`;
  accent keywords updated from `text-sky-300/pink-300/amber-300` to
  `text-sky-600/rose-600/amber-600`; split layout into `lg:col-span-7` copy +
  `lg:col-span-5` `<TruckIllustration>` columns; responsive mobile illustration block
  below the copy on smaller screens; CTA buttons re-skinned for the light surface
  (`!bg-slate-900 !text-white` primary, `!bg-white/70 !text-slate-900` secondary).

---

## Sprint 21 — 2026-05-13 · Vercel Deployment Hardening, Landing Page Hero Redesign, and Manifest Form UX Overhaul

**Goal:** Harden the Vercel deployment so all routes resolve correctly and the
frontend can call the backend without CORS errors; replace the Three.js hero canvas
with a zero-bundle CSS-only interactive background for faster landing page load;
overhaul the manifest sidebar into a tabbed panel with a live 3D preview so users
see items placed in the truck as they type.

### Added

**Frontend**
- `frontend/src/lib/previewPacker.ts`: New naive grid packer for live 3D preview —
  walks items in input order, wraps by X-row → Y-plane → Z-layer, no LIFO or
  constraint optimisation; returns `PackingPlan` with `solver_mode: "FFD"` and a
  clear rationale string distinguishing it from a solved plan.
- `frontend/src/App.tsx`: Live preview state (`previewItems`, `previewTruck`) and
  `handlePreviewChange` callback; derives `previewPlan` via `useMemo` from
  `buildPreviewPlan`; renders `TruckViewer` with an amber "Preview only — click
  Solve Packing Plan for the optimised layout" badge when items are in the form
  but no solve has been run yet.
- `frontend/src/components/ManifestForm.tsx`: Tabbed panel navigation
  (Truck / Stops / Items) with live count badges on the Stops and Items tabs;
  `onPreviewChange` prop that fires on every items/truck state change to drive the
  live 3D preview in `App.tsx`.

### Changed

**Frontend**
- `frontend/src/components/ManifestForm.tsx`: Cleared all default truck/stop/item
  data — removed pre-populated truck dimensions, three sample stops, and five sample
  items (wardrobe, desk, dining table, sofa, bookshelf) so new users start from a
  blank manifest.
- `frontend/src/landing/Hero.tsx`: Replaced Three.js `Hero3D` canvas with a
  CSS-only interactive background — pointer-aware spotlight via `--mx`/`--my` CSS
  vars updated through `requestAnimationFrame` (one DOM write per animation frame,
  no React re-renders); two GPU-composited `animate-pulse` orbs at 9 s/11 s; ambient
  aurora radial gradient; vignette grid with radial mask. Eliminates the Three.js
  `@react-three/fiber` + `Hero3D` bundle from the landing page critical path.
  Replaced `bg-clip-text text-transparent` gradient emphasis words (*route*,
  *fragile*, *truck*) with `italic font-black` solid colours (`text-sky-300`,
  `text-pink-300`, `text-amber-300`) and two-layer neon `textShadow` glow for clear
  legibility against the dark `#0b0d12` background. Removed `pointer-events-none`
  from the copy column so CTAs are always interactive.

### Fixed

**Config**
- `frontend/vercel.json` (moved from repo root): Relocated `vercel.json` into
  `frontend/` to match the Vercel project's configured root directory; the root-level
  file was silently ignored.
- `frontend/vercel.json`: Removed `ignoreCommand` field that caused Vercel to cancel
  builds on non-frontend commits, preventing deployment of backend-only pushes from
  triggering frontend rebuilds unnecessarily.
- `frontend/vercel.json`: Added SPA rewrite rule
  `{ "source": "/(.*)", "destination": "/index.html" }` so all React Router client-
  side routes (e.g. `/app`, `/login`, `/admin`) serve `index.html` — fixes 404 on
  direct URL navigation and hard refresh.
- `backend/main.py`: Added `ALLOWED_ORIGINS` environment variable support to the
  CORS middleware so the deployed Vercel frontend domain can call the FastAPI backend
  without CORS errors in production.

### Removed

**Frontend**
- `frontend/src/pages/Landing.tsx`: Removed `<SocialProof />` section, which
  contained placeholder pilot testimonials marked `// TODO: replace` and was not
  ready for public release.

---

## Sprint 20 — 2026-05-12 · Auth Hardening, Real Admin Backend, and Operator Activity Logging

**Goal:** Harden the authentication flow so self-registration is removed and all accounts
are admin-created; wire the admin panel to a real FastAPI + PostgreSQL backend with JWT
auth; add a comprehensive per-user session activity log visible in the admin panel; and
extend admin controls with account reactivation and forced password reset.

### Added

**Backend**
- `backend/api/auth_routes.py`: `POST /api/auth/login` returns `{ access_token, token_type, must_change_password }`;
  `POST /api/auth/change-password` validates current token and updates `hashed_password` + clears
  `must_change_password`. Both endpoints write to `audit_logs`.
- `backend/api/admin_routes.py`: Full user management API — `GET/POST /api/admin/users`,
  `PUT /api/admin/users/{id}`, `DELETE /api/admin/users/{id}` (soft deactivate),
  `POST /api/admin/users/{id}/reactivate`, `POST /api/admin/users/{id}/force-reset`.
  Every mutation writes a typed audit log entry (`user_created`, `user_modified`,
  `user_deactivated`, `user_reactivated`, `force_password_reset`).
- `backend/api/deps.py`: `get_current_user` and `require_admin` FastAPI dependencies
  using `OAuth2PasswordBearer` + HS256 JWT decode.
- `backend/core/auth.py`: `hash_password`, `verify_password` (passlib/bcrypt),
  `create_access_token`, `decode_access_token` (python-jose HS256).
- `backend/core/db.py`: `reactivate_user()` helper — sets `is_active=True`.
- `backend/requirements.txt`: Added `passlib[bcrypt]` and `python-jose[cryptography]`.
- `backend/settings.py`: Added `JWT_SECRET`, `JWT_ALGORITHM`, `JWT_EXPIRE_MINUTES`
  loaded from `.env`.
- `backend/main.py`: Lifespan registers `create_tables()` + `seed_admin()` on startup;
  includes `auth_router` and `admin_router`.

**Frontend**
- `frontend/src/lib/sessionLog.ts`: New localStorage-backed activity log utility.
  `appendSessionLog(username, action, detail)` appends to `"flow3d_session_logs"` (500-entry
  rolling cap); `getSessionLogs()` returns all entries sorted newest-first.
- `frontend/src/pages/ChangePassword.tsx`: Force-change-password page shown after first
  login (when `mustChangePassword` is true). Form requires new password (≥ 6 chars) +
  confirm; calls `changePassword()` from `AuthContext`; redirects to `/admin` or `/app`
  on success.

### Changed

**Frontend**
- `frontend/src/auth/AuthContext.tsx`: Added `mustChangePassword: boolean`,
  `changePassword(newPassword)`, and `registerUser(username, password, role)` to context.
  Mock path stores extra users in `"flow3d_mock_users"` localStorage JSON and tracks
  must-change state in `"flow3d_must_change"`. Real path reads `must_change_password`
  from login response.
- `frontend/src/pages/Login.tsx`: Removed Register link and registered-success banner.
  `useEffect` redirects to `/change-password` when `mustChangePassword` is true.
- `frontend/src/pages/AdminDashboard.tsx`:
  - Switched from mock-only to real API mode (`VITE_USE_MOCK` flag); all mutations
    call the FastAPI backend in real mode with `Authorization: Bearer` headers.
  - Add User modal: removed role selector (new accounts are always `"user"`).
  - Added **Session Logs** third tab — user filter dropdown, refresh button, color-coded
    table for all 14 session action types.
  - Added **Reactivate** button (teal refresh icon) for inactive users in the Users table.
  - Added **Force Password Reset** button (lock icon) for active users — sets
    `must_change_password=True` on next login.
  - Deactivate icon changed from trash to circle-slash for clarity.
  - Audit log tab: added `user_reactivated` (teal) and `force_password_reset` (violet)
    action labels and colors.
- `frontend/src/main.tsx`: Added `/change-password` route (behind `<ProtectedRoute>`);
  removed `/register` route.
- `frontend/src/landing/Hero.tsx`, `Nav.tsx`, `FinalCTA.tsx`: Replaced all "Get Started"
  CTAs with "Sign In" → `/login`. Removed unused Register links.
- `frontend/src/App.tsx`: Session activity logging via `appendSessionLog` —
  `session_start`, `session_end`, `solve_submitted`, `solve_success`, `solve_error`,
  `plan_selected`, `session_saved`, `session_restored`. Restored Log Out button beside
  Save State in the TruckViewer overlay.
- `frontend/src/components/ManifestForm.tsx`: Session activity logging for manifest
  mutations — `item_added` (with generated IDs), `item_edited`, `item_deleted`,
  `stop_added` (with stop_id), `stop_removed` (with stop_id), `truck_param_changed`
  (field=value). All logged via `appendSessionLog` using the signed-in username.

---

## Sprint 19 — 2026-05-12 · Login/Register Authentication, Admin Dashboard, and Simulator Session Save/Restore

**Goal:** Implement a complete JWT-based authentication layer — login and register pages
matching the existing dark glass-card design system, a role-aware navigation bar, an
admin dashboard for user management and audit logging, and per-user simulator session
persistence via `localStorage` so signed-in users never lose their packing plans.

### Added

**Frontend**
- `frontend/src/auth/AuthContext.tsx`: New `AuthProvider` and `useAuth()` hook — stores
  a JWT in `localStorage` under `"flow3d_token"`, decodes expiry on init, and exposes
  `login()` / `logout()` / `user: AuthUser | null` / `isAdmin: boolean`. Mock path
  (enabled when `VITE_USE_MOCK !== "false"`) issues base64 mock tokens for
  `admin/admin123` (role `"admin"`) and `user/user123` (role `"user"`) with an 8-hour
  expiry; real path calls `POST /api/auth/login`.
- `frontend/src/auth/ProtectedRoute.tsx`: New route guard component. Unauthenticated
  users are redirected to `/login` with `state: { from: location }` for post-login
  redirect. Non-admin users accessing a `requireAdmin` route are redirected to `/app`.
- `frontend/src/pages/Login.tsx`: Replace stub with a full dark glass-card login form —
  session-expired amber banner and registered-success green banner (both dismissible);
  username + password fields with show/hide toggle; error notification with 5 s
  auto-dismiss; X close button; post-login redirect honors `state.from`; admin users
  land on `/admin`, regular users on `/app`; "See Simulator Preview →" guest link;
  `admin / admin123` and `user / user123` demo credential hint.
- `frontend/src/pages/Register.tsx`: Replace stub with a full register form — client-side
  validation (username ≥ 3 chars, password ≥ 6 chars, passwords match); X close button;
  mock mode always succeeds and redirects to `/login` with `{ registered: true }`;
  real mode calls `POST /api/auth/register`; "See Simulator Preview →" guest link.
  `StubCard` export kept for backward compatibility.
- `frontend/src/pages/AdminDashboard.tsx`: New admin panel with a `grid grid-cols-[280px_1fr]`
  shell. **Users tab** — paginated table showing username (avatar initial), role badge
  (violet = admin, teal = user), status badge, and last-login; Add User modal (username /
  password / role segmented toggle); Edit User modal (password blank = keep current);
  Deactivate confirmation popover (`absolute bottom-full right-0 mb-2`) with caret
  triangle — same pattern as ManifestForm delete popover. **Audit Logs tab** — color-coded
  action chips: `login_ok` green, `login_fail` red, `logout` gray, `user_created /
  modified` blue, `user_deactivated` amber. Toast system at `fixed bottom-6 right-6 z-50`
  (green success / red error). All mutations update local state and append a new log row.
- `frontend/src/types/index.ts`: New `SavedSession` interface —
  `{ items, truck, stops, plans, selectedIdx, savedAt }` — the `localStorage` envelope
  written by Save State.

### Changed

**Frontend**
- `frontend/src/landing/Nav.tsx`: Auth-aware navigation bar. When signed in: avatar
  initial pill with username, `ADMIN` role badge (violet), outside-click dropdown —
  "Open Simulator", "Admin Panel" (admin only), divider, "Sign Out". `handleSignOut()`
  calls `logout()` then `navigate("/", { replace: true })`. Mobile menu mirrors the same
  auth state. When signed out: original "Sign in" + "Get Started" buttons unchanged.
- `frontend/src/main.tsx`: Router wrapped in `<AuthProvider>`; `/admin` route added
  behind `<ProtectedRoute requireAdmin>`; `/login` and `/register` now resolve to the
  live `Login` and `Register` pages instead of stubs.
- `frontend/src/App.tsx`: Auth integration — `useAuth()` provides `user` and `logout`;
  `SESSION_KEY = flow3d_state_${user.username}` (null for guests); one-time `useEffect`
  restores a saved session from `localStorage` when a user signs in and no plan is
  loaded. **Save State button** (`absolute top-4 right-4 z-20` overlay on TruckViewer)
  serializes the full session to `localStorage` and shows a 2.5 s green flash; guests
  see a sign-in modal (Sign In / Create Account / Continue without saving). **Log Out
  button** auto-saves the session before calling `logout()` + `navigate("/")`.

---

## Sprint 18 — 2026-05-12 · Manifest Form UX: Undo/Redo, Unit Conversion, and Delete Confirmation, Public Landing Page and Vercel Deployment

**Goal:** Reduce user error and friction in the cargo manifest editor by adding a
30-entry undo/redo stack scoped to cargo-item mutations, a shared mm/cm/m/in dimension
unit toggle across both the Truck Specification and Cargo Items sections, and a
polished floating popover confirmation card that replaces the cramped inline delete strip.
Ship a public-facing landing page at `/` with a proximity-wave interactive
3D hero (furniture pieces replacing abstract boxes), full marketing sections, and
route the existing simulator to `/app` — making FLOW-3D deployable to Vercel as a
standalone frontend with zero backend dependency on the landing experience.

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
- `frontend/src/pages/Landing.tsx`: New root route (`/`) — composes Nav, Hero,
  SocialProof, AboutSection, HowItWorks, FAQ, FinalCTA, and Footer sections into
  the public marketing page.
- `frontend/src/pages/Register.tsx`, `frontend/src/pages/Login.tsx`: Stub auth
  pages at `/register` and `/login` — "Coming soon" cards with back-link; wired to
  the router so CTAs on the landing page have live destinations.
- `frontend/src/landing/Nav.tsx`: Sticky glassmorphism navigation bar — FLOW-3D
  wordmark, Features / How it works / FAQ anchor links, Sign in and Get Started
  CTAs; glassmorphism background activates after 24 px scroll; responsive hamburger
  menu for mobile.
- `frontend/src/landing/Hero.tsx`: Hero section — headline "Loading plans that
  respect your route, your fragile, and your truck." with gradient-colored keywords;
  subheading; primary CTA → `/register`, secondary CTA → `#how`; lazy-loads
  `Hero3D` with a blurred poster fallback; left-side scrim keeps text readable over
  the 3D canvas; `pointer-events: none` on the copy column restores canvas
  interactivity across the full hero width; text-shadow on all copy for legibility.
- `frontend/src/landing/Hero3D.tsx`: Lazy-loaded R3F `<Canvas>` wrapper —
  camera at `[0, 7.5, 9.5]` fov 38; no post-fx (removed Bloom/Vignette for perf);
  DPR cap `[1, 1.5]`.
- `frontend/src/landing/TruckScene.tsx`: Proximity-wave interactive 3D scene —
  7 × 5 grid of furniture pieces on a dark grid floor; single `useFrame` raycasts
  pointer onto Y=0 plane each frame and lifts each piece by
  `(1 − dist/3.2)² × 0.8 m`; pieces tilt away from the cursor proportional to
  lift; label chip ("Wardrobe · 1800×600×2100mm · Fragile") appears on the
  most-lifted piece only; `hasPointer` ref gates animation when cursor is outside
  the canvas; React state updated only when the labelled item changes.
- `frontend/src/landing/FurnitureMeshes.tsx`: Six low-poly furniture types
  (sofa, dining chair, wardrobe, refrigerator, bed frame, side table) — each
  1–2 primitive meshes; dark translucent `MeshStandardMaterial` body (opacity 0.85)
  + `EdgesGeometry` `LineSegments` overlay with per-type accent color (cyan, violet,
  magenta, etc.) matching the 21st.dev interactive-box aesthetic; shared materials
  and cached `EdgesGeometry` per bounding-box size so every instance shares the
  same GPU buffers.
- `frontend/src/landing/SocialProof.tsx`: Logo strip, 5-star validation block
  ("Validated by an independent ConstraintValidator on every plan"), and two
  placeholder pilot testimonials marked `// TODO: replace`.
- `frontend/src/landing/AboutSection.tsx`: Two-column section — left explains
  the hybrid ILP + FFD engine and the DSS philosophy ("dispatcher keeps the final
  call"); right contextualises PH furniture logistics (narrow streets, multi-stop,
  fragile cargo, SME haulers).
- `frontend/src/landing/HowItWorks.tsx`: Four-step explainer with icon cards
  (Enter manifest → Pick truck → Generate Plan → Review in 3D); reassurance line
  "No CAD skills, no math."
- `frontend/src/landing/FAQ.tsx`: 8-item accordion (single-open) with real
  answers covering pricing, rectangle-only items, fragile no-stacking guarantee,
  LIFO delivery order, manifest size limits, payload enforcement, connectivity
  requirements, and thesis-vs-production honesty.
- `frontend/src/landing/FinalCTA.tsx`: Full-width closing band with headline +
  primary Get Started CTA + "Already have an account? Sign in" link.
- `frontend/src/landing/Footer.tsx`: Three-column footer (Product, Project,
  Legal) + copyright line + advisory disclaimer.
- `frontend/src/landing/primitives/Button.tsx`: Shared `<Button>` and
  `<ButtonLink>` components with `variant="primary" | "secondary" | "ghost"` and
  `size="md" | "lg"`; consistent focus rings for keyboard navigation.
- `frontend/src/landing/primitives/Section.tsx`: `<Section>`, `<Eyebrow>`,
  `<H2>`, `<Lead>` layout primitives used across all marketing sections.
- `frontend/src/landing/hooks/usePrefersReducedMotion.ts`: Reads and subscribes
  to `prefers-reduced-motion: reduce` — canvas replaced by static poster when
  true.
- `frontend/src/landing/hooks/useIsMobile.ts`: Breakpoint hook (default 768 px)
  — canvas replaced by static poster on mobile.
- `frontend/src/landing/README.md`: Documents section map, 3D scene perf budget
  (~70 draw calls/frame, target ≥50 fps), instancing upgrade path, and
  instructions for replacing the placeholder hero poster and testimonials.
- `frontend/public/landing/hero-poster.webp`: Placeholder 1×1 WebP fallback
  for the hero canvas on mobile and reduced-motion; README documents how to
  replace with a real pre-rendered screenshot.

**Config & Tooling**
- `vercel.json`: Root-level Vercel config — `ignoreCommand` skips Vercel
  rebuilds when no files under `frontend/` changed, preventing wasted builds on
  backend-only pushes.

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
- `frontend/src/main.tsx`: Wrap app in `<BrowserRouter>` with `<Routes>` —
  `/` → `Landing`, `/app/*` → existing simulator (was previously at `/`),
  `/register` → `Register`, `/login` → `Login`, `*` → `Landing`.
- `frontend/index.html`: Add `<title>`, `<meta name="description">`,
  OpenGraph (`og:title`, `og:description`, `og:type`, `og:image`), and Twitter
  Card tags for SEO and social sharing.
- `frontend/package.json`: Add `react-router-dom ^7.10.1`,
  `@react-three/fiber ^9.4.0`, `@react-three/drei ^10.7.7`,
  `@react-three/postprocessing ^3.0.4` to `dependencies`.

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
- `backend/tests/test_blackbox.py`: New file. 35 tests treating
  `OptimizationEngine.optimize()` as an opaque input/output boundary; no internal state
  is read.
- `benchmark/`: ANOVA benchmark output data. `benchmark_full.json` (1.1 MB) captures
  per-trial `solver_mode`, `n_items`, `V_util`, and `t_exec_ms` for n ∈ {4–24}; raw
  data for the two-way ANOVA (solver_mode × n_items) required by thesis section 3.6.

### Changed

**Frontend**
- `frontend/src/api/client.ts`: Switch mock-mode import from `{ mockPlan, mockPlans }`
  to `{ buildPlansFromRequest }` (`../data/planBuilder`); aligns the mock path with
  the `planBuilder` module introduced in Sprint 9.

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
- `frontend/src/components/ManifestForm.tsx`: New `CheckboxRow` component — a
  bordered card with a title and description line; `warn=true` switches to amber
  accent for the Fragile flag.
- `frontend/src/App.tsx`: New `HelpCard` component — numbered step card used in the
  three-column onboarding grid on the empty state.

### Changed

**Frontend**
- `frontend/src/App.tsx`: Default `lightMode` switched to `true`; sidebar width
  400 → 440 px; navigation tabs redesigned as numbered step buttons; loading spinner
  enlarged; error banner rebuilt with SVG alert icon.
- `frontend/src/components/Dashboard.tsx`, `frontend/src/components/ManifestForm.tsx`,
  `frontend/src/components/PlanSelector.tsx`, `frontend/src/components/TruckViewer.tsx`:
  Matching spacing uplift (`px-5/py-5`, `gap-3`), `border-2` thickness, and font-size
  scale for visual consistency.

### Removed

**Frontend**
- `frontend/src/App.tsx`: `EmptyState` and `StrategyCard` components — replaced by
  inline `HelpCard` grid.

---

## Sprint 11 — 2026-05-02 · Fragile No-Stacking and Model Extensions Documentation

**Goal:** Honour the `FurnitureItem.fragile` data contract end-to-end across the
ILP solver, the FFD heuristic, and the post-solve validator, and lock the
panel-facing documentation for every implementation extension that goes beyond
thesis 3.5.2.1 A–E into a single authoritative reference.

### Added

**Backend**
- `backend/solver/ilp_solver.py::_support()`: New `sup_fragile_{i}_{j}`
  constraint family — fixes `u_{i,j} = 0` for every ordered pair `(i, j)` with
  `items[j].fragile == True`. Extension G; see `docs/model_extensions.md`.
- `backend/core/validator.py::validate_no_stack_on_fragile()`: New post-solve
  predicate. Rejects the plan when any packed item `a` has `a.z >= b.z + b.h` and
  overlapping xy footprint with a fragile placed item `b`. Surfaces as
  `"fragile_stacking"` from `first_failing_check`. O(n²).

**Docs**
- `docs/model_extensions.md`: Authoritative reference for Extensions F, G, and the
  Truck Payload extension — variables, formal constraints, citations, cycle-freedom
  proofs, test coverage tables, and Defense Q&A.
- `CLAUDE.md`: New "Implementation extensions beyond thesis 3.5.2.1 A–E" section.

**Tests**
- `backend/tests/test_ilp_solver.py`: 13 new tests covering boundary, orientation,
  LIFO, payload, non-overlap, fragile supporter refusal (Extension G), and
  full-validator agreement.
- `backend/tests/test_validator.py`: 4 fragile-predicate tests.
- `backend/tests/test_ffd_solver.py`: 2 fragile-parity tests.

### Changed

**Backend**
- `backend/solver/ffd_solver.py::_supported()`: New optional `fragile_ids` parameter
  — excludes fragile items as valid supporters, bringing FFD to parity with
  ILP Extension G.
- `backend/core/validator.py`: Extend `validate_all` and `first_failing_check` to
  call `validate_no_stack_on_fragile` when `items` list is provided.

---

## Sprint 10 — 2026-05-02 · Vertical Stacking, FFD Support Parity, and Empirical Threshold Benchmark

**Goal:** Replace the ILP single-layer floor lock with a rigorous vertical-stacking
support disjunction, bring the FFD solver to parity by rejecting mid-air placements,
and produce the empirical data required by thesis section 3.5.2.3 to justify the
hybrid-switching threshold θ.

### Added

**Backend**
- `backend/solver/ilp_solver.py::_support()`: New single-supporter disjunction
  (Extension F). `floor[i]` and `u[i,j]` binary variables; enforces unique support,
  vertical contact, and xy-footprint containment. Bortfeldt & Mack (2007).
  Thesis ref: section 3.5.2.1 — Extension F
- `backend/solver/ffd_solver.py::_supported()`: New static helper — accepts `z == 0`;
  otherwise requires an already-placed item `p` with `p.z + p.h == z` and full
  xy-footprint containment. Thesis ref: section 3.5.2.2
- `backend/benchmarks/threshold_bench.py`: Benchmark harness for empirical threshold
  justification. Thesis ref: section 3.5.2.3
- `docs/benchmarks/threshold_bench_2026-05-02.md`: Pilot results — ILP median 1.7 s
  at n=20; recommended θ: 1 s → 16, 5 s+ → 24.

**Tests**
- `backend/tests/test_ffd_solver.py`: 2 new support-physics tests.
- `backend/tests/test_integration_solve.py`: Gurobi-gated vertical stacking test.

### Changed

**Backend**
- `backend/solver/ilp_solver.py::_variable_domains()`: Remove `z_i = 0` floor lock;
  z upper bound now `max(0, H - h_min_eff)` per item. Thesis ref: 3.5.2.1 D

---

## Sprint 9 — 2026-05-01 · Light Mode, Manifest Import, Model Preview, and ILP Floor Lock

**Goal:** Land full light-mode support across the dashboard, ship Excel/JSON
manifest import with quantity + boxed/fragile item flags, add a hover 3D
preview to the AddItem form, harden the dev pipeline (Postgres + Vite polling),
and lock the ILP solver to single-layer ground packing so items no longer
float inside the truck.

### Added

**Backend**
- `backend/api/models.py`: Add `model_variant`, `boxed`, and `fragile` fields to
  `FurnitureItem`.

**Frontend**
- `frontend/src/components/ModelPreview.tsx`: Mini Three.js turntable for AddItem form.
- `frontend/src/data/manifestImport.ts`: Excel/JSON manifest import + template export.
- `frontend/src/components/ManifestForm.tsx`: Drag-and-drop, quantity field, boxed +
  fragile checkboxes, inline `ModelPreview`.
- `frontend/src/data/planBuilder.ts`: Mock plan builder for `VITE_USE_MOCK` mode.
- Full light-mode support across `App`, `Dashboard`, `PlanSelector`, `ManifestForm`,
  `TruckViewer`.

**Config & Tooling**
- `docker-compose.yml`: Add `db` (Postgres) service + healthcheck.
- `frontend/vite.config.ts`: Bind to `0.0.0.0:5173`, enable polling for Docker.
- `frontend/package.json`: Add `xlsx ^0.18.5`.

### Fixed

**Backend**
- `backend/solver/ilp_solver.py`: Lock `z_i = 0` floor (single-layer ground packing,
  temporary). Thesis ref: 3.5.2.1 D

---

## Sprint 8 — 2026-04-29 · True 3-Strategy DSS Plan Diversity and Playwright Smoke Harness

**Goal:** Replace the three-identical-plan output with three structurally distinct
packing plans and add a Playwright browser smoke harness.

### Added

**Backend**
- `backend/api/models.py`: `SolveStrategy` type alias; `strategy` and `rationale`
  fields on `SolveRequest` and `PackingPlan`.
- `backend/core/optimizer.py`: Strategy dispatch — `"optimal"` → ILP/FFD-volume,
  `"balanced"` → FFD volume-desc, `"stability"` → FFD weight-desc.
- `backend/solver/ffd_solver.py`: `presort="volume" | "weight"` constructor parameter.

**Frontend**
- `frontend/src/types/index.ts`: `SolveStrategy` type + `strategy`/`rationale` fields.
- `frontend/src/api/client.ts`: 3 parallel strategy requests.
- `frontend/src/components/Dashboard.tsx`: "Why This Plan" section.
- `frontend/src/components/PlanSelector.tsx`: Strategy name cards.

**Config & Tooling**
- `frontend/e2e/strategies.spec.ts`: Playwright smoke test.
- `frontend/playwright.config.ts`: Playwright config with mock-mode Vite server.
- `frontend/package.json`: Add `@playwright/test`.

---

## Sprint 7 — 2026-04-28 · Unified Pre-Push Gate and Docker Compose Dev Pipeline

**Goal:** Consolidate the pre-push gate into `/ship` and containerize the full stack.

### Added

**Config & Tooling**
- `.claude/commands/ship.md`: Unified `/ship` slash command (commit + release modes).
- `docker-compose.yml`: Full `redis` + `backend` + `celery` + `frontend` stack.
- `backend/Dockerfile`, `frontend/Dockerfile`: Container definitions.

### Removed
- `.claude/commands/check-git-push.md`, `.claude/commands/update-changelog.md`:
  Superseded by `/ship`.

---

## Sprint 6 — 2026-04-28 · 3D Furniture Models, Animate Mode, and Manifest UX

**Goal:** Render ShapeNetSem 3D furniture meshes, add LIFO animate-mode playback,
replace free-text input with a structured furniture dropdown, and provide JSON export.

### Added

**Frontend**
- `frontend/src/data/modelCatalog.ts`: `FURNITURE_OPTIONS`, `FURNITURE_DEFAULTS`,
  `resolveModelPath()`.
- `frontend/public/models/`: 41 ShapeNetSem OBJ mesh files across 8 categories.
- `frontend/src/components/TruckViewer.tsx`: Animate mode — LIFO playback with
  controls bar. Thesis ref: 3.5.2.1 E
- `frontend/src/components/Dashboard.tsx`: JSON export button.

---

## Sprint 5 — 2026-04-27 · Async Pipeline, Payload Constraint, and Live Demo Bring-up

**Goal:** Wire the FastAPI ↔ Celery ↔ Redis ↔ PostgreSQL async pipeline end-to-end
and add the payload-weight constraint.

### Added

**Backend**
- `backend/worker/celery_app.py`, `backend/worker/tasks.py`: Celery + Redis async
  job queue.
- `backend/core/db.py`: SQLAlchemy job logging to PostgreSQL.
- `backend/solver/ilp_solver.py::_weight()`: Payload constraint
  `Σ weight_kg_i · b_i ≤ payload_kg`. Thesis ref: 3.5.2.1
- `backend/solver/ffd_solver.py`: Running `placed_weight` payload gate.
- `backend/core/validator.py::validate_weight()`: Post-solve payload check.

### Changed

**Backend**
- `backend/api/routes.py`: HTTP 202 async job-creation pattern.
- `backend/main.py`: FastAPI lifespan context manager.

---

## Sprint 4 — 2026-04-25 · FFD Heuristic, Post-Solve Safety Net, and Template Method

**Goal:** Ship the live Route-Sequential FFD heuristic and convert `AbstractSolver`
into a post-solve safety-net template method.

### Added

**Backend**
- `backend/solver/base.py`: Template method — auto-invokes `ConstraintValidator`
  after every `_solve()`; raises `PlanValidationError` on violation.
- `backend/solver/ffd_solver.py`: Live Route-Sequential FFD (O(n²)).
  Thesis ref: 3.5.2.2

---

## Sprint 3 — 2026-04-24 · Live ILP Model and ConstraintValidator

**Goal:** Implement the complete Gurobi ILP formulation (constraints A–E) and the
independent ConstraintValidator.

### Added

**Backend**
- `backend/solver/ilp_solver.py`: Full Gurobi ILP — `_variable_domains` (3.5.2.1 D),
  `_boundary` (C), `_non_overlap` (B), `_lifo` (E), `_orientation` (Rigid Orientation),
  `_objective` (A), `_extract_plan`.
- `backend/core/validator.py`: `validate_non_overlap` (B), `validate_boundary` (C),
  `validate_lifo` (E), `validate_orientation`; 9 pytest cases.

---

## Sprint 2 — 2026-04-27 · Frontend UI — Manifest Form, 3D Hover, Multi-Plan Comparison

**Goal:** Deliver a fully interactive frontend with manifest input, 3D hover tooltips,
and three-plan comparison.

### Added

**Frontend**
- `frontend/src/components/ManifestForm.tsx`: Full manifest input component.
- `frontend/src/components/PlanSelector.tsx`: 3-card comparison panel.
- `frontend/src/components/TruckViewer.tsx`: Raycaster hover tooltip; camera persistence.
  Thesis ref: 3.5.2.1 — Placement contract
- `frontend/src/components/Dashboard.tsx`: LIFO load-sequence panel; V_util bar.
  Thesis ref: 3.5.2.1 E

---

## Sprint 1 — 2026-04-24 · Project Bootstrap

**Goal:** Establish the full project scaffold and developer tooling.

### Added

**Backend**
- `backend/solver/ilp_solver.py`: ILPSolver scaffold. Thesis ref: 3.5.2.1 B, E
- `backend/solver/ffd_solver.py`: FFDSolver scaffold. Thesis ref: 3.5.2.1 E
- `backend/core/validator.py`: ConstraintValidator scaffold. Thesis ref: 3.5.2.1 B, C, E
- `backend/core/optimizer.py`: Hybrid dispatch (ILP/FFD + validate_all).
- `backend/api/models.py`: Full Placement + PackingPlan Pydantic contracts.
- `backend/api/routes.py`: FastAPI solver routes.

**Frontend**
- `frontend/src/components/TruckViewer.tsx`: Three.js r165+ interactive 3D viewer.
- `frontend/src/components/Dashboard.tsx`: V_util, T_exec, solver_mode panel.
- `frontend/src/api/client.ts`: Typed API client.
- `frontend/src/types/index.ts`: TypeScript interfaces for Placement + PackingPlan.

**Config & Tooling**
- `CLAUDE.md`, `.env.example`, `.gitignore`, `CHANGELOG.md`.

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
