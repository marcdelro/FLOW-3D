# No HTTP imports permitted — CLAUDE.md rule
"""Baseline solver — naive first-fit with no LIFO and no orientation.

This is the thesis comparison baseline. It exists so that V_util and
success_rate from the real solvers (ILP / FFD) can be quoted against a
deliberately dumb counterfactual: "what would a packer that does *none*
of the route-aware tricks recover?". Use cases:

  * Defence panel — quantify what FFD's LIFO pre-sort and Extension F
    vertical-support add over a plain first-fit.
  * RQ1 / RQ2 chapters — pair each strategy plan with the baseline so the
    delta is reported explicitly.
  * Operations — when a manifest fails to pack under any strategy, the
    baseline shows whether it is geometrically impossible (baseline also
    leaves items unplaced) or merely route-constrained (baseline packs it
    but violates LIFO).

The baseline deliberately omits:

  * Phase 1 LIFO pre-sort (uses the raw input order).
  * Phase 2 orientation enumeration (orientation_index forced to 0).
  * Vertical support (Extension F) — items may float at z > 0 if a free
    corner exists.
  * Fragile no-stacking (Extension G) — fragile items can be stacked on.
  * Axle balance scoring.
  * Weight payload check (still respected, so the baseline cannot
    physically overload the truck — that constraint is a regulatory
    invariant, not a route-aware optimisation).

What it *does* enforce, because they are geometric invariants without
which the plan is not a packing plan at all:

  * Boundary containment (thesis 3.5.2.1 C) — items fit inside W×L×H.
  * Non-overlap (thesis 3.5.2.1 B) — items do not collide.

The post-solve ConstraintValidator is therefore configured to allow this
solver to violate LIFO / support / fragile, but not boundary / overlap.
That selective enforcement is handled by validate_baseline() rather than
validate_all().
"""

from __future__ import annotations

import time
from typing import List, Tuple

from api.models import FurnitureItem, PackingPlan, Placement, TruckSpec
from solver.base import AbstractSolver


class BaselineSolver(AbstractSolver):
    """Naive first-fit baseline for thesis comparison.

    Worst-case time complexity: O(n²) — same nested-loop structure as FFD
    minus the orientation and support inner work, so in practice it is
    faster than FFD on the same manifest.

    Does NOT call ConstraintValidator.validate_all() in the template
    method, because the baseline by design ignores LIFO / support /
    fragile. The boundary and overlap predicates are enforced inline in
    `_greedy_placement()` so the produced plan is still geometrically
    valid.
    """

    def solve(self, items: List[FurnitureItem], truck: TruckSpec) -> PackingPlan:
        """Skip validate_all() but still populate success_rate.

        The default AbstractSolver.solve() template method runs
        ConstraintValidator.first_failing_check() which would reject the
        baseline plan on the very first LIFO violation. We replicate the
        success_rate population step and rely on the inline boundary +
        overlap guards in `_greedy_placement()` for safety.
        """
        plan = self._solve(items, truck)
        n_items = len(items)
        if n_items > 0:
            plan.success_rate = (n_items - len(plan.unplaced_items)) / n_items
        return plan

    def _solve(self, items: List[FurnitureItem], truck: TruckSpec) -> PackingPlan:
        t0 = time.perf_counter()
        placements, unplaced = self._greedy_placement(items, truck)
        t_exec_ms = int((time.perf_counter() - t0) * 1000)

        truck_volume = truck.W * truck.L * truck.H
        items_by_id = {it.item_id: it for it in items}
        packed_volume = sum(
            items_by_id[p.item_id].w
            * items_by_id[p.item_id].l
            * items_by_id[p.item_id].h
            for p in placements
        )
        return PackingPlan(
            placements=placements,
            v_util=packed_volume / truck_volume if truck_volume > 0 else 0.0,
            t_exec_ms=t_exec_ms,
            solver_mode="BASELINE",
            unplaced_items=unplaced,
        )

    def _greedy_placement(
        self, items: List[FurnitureItem], truck: TruckSpec
    ) -> Tuple[List[Placement], List[str]]:
        """Place each item at the first feasible (x, y, z) anchor in input order.

        The candidate set grows in the same way as FFD — three new anchors
        from the right/front/top of each accepted placement — but
        candidates are sorted by (z, y, x) instead of (y, x, z) so the
        baseline does NOT preferentially sweep deep-y first (which would
        accidentally reproduce part of LIFO's effect).
        """
        placements: List[Placement] = []
        unplaced: List[str] = []
        candidates: List[Tuple[int, int, int]] = [(0, 0, 0)]
        placed_weight: float = 0.0
        weight_cap = truck.payload_kg if truck.payload_kg > 0 else float("inf")

        for item in items:
            if placed_weight + item.weight_kg > weight_cap:
                unplaced.append(item.item_id)
                continue

            # Sort by (z, y, x) — floor first, then sweep length, then
            # width. Deliberately different from FFD's (y, x, z) so the
            # baseline does not accidentally inherit LIFO's deep-y bias.
            sorted_candidates = sorted(candidates, key=lambda c: (c[2], c[1], c[0]))
            chosen: Tuple[int, int, int] | None = None
            w, l, h = item.w, item.l, item.h  # noqa: E741 — l_i matches thesis naming per CLAUDE.md; orientation_index always 0
            for cx, cy, cz in sorted_candidates:
                if cx + w > truck.W or cy + l > truck.L or cz + h > truck.H:
                    continue
                if self._collides(cx, cy, cz, w, l, h, placements):
                    continue
                chosen = (cx, cy, cz)
                break

            if chosen is None:
                unplaced.append(item.item_id)
                continue

            cx, cy, cz = chosen
            placements.append(
                Placement(
                    item_id=item.item_id,
                    x=cx,
                    y=cy,
                    z=cz,
                    w=w,
                    l=l,
                    h=h,
                    orientation_index=0,
                    stop_id=item.stop_id,
                    is_packed=True,
                    model_variant=item.model_variant,
                )
            )
            candidates.extend(
                [(cx + w, cy, cz), (cx, cy + l, cz), (cx, cy, cz + h)]
            )
            placed_weight += item.weight_kg

        return placements, unplaced

    @staticmethod
    def _collides(
        x: int,
        y: int,
        z: int,
        w: int,
        l: int,  # noqa: E741
        h: int,
        placements: List[Placement],
    ) -> bool:
        for p in placements:
            if (
                x + w <= p.x
                or p.x + p.w <= x
                or y + l <= p.y
                or p.y + p.l <= y
                or z + h <= p.z
                or p.z + p.h <= z
            ):
                continue
            return True
        return False
