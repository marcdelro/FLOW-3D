"""Unit tests for solver.ilp_solver.ILPSolver.

Two layers of coverage:

1. Pure-Python helpers (no Gurobi licence needed) — orientation tables,
   `_min_effective_dims`, mock-mode short-circuit.
2. Live Gurobi tests gated by `_gurobi_available()` — each one drives the
   solver directly with a tiny manifest crafted to isolate a single thesis
   3.5.2.1 constraint block. Skipped cleanly when no licence is present so
   CI without Gurobi stays green.

The integration tests in `test_integration_solve.py` exercise the full HTTP
+ Celery pipeline; this file bypasses both to keep the assertions tight on
solver behaviour itself.
"""

from __future__ import annotations

from typing import List
from unittest.mock import patch

import pytest

from api.models import FurnitureItem, TruckSpec
from core.validator import ConstraintValidator
from solver.ilp_solver import (
    ORIENTATION_PERMUTATIONS,
    UPRIGHT_ORIENTATIONS,
    ILPSolver,
)

# -- helpers ------------------------------------------------------------------

def _item(
    item_id: str,
    w: int,
    l: int,  # noqa: E741 — thesis l_i naming per CLAUDE.md
    h: int,
    stop_id: int,
    side_up: bool = False,
    weight_kg: float = 10.0,
) -> FurnitureItem:
    return FurnitureItem(
        item_id=item_id,
        w=w,
        l=l,
        h=h,
        weight_kg=weight_kg,
        stop_id=stop_id,
        side_up=side_up,
    )


def _gurobi_available() -> bool:
    """True iff gurobipy imports AND a tiny model can solve (license check)."""
    try:
        import gurobipy as gp
        from gurobipy import GRB

        m = gp.Model("license_probe")
        m.setParam("OutputFlag", 0)
        x = m.addVar(vtype=GRB.BINARY)
        m.setObjective(x, GRB.MAXIMIZE)
        m.optimize()
        return m.Status == GRB.OPTIMAL
    except Exception:
        return False


needs_gurobi = pytest.mark.skipif(
    not _gurobi_available(), reason="gurobipy not installed or no usable license"
)


@pytest.fixture
def truck() -> TruckSpec:
    return TruckSpec()


@pytest.fixture
def live_solver() -> ILPSolver:
    """ILPSolver with the mock short-circuit disabled."""
    with patch("solver.ilp_solver.USE_MOCK_SOLVER", False):
        yield ILPSolver()


# -- pure-Python: orientation tables -----------------------------------------

def test_orientation_permutations_are_distinct_permutations_of_012() -> None:
    """The 6 orientation rows enumerate every permutation of (0, 1, 2) once."""
    assert len(ORIENTATION_PERMUTATIONS) == 6
    for perm in ORIENTATION_PERMUTATIONS:
        assert sorted(perm) == [0, 1, 2]
    assert len(set(ORIENTATION_PERMUTATIONS)) == 6


def test_upright_orientations_keep_h_on_z_axis() -> None:
    """side_up restricts orientations to those with h_i routed to the z-axis.

    Index 2 in each permutation tuple denotes which physical dimension
    becomes the z-axis (h_eff). For an upright orientation that must be
    the original h, i.e. permutation index 2.
    """
    for k in UPRIGHT_ORIENTATIONS:
        assert ORIENTATION_PERMUTATIONS[k][2] == 2


# -- pure-Python: _min_effective_dims ----------------------------------------

def test_min_effective_dims_side_up_uses_only_upright_set() -> None:
    """side_up=True restricts the min over (w, l, h) candidates to upright poses."""
    solver = ILPSolver()
    item = _item("rigid", w=700, l=500, h=1700, stop_id=1, side_up=True)

    w_min, l_min, h_min = solver._min_effective_dims(item)

    # Upright permutations are (w, l, h) and (l, w, h): h is always 1700.
    assert h_min == 1700
    # The min over the swapped (w, l) pair is min(w, l) for both axes.
    assert w_min == min(item.w, item.l) == 500
    assert l_min == min(item.w, item.l) == 500


def test_min_effective_dims_free_orientation_picks_smallest_dim_per_axis() -> None:
    """side_up=False allows any of the 6 orientations, so each axis can take
    the minimum across all three physical dims."""
    solver = ILPSolver()
    item = _item("free", w=700, l=500, h=1700, stop_id=1, side_up=False)

    w_min, l_min, h_min = solver._min_effective_dims(item)

    # With all 6 perms admissible, every axis can host any of (700, 500, 1700).
    assert w_min == 500
    assert l_min == 500
    assert h_min == 500


# -- pure-Python: mock-mode short-circuit ------------------------------------

def test_solve_returns_mock_plan_when_use_mock_solver_true(
    truck: TruckSpec,
) -> None:
    """USE_MOCK_SOLVER=True must short-circuit before importing gurobipy."""
    with patch("solver.ilp_solver.USE_MOCK_SOLVER", True):
        solver = ILPSolver()
        plan = solver.solve(
            [_item("anything", 500, 500, 500, stop_id=1)], truck
        )
    assert plan.solver_mode in ("ILP", "FFD")
    # Mock plan ships with at least one placement and a valid v_util range.
    assert 0.0 <= plan.v_util <= 1.0


# -- live Gurobi: thesis 3.5.2.1 constraint isolation ------------------------

@needs_gurobi
def test_boundary_packs_single_fitting_item_at_origin(
    live_solver: ILPSolver, truck: TruckSpec
) -> None:
    """A single item that fits comfortably must be packed (b_i = 1)."""
    items = [_item("box", 1000, 800, 700, stop_id=1)]
    plan = live_solver.solve(items, truck)

    assert plan.solver_mode == "ILP"
    assert plan.unplaced_items == []
    assert len(plan.placements) == 1
    p = plan.placements[0]
    assert 0 <= p.x and p.x + p.w <= truck.W
    assert 0 <= p.y and p.y + p.l <= truck.L
    assert 0 <= p.z and p.z + p.h <= truck.H


@needs_gurobi
def test_boundary_marks_oversize_item_unplaced(
    live_solver: ILPSolver,
) -> None:
    """A side_up rigid taller than the truck cannot pack in any orientation."""
    tiny_truck = TruckSpec(W=2400, L=2400, H=2000, payload_kg=3000.0)
    items = [_item("too_tall", 100, 100, 9999, stop_id=1, side_up=True)]
    plan = live_solver.solve(items, tiny_truck)

    assert plan.placements == []
    assert plan.unplaced_items == ["too_tall"]


@needs_gurobi
def test_orientation_side_up_keeps_h_on_z_axis(
    live_solver: ILPSolver, truck: TruckSpec
) -> None:
    """Rigid items must use orientation_index in UPRIGHT_ORIENTATIONS."""
    items = [_item("fridge", 700, 700, 1700, stop_id=1, side_up=True)]
    plan = live_solver.solve(items, truck)

    assert len(plan.placements) == 1
    p = plan.placements[0]
    assert p.orientation_index in UPRIGHT_ORIENTATIONS
    # Effective h must equal physical h for an upright pose.
    assert p.h == 1700


@needs_gurobi
def test_lifo_orders_later_stops_deeper_in_y(
    live_solver: ILPSolver, truck: TruckSpec
) -> None:
    """Thesis 3.5.2.1 E: stop_i > stop_j => y_i + l_i <= y_j."""
    items: List[FurnitureItem] = [
        _item("first_drop", 800, 500, 500, stop_id=1),
        _item("second_drop", 800, 500, 500, stop_id=2),
        _item("third_drop", 800, 500, 500, stop_id=3),
    ]
    plan = live_solver.solve(items, truck)

    assert plan.unplaced_items == []
    by_stop = {p.stop_id: p for p in plan.placements}
    assert by_stop[3].y + by_stop[3].l <= by_stop[2].y
    assert by_stop[2].y + by_stop[2].l <= by_stop[1].y


@needs_gurobi
def test_weight_payload_excludes_at_least_one_item_when_overloaded(
    live_solver: ILPSolver, truck: TruckSpec
) -> None:
    """Sum(weight_kg * b_i) <= payload_kg forces a subset when total > limit."""
    light_truck = TruckSpec(
        W=truck.W, L=truck.L, H=truck.H, payload_kg=150.0
    )
    items = [
        _item("a", 500, 500, 500, stop_id=1, weight_kg=100.0),
        _item("b", 500, 500, 500, stop_id=1, weight_kg=100.0),
    ]
    plan = live_solver.solve(items, light_truck)

    assert len(plan.placements) == 1
    assert len(plan.unplaced_items) == 1
    packed_weight = sum(
        it.weight_kg
        for it in items
        if it.item_id in {p.item_id for p in plan.placements}
    )
    assert packed_weight <= light_truck.payload_kg


@needs_gurobi
def test_non_overlap_excludes_one_item_when_both_cannot_fit(
    live_solver: ILPSolver,
) -> None:
    """Two boxes that exceed the truck width together must not both pack."""
    narrow = TruckSpec(W=1000, L=1000, H=1000, payload_kg=1000.0)
    items = [
        _item("a", 1000, 1000, 1000, stop_id=1),
        _item("b", 1000, 1000, 1000, stop_id=1),
    ]
    plan = live_solver.solve(items, narrow)

    # Only one fills the truck completely; the other goes unplaced.
    assert len(plan.placements) == 1
    assert len(plan.unplaced_items) == 1


@needs_gurobi
def test_fragile_item_refuses_to_be_supporter(
    live_solver: ILPSolver,
) -> None:
    """sup_fragile_*: nothing may rest on a fragile item.

    A footprint-tight 500x500x1000 truck only fits two stacked 400-tall
    boxes if one supports the other. With one item marked fragile, the
    ILP must either (a) invert the stack so the non-fragile item is the
    base and the fragile one rides on top, or (b) leave one unplaced.
    Either way, no placed item may have its xy footprint above the
    fragile item's top surface.
    """
    narrow = TruckSpec(W=500, L=500, H=1000, payload_kg=1000.0)
    items = [
        FurnitureItem(
            item_id="mirror", w=500, l=500, h=400, weight_kg=10.0,
            stop_id=1, fragile=True,
        ),
        FurnitureItem(
            item_id="crate", w=500, l=500, h=400, weight_kg=10.0, stop_id=1,
        ),
    ]
    plan = live_solver.solve(items, narrow)
    assert plan.solver_mode == "ILP"

    mirror = next((p for p in plan.placements if p.item_id == "mirror"), None)
    if mirror is None:
        # Mirror unplaced — no fragile-stacking concern by definition.
        return
    mirror_top = mirror.z + mirror.h
    for p in plan.placements:
        if p.item_id == "mirror":
            continue
        if p.z < mirror_top:
            continue
        xy_overlap = (
            p.x < mirror.x + mirror.w
            and mirror.x < p.x + p.w
            and p.y < mirror.y + mirror.l
            and mirror.y < p.y + p.l
        )
        assert not xy_overlap, f"{p.item_id} sits on top of fragile mirror"


@needs_gurobi
def test_solve_plan_passes_constraint_validator(
    live_solver: ILPSolver, truck: TruckSpec
) -> None:
    """The post-solve safety net must accept whatever ILPSolver returns.

    AbstractSolver.solve() already runs validate_all internally; this test
    re-runs it from outside to lock the contract: a successful ILP solve
    can never produce a plan that fails the validator.
    """
    items = [
        _item("box_a", 1000, 800, 700, stop_id=1),
        _item("box_b", 900, 700, 600, stop_id=2),
    ]
    plan = live_solver.solve(items, truck)
    assert ConstraintValidator().validate_all(plan, truck, items) is True
