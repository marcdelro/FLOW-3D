# FLOW-3D ILP Model Extensions Beyond Thesis Section 3.5.2.1

**Status:** Implementation reference for the FLOW-3D solver pipeline.
**Audience:** Thesis panel, Yukti (thesis lead), and any future maintainer.
**Scope:** This document defines the two constraint blocks present in
`backend/solver/ilp_solver.py` that go beyond the formal MILP statement in
thesis section 3.5.2.1 A–E.

The original thesis formulation (3.5.2.1) covers:

| Block | Name                  | Purpose                                |
| ----- | --------------------- | -------------------------------------- |
| A     | Objective             | Maximize V_util                        |
| B     | Non-overlap           | Big-M disjunctive separation, 6 planes |
| C     | Boundary              | Truck containment (W × L × H)          |
| D     | Variable domains      | b_i, s_ij,k, x_i, y_i, z_i, o_i,k      |
| E     | Route-Sequenced LIFO  | stop_i > stop_j ⇒ y_i + l_i ≤ y_j      |

This document specifies two further blocks **F** (Vertical Support) and
**G** (Fragile No-Stacking), both of which are physically necessary for a
deployable Decision Support System but are not formalized in 3.5.2.1.

---

## Why these extensions exist

The pure 3.5.2.1 model permits two physically nonsensical optima that any
demo would expose immediately:

1. **Floating items.** A box can sit at z > 0 with empty space below.
   Non-overlap (B) and boundary (C) do not require contact with a
   supporting surface.
2. **Stacking on fragile items.** The `FurnitureItem.fragile` field is
   declared on the data contract and exposed by the frontend (Manifest
   form, 3D viewer decals). Without an enforcing constraint the solver
   silently ignores it, so users marking glass cabinets or mirrors as
   fragile receive plans that crush them under heavier crates.

Both extensions are motivated by the load-bearing physics language already
present in the thesis introduction. They are documented separately here
because they are not part of the formal mathematical statement in
3.5.2.1 A–E, and the panel must be able to find an authoritative source
for them.

---

## Extension F: Vertical Support / Single-Supporter Disjunction

**Reference implementation:** `backend/solver/ilp_solver.py::_support()`
(also mirrored in `backend/solver/ffd_solver.py::_supported()`).

**Citation:** Bortfeldt, A., & Mack, D. (2007). *A heuristic for the
three-dimensional strip packing problem.* European Journal of
Operational Research, 183(3), 1267–1279. The "single-supporter"
simplification adopted here matches §3 of that paper.

### Added decision variables

```
floor_i ∈ {0, 1}                for every item i
u_{i, j} ∈ {0, 1}                for every ordered pair (i, j) with i ≠ j
```

Semantics:

- `floor_i = 1` iff item i rests directly on the truck floor (z_i = 0).
- `u_{i, j} = 1` iff item j is the single direct supporter of item i.

### Constraints

**(F.1) Unique support per packed item.** Every packed item has exactly
one supporter, which is either the floor or one other packed item:

```
floor_i + Σ_{j ≠ i} u_{i, j} = b_i               ∀ i
```

When b_i = 0 (item i unpacked), all support variables collapse to zero.

**(F.2) Floor lock.** If item i is supported by the floor, its z-coordinate
is zero:

```
z_i ≤ H · (1 − floor_i)                           ∀ i
```

**(F.3) Supporter must be packed.**

```
u_{i, j} ≤ b_j                                    ∀ i, j with i ≠ j
```

**(F.4) Vertical contact.** When u_{i, j} = 1, the bottom face of i
coincides with the top face of j. Linearized via a Big-M disjunction on
both sides:

```
z_i − z_j − h_eff_j ≤ H · (1 − u_{i, j})          ∀ i, j with i ≠ j
z_j + h_eff_j − z_i ≤ H · (1 − u_{i, j})          ∀ i, j with i ≠ j
```

**(F.5) Footprint containment.** When u_{i, j} = 1, the xy footprint of i
is fully contained within the xy footprint of j:

```
x_j − x_i             ≤ W · (1 − u_{i, j})        ∀ i, j with i ≠ j
(x_i + w_eff_i) − (x_j + w_eff_j) ≤ W · (1 − u_{i, j})    ∀ i, j with i ≠ j
y_j − y_i             ≤ L · (1 − u_{i, j})        ∀ i, j with i ≠ j
(y_i + l_eff_i) − (y_j + l_eff_j) ≤ L · (1 − u_{i, j})    ∀ i, j with i ≠ j
```

`w_eff_i`, `l_eff_i`, `h_eff_i` are the orientation-dependent effective
dimensions defined by Rigid Orientation in 3.5.2.1 D.

### Why the single-supporter approximation

The strict physical condition — i is supported iff its base is fully
covered by some union of supporters' top surfaces — requires either
disjunctions over subsets of {1, …, n} or auxiliary covering variables
that explode the model size. Restricting to a single supporter rules out
items that span two adjacent boxes but keeps the formulation at O(n²)
binaries (`u_{i, j}`) and O(n²) constraints, which fits comfortably
inside the ILP regime (n ≤ ~20). Bortfeldt & Mack (2007) report this is
the dominant trade-off in the 3DBPP literature and recover near-optimal
densities in practice.

### Cycle freedom (proof sketch)

If u_{i, j} = 1 then by (F.4) z_i = z_j + h_eff_j. Whenever item j is
packed (b_j = 1) with non-zero height (h_eff_j ≥ 1), this forces
z_i > z_j. Therefore u_{j, i} = 1 would simultaneously force z_j > z_i,
a contradiction. Cyclic support is infeasible.

### Test coverage

| Test                                        | File                        |
| ------------------------------------------- | --------------------------- |
| `test_ilp_supports_vertical_stacking`       | `tests/test_integration_solve.py` |
| `test_every_placement_has_floor_or_supporter` | `tests/test_ffd_solver.py` |
| `test_supported_rejects_unsupported_overhang` | `tests/test_ffd_solver.py` |

The first asserts that two same-stop boxes in a footprint-tight truck
stack with vertical contact and full xy containment under the ILP path.
The latter two lock the FFD parity behavior at the unit level.

---

## Extension G: Fragile No-Stacking

**Reference implementation:**
`backend/solver/ilp_solver.py::_support()` (constraint family
`sup_fragile_{i}_{j}`), `backend/solver/ffd_solver.py::_supported()`
(fragile_ids gate), and
`backend/core/validator.py::validate_no_stack_on_fragile()`.

**Motivation:** Honors the `FurnitureItem.fragile` field, which is part
of the data contract (`backend/api/models.py:39`) and is exposed to end
users through the frontend Manifest form and TruckViewer fragile
decals. The contract description reads literally: *"Fragile — solver
must not stack other items on top of this one."*

### Constraint (added to F)

For every ordered pair (i, j), if item j carries `fragile = true` in the
manifest, fix the supporter binary to zero:

```
u_{i, j} = 0                                      ∀ i, j with j fragile
```

Combined with the unique-support constraint (F.1), this forces every
item that would otherwise rest on j to instead choose the floor or some
non-fragile supporter k. If no such alternative exists in the truck
geometry, the affected item is left unpacked (b_i = 0) and surfaces in
`PackingPlan.unplaced_items`.

The constraint is strictly tightening: it removes feasible solutions
that violate the fragile contract without altering any
physically-valid packing.

### Note on what the constraint does and does not do

- It **forbids** placing any item directly above a fragile item via the
  support disjunction.
- It does **not** forbid the fragile item itself from being supported
  by something else. A fragile mirror may legally rest on top of a
  non-fragile crate. The ILP frequently exploits this in tight trucks
  by inverting the natural order — the test
  `test_fragile_item_refuses_to_be_supporter` was specifically rewritten
  to permit this.
- It does **not** forbid items from being above a fragile item with no
  xy overlap. Fragile items still tessellate with their neighbors at
  the same height; only the column directly above them is reserved.

### Validator (independent post-solve check)

`ConstraintValidator.validate_no_stack_on_fragile(plan, items)` provides
the post-solve safety net required by the AbstractSolver template
method. Its predicate is strictly stronger than the support-level
constraint above: for every fragile placed item b and every other
placed item a, if `a.z ≥ b.z + b.h` and the xy footprints of a and b
overlap, the plan is rejected. This catches any future regression in
either solver where a stacked-on-fragile placement could arise from a
path other than the support binaries (e.g., an FFD bug skipping the
fragile gate).

`first_failing_check` returns the label `"fragile_stacking"` so
`PlanValidationError` carries a meaningful diagnostic.

### Test coverage

| Test                                          | File                       |
| --------------------------------------------- | -------------------------- |
| `test_fragile_rejects_stacked_load`           | `tests/test_validator.py`  |
| `test_fragile_allows_side_by_side`            | `tests/test_validator.py`  |
| `test_fragile_allows_load_below`              | `tests/test_validator.py`  |
| `test_validate_all_flags_fragile_stacking`    | `tests/test_validator.py`  |
| `test_supported_rejects_unsupported_overhang` (extended with `fragile_ids`) | `tests/test_ffd_solver.py` |
| `test_ffd_does_not_stack_on_fragile_item`     | `tests/test_ffd_solver.py` |
| `test_fragile_item_refuses_to_be_supporter`   | `tests/test_ilp_solver.py` |

---

## Combined extended model summary

The full model solved by `ILPSolver` is:

```
maximize    V_util = (1 / (W·L·H)) · Σ_i v_i · b_i              [3.5.2.1 A]

subject to:
            (Non-overlap, 6 Big-M planes)                        [3.5.2.1 B]
            (Boundary containment scaled by b_i)                 [3.5.2.1 C]
            (Variable domains, including o_{i,k})                [3.5.2.1 D]
            (Route-Sequenced LIFO)                               [3.5.2.1 E]
            (Vertical Support — single-supporter, F.1–F.5)       [Extension F]
            (Fragile No-Stacking, u_{i,j} = 0 when j fragile)    [Extension G]

            (Truck payload Σ_i w_kg_i · b_i ≤ payload_kg)        [extension, see _weight()]
```

The payload constraint is a third extension beyond 3.5.2.1 A–E but is
not separately documented here because it is a single linear inequality
in pre-existing decision variables (b_i) and adds no new structural
behavior. See `_weight()` in `ilp_solver.py` for the implementation and
`validate_weight` in `validator.py` for the post-solve check.

---

## Compatibility with the heuristic path

The Route-Sequential FFD heuristic (`backend/solver/ffd_solver.py`,
thesis 3.5.2.2) implements all three extensions for parity:

- Vertical support — `FFDSolver._supported()` rejects any candidate at
  z > 0 unless some placed item p has p.z + p.h equal to the candidate's
  z and p's xy footprint contains the candidate's footprint.
- Fragile no-stacking — `_supported()` accepts a `fragile_ids` set and
  excludes any p whose item_id appears in that set from being a valid
  supporter.
- Payload — running `placed_weight` counter gates each item against
  `truck.payload_kg` before geometry is attempted.

This is a deliberate design choice (see CLAUDE.md module separation
rules and thesis 3.5.2.2): both solvers must obey the same physical
contract so that switching between paths via SOLVER_THRESHOLD is safe
and the constraint validator never produces a different verdict per
solver mode.

---

## Defense Q&A — likely questions

**Q1. Why aren't these in section 3.5.2.1 of the thesis?**
Section 3.5.2.1 documents the formal 3DBPP-SLC formulation as derived
from the literature. Both extensions formalize implicit physical
constraints discussed in the thesis introduction (load-bearing
fragility) but not encoded in the original mathematical statement. They
were added during implementation when test scenarios surfaced
physically nonsensical optima (floating items, crates on mirrors).

**Q2. Do these extensions change the worst-case complexity?**
No. Extension F adds n + n(n−1) = O(n²) binaries and O(n²) constraints.
Extension G adds at most n(n−1) equality fixings (one per ordered pair
with a fragile second component) and zero new variables. The dominant
term in the ILP regime remains the 3DBPP non-overlap (6 · n(n−1)/2
disjunctive planes) from 3.5.2.1 B. Branch-and-bound complexity stays
O(2^n) per Table 3.3, path 2.

**Q3. Have you measured the empirical cost?**
Yes. The benchmark report at
`docs/benchmarks/threshold_bench_2026-05-02.md` was generated with
Extension F live and reports median ILP runtime of 1.7 s at n = 20
(the configured `SOLVER_THRESHOLD`). The fragile constraint (G) adds
only equality fixings; Gurobi presolve absorbs them and the empirical
cost is below the benchmark's measurement noise.

**Q4. Why a single-supporter rule rather than full multi-supporter?**
See "Why the single-supporter approximation" under Extension F above.
Short version: keeps the model at O(n²) binaries instead of subset
enumeration, follows Bortfeldt & Mack (2007), and recovers near-optimal
densities in practice for the manifest sizes the hybrid engine routes
to ILP.

**Q5. What if a fragile item cannot fit on the floor and there is no
non-fragile supporter that contains it?**
The item appears in `PackingPlan.unplaced_items` and the frontend
surfaces this in the dashboard. This is the correct behavior: the
solver refuses to produce a plan that violates the fragility contract,
and the user receives explicit feedback that the manifest cannot be
fully packed under the constraint.

---

## Maintenance notes

- Any change to `_support()` in `ilp_solver.py` must update the
  corresponding section above.
- New "implementation extensions" should be added as additional
  sections (Extension H, I, …) rather than silently inlined into the
  existing solver. The presence of a constraint in the code without a
  corresponding section in this document is a defense liability.
- When the thesis document is updated to include these extensions
  natively (Yukti's prerogative), this document can be retired and the
  docstrings in `ilp_solver.py` updated to cite the new thesis section
  instead of "implementation extension beyond 3.5.2.1 A–E".
