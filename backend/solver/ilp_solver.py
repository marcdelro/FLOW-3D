# No HTTP imports permitted — CLAUDE.md rule
"""Integer Linear Programming solver (Gurobi Branch-and-Bound).

Implements the exact 3DBPP-SLC formulation from thesis section 3.5.2.1
(A-E) plus Rigid Orientation. When USE_MOCK_SOLVER is True, solve()
returns the fixture plan from docs/mockPlan.json so the frontend and API
layers can be developed and tested without a Gurobi licence.
"""

from __future__ import annotations

import time
from typing import List, Tuple

from api.models import FurnitureItem, PackingPlan, Placement, TruckSpec
from settings import (
    GUROBI_MIP_GAP,
    GUROBI_OUTPUT_FLAG,
    GUROBI_THREADS,
    GUROBI_TIME_LIMIT,
    USE_MOCK_SOLVER,
)
from solver.base import AbstractSolver

# Map orientation_index -> permutation of (w, l, h) assigned to truck axes
# (x-width, y-length, z-height). Indices 0 and 1 keep the original height
# along the z-axis; the remaining four tip the item onto a side or end.
# Matches UPRIGHT_ORIENTATIONS in core.validator.
ORIENTATION_PERMUTATIONS: Tuple[Tuple[int, int, int], ...] = (
    (0, 1, 2),  # 0: (w, l, h)    — upright
    (1, 0, 2),  # 1: (l, w, h)    — upright, 90deg Z
    (0, 2, 1),  # 2: (w, h, l)    — tipped on x-axis
    (2, 1, 0),  # 3: (h, l, w)    — tipped on y-axis
    (1, 2, 0),  # 4: (l, h, w)
    (2, 0, 1),  # 5: (h, w, l)
)
UPRIGHT_ORIENTATIONS: Tuple[int, ...] = (0, 1)


class ILPSolver(AbstractSolver):
    """Exact solver via Gurobi Branch-and-Bound.

    Worst-case time complexity: O(2^n) (thesis section 3.5.2.4, path 2).
    """

    def _solve(self, items: List[FurnitureItem], truck: TruckSpec) -> PackingPlan:
        if USE_MOCK_SOLVER:
            return self.load_mock()

        import gurobipy as gp
        from gurobipy import GRB

        self._items = items
        self._truck = truck
        self._model = gp.Model("flow3d_ilp")
        self._gp = gp
        self._GRB = GRB

        self._apply_gurobi_params()
        self._variable_domains()
        self._orientation()
        self._boundary()
        self._non_overlap()
        self._support()
        self._lifo()
        self._weight()
        self._symmetry_breaking()
        self._objective()

        t0 = time.perf_counter()
        self._model.optimize()
        t_exec_ms = int((time.perf_counter() - t0) * 1000)

        return self._extract_plan(t_exec_ms)

    def _apply_gurobi_params(self) -> None:
        """Push tuning knobs from settings.py onto the Gurobi model.

        Each parameter is only set when the corresponding setting is non-None,
        so leaving an env var blank preserves Gurobi's own default. Quiet
        output by default keeps pytest logs readable; raise GUROBI_OUTPUT_FLAG
        when debugging the model.
        """
        m = self._model
        m.setParam("OutputFlag", GUROBI_OUTPUT_FLAG)
        if GUROBI_TIME_LIMIT is not None:
            m.setParam("TimeLimit", GUROBI_TIME_LIMIT)
        if GUROBI_MIP_GAP is not None:
            m.setParam("MIPGap", GUROBI_MIP_GAP)
        if GUROBI_THREADS is not None:
            m.setParam("Threads", GUROBI_THREADS)

    def _min_effective_dims(self, item: FurnitureItem) -> Tuple[int, int, int]:
        """Lower bounds on (w_eff, l_eff, h_eff) over admissible orientations.

        Used to tighten the upper bounds on x_i, y_i, z_i: a packed item
        cannot start at coordinate `> truck_dim - min_eff_dim`. This is a
        valid Big-M-adjacent tightening because the boundary constraint
        already forces `x_i + w_eff_i <= W`; pushing the bound onto the
        variable itself helps Gurobi presolve and shrinks the LP relaxation.
        """
        admissible = (
            UPRIGHT_ORIENTATIONS if item.side_up else tuple(range(6))
        )
        dims = (item.w, item.l, item.h)
        w_choices = [dims[ORIENTATION_PERMUTATIONS[k][0]] for k in admissible]
        l_choices = [dims[ORIENTATION_PERMUTATIONS[k][1]] for k in admissible]
        h_choices = [dims[ORIENTATION_PERMUTATIONS[k][2]] for k in admissible]
        return min(w_choices), min(l_choices), min(h_choices)

    def _variable_domains(self) -> None:
        """Domain definitions for b_i, s_ij_k, (x_i, y_i, z_i), and o_i,k.

        Thesis section 3.5.2.1 D:
            b_i      in {0, 1}
            s_ij,k   in {0, 1}
            x_i, y_i, z_i >= 0

        Coordinates are integer millimetres to match the JSON placement
        contract in CLAUDE.md. Upper bounds for x_i, y_i, z_i are the
        truck's W, L, H — this tightens the LP relaxation without changing
        the feasible region (boundary constraints already enforce this).

        o_i,k (k in 0..5) are the orientation binaries for Rigid
        Orientation (thesis section 3.5.2.1). Exactly one is active when
        b_i = 1 and all are zero when b_i = 0 — enforced in _orientation().
        """
        GRB = self._GRB
        m = self._model
        n = len(self._items)
        W, L, H = self._truck.W, self._truck.L, self._truck.H

        self._b = m.addVars(n, vtype=GRB.BINARY, name="b")
        # Per-item upper bounds: a packed item cannot start past
        # truck_dim - min_eff_dim. Items that cannot fit at all collapse to
        # ub=0, so Gurobi presolve will fix them as unpackable when feasible.
        x_ubs, y_ubs, z_ubs = [], [], []
        for item in self._items:
            w_min, l_min, h_min = self._min_effective_dims(item)
            x_ubs.append(max(0, W - w_min))
            y_ubs.append(max(0, L - l_min))
            z_ubs.append(max(0, H - h_min))
        self._x = m.addVars(n, vtype=GRB.INTEGER, lb=0, ub=x_ubs, name="x")
        self._y = m.addVars(n, vtype=GRB.INTEGER, lb=0, ub=y_ubs, name="y")
        self._z = m.addVars(n, vtype=GRB.INTEGER, lb=0, ub=z_ubs, name="z")
        self._s = m.addVars(
            [(i, j, k) for i in range(n) for j in range(i + 1, n) for k in range(1, 7)],
            vtype=GRB.BINARY,
            name="s",
        )
        self._o = m.addVars(
            [(i, k) for i in range(n) for k in range(6)],
            vtype=GRB.BINARY,
            name="o",
        )
        # Support disjunction (implementation extension beyond thesis
        # 3.5.2.1 A-E; the thesis introduction cites load-bearing physics
        # but does not formalize a support constraint). floor[i] = 1 iff
        # item i rests on the truck floor; u[i, j] = 1 iff item j directly
        # supports item i (j is below i, z_i = z_j + h_eff_j, and i's xy
        # footprint is fully contained within j's). See _support().
        self._floor = m.addVars(n, vtype=GRB.BINARY, name="floor")
        self._u = m.addVars(
            [(i, j) for i in range(n) for j in range(n) if i != j],
            vtype=GRB.BINARY,
            name="u",
        )

    def _orientation(self) -> None:
        """Rigid Orientation (thesis section 3.5.2.1).

        For each item i:
            sum_k o_i,k = b_i         (exactly one orientation iff packed)
            o_i,k = 0 for k not in UPRIGHT_ORIENTATIONS when side_up = True

        The effective axis-aligned dimensions (w_eff, l_eff, h_eff) are
        derived as linear combinations of o_i,k over the six permutations
        of the item's physical (w, l, h) — see _effective_dims().
        """
        m = self._model
        gp = self._gp

        for i, item in enumerate(self._items):
            m.addConstr(
                gp.quicksum(self._o[i, k] for k in range(6)) == self._b[i],
                name=f"orient_pick_{i}",
            )
            if item.side_up:
                for k in range(6):
                    if k not in UPRIGHT_ORIENTATIONS:
                        m.addConstr(self._o[i, k] == 0, name=f"orient_sideup_{i}_{k}")

    def _effective_dims(self, i: int):
        """Return (w_eff, l_eff, h_eff) as Gurobi linear expressions for item i.

        Each dimension is the sum over orientations of o_i,k weighted by
        the physical dimension that orientation routes to that truck axis.
        When the item is unpacked (all o_i,k = 0) every effective dim is
        zero, which plays correctly with the b_i-scaled boundary RHS.
        """
        gp = self._gp
        dims = (self._items[i].w, self._items[i].l, self._items[i].h)
        w_eff = gp.quicksum(
            dims[ORIENTATION_PERMUTATIONS[k][0]] * self._o[i, k] for k in range(6)
        )
        l_eff = gp.quicksum(
            dims[ORIENTATION_PERMUTATIONS[k][1]] * self._o[i, k] for k in range(6)
        )
        h_eff = gp.quicksum(
            dims[ORIENTATION_PERMUTATIONS[k][2]] * self._o[i, k] for k in range(6)
        )
        return w_eff, l_eff, h_eff

    def _boundary(self) -> None:
        """Containment within truck W x L x H scaled by b_i.

            x_i + w_eff_i <= W * b_i
            y_i + l_eff_i <= L * b_i
            z_i + h_eff_i <= H * b_i

        Thesis section 3.5.2.1 C. Effective dimensions come from the chosen
        orientation; unpacked items collapse to coordinate 0.
        """
        m = self._model
        W, L, H = self._truck.W, self._truck.L, self._truck.H

        for i in range(len(self._items)):
            w_eff, l_eff, h_eff = self._effective_dims(i)
            m.addConstr(self._x[i] + w_eff <= W * self._b[i], name=f"bnd_x_{i}")
            m.addConstr(self._y[i] + l_eff <= L * self._b[i], name=f"bnd_y_{i}")
            m.addConstr(self._z[i] + h_eff <= H * self._b[i], name=f"bnd_z_{i}")

    def _objective(self) -> None:
        """Maximize V_util = sum(v_i * b_i) / (W * L * H).

        Thesis section 3.5.2.1 A. Volume is rotation-invariant so the
        objective depends on b_i only, not on orientation. Normalizing by
        the constant truck volume keeps coefficients in [0, 1] and avoids
        Gurobi's large-coefficient numerical warning.
        """
        gp = self._gp
        GRB = self._GRB

        truck_volume = self._truck.W * self._truck.L * self._truck.H
        coeffs = [(it.w * it.l * it.h) / truck_volume for it in self._items]
        self._model.setObjective(
            gp.quicksum(c * self._b[i] for i, c in enumerate(coeffs)),
            GRB.MAXIMIZE,
        )

    def _non_overlap(self) -> None:
        """Big-M disjunctive separation across 6 spatial planes.

        For each unordered pair (i, j):
            x_i + w_eff_i <= x_j + M_x * (1 - s_ij,1)
            x_j + w_eff_j <= x_i + M_x * (1 - s_ij,2)
            y_i + l_eff_i <= y_j + M_y * (1 - s_ij,3)
            y_j + l_eff_j <= y_i + M_y * (1 - s_ij,4)
            z_i + h_eff_i <= z_j + M_z * (1 - s_ij,5)
            z_j + h_eff_j <= z_i + M_z * (1 - s_ij,6)
            sum(s_ij,k for k=1..6) >= b_i + b_j - 1

        Thesis section 3.5.2.1 B. Axis-specific Big-M = W, L, H are the
        tightest valid constants per axis.
        """
        m = self._model
        W, L, H = self._truck.W, self._truck.L, self._truck.H
        n = len(self._items)
        s = self._s

        effs = [self._effective_dims(i) for i in range(n)]

        for i in range(n):
            w_i, l_i, h_i = effs[i]
            for j in range(i + 1, n):
                w_j, l_j, h_j = effs[j]
                m.addConstr(
                    self._x[i] + w_i <= self._x[j] + W * (1 - s[i, j, 1]),
                    name=f"ov_x1_{i}_{j}",
                )
                m.addConstr(
                    self._x[j] + w_j <= self._x[i] + W * (1 - s[i, j, 2]),
                    name=f"ov_x2_{i}_{j}",
                )
                m.addConstr(
                    self._y[i] + l_i <= self._y[j] + L * (1 - s[i, j, 3]),
                    name=f"ov_y1_{i}_{j}",
                )
                m.addConstr(
                    self._y[j] + l_j <= self._y[i] + L * (1 - s[i, j, 4]),
                    name=f"ov_y2_{i}_{j}",
                )
                m.addConstr(
                    self._z[i] + h_i <= self._z[j] + H * (1 - s[i, j, 5]),
                    name=f"ov_z1_{i}_{j}",
                )
                m.addConstr(
                    self._z[j] + h_j <= self._z[i] + H * (1 - s[i, j, 6]),
                    name=f"ov_z2_{i}_{j}",
                )
                m.addConstr(
                    sum(s[i, j, k] for k in range(1, 7)) >= self._b[i] + self._b[j] - 1,
                    name=f"ov_act_{i}_{j}",
                )

    def _lifo(self) -> None:
        """Route-Sequenced LIFO / Sequential Loading Constraint.

        If stop_i > stop_j then y_i + l_eff_i <= y_j — items for later
        stops sit deeper along the Y-axis (y = 0 is truck rear, y = L is
        loading door per CLAUDE.md). Gated by b_i and b_j:

            y_i + l_eff_i <= y_j + L * (2 - b_i - b_j)

        Thesis section 3.5.2.1 E.
        """
        m = self._model
        L = self._truck.L
        n = len(self._items)

        for i in range(n):
            _, l_i, _ = self._effective_dims(i)
            for j in range(n):
                if i == j:
                    continue
                if self._items[i].stop_id > self._items[j].stop_id:
                    m.addConstr(
                        self._y[i] + l_i
                        <= self._y[j] + L * (2 - self._b[i] - self._b[j]),
                        name=f"lifo_{i}_{j}",
                    )

    def _support(self) -> None:
        """Vertical support / single-supporter disjunction.

        Implementation extension beyond thesis 3.5.2.1 A-E. Full formal
        statement, citations (Bortfeldt & Mack 2007), and defense Q&A
        live in docs/model_extensions.md (Extension F). Update that
        document if this method's constraints change.

        The thesis introduction discusses load-bearing fragility, but
        section 3.5.2.1 formalizes only objective, non-overlap, boundary,
        variable domains, and LIFO. Without this block, nothing in the
        model penalizes items floating mid-air — feasible per the thesis
        constraints, but physically nonsensical.

        For each packed item i, exactly one supporter is chosen:

            floor_i + sum_{j != i} u_{i,j} = b_i

        If floor_i = 1 the item rests on the truck floor (z_i = 0). If
        u_{i,j} = 1, item j directly supports item i, which requires:

            z_i = z_j + h_eff_j               (vertical contact)
            x_i >= x_j                        (xy footprint of i fully
            x_i + w_eff_i <= x_j + w_eff_j     contained within j's)
            y_i >= y_j
            y_i + l_eff_i <= y_j + l_eff_j
            b_j = 1                           (supporter must be packed)

        The "single-supporter" simplification (i rests entirely on one j)
        is the standard Bortfeldt & Mack (2007) approximation — it rules
        out spanning two adjacent boxes but keeps the formulation compact
        (n^2 binaries, O(n^2) constraints, fine in the ILP regime n <= ~20).

        Cycles are impossible: u_{i,j} = 1 forces z_i = z_j + h_eff_j > z_j
        whenever j is packed with non-zero height, so u_{j,i} = 1 would
        force z_j > z_i and contradict.

        Fragile items (item.fragile == True) additionally fix u_{i,j} = 0
        for every i — nothing may rest on a fragile supporter. This honors
        the FurnitureItem.fragile contract ("solver must not stack other
        items on top of this one"). Implementation extension beyond thesis
        3.5.2.1 A-E, motivated by the same load-bearing fragility argument
        that justifies the support disjunction itself.
        """
        m = self._model
        gp = self._gp
        W, L, H = self._truck.W, self._truck.L, self._truck.H
        n = len(self._items)

        effs = [self._effective_dims(i) for i in range(n)]

        for i in range(n):
            # Unique support: floor or exactly one supporter, gated by b_i.
            m.addConstr(
                self._floor[i]
                + gp.quicksum(self._u[i, j] for j in range(n) if j != i)
                == self._b[i],
                name=f"sup_unique_{i}",
            )
            # Floor lock: if floor_i = 1 then z_i = 0.
            m.addConstr(
                self._z[i] <= H * (1 - self._floor[i]),
                name=f"sup_floor_{i}",
            )

            w_i, l_i, h_i = effs[i]
            for j in range(n):
                if j == i:
                    continue
                w_j, l_j, h_j = effs[j]
                u_ij = self._u[i, j]

                # Supporter must be packed.
                m.addConstr(u_ij <= self._b[j], name=f"sup_packed_{i}_{j}")

                # Fragile items refuse to support anything (FurnitureItem.fragile
                # contract). Forcing u_ij = 0 collapses the entire support
                # disjunction onto j for any i, so an item above a fragile j
                # must instead rest on the floor or on a non-fragile supporter.
                if self._items[j].fragile:
                    m.addConstr(u_ij == 0, name=f"sup_fragile_{i}_{j}")

                # Vertical contact: z_i = z_j + h_eff_j when u_ij = 1.
                m.addConstr(
                    self._z[i] - self._z[j] - h_j <= H * (1 - u_ij),
                    name=f"sup_zhi_{i}_{j}",
                )
                m.addConstr(
                    self._z[j] + h_j - self._z[i] <= H * (1 - u_ij),
                    name=f"sup_zlo_{i}_{j}",
                )

                # XY containment: footprint of i ⊆ footprint of j when u_ij = 1.
                m.addConstr(
                    self._x[j] - self._x[i] <= W * (1 - u_ij),
                    name=f"sup_xlo_{i}_{j}",
                )
                m.addConstr(
                    (self._x[i] + w_i) - (self._x[j] + w_j) <= W * (1 - u_ij),
                    name=f"sup_xhi_{i}_{j}",
                )
                m.addConstr(
                    self._y[j] - self._y[i] <= L * (1 - u_ij),
                    name=f"sup_ylo_{i}_{j}",
                )
                m.addConstr(
                    (self._y[i] + l_i) - (self._y[j] + l_j) <= L * (1 - u_ij),
                    name=f"sup_yhi_{i}_{j}",
                )

    def _weight(self) -> None:
        """Truck payload constraint.

            sum(weight_kg_i * b_i) <= payload_kg

        Implementation extension beyond thesis 3.5.2.1 A-E; documented
        alongside the other extensions in docs/model_extensions.md.

        Manifest-level capacity bound on the chosen subset of items. Linear
        in b_i so it adds no integer variables — Gurobi presolve usually
        absorbs it into bound tightening on b. Skipped silently when
        payload_kg <= 0 (interpreted as "no payload limit configured").
        """
        if self._truck.payload_kg <= 0:
            return
        m = self._model
        gp = self._gp
        m.addConstr(
            gp.quicksum(it.weight_kg * self._b[i] for i, it in enumerate(self._items))
            <= self._truck.payload_kg,
            name="payload",
        )

    def _symmetry_breaking(self) -> None:
        """Valid inequalities + symmetry cuts to tighten the LP relaxation.

        Two families, both proven not to cut off any optimal integer solution:

        1. Separation activation linkage (LP-tightening valid inequality):
              s_ij,k <= b_i      and      s_ij,k <= b_j
           A separation indicator is only meaningful when both items are
           packed. The base model already enforces
           `sum_k s_ij,k >= b_i + b_j - 1`, but in the LP relaxation an s
           variable could float to 1 even with b_i = b_j = 0. Capping each
           s by both b's collapses that slack and typically improves the
           root bound by a few percent on dense manifests.

        2. Identical-item lex break (symmetry cut):
              b_i >= b_j   for i < j and items i, j physically identical
           Two items with the same (w, l, h, stop_id, side_up) are
           interchangeable in any feasible solution; forcing the lower
           index to be packed first removes a factorial branch of
           equivalent solutions.

        Skipped enhancements and why:
          - Per-pair Big-M tightening below `M = W` (resp. L, H) is not
            generally valid: the worst-case LHS at the boundary plus the
            worst-case RHS at the origin already saturate the per-axis
            truck dimension. We instead tightened variable upper bounds
            in `_variable_domains()` (see `_min_effective_dims`).
          - Anchor cuts (e.g. fixing the largest item at the origin) are
            *not* added because the LIFO constraint couples placement to
            stop_id, so the largest item's optimal y can be non-zero.
        """
        m = self._model
        n = len(self._items)
        s = self._s
        b = self._b

        # 1) s <= b on both items.
        for i in range(n):
            for j in range(i + 1, n):
                for k in range(1, 7):
                    m.addConstr(s[i, j, k] <= b[i], name=f"sleq_b_{i}_{j}_{k}_i")
                    m.addConstr(s[i, j, k] <= b[j], name=f"sleq_b_{i}_{j}_{k}_j")

        # 2) Identical-item lex break.
        def signature(item: FurnitureItem) -> Tuple[int, int, int, int, bool]:
            return (item.w, item.l, item.h, item.stop_id, item.side_up)

        for i in range(n):
            for j in range(i + 1, n):
                if signature(self._items[i]) == signature(self._items[j]):
                    m.addConstr(b[i] >= b[j], name=f"lexbreak_{i}_{j}")

    def _extract_plan(self, t_exec_ms: int) -> PackingPlan:
        """Convert the solved Gurobi model into a PackingPlan contract.

        The stored (w, l, h) on each Placement are the effective axis-
        aligned dimensions under the chosen orientation, so downstream
        consumers (frontend, validator) can use them directly without
        re-running the permutation logic.
        """
        GRB = self._GRB
        W, L, H = self._truck.W, self._truck.L, self._truck.H

        if self._model.Status != GRB.OPTIMAL:
            return PackingPlan(
                placements=[],
                v_util=0.0,
                t_exec_ms=t_exec_ms,
                solver_mode="ILP",
                unplaced_items=[it.item_id for it in self._items],
            )

        placements: List[Placement] = []
        unplaced: List[str] = []
        packed_volume = 0

        for i, item in enumerate(self._items):
            if self._b[i].X <= 0.5:
                unplaced.append(item.item_id)
                continue
            orientation_index = next(
                k for k in range(6) if self._o[i, k].X > 0.5
            )
            perm = ORIENTATION_PERMUTATIONS[orientation_index]
            dims = (item.w, item.l, item.h)
            w_eff, l_eff, h_eff = dims[perm[0]], dims[perm[1]], dims[perm[2]]
            placements.append(
                Placement(
                    item_id=item.item_id,
                    x=int(round(self._x[i].X)),
                    y=int(round(self._y[i].X)),
                    z=int(round(self._z[i].X)),
                    w=w_eff,
                    l=l_eff,
                    h=h_eff,
                    orientation_index=orientation_index,
                    stop_id=item.stop_id,
                    is_packed=True,
                    model_variant=item.model_variant,
                )
            )
            packed_volume += item.w * item.l * item.h

        return PackingPlan(
            placements=placements,
            v_util=packed_volume / (W * L * H),
            t_exec_ms=t_exec_ms,
            solver_mode="ILP",
            unplaced_items=unplaced,
        )
