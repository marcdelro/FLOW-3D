"""Hybrid ILP/FFD dispatcher (thesis section 3.5.2.3) with DSS strategy layer.

OptimizationEngine.optimize() routes a manifest through one of three
decision-support strategies, each with a distinct objective trade-off:

    optimal   — exact ILP (Gurobi Branch-and-Bound) when available and
                n <= SOLVER_THRESHOLD; falls back to volume-desc FFD otherwise.
                Maximizes V_util.
    balanced  — volume-desc FFD always. Fast, deterministic, predictable.
    stability — weight-desc FFD always. Heavy items placed first → lower
                center of gravity, reducing transit shifting damage.

The post-solve `ConstraintValidator` run is performed inside
`AbstractSolver.solve()` itself (template method), so a solver cannot
return an unchecked plan to this layer.

When gurobipy is not installed or no valid licence is present, the
"optimal" strategy auto-degrades to volume-desc FFD for all manifest
sizes so the system stays operational without a Gurobi licence.
"""

from __future__ import annotations

import logging
from typing import Dict, List

from api.models import FurnitureItem, PackingPlan, SolveStrategy, TruckSpec
from settings import SOLVER_THRESHOLD
from solver.ffd_solver import FFDSolver
from solver.ilp_solver import ILPSolver

_log = logging.getLogger(__name__)

try:
    import gurobipy  # noqa: F401
    _GUROBI_AVAILABLE = True
except Exception:
    _GUROBI_AVAILABLE = False
    _log.warning("gurobipy unavailable — ILP path disabled, all manifests use FFD")


STRATEGY_RATIONALES: Dict[SolveStrategy, str] = {
    "optimal": (
        "Maximum volumetric utilization via exact ILP. Choose this plan when "
        "minimizing trips and fuel cost matters most — the solver provably "
        "finds the densest LIFO-feasible packing for the given manifest."
    ),
    "balanced": (
        "Fast deterministic FFD with volume-descending presort. Choose this "
        "plan when solve speed matters or when you want a predictable, "
        "repeatable layout for the same route on different days."
    ),
    "stability": (
        "FFD with weight-descending presort — heavy items go in first and "
        "settle at the bottom of the load. Choose this plan for fragile "
        "cargo, rough roads, or long highway transit where a low center of "
        "gravity reduces shifting damage."
    ),
}


class OptimizationEngine:
    """Decision controller that picks the active solver per strategy."""

    def __init__(self) -> None:
        self.threshold: int = SOLVER_THRESHOLD
        self._ilp: ILPSolver = ILPSolver()
        self._ffd_volume: FFDSolver = FFDSolver(presort="volume")
        self._ffd_weight: FFDSolver = FFDSolver(presort="weight")

    def get_active_algorithm(self, n: int) -> str:
        """Return 'ILP' if Gurobi is available and n <= threshold, else 'FFD' (thesis 3.5.2.3)."""
        if _GUROBI_AVAILABLE and n <= self.threshold:
            return "ILP"
        return "FFD"

    def optimize(
        self,
        items: List[FurnitureItem],
        truck: TruckSpec,
        strategy: SolveStrategy = "optimal",
    ) -> PackingPlan:
        if strategy == "stability":
            plan = self._ffd_weight.solve(items, truck)
        elif strategy == "balanced":
            plan = self._ffd_volume.solve(items, truck)
        else:  # "optimal"
            mode = self.get_active_algorithm(len(items))
            if mode == "ILP":
                try:
                    plan = self._ilp.solve(items, truck)
                except Exception as exc:
                    _log.warning("ILP solver failed (%s) — falling back to FFD", exc)
                    plan = self._ffd_volume.solve(items, truck)
            else:
                plan = self._ffd_volume.solve(items, truck)

        plan.strategy = strategy
        plan.rationale = STRATEGY_RATIONALES[strategy]
        return plan
