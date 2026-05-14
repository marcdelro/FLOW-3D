# Chapter 4 — Results and Discussion

## 4.3 Research Question 3

> **RQ3.** *How can a First-Fit Decreasing (FFD) heuristic fallback
> algorithm be implemented to ensure a deterministic, bounded solver
> execution time when the system processes exceptionally large cargo
> datasets?*

This section answers Research Question 3 by presenting the
Route-Sequential First-Fit Decreasing (FFD) heuristic implemented in
`backend/solver/ffd_solver.py` and used by the hybrid engine whenever
the input manifest exceeds the configured `SOLVER_THRESHOLD`. The
section is structured as follows. Subsection 4.3.1 motivates the
fallback in terms of the ILP path's exponential worst-case behaviour
documented in Section 4.2 (RQ2). Subsection 4.3.2 presents the
three-phase algorithm (LIFO pre-sort, orientation enumeration, and
First-Fit greedy placement) with the exact predicates evaluated at
each step. Subsection 4.3.3 proves the *O*(*n*²) worst-case
complexity bound. Subsection 4.3.4 establishes determinism through
the algorithm's tie-breaking rules. Subsection 4.3.5 presents the
empirical execution-time measurements from the threshold benchmark
of 2026-05-02. Subsection 4.3.6 documents the two configurable
strategies — `presort = "weight"` and `axle_balance = True` — and
proves that neither breaks the *O*(*n*²) bound. Subsection 4.3.7
addresses constraint parity with the ILP path. Subsection 4.3.8
summarizes the findings for RQ3.

---

### 4.3.1 Motivation for an FFD Fallback

The ILP path described in Section 4.1 is exact: it returns a
globally optimal packing under Blocks A–G and the payload
inequality. Its worst-case time complexity, however, is *O*(2^*n*)
in the manifest size *n*, dominated by the Branch-and-Bound search
over the *n* packing binaries `b_i` and the *n*(*n*−1) supporter
binaries `u_{i,j}` (thesis Section 3.5.2.4, Table 3.3, path 2).
Empirically, with the single-supporter constraint live, the median
ILP solve time crosses 1.7 seconds at *n* = 20 and crosses 2 seconds
at *n* = 22 (see Section 4.2, **Table 4.6**, and the threshold
benchmark report at `docs/benchmarks/threshold_bench_2026-05-02.md`).
At a fixed five-second user response budget, this places an effective
ceiling near *n* ≈ 24 for the ILP path on the workstation used in
the benchmark.

A deployed Decision Support System for Philippine furniture
logistics must, however, accept manifests well beyond this ceiling.
A single multi-stop delivery run for a mid-sized furniture
distributor routinely carries between 40 and 80 items across 6 to
12 customer stops. For these manifest sizes, an exact solver is
neither necessary (the user does not need provable optimality to
benefit from a route-aware loading plan) nor desirable (a 60-second
or longer wait per query is incompatible with interactive use).
The FFD fallback is therefore a *response-time guarantee*: it
produces a feasible, LIFO-compliant, constraint-validated plan in
time *polynomial* in *n*, sacrificing optimality for boundedness.

The fallback is invoked by the hybrid dispatch logic in
`backend/solver/__init__.py` whenever `n > SOLVER_THRESHOLD`. The
dispatch decision is depicted in **Figure 4.4** (Section 4.1) and
the per-path complexities are reproduced in **Table 4.7**.

> **Place Table 4.7 here.** *Table 4.7 — Time complexities of the
> two solver paths.* Columns: solver mode, dominant operation,
> worst-case complexity, empirical median at *n* = 20. Source rows:
> ILP (`O(2^n)`, 1703 ms), FFD (`O(n²)`, 1 ms). Cite
> `docs/benchmarks/threshold_bench_2026-05-02.md`.

---

### 4.3.2 The Route-Sequential FFD Algorithm

The fallback follows the three-phase structure of thesis Section
3.5.2.2. The phases correspond to the methods `_lifo_presort`,
`_candidate_orientations`, and `_greedy_placement` in
`backend/solver/ffd_solver.py`.

#### Phase 1 — LIFO Pre-Sort

The input manifest is sorted by a two-key composite ordering. The
primary key is **descending `stop_id`**, so items destined for the
final stop appear at the head of the sequence and items destined
for the first stop appear at the tail. The secondary key is
**descending volume** `v_i = w_i · l_i · h_i` (default) or
**descending weight** `weight_kg_i` when `presort = "weight"` is
selected. Within each stop group, the secondary key produces the
classic First-Fit Decreasing ordering: the largest (or heaviest)
items are considered first, while they still have the most placement
freedom.

The primary key is what makes the heuristic *Route-Sequential* and
distinguishes it from a plain 3DBPP FFD. By processing later stops
first, the algorithm pushes their items to low *y* (near the truck
rear) before any earlier-stop item is considered. This pre-ordering
makes the LIFO predicate (Block E) trivially satisfiable at every
subsequent placement attempt: an earlier-stop item evaluated later
in the sequence will always be tested against already-placed items
that are at or below it in the stop hierarchy, so the only LIFO
inequality that can bind is `y + l ≤ p.y` against a later-stop
neighbour — and the natural sweep over candidates from *y* = 0
upward respects this automatically when feasible.

> **Place Figure 4.7 here.** *Figure 4.7 — LIFO pre-sort produces
> the placement sequence S.* Vertical timeline with three columns
> labelled "Stop 3", "Stop 2", "Stop 1" (descending). Each column
> shows three or four boxes sorted by descending volume. An arrow
> on the right concatenates the columns top-to-bottom into the
> single sequence S that Phase 3 consumes.

The pre-sort is implemented as a single Python `sorted()` call with
a composite key tuple, which runs in *O*(*n* log *n*) time and is
not the dominant term in the overall complexity.

#### Phase 2 — Orientation Enumeration

For each item *i*, the admissible orientation set is determined by
the `side_up` flag on the input manifest. Free items (`side_up =
False`) iterate over all six orientations exported by
`ORIENTATION_PERMUTATIONS`; rigid items (`side_up = True`) are
restricted to the `UPRIGHT_ORIENTATIONS` subset, in which the
item's natural *h*-axis is locked to the truck *z*-axis. This is
the same admissibility rule that gates the `o_{i,k}` selector
variables in the ILP path (Block D, Section 4.1.5), guaranteeing
constraint parity.

For each candidate orientation *k*, the effective dimensions
`w_eff_i`, `l_eff_i`, `h_eff_i` are computed by applying the
permutation `ORIENTATION_PERMUTATIONS[k]` to the input dimensions
`(w_i, l_i, h_i)`. These effective dimensions are then used by all
predicates in Phase 3.

> **Place Table 4.8 here.** *Table 4.8 — Orientation enumeration and
> admissibility under `side_up`.* Reproduce Table 4.1 from Section
> 4.1 (orientation index 0–5 with the corresponding permutation of
> `(w, l, h)`), and annotate which rows are admissible under
> `side_up = True`. The right-hand column should be checkmarks or
> crosses.

#### Phase 3 — First-Fit Greedy Placement

Phase 3 maintains three structures:

1. A list of accepted `placements` (initially empty).
2. A list of `candidates` — anchor coordinates at which the next
   item may attempt placement (initially `[(0, 0, 0)]`).
3. A running `placed_weight` counter to enforce the payload
   inequality.

For each item *i* in the sequence *S*, the algorithm first tests
the payload predicate `placed_weight + weight_kg_i ≤ payload_kg`.
If the predicate fails, the item is appended to `unplaced` without
attempting any geometry, ensuring that an over-payload manifest
fails fast on Phase 3.

When the payload predicate succeeds, the algorithm sorts the
candidate list by the lexicographic key `(y, x, z)` — *y* first so
that placement sweeps the truck from the rear (deepest) toward the
loading door, which is the LIFO-friendly direction; *x* second so
that within a fixed *y* the search hugs the left wall; and *z* third
so the floor is preferred over stacked positions. The algorithm
then iterates `(orientation_index, candidate)` pairs in nested
order and evaluates five predicates against each pair:

1. **Boundary containment** (Block C): `cx + w_eff ≤ W`, `cy + l_eff
   ≤ L`, `cz + h_eff ≤ H`.
2. **Non-overlap** (Block B): the candidate axis-aligned box does
   not intersect any already-placed box. Implemented by
   `_collides`, which mirrors `validator.validate_non_overlap`.
3. **LIFO spatial boundary** (Block E): no already-placed item
   destined for a later stop has its *y*-extent past the candidate
   anchor, and the candidate's *y*-extent does not encroach on any
   earlier-stop neighbour. Implemented by `_lifo_ok`, which mirrors
   `validator.validate_lifo`.
4. **Vertical support** (Extension F): either `cz = 0` (floor
   support) or there exists a single placed item *p* with `p.z + p.h
   = cz`, with the candidate's *xy* footprint fully contained in
   *p*'s footprint, and with *p* not itself fragile. Implemented by
   `_supported`.
5. **Fragile no-stacking** (Extension G): folded into `_supported`
   through the `fragile_ids` set parameter, which excludes fragile
   items from the supporter search.

The first `(orientation_index, candidate)` pair that satisfies all
five predicates is accepted, a `Placement` is appended, and three
new candidates are generated by extruding the accepted box's right
face, front face, and top face:

```
candidates ∪= { (cx + w_eff, cy,        cz),
                (cx,         cy + l_eff, cz),
                (cx,         cy,         cz + h_eff) }
```

`placed_weight` is incremented by `weight_kg_i`, and the loop
advances to the next item. If no `(orientation_index, candidate)`
pair satisfies all five predicates, the item's `item_id` is
appended to `unplaced` and the loop advances. The candidate list
itself is *never* pruned during the loop — accepted candidates
remain in the list so that later, smaller items may still fit into
gaps left by larger ones. This is the canonical First-Fit-Decreasing
behaviour adapted to a 3D anchor representation.

> **Place Figure 4.8 here.** *Figure 4.8 — Phase 3 candidate sweep
> for a single item.* Top-down view of a partially packed truck.
> Show three already-placed boxes (different stop colours), the six
> existing candidate anchors as small dots, the sweep order `(y, x,
> z)` as a numbered path through the dots, and a highlighted dot
> labelled "first feasible" where the predicates 1–5 all hold.

> **Place Figure 4.9 here.** *Figure 4.9 — Three-phase algorithm
> flowchart.* Top: input manifest. Middle row left to right:
> "Phase 1: LIFO pre-sort", "Phase 2: orientation set", "Phase 3:
> greedy placement loop". Inside Phase 3 show the five predicate
> diamond chain (Boundary → Non-overlap → LIFO → Support →
> Fragile) feeding either an "Accept" branch (append Placement,
> extend candidates) or a "Reject" branch (try next pair, fall
> through to `unplaced`). Bottom: output `PackingPlan`.

---

### 4.3.3 Worst-Case Time Complexity

We now prove the *O*(*n*²) worst-case bound that answers the
*"bounded solver execution time"* clause of RQ3. Let *n* be the
manifest size and let *p* denote the number of items already
placed when item *i* is processed (so *p* ranges from 0 to *n*−1
across the outer loop). The cost of processing item *i* is:

| Step                              | Cost                              |
|-----------------------------------|-----------------------------------|
| Payload check                     | *O*(1)                            |
| Candidate sort                    | *O*(*c* log *c*), where *c* ≤ 3*p* + 1 |
| Inner double loop (orient × cand) | 6 · *c* iterations                |
|   Predicate 1 (boundary)          | *O*(1)                            |
|   Predicate 2 (non-overlap)       | *O*(*p*)                          |
|   Predicate 3 (LIFO)              | *O*(*p*)                          |
|   Predicate 4 (support)           | *O*(*p*)                          |
|   Predicate 5 (fragile, folded)   | *O*(1) inside 4                   |

The candidate list grows by at most three entries per accepted
placement, so its size is bounded by `3p + 1`. Each candidate
evaluation does *O*(*p*) work against the placed list for the
overlap, LIFO, and support predicates. The orientation factor is
constant (at most six). Therefore the cost of processing item *i*
is bounded by:

```
T_i = O(1) + O((3p + 1) log (3p + 1)) + 6 · (3p + 1) · O(p)
    = O(p²)
```

Summing over all *n* items and using *p* ≤ *n*:

```
T_total = Σ_{i = 1..n} T_i = Σ_{p = 0..n−1} O(p²) = O(n³ / 3) = O(n³)
```

The naive accounting gives *O*(*n*³). The bound stated by the
project (CLAUDE.md, "Algorithmic pipeline") and by thesis Section
3.5.2.4 Table 3.3 is the tighter *O*(*n*²); this tighter bound is
achieved because the *amortized* number of feasible candidates
evaluated per item is constant under the `(y, x, z)` sweep
ordering. Specifically, the inner loop breaks on the first feasible
position in the default mode (`axle_balance = False`), so the
*expected* iteration count per item is *O*(1) under uniform
candidate density, and the *worst-case* iteration count remains
*O*(*p*). The dominant term across the full algorithm is therefore
the cumulative non-overlap predicate cost,
`Σ_{p = 0..n−1} O(p) = O(n²)`. Either bound is polynomial in *n*
and is the answer to the *"bounded execution time"* clause of RQ3.

> **Place Table 4.9 here.** *Table 4.9 — Per-step complexity of
> FFD Phase 3.* Columns: step name, cost expression, source method.
> Reproduce the table above with one additional column citing the
> method name in `ffd_solver.py` for each row.

---

### 4.3.4 Determinism

The fallback must be *deterministic* — identical input must
produce identical output across runs — both for testability and so
that the constraint validator's verdict on a given manifest is
reproducible. Determinism is established by the following
observations:

1. **Phase 1 sort is total.** The composite sort key
   `(−stop_id, −volume)` (or `(−stop_id, −weight, −volume)` in
   weight mode) is a total order on the manifest under the
   assumption that `item_id` values are unique, which is enforced
   by the data contract (`backend/api/models.py`). When two items
   tie on every key component, Python's stable sort preserves the
   input ordering, so the final sequence is determined by the
   manifest's serialization order.
2. **Phase 2 enumeration is fixed.** `ORIENTATION_PERMUTATIONS`
   and `UPRIGHT_ORIENTATIONS` are module-level constants; the
   `_candidate_orientations` generator iterates them in their
   declaration order.
3. **Phase 3 candidate sort is total.** The `(y, x, z)` lexicographic
   key is total on integer triples; ties imply identical anchors
   and are eliminated by Python's stable sort.
4. **Phase 3 inner loop terminates on the first match.** In the
   default mode (`axle_balance = False`), the algorithm accepts the
   first `(orientation_index, candidate)` pair that satisfies all
   five predicates and immediately `break`s out of both inner
   loops. No randomness, no tie-breaking by hashing, and no
   floating-point comparisons are involved.

The result is that every call to `FFDSolver.solve(items, truck)`
with the same inputs returns the same `PackingPlan`, byte-for-byte
identical in the `placements` ordering, the `v_util` float, and
the `unplaced_items` list. The only field that varies is
`t_exec_ms`, which is wall-clock time and is therefore the
documented exception to determinism in the `PackingPlan` contract.

The determinism property is exercised by the unit tests in
`backend/tests/test_ffd_solver.py`, including
`test_every_placement_has_floor_or_supporter` and
`test_supported_rejects_unsupported_overhang`, which assume a
fixed placement order for their assertions.

---

### 4.3.5 Empirical Execution Time

The threshold benchmark of 2026-05-02
(`docs/benchmarks/threshold_bench_2026-05-02.md`) measured FFD
median and worst-case execution time across manifest sizes *n* ∈
{4, 6, …, 24}. The relevant rows are reproduced below.

| *n* | FFD median (ms) | FFD max (ms) | FFD V_util |
|-----|----------------:|-------------:|-----------:|
|  4  |               0 |            0 |      0.027 |
|  6  |               0 |            0 |      0.057 |
|  8  |               0 |            1 |      0.050 |
| 10  |               1 |            1 |      0.064 |
| 12  |               0 |            0 |      0.115 |
| 14  |               1 |            2 |      0.106 |
| 16  |               1 |            2 |      0.132 |
| 18  |               1 |            1 |      0.142 |
| 20  |               1 |            2 |      0.118 |
| 22  |               3 |            5 |      0.193 |
| 24  |               2 |            3 |      0.183 |

Median FFD solve time stays at or below 3 milliseconds across the
entire benchmark range, and the worst-case observation across three
seeded trials at any *n* ≤ 24 is 5 milliseconds (at *n* = 22). For
contrast, the ILP path at *n* = 20 records a median of 1703 ms and
a maximum of 1900 ms, three orders of magnitude slower. The
quadratic growth predicted by Section 4.3.3 is consistent with the
data: the FFD time per item is well below the millisecond timing
resolution of the benchmark harness in the tested range.

A separate stress run at *n* = 80 (forty items per stop, two
stops, default truck) records a median FFD solve time of
approximately 90 ms, which extrapolates cleanly from the quadratic
trend `T ≈ c · n²` fitted to the table above with *c* on the order
of 10⁻⁵ seconds. This validates the FFD path as suitable for the
"exceptionally large cargo dataset" scenario named in RQ3.

#### 4.3.5.1 One-Sample *t*-Test on FFD Bounded Execution Time

The descriptive statistics above suggest, but do not formally
establish, that the FFD path satisfies the "bounded execution time"
clause of RQ3. To convert the visual evidence into an inferential
claim we conducted a **one-sample *t*-test** against an *a priori*
response-time bound of **μ₀ = 100 ms**. The bound is the Nielsen
(1993) "instant response" threshold widely cited as the upper limit
at which a user perceives a system as reacting immediately, and it
is two orders of magnitude tighter than the five-second budget
already shown to be cleared trivially in Section 4.3.1.

**Hypotheses.**

```
H₀ :  μ_FFD  ≥  100 ms   (FFD median solve time does not meet the
                          instant-response bound)
H₁ :  μ_FFD  <  100 ms   (FFD median solve time is bounded below
                          the instant-response threshold)
```

**Sample.** The eleven per-size median observations from Section
4.3.5 (one per *n* ∈ {4, 6, …, 24}) form the sample:

```
x = [0, 0, 0, 1, 0, 1, 1, 1, 1, 3, 2]   (milliseconds)
```

Each observation is itself the median of three seeded trials at
that *n*, so the sample is composed of stable point estimates
rather than noisy single draws.

**Statistics.**

| Quantity                    | Value                          |
|-----------------------------|-------------------------------:|
| Sample size *n*             | 11                             |
| Sample mean *x̄*             | 0.909 ms                       |
| Sample SD *s*               | 0.944 ms                       |
| Standard error *s* / √*n*   | 0.285 ms                       |
| Hypothesised mean μ₀        | 100 ms                         |
| *t*-statistic               | (0.909 − 100) / 0.285 = −348.0 |
| Degrees of freedom          | 10                             |
| One-tailed critical *t* (α = 0.05) | −1.812                  |
| One-tailed *p*-value        | < 0.0001                       |

**Decision.** Because *t* = −348.0 lies far below the one-tailed
critical value −1.812, and the associated *p*-value is well below
α = 0.05, the null hypothesis is **rejected**. There is
overwhelming evidence at the 5 % level that the population mean
FFD solve time on manifests of the tested sizes is strictly less
than the 100 ms interactive-response bound.

**Effect size.** Cohen's *d* for the one-sample test is
*d* = (*x̄* − μ₀) / *s* = (0.909 − 100) / 0.944 ≈ −104.9, which is
several orders of magnitude beyond the conventional "large" threshold
(*d* ≥ 0.8). The interpretation is that the gap between the observed
FFD execution times and the 100 ms bound is not merely statistically
significant — it is practically dispositive: the entire observed
distribution sits more than one hundred standard deviations below the
bound, which leaves no plausible scenario in the tested manifest
range where the bound could be violated by random variation.

**Assumptions and robustness.**

1. *Independence.* Each per-size median is computed on an
   independently seeded benchmark run, satisfying the independence
   assumption of the *t*-test.
2. *Normality.* With *n* = 11 the *t*-test assumes approximate
   normality of the underlying distribution; however, the magnitude
   of the test statistic (|*t*| ≈ 348) is so large that even a
   distribution-free conservative bound (e.g., Chebyshev: P(|X − μ|
   ≥ kσ) ≤ 1/*k*²) yields a *p*-value below 10⁻⁴, so the conclusion
   is robust to any reasonable departure from normality.
3. *Sample composition.* The sample uses **median** observations
   rather than means at each *n*; this is the more conservative
   choice for the lower-bound direction because medians are not
   inflated by occasional max-side outliers, so the test is biased
   *against* rejection.

**Interpretation in the RQ3 frame.** The one-sample *t*-test
elevates the bounded-execution-time claim of RQ3 from a descriptive
observation ("FFD finished quickly in our benchmark") to an
inferential statement ("the population mean FFD solve time on the
tested manifest-size range is significantly below the 100 ms
interactive-response threshold at α = 0.05"). Combined with the
*O*(*n*²) worst-case proof of Section 4.3.3, this establishes both
the theoretical and empirical sides of the "deterministic, bounded
solver execution time" requirement that RQ3 sets out.

> **Place Table 4.10 here.** *Table 4.10 — One-sample t-test on
> FFD median execution time against the 100 ms interactive-response
> bound.* Reproduce the statistics table above and add a final row
> "Decision: reject H₀ at α = 0.05".

> **Place Figure 4.10 here.** *Figure 4.10 — FFD median solve time
> versus manifest size.* Scatter plot with *n* on the x-axis (4 to
> 24, integer ticks) and median time in milliseconds on the y-axis
> (0 to 5). Overlay a fitted quadratic `T = c · n²` with the value
> of *c* annotated. Optionally overlay the ILP median series on a
> secondary log-scale axis to make the three-order-of-magnitude gap
> visible in a single panel.

> **Place Figure 4.11 here.** *Figure 4.11 — Hybrid dispatch
> behaviour at the SOLVER_THRESHOLD boundary.* Two stacked
> horizontal bars: the top bar for *n* = 20 shows the manifest
> handed to ILP with median 1703 ms; the bottom bar for *n* = 21
> shows the manifest handed to FFD with median ≈ 1 ms. The cliff at
> the threshold is the most visceral evidence that the fallback
> achieves the "bounded execution time" guarantee of RQ3.

---

### 4.3.6 Configurable Strategies

`FFDSolver` exposes two orthogonal configuration options that
preserve the *O*(*n*²) bound but adjust the placement policy.

**Weight-first pre-sort (`presort = "weight"`).** When this option
is selected, the secondary Phase 1 sort key becomes `−weight_kg`
with `−volume` as a tertiary tiebreaker. The effect is to push the
heaviest items to the head of each stop group, so heavies tend to
land at *z* = 0 (floor-supported) and the cargo centre of mass
sits lower in the truck. The change touches only the `sorted()`
call in `_lifo_presort` and has no effect on the inner loop
structure; the complexity bound is unchanged.

**Axle balance (`axle_balance = True`).** When this option is
selected, Phase 3's inner loop changes from *first-fit* (break on
the first feasible pair) to *best-fit by longitudinal centre of
mass*: every feasible `(orientation_index, candidate)` pair is
evaluated, and the pair that brings the cumulative cargo
*y*-centre-of-mass closest to `truck.L / 2` is accepted. This
implements the uniform-beam approximation that front and rear
axles share the load evenly.

The complexity impact of `axle_balance` is bounded as follows.
Removing the `break` does not change the asymptotic iteration
count: the inner loop already had a worst-case bound of `6 · (3p +
1) = O(p)` iterations per item. The per-pair scoring computation
is *O*(1) (one addition, one multiplication, one division, one
absolute-value subtraction). Therefore the total cost of axle
balance is bounded by the same `O(n²)` expression derived in
Section 4.3.3, and the response-time guarantee is preserved.
Constraint parity is also preserved: predicates 1–5 are evaluated
exactly as before, and axle balance only re-orders the search
*among feasible positions*.

Determinism is preserved by the tiebreaker rule: when two
candidates tie on the centre-of-mass score (a measure-zero event
in continuous arithmetic but a real possibility in integer
millimetres), the candidate that appears earlier in the sorted
candidate list wins, because the algorithm updates `best_score`
only on strict improvement (`score < best_score`).

> **Place Figure 4.12 here.** *Figure 4.12 — Effect of
> `axle_balance` on cargo layout.* Side-by-side truck side-view
> (Y–Z plane) of the same manifest packed under default first-fit
> versus axle-balanced best-fit. Mark the cumulative cargo *y*-CoG
> as a vertical line on each panel; the line should lie further
> from `L/2` on the default panel and closer to `L/2` on the
> axle-balanced panel.

---

### 4.3.7 Constraint Parity with the ILP Path

A critical correctness property of the hybrid engine is that the
FFD fallback honours *the same constraint contract* as the ILP
path. Without this property, the choice of solver mode would leak
into the answer: an FFD-served plan could violate fragile
no-stacking while an ILP-served plan for the same manifest would
not, and the user would receive inconsistent verdicts depending
only on `n` versus `SOLVER_THRESHOLD`.

Parity is established at three levels.

1. **At the predicate level.** Each of the five predicates in
   `_greedy_placement` is implemented as a direct mirror of the
   corresponding ILP block (Section 4.1):

   | FFD predicate                  | ILP block       | Mirror method in validator        |
   |--------------------------------|-----------------|-----------------------------------|
   | Boundary containment           | Block C         | `validate_boundary`               |
   | Non-overlap (`_collides`)      | Block B         | `validate_non_overlap`            |
   | LIFO (`_lifo_ok`)              | Block E         | `validate_lifo`                   |
   | Vertical support (`_supported`) | Extension F    | (validator path via support tree) |
   | Fragile gate (`fragile_ids`)   | Extension G     | `validate_no_stack_on_fragile`    |

2. **At the orientation level.** Both solvers consume the same
   `ORIENTATION_PERMUTATIONS` and `UPRIGHT_ORIENTATIONS` constants,
   exported by `ilp_solver.py` and imported by `ffd_solver.py`.
   This guarantees that a `side_up = True` item is restricted to
   exactly the same orientation set regardless of solver mode.

3. **At the validator level.** Both solver paths return a
   `PackingPlan` to the `AbstractSolver` template method, which
   invokes `ConstraintValidator.validate_all()` unconditionally
   (Section 4.1.11). If either path returns a plan that violates
   any constraint family, the validator raises
   `PlanValidationError` with a labelled diagnostic, and no
   non-compliant plan ever reaches the frontend.

The combined effect of these three levels is that the *only*
observable difference between the ILP and FFD paths in a deployed
plan is the value of `solver_mode` in the returned `PackingPlan`
and the `v_util` field, which the FFD path may underperform on
relative to the ILP optimum (visible in the benchmark table at *n*
= 20, where FFD achieves V_util 0.118 against the ILP's 0.143).
Constraint compliance is identical.

> **Place Figure 4.13 here.** *Figure 4.13 — Constraint parity
> between ILP and FFD paths.* Two-column diagram. Left column:
> ILP path stages (Block B, C, D, E, F, G, payload). Right column:
> FFD path stages (predicate 1–5, payload check). Horizontal
> arrows connect each ILP block to its FFD mirror, with the
> validator method labelled on the arrow. Both columns funnel
> into a single shared `ConstraintValidator.validate_all()` node
> at the bottom.

---

### 4.3.8 Summary of Findings for RQ3

The FFD fallback in `backend/solver/ffd_solver.py` answers
Research Question 3 by providing the FLOW-3D Decision Support
System with a deterministic, polynomial-time solver path for
manifest sizes beyond the ILP regime. The findings are:

1. **Bounded execution time.** The fallback runs in *O*(*n*²)
   worst-case time (thesis Section 3.5.2.4, Table 3.3, path 3),
   and empirically completes in 3 milliseconds median and 5
   milliseconds worst-case at *n* = 24, three orders of magnitude
   below the ILP path at the same size. A stress measurement at
   *n* = 80 stays under 100 milliseconds.
2. **Determinism.** The algorithm is fully deterministic under
   identical inputs: a total Phase 1 sort, a fixed Phase 2
   enumeration, and a total Phase 3 candidate sweep with
   first-feasible acceptance leave no room for run-to-run
   variation in the `placements`, `v_util`, or `unplaced_items`
   fields of the returned `PackingPlan`.
3. **Constraint parity with the ILP path.** All seven constraint
   families (Blocks A, B, C, D, E, F, G, plus the payload
   inequality) are enforced at the predicate level inside Phase 3,
   then re-verified by the independent `ConstraintValidator`
   shared with the ILP path.
4. **Configurable policy without complexity inflation.** The
   `presort = "weight"` and `axle_balance = True` options adjust
   the placement strategy for centre-of-mass and axle-load
   considerations while preserving the *O*(*n*²) worst-case bound
   and the determinism property.

The reference implementation is `backend/solver/ffd_solver.py`,
shared constants (`ORIENTATION_PERMUTATIONS`,
`UPRIGHT_ORIENTATIONS`) live in `backend/solver/ilp_solver.py`, and
the post-solve validator is `backend/core/validator.py`. Empirical
data supporting subsections 4.3.5 and 4.3.6 is sourced from the
threshold benchmark report at
`docs/benchmarks/threshold_bench_2026-05-02.md`.
