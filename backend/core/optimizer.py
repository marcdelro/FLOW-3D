"""Hybrid ILP/FFD dispatcher (thesis section 3.5.2.3).

OptimizationEngine.optimize() counts the manifest, routes to the correct
solver based on SOLVER_THRESHOLD, then runs ConstraintValidator on the
returned plan.
"""

from __future__ import annotations

from typing import List

from api.models import FurnitureItem, PackingPlan, TruckSpec
from core.validator import ConstraintValidator
from settings import SOLVER_THRESHOLD
from solver.ffd_solver import FFDSolver
from solver.ilp_solver import ILPSolver


class OptimizationEngine:
    """Decision controller that picks the active solver per manifest size."""

    def __init__(self) -> None:
        self.threshold: int = SOLVER_THRESHOLD
        self.validator: ConstraintValidator = ConstraintValidator()
        self._ilp: ILPSolver = ILPSolver()
        self._ffd: FFDSolver = FFDSolver()

    def get_active_algorithm(self, n: int) -> str:
        """Return 'ILP' if n <= threshold, else 'FFD' (thesis 3.5.2.3)."""
        return "ILP" if n <= self.threshold else "FFD"

    def optimize(
        self, items: List[FurnitureItem], truck: TruckSpec
    ) -> PackingPlan:
        mode = self.get_active_algorithm(len(items))
        solver = self._ilp if mode == "ILP" else self._ffd
        plan = solver.solve(items, truck)
        self.validator.validate_all(plan, truck)
        return plan
