# Chapter 4 — Results and Discussion

## 4.1 Research Question 1

> **RQ1.** *How can the mathematical models and constraint validation logic
> for the furniture-specific 3D Bin Packing Problem with Sequential Loading
> Constraints (3DBPP-SLC) be formulated to strictly integrate orientation
> restrictions, multi-stop delivery LIFO constraints, and non-overlapping
> truck boundary limits?*

This section answers Research Question 1 by presenting the complete
mathematical formulation that drives the FLOW-3D solver pipeline, together
with the independent constraint validation logic that enforces the same
contract at runtime. The formulation is organized into seven constraint
blocks. Blocks A through E reproduce the formal 3DBPP-SLC statement of
thesis Section 3.5.2.1; Blocks F and G are implementation extensions
required to eliminate two physically nonsensical optima that the
A–E model admits (floating items and items stacked on fragile cargo).
A final payload inequality is added as a single linear constraint on the
packing binaries. All constraint families are mirrored in
`backend/core/validator.py` as post-solve checks so that constraint
satisfaction is verified independently of the path (ILP or FFD) taken
by the hybrid engine.

---

### 4.1.1 Decision Variables and Domains

The model treats every item *i* in the input manifest as a candidate
for inclusion in the loading plan of a truck with internal envelope
*W × L × H* (millimetres). The decision variables follow the naming
convention mandated by thesis Section 3.5.2.1 and are summarized below.

| Symbol           | Domain           | Meaning                                                                 |
|------------------|------------------|-------------------------------------------------------------------------|
| `b_i`            | {0, 1}           | 1 iff item *i* is packed into the truck                                 |
| `x_i, y_i, z_i`  | ℤ ≥ 0            | Position (mm) of the front-left-bottom corner of item *i*               |
| `o_{i,k}`        | {0, 1}           | 1 iff item *i* takes orientation *k* ∈ {0, …, 5}                        |
| `s_{ij,k}`       | {0, 1}           | Separation indicator on plane *k* ∈ {1, …, 6} for the unordered pair {*i*, *j*} |
| `floor_i`        | {0, 1}           | 1 iff item *i* rests on the truck floor (Extension F)                   |
| `u_{i,j}`        | {0, 1}           | 1 iff item *j* is the unique direct supporter of item *i* (Extension F) |

The effective dimensions `w_eff_i`, `l_eff_i`, `h_eff_i` of item *i*
are determined by the active orientation *k* through a fixed
permutation map applied to the input tuple `(w_i, l_i, h_i)`. Once
orientation is fixed, all subsequent geometric constraints operate on
the effective dimensions. A schematic of the variable geometry is shown
in **Figure 4.1**, and the orientation enumeration is reproduced in
**Table 4.1**.

---

### 4.1.2 Block A — Objective

The objective maximizes truck volumetric utilization, defined as the
fraction of the internal truck volume occupied by packed items:

```
maximize    V_util = (1 / (W · L · H)) · Σ_i v_i · b_i                (A.1)
```

where `v_i = w_i · l_i · h_i` is the volume of item *i* in cubic
millimetres. Because `v_i` is orientation-invariant, the objective is
linear in the packing binaries alone and does not interact with the
orientation variables. `V_util` is reported in the `PackingPlan`
contract as a float in [0, 1] (CLAUDE.md, "PackingPlan contract").

---

### 4.1.3 Block B — Non-Overlap (Big-M Disjunction)

For every unordered pair of distinct items {*i*, *j*}, at least one
separating plane must hold whenever both items are packed. Six binary
indicators `s_{ij,k}` are introduced — one per face direction — and
each is associated with a Big-M inequality that becomes vacuous when
the corresponding indicator is zero:

```
x_i + w_eff_i ≤ x_j + M · (1 − s_{ij,1})                              (B.1)
x_j + w_eff_j ≤ x_i + M · (1 − s_{ij,2})                              (B.2)
y_i + l_eff_i ≤ y_j + M · (1 − s_{ij,3})                              (B.3)
y_j + l_eff_j ≤ y_i + M · (1 − s_{ij,4})                              (B.4)
z_i + h_eff_i ≤ z_j + M · (1 − s_{ij,5})                              (B.5)
z_j + h_eff_j ≤ z_i + M · (1 − s_{ij,6})                              (B.6)

Σ_{k = 1..6} s_{ij,k} ≥ b_i + b_j − 1                                 (B.7)
```

Inequality (B.7) forces at least one of the six planes to be active
whenever both items are packed (`b_i = b_j = 1`), and leaves the
separation indicators unconstrained otherwise. The constant *M* is
chosen as `max(W, L, H)` so that any inactive plane is rendered
trivially feasible. The six possible separation cases are illustrated
in **Figure 4.2**.

---

### 4.1.4 Block C — Boundary

Each packed item must lie entirely within the truck envelope. The
inequalities are gated by `b_i` so that unpacked items are exempt:

```
x_i + w_eff_i ≤ W · b_i                                               (C.1)
y_i + l_eff_i ≤ L · b_i                                               (C.2)
z_i + h_eff_i ≤ H · b_i                                               (C.3)
```

Combined with the integrality of the position variables, (C.1)–(C.3)
guarantee that every packed item occupies an axis-aligned sub-box of
the truck interior.

---

### 4.1.5 Block D — Orientation and Variable Domains

Each item is assigned exactly one orientation when packed and no
orientation when unpacked:

```
Σ_{k = 0..5} o_{i,k} = b_i                                            (D.1)
```

The orientation index determines the effective dimensions through a
fixed permutation table (Table 4.1). Rigid items carry a `side_up`
flag in the input manifest that restricts the admissible orientation
set. In the implementation, `o_{i,k}` is fixed to zero for every
*k* outside the admissible set before the solver begins. This
preserves linearity and lets Gurobi presolve eliminate the affected
variables (`backend/solver/ilp_solver.py`).

---

### 4.1.6 Block E — Route-Sequenced LIFO

The truck loading axis is the Y-axis: *y* = 0 is the truck rear (the
deepest point reached during loading), and *y* = *L* is the loading
door. The LIFO requirement states that items destined for later stops
must be loaded deeper, so that they sit behind earlier-stop items and
are not blocked at unloading. For every ordered pair (*i*, *j*) of
packed items with strictly differing stop identifiers,

```
stop_i > stop_j   ⟹   y_i + l_eff_i ≤ y_j                             (E.1)
```

Constraint (E.1) is added as a hard linear inequality for every such
pair at model-build time; pairs sharing a stop are exempt, and pairs
in the reverse stop order are covered by the symmetric instance of
(E.1) with *i* and *j* swapped. The geometric interpretation of the
LIFO axis is shown in **Figure 4.3**.

---

### 4.1.7 Block F — Vertical Support (Implementation Extension)

The A–E model admits floating items because Blocks B and C never
require contact with a supporting surface. Extension F closes this gap
using a single-supporter disjunction adapted from Bortfeldt and Mack
(2007).

**(F.1) Unique support.** Every packed item is supported either by
the floor or by exactly one other packed item:

```
floor_i + Σ_{j ≠ i} u_{i,j} = b_i                ∀ i                  (F.1)
```

**(F.2) Floor lock.** Floor-supported items have z-coordinate zero:

```
z_i ≤ H · (1 − floor_i)                          ∀ i                  (F.2)
```

**(F.3) Supporter must be packed.**

```
u_{i,j} ≤ b_j                                    ∀ i, j, i ≠ j        (F.3)
```

**(F.4) Vertical contact.** When *j* supports *i*, the bottom face of
*i* coincides with the top face of *j*:

```
z_i − z_j − h_eff_j ≤ H · (1 − u_{i,j})          ∀ i, j, i ≠ j        (F.4a)
z_j + h_eff_j − z_i ≤ H · (1 − u_{i,j})          ∀ i, j, i ≠ j        (F.4b)
```

**(F.5) Footprint containment.** When *j* supports *i*, the *xy*
footprint of *i* is fully contained within that of *j*:

```
x_j − x_i ≤ W · (1 − u_{i,j})                                       (F.5a)
(x_i + w_eff_i) − (x_j + w_eff_j) ≤ W · (1 − u_{i,j})               (F.5b)
y_j − y_i ≤ L · (1 − u_{i,j})                                       (F.5c)
(y_i + l_eff_i) − (y_j + l_eff_j) ≤ L · (1 − u_{i,j})               (F.5d)
```

The single-supporter approximation rules out items that physically
span two adjacent supporters, but it keeps the formulation at *O*(*n*²)
binaries and *O*(*n*²) constraints, which is essential to remain
within the ILP regime (manifest size *n* ≤ `SOLVER_THRESHOLD`).
Bortfeldt and Mack (2007) report that this approximation recovers
near-optimal densities in practice for the 3DBPP. A cycle-freedom
argument follows from (F.4): `u_{i,j} = 1` forces `z_i = z_j + h_eff_j
> z_j` whenever `h_eff_j ≥ 1`, so a reciprocal `u_{j,i} = 1` would
imply `z_j > z_i`, a contradiction. The support tree therefore
contains no cycles and roots at the floor.

---

### 4.1.8 Block G — Fragile No-Stacking (Implementation Extension)

The `FurnitureItem.fragile` field on the data contract
(`backend/api/models.py:39`) reads literally *"Fragile — solver must
not stack other items on top of this one."* The constraint is
implemented as an equality fixing on the supporter binary:

```
u_{i,j} = 0   ∀ i, j with j fragile                                   (G.1)
```

Combined with the unique-support equality (F.1), constraint (G.1)
forces every item that would otherwise rest on *j* to choose the
floor or some non-fragile supporter. If no such alternative exists,
the affected item is left unpacked and surfaces in
`PackingPlan.unplaced_items`. (G.1) is strictly tightening: it
removes only solutions that violate the fragile contract and does
not eliminate any physically valid packing. Note that (G.1) does
**not** forbid a fragile item from being supported by something else
— a fragile mirror may legally rest on top of a non-fragile crate —
nor does it forbid items at the same height as a fragile item with
no *xy* overlap. The constraint reserves only the vertical column
directly above each fragile item.

---

### 4.1.9 Payload Constraint

The truck has a maximum payload mass `payload_kg`. A single linear
inequality in the packing binaries enforces this limit:

```
Σ_i weight_kg_i · b_i ≤ payload_kg                                    (P.1)
```

Although (P.1) lies outside the formal 3.5.2.1 A–E statement, it is
implemented in `_weight()` of `backend/solver/ilp_solver.py` and
mirrored in `validate_weight()` of `backend/core/validator.py`. It
introduces no new variables and is absorbed cleanly by Gurobi
presolve.

---

### 4.1.10 Combined Model

The full integer linear program solved by `ILPSolver` for manifests
of size *n* ≤ `SOLVER_THRESHOLD` is:

```
maximize    V_util = (1 / (W · L · H)) · Σ_i v_i · b_i               [A]

subject to  (B.1)–(B.7)   non-overlap (six Big-M planes)             [B]
            (C.1)–(C.3)   boundary containment                       [C]
            (D.1)         orientation assignment                     [D]
            (E.1)         route-sequenced LIFO                       [E]
            (F.1)–(F.5)   vertical single-supporter                  [F]
            (G.1)         fragile no-stacking                        [G]
            (P.1)         payload                                    [Pay]

            b_i, o_{i,k}, s_{ij,k}, floor_i, u_{i,j} ∈ {0, 1}
            x_i, y_i, z_i ∈ ℤ ≥ 0
```

For manifests larger than `SOLVER_THRESHOLD`, the same constraint
contract is honoured by the `FFDSolver` heuristic
(`backend/solver/ffd_solver.py`) through a deterministic
Route-Sequential First-Fit Decreasing procedure: items are sorted by
descending volume within increasing stop order, and each item is
placed at the first feasible candidate position that satisfies all
seven constraint families. The hybrid dispatch is described in
**Figure 4.4**, and the per-operation complexities are reproduced in
**Table 4.2**.

---

### 4.1.11 Constraint Validation Logic

The constraint validator
(`backend/core/validator.py::ConstraintValidator`) is an independent
post-solve component that re-verifies every constraint family against
the returned `PackingPlan`. It is invoked unconditionally by the
`AbstractSolver` template method after either solver path completes,
so its verdict is independent of the path taken. This separation is
enforced by the module rule that `solver/` never imports from `api/`
or `main.py`, and that the validator lives in `core/` (CLAUDE.md,
"Module separation rules"). The mapping from validator methods to
constraint blocks is:

| Validator method                       | Enforces      | Predicate                                                                 |
|----------------------------------------|---------------|---------------------------------------------------------------------------|
| `validate_boundary`                    | Block C       | For every placed item, `0 ≤ x, y, z` and `x + w ≤ W`, `y + l ≤ L`, `z + h ≤ H` |
| `validate_no_overlap`                  | Block B       | For every pair of placed items, their axis-aligned boxes are disjoint     |
| `validate_lifo`                        | Block E       | For every pair (*a*, *b*) with `stop_a > stop_b`, `y_a + l_a ≤ y_b`       |
| `validate_orientation`                 | Block D       | `orientation_index ∈ {0, …, 5}` and admissible under `side_up`            |
| `validate_no_stack_on_fragile`         | Block G       | For every fragile placed item *b* and every other placed item *a*, if `z_a ≥ z_b + h_b` then the *xy* footprints of *a* and *b* are disjoint |
| `validate_weight`                      | Payload (P.1) | `Σ weight_kg of placed items ≤ payload_kg`                                |

The `validate_no_stack_on_fragile` predicate is strictly stronger than
the support-level constraint (G.1): it inspects raw placement geometry
rather than supporter binaries, so it catches any regression in either
solver where a stacked-on-fragile placement could arise from a path
that bypasses the support variables (e.g., a future bug in the FFD
fragile gate). The validator's `first_failing_check` method returns
a labelled diagnostic (`"fragile_stacking"`, `"lifo"`, `"overlap"`,
etc.) which is wrapped in `PlanValidationError` and surfaced to the
frontend dashboard. The full validator-to-constraint mapping is also
shown in **Figure 4.5**.

The architectural separation between the solver and the validator
serves two purposes. First, it provides a runtime guarantee that the
constraint contract holds for the FFD path, which is greedy and not
globally optimal; without the validator, an FFD bug could produce a
plan that violates LIFO or fragile no-stacking without detection.
Second, it makes the constraint contract auditable: the validator
file alone is sufficient to verify what the system promises, without
the reader needing to follow the full Gurobi model build in
`ilp_solver.py`.

---

### 4.1.12 Strict Integration of the Three RQ1 Requirements

Research Question 1 asks specifically how the three named requirement
families — orientation restrictions, multi-stop LIFO, and
non-overlapping truck boundary — are *strictly integrated* into a
single mathematical model rather than enforced as independent
post-processing filters. The integration is achieved through three
design decisions, each visible in the formulation above.

**(1) Shared effective dimensions tie orientation to every geometric
constraint.** The variables `w_eff_i`, `l_eff_i`, `h_eff_i` are
functions of the orientation indicator `o_{i,k}` (Block D), and they
appear in every spatial inequality — non-overlap (B), boundary (C),
LIFO (E), vertical contact (F.4), and footprint containment (F.5).
This means orientation is not a separate pre-processing step that
fixes dimensions before the geometry is solved; instead, the solver
jointly chooses orientation and position, and an invalid orientation
choice for a rigid item is ruled out at the variable level by zeroing
the inadmissible `o_{i,k}` entries.

**(2) LIFO is a hard constraint of the same algebraic class as
non-overlap.** Constraint (E.1) is a linear inequality on the
position variables and the effective length, structurally identical
to a non-overlap plane in the *y*-direction. It is not enforced
post-solve, nor as a soft penalty in the objective; the solver
cannot return a plan that violates it. This is what distinguishes
3DBPP-SLC from plain 3DBPP, and what makes the formulation
*route-aware* in the sense of the project title.

**(3) Boundary, non-overlap, and LIFO share the packing binary
gate.** All three constraint families are scaled by `b_i` (boundary,
C.1–C.3) or are conditioned on `b_i + b_j − 1` (non-overlap, B.7) or
on the implicit packed status of both endpoints (LIFO, E.1, which is
trivially satisfied if either item is unpacked because the position
of an unpacked item is unconstrained by Blocks B and C). This gating
is what allows the model to *partially* pack a manifest when full
inclusion is infeasible, returning the rejected items in
`unplaced_items` rather than declaring the entire instance
infeasible.

Together, these three design decisions produce a single ILP whose
optimal solution is, by construction, simultaneously orientation-
admissible, LIFO-compliant, and bounded by the truck envelope — and
whose constraint contract is enforced again at runtime by the
independent validator. The combined model is the formal answer to
RQ1.

---

### 4.1.13 Summary of Findings for RQ1

The 3DBPP-SLC for furniture logistics can be formulated as a single
integer linear program of *O*(*n*²) binaries and *O*(*n*²)
constraints in the manifest size *n*. The formulation strictly
integrates the three RQ1 requirements as follows:

- **Orientation restrictions** are encoded in Block D through
  selector variables `o_{i,k}` whose admissible set is restricted by
  the `side_up` flag, and which determine the effective dimensions
  used by every other geometric constraint.
- **Multi-stop LIFO constraints** are encoded in Block E as hard
  linear inequalities on the *y*-axis position variables, structurally
  parallel to the non-overlap planes and gated by stop identifier
  ordering.
- **Non-overlapping truck boundary limits** are encoded jointly in
  Blocks B (Big-M disjunctive separation, six planes) and C
  (envelope containment scaled by `b_i`).

Two implementation extensions (F, G) and one payload inequality
augment the formal A–E statement to eliminate physically
nonsensical optima and to honour the `fragile` and `payload_kg`
fields of the data contract. The independent
`ConstraintValidator` re-verifies every block against the returned
`PackingPlan`, guaranteeing that the constraint contract holds
regardless of which solver path (ILP or FFD) produced the plan.

A reference implementation of the formulation lives in
`backend/solver/ilp_solver.py`; the parity heuristic in
`backend/solver/ffd_solver.py`; and the post-solve validator in
`backend/core/validator.py`. Empirical performance of the
formulation against the configured `SOLVER_THRESHOLD` is presented
in Section 4.2, which addresses Research Question 2.
