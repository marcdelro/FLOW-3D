# No HTTP imports permitted in this module — CLAUDE.md module separation rule
# Cross-platform: use pathlib.Path for all file I/O in this module
"""Abstract solver base class.

Concrete solvers (ILPSolver, FFDSolver) extend this and override `_solve()`.
The public `solve()` is a template method: it runs the subclass solver, then
auto-invokes `ConstraintValidator.validate_all()` and raises
`PlanValidationError` if the produced plan violates any thesis 3.5.2.1
constraint. This is the post-solve safety net — solvers cannot ship an
unchecked plan to the API layer.

`load_mock()` reads docs/mockPlan.json via pathlib so the same code runs on
Windows and macOS without change.
"""

from __future__ import annotations

import json
from abc import ABC, abstractmethod
from typing import List

from api.models import FurnitureItem, PackingPlan, TruckSpec
from core.validator import ConstraintValidator, PlanValidationError
from settings import MOCK_PLAN_PATH


class AbstractSolver(ABC):
    """Contract every solver implementation must satisfy."""

    def __init__(self) -> None:
        self._validator: ConstraintValidator = ConstraintValidator()

    def solve(self, items: List[FurnitureItem], truck: TruckSpec) -> PackingPlan:
        """Run the subclass solver, then validate the plan before returning.

        Template method (CLAUDE.md module separation rule: solvers may call
        the validator but never embed it). Subclasses implement `_solve()`;
        this wrapper enforces the safety net so every PackingPlan handed
        back to `OptimizationEngine` has already cleared all four checks
        from thesis section 3.5.2.1 (B, C, E, and Rigid Orientation).
        """
        plan = self._solve(items, truck)
        # Populate success_rate uniformly so every solver mode reports the
        # same metric — share of input items the plan actually packed. The
        # unplaced_items list is the authoritative source; we do not trust
        # the placements list alone because a plan could in principle hold
        # both a placement and an unplaced entry for the same item_id.
        n_items = len(items)
        if n_items > 0:
            plan.success_rate = (n_items - len(plan.unplaced_items)) / n_items
        failed = self._validator.first_failing_check(plan, truck, items)
        if failed is not None:
            raise PlanValidationError(plan, truck, failed)
        return plan

    @abstractmethod
    def _solve(self, items: List[FurnitureItem], truck: TruckSpec) -> PackingPlan:
        """Produce a PackingPlan for the given manifest and truck."""

    def load_mock(self) -> PackingPlan:
        """Load mockPlan.json using pathlib — works on Windows and macOS."""
        with open(MOCK_PLAN_PATH, encoding="utf-8") as f:
            return PackingPlan(**json.load(f))
