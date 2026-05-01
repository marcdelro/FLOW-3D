# No HTTP imports permitted — CLAUDE.md rule
"""First-Fit Decreasing heuristic fallback.

Route-Sequential FFD (thesis section 3.5.2.2) — used when the manifest
exceeds SOLVER_THRESHOLD. When USE_MOCK_SOLVER is True, solve() returns
the fixture plan from docs/mockPlan.json.
"""

from __future__ import annotations

import time
from typing import Iterable, List, Tuple

from api.models import FurnitureItem, PackingPlan, Placement, TruckSpec
from settings import USE_MOCK_SOLVER
from solver.base import AbstractSolver
from solver.ilp_solver import ORIENTATION_PERMUTATIONS, UPRIGHT_ORIENTATIONS


class FFDSolver(AbstractSolver):
    """Deterministic greedy heuristic; O(n^2) worst case.

    Worst-case time complexity: O(n^2) (thesis section 3.5.2.4, path 3).

    The `presort` argument selects the secondary sort key inside each
    stop_id group during Phase 1 (thesis 3.5.2.2):
        "volume" — largest items first (default; maximizes early packing density).
        "weight" — heaviest items first (heavies land at z=0, lowering CoG).
    Stop-id ordering is always descending so the LIFO Y-axis layout is preserved.
    """

    def __init__(self, presort: str = "volume") -> None:
        super().__init__()
        if presort not in ("volume", "weight"):
            raise ValueError(f"Unknown FFD presort strategy: {presort!r}")
        self._presort = presort

    def _solve(self, items: List[FurnitureItem], truck: TruckSpec) -> PackingPlan:
        if USE_MOCK_SOLVER:
            plan = self.load_mock()
            plan.solver_mode = "FFD"
            return plan

        t0 = time.perf_counter()
        sequence = self._lifo_presort(items)
        placements, unplaced = self._greedy_placement(sequence, truck)
        t_exec_ms = int((time.perf_counter() - t0) * 1000)

        truck_volume = truck.W * truck.L * truck.H
        items_by_id = {it.item_id: it for it in items}
        packed_volume = sum(
            self._physical_volume(items_by_id[p.item_id]) for p in placements
        )
        return PackingPlan(
            placements=placements,
            v_util=packed_volume / truck_volume,
            t_exec_ms=t_exec_ms,
            solver_mode="FFD",
            unplaced_items=unplaced,
        )

    @staticmethod
    def _physical_volume(item: FurnitureItem) -> int:
        return item.w * item.l * item.h

    def _lifo_presort(self, items: List[FurnitureItem]) -> List[FurnitureItem]:
        """Phase 1 — LIFO pre-sort.

        Group items by stop_id (descending so the final stop is processed
        first), then sort items within each group by either volume or
        weight descending depending on `self._presort`. Flatten to produce
        the placement sequence S.

        Thesis section 3.5.2.2, Phase 1.
        """
        if self._presort == "weight":
            return sorted(
                items,
                key=lambda it: (-it.stop_id, -it.weight_kg, -(it.w * it.l * it.h)),
            )
        return sorted(
            items,
            key=lambda it: (-it.stop_id, -(it.w * it.l * it.h)),
        )

    def _candidate_orientations(self, item: FurnitureItem) -> Iterable[int]:
        """Phase 2 — admissible orientations under the side_up flag.

        Free items try all six permutations from ORIENTATION_PERMUTATIONS;
        rigid items (side_up=True) are restricted to UPRIGHT_ORIENTATIONS,
        i.e. the original h_i stays along the truck z-axis.
        Thesis section 3.5.2.1 (Rigid Orientation).
        """
        if item.side_up:
            return UPRIGHT_ORIENTATIONS
        return range(6)

    @staticmethod
    def _effective_dims(item: FurnitureItem, orientation_index: int) -> Tuple[int, int, int]:
        """Return (w_eff, l_eff, h_eff) for `item` under the given orientation."""
        perm = ORIENTATION_PERMUTATIONS[orientation_index]
        dims = (item.w, item.l, item.h)
        return dims[perm[0]], dims[perm[1]], dims[perm[2]]

    def _greedy_placement(
        self, sequence: List[FurnitureItem], truck: TruckSpec
    ) -> Tuple[List[Placement], List[str]]:
        """Phase 3 — First-Fit greedy placement loop.

        For each item, walk the candidate coordinate set (ascending y,
        then x, then z) and accept the first coordinate that satisfies
        all four checks:

            1. Boundary containment           (thesis 3.5.2.1 C)
            2. Orientation compliance         (side_up flag)
            3. Non-overlap                    (thesis 3.5.2.1 B)
            4. LIFO spatial boundary          (thesis 3.5.2.1 E)

        A running payload counter also enforces
        `sum(weight_kg) <= truck.payload_kg`; items that would breach the
        cap are sent to unplaced_items without attempting any geometry.

        Items that fail every candidate are appended to unplaced_items.

        Thesis section 3.5.2.2, Phase 3.
        """
        placements: List[Placement] = []
        unplaced: List[str] = []
        candidates: List[Tuple[int, int, int]] = [(0, 0, 0)]
        placed_weight: float = 0.0
        weight_cap = truck.payload_kg if truck.payload_kg > 0 else float("inf")

        for item in sequence:
            if placed_weight + item.weight_kg > weight_cap:
                unplaced.append(item.item_id)
                continue

            sorted_candidates = sorted(candidates, key=lambda c: (c[1], c[0], c[2]))
            chosen: Tuple[int, int, int, int, int, int, int] | None = None

            for orientation_index in self._candidate_orientations(item):
                w_eff, l_eff, h_eff = self._effective_dims(item, orientation_index)
                for cx, cy, cz in sorted_candidates:
                    if cx + w_eff > truck.W:
                        continue
                    if cy + l_eff > truck.L:
                        continue
                    if cz + h_eff > truck.H:
                        continue
                    if self._collides(cx, cy, cz, w_eff, l_eff, h_eff, placements):
                        continue
                    if not self._lifo_ok(cy, l_eff, item.stop_id, placements):
                        continue
                    chosen = (cx, cy, cz, w_eff, l_eff, h_eff, orientation_index)
                    break
                if chosen is not None:
                    break

            if chosen is None:
                unplaced.append(item.item_id)
                continue

            cx, cy, cz, w_eff, l_eff, h_eff, orientation_index = chosen
            placements.append(
                Placement(
                    item_id=item.item_id,
                    x=cx,
                    y=cy,
                    z=cz,
                    w=w_eff,
                    l=l_eff,
                    h=h_eff,
                    orientation_index=orientation_index,
                    stop_id=item.stop_id,
                    is_packed=True,
                )
            )
            candidates.extend(
                [(cx + w_eff, cy, cz), (cx, cy + l_eff, cz), (cx, cy, cz + h_eff)]
            )
            placed_weight += item.weight_kg

        return placements, unplaced

    @staticmethod
    def _collides(
        x: int,
        y: int,
        z: int,
        w: int,
        l: int,  # noqa: E741 — l_i matches thesis naming per CLAUDE.md
        h: int,
        placements: List[Placement],
    ) -> bool:
        """Mirror validator.validate_non_overlap for a single trial box."""
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

    @staticmethod
    def _lifo_ok(
        y: int,
        l: int,  # noqa: E741 — l_i matches thesis naming per CLAUDE.md
        stop_id: int,
        placements: List[Placement],
    ) -> bool:
        """Mirror validator.validate_lifo for a single trial box.

            stop_new > p.stop_id  =>  y_new + l_new <= p.y
            p.stop_id > stop_new  =>  p.y + p.l    <= y_new
        """
        for p in placements:
            if stop_id > p.stop_id and y + l > p.y:
                return False
            if p.stop_id > stop_id and p.y + p.l > y:
                return False
        return True
