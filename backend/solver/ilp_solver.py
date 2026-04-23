# No HTTP imports permitted — CLAUDE.md rule
"""Integer Linear Programming solver (Gurobi Branch-and-Bound).

Implements the exact 3DBPP-SLC formulation from thesis section 3.5.2.1
(A–E). When USE_MOCK_SOLVER is True, solve() returns the fixture plan from
docs/mockPlan.json so the frontend and API layers can be developed and
tested without a Gurobi licence.
"""

from __future__ import annotations

from typing import List

from api.models import FurnitureItem, PackingPlan, TruckSpec
from settings import USE_MOCK_SOLVER
from solver.base import AbstractSolver


class ILPSolver(AbstractSolver):
    """Exact solver via Gurobi Branch-and-Bound.

    Worst-case time complexity: O(2^n) (thesis section 3.5.2.4, path 2).
    """

    def solve(self, items: List[FurnitureItem], truck: TruckSpec) -> PackingPlan:
        if USE_MOCK_SOLVER:
            return self.load_mock()
        raise NotImplementedError("Live Gurobi build pending — see thesis 3.5.2.1")

    def _objective(self) -> None:
        """Maximize V_util = sum(v_i * b_i) / (W * L * H).

        Thesis section 3.5.2.1 A.
        """

    def _non_overlap(self) -> None:
        """Big-M disjunctive separation across 6 spatial planes.

        For each unordered pair (i, j):
            x_i + w_i <= x_j + M*(1 - s_ij1)
            x_j + w_j <= x_i + M*(1 - s_ij2)
            y_i + l_i <= y_j + M*(1 - s_ij3)
            y_j + l_j <= y_i + M*(1 - s_ij4)
            z_i + h_i <= z_j + M*(1 - s_ij5)
            z_j + h_j <= z_i + M*(1 - s_ij6)
            sum(s_ij_k for k=1..6) >= b_i + b_j - 1

        Thesis section 3.5.2.1 B.
        """

    def _boundary(self) -> None:
        """Containment within truck W x L x H scaled by b_i.

            x_i + w_i <= W * b_i
            y_i + l_i <= L * b_i
            z_i + h_i <= H * b_i

        Thesis section 3.5.2.1 C.
        """

    def _variable_domains(self) -> None:
        """Domain definitions for b_i, s_ij_k, and (x_i, y_i, z_i).

        Thesis section 3.5.2.1 D.
        """

    def _lifo(self) -> None:
        """Route-Sequenced LIFO / Sequential Loading Constraint.

        If stop_i > stop_j then y_i + l_i <= y_j — items destined for later
        stops sit deeper along the Y-axis.

        Thesis section 3.5.2.1 E.
        """
