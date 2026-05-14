"""Hybrid ILP/FFD dispatcher (thesis section 3.5.2.3) with DSS strategy layer.

OptimizationEngine.optimize() routes a manifest through one of three
decision-support strategies, each with a distinct objective trade-off:

    optimal       — exact ILP (Gurobi Branch-and-Bound) when available and
                    n <= SOLVER_THRESHOLD; falls back to volume-desc FFD
                    otherwise. Maximises V_util.
    axle_balance  — FFD with axle-aware position picker. Among LIFO-feasible
                    candidate positions, picks the one that brings the cargo
                    longitudinal centre-of-mass closest to truck.L / 2 so
                    front and rear axles share load evenly. Defensible
                    against LTO axle-weight regulations.
    stability     — weight-desc FFD. Heavy items placed first land at z=0
                    and lower the vertical centre of gravity, reducing
                    transit shifting damage.

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
from solver.baseline_solver import BaselineSolver
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
    "axle_balance": (
        "FFD with axle-aware best-fit placement — distributes mass along the "
        "cargo bay so front and rear axles share load evenly. Choose this "
        "plan to keep individual-axle weight within LTO regulatory limits "
        "and reduce drive-axle wear on long runs."
    ),
    "stability": (
        "FFD with weight-descending presort — heavy items go in first and "
        "settle at the bottom of the load. Choose this plan for fragile "
        "cargo, rough roads, or long highway transit where a low center of "
        "gravity reduces shifting damage."
    ),
    "baseline": (
        "Naive first-fit baseline — places items in input order at the "
        "first geometrically feasible position, ignoring LIFO, vertical "
        "support, fragile no-stacking and orientation. Shown for comparison "
        "only: the gap in V_util and success rate between this plan and "
        "the Optimal / Axle Balance / Stability plans quantifies what the "
        "route-aware solvers actually contribute."
    ),
}


class OptimizationEngine:
    """Decision controller that picks the active solver per strategy."""

    def __init__(self) -> None:
        self.threshold: int = SOLVER_THRESHOLD
        self._ilp: ILPSolver = ILPSolver()
        # Volume-desc FFD is the Optimal-strategy fallback when n > threshold
        # or when Gurobi is unavailable. It is NOT exposed as its own DSS
        # strategy any more — Axle Balance replaced that role.
        self._ffd_volume: FFDSolver = FFDSolver(presort="volume")
        self._ffd_axle: FFDSolver = FFDSolver(
            presort="weight", axle_balance=True
        )
        self._ffd_weight: FFDSolver = FFDSolver(presort="weight")
        self._baseline: BaselineSolver = BaselineSolver()

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
        elif strategy == "axle_balance":
            plan = self._ffd_axle.solve(items, truck)
        elif strategy == "baseline":
            plan = self._baseline.solve(items, truck)
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
