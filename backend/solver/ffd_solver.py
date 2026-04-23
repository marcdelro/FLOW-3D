# No HTTP imports permitted — CLAUDE.md rule
"""First-Fit Decreasing heuristic fallback.

Route-Sequential FFD (thesis section 3.5.2.2) — used when the manifest
exceeds SOLVER_THRESHOLD. When USE_MOCK_SOLVER is True, solve() returns
the fixture plan from docs/mockPlan.json.
"""

from __future__ import annotations

from typing import List

from api.models import FurnitureItem, PackingPlan, TruckSpec
from settings import USE_MOCK_SOLVER
from solver.base import AbstractSolver


class FFDSolver(AbstractSolver):
    """Deterministic greedy heuristic; O(n^2) worst case.

    Worst-case time complexity: O(n^2) (thesis section 3.5.2.4, path 3).
    """

    def solve(self, items: List[FurnitureItem], truck: TruckSpec) -> PackingPlan:
        if USE_MOCK_SOLVER:
            plan = self.load_mock()
            plan.solver_mode = "FFD"
            return plan
        raise NotImplementedError("Live FFD build pending — see thesis 3.5.2.2")

    def _lifo_presort(self) -> None:
        """Phase 1 — LIFO pre-sort.

        Group items by stop_id, sort groups descending so the final stop
        is processed first, then sort items within each group by volume
        descending. Flatten to produce the placement sequence S.

        Thesis section 3.5.2.2, Phase 1.
        """

    def _greedy_placement(self) -> None:
        """Phase 3 — First-Fit greedy placement loop.

        For each item, walk the candidate coordinate set (ascending y,
        then x, then z) and accept the first coordinate that satisfies
        all four checks:

            1. Boundary containment           (thesis 3.5.2.1 C)
            2. Orientation compliance         (side_up flag)
            3. Non-overlap                    (thesis 3.5.2.1 B)
            4. LIFO spatial boundary          (thesis 3.5.2.1 E)

        Items that fail every candidate are appended to unplaced_items.

        Thesis section 3.5.2.2, Phase 3.
        """
