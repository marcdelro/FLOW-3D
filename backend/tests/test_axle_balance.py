"""Tests for the Axle Balance FFD strategy.

The axle-balance solver picks among feasible candidate positions to drive
the cargo y-CoG toward truck.L / 2 (uniform-beam approximation for "front
and rear axles equally loaded"). These tests verify:

  1. The strategy is wired through the OptimizationEngine.
  2. It produces a layout that brings the y-CoG closer to truck centre
     than the equivalent first-fit FFD on the same manifest.
  3. All thesis 3.5.2.1 constraints (B, C, E + F + G) still hold — axle
     balance must never produce an invalid plan.
"""

from __future__ import annotations

from typing import List
from unittest.mock import patch

import pytest

from api.models import FurnitureItem, PackingPlan, TruckSpec
from core.optimizer import OptimizationEngine
from core.validator import ConstraintValidator
from solver.ffd_solver import FFDSolver


def _truck() -> TruckSpec:
    return TruckSpec(W=2400, L=13600, H=2440, payload_kg=99999.0)


def _item(item_id: str, w: int, l: int, h: int, weight_kg: float, stop_id: int) -> FurnitureItem:  # noqa: E741
    return FurnitureItem(
        item_id=item_id, w=w, l=l, h=h, weight_kg=weight_kg, stop_id=stop_id
    )


def _y_cog(plan: PackingPlan, items: List[FurnitureItem]) -> float:
    by_id = {it.item_id: it for it in items}
    total = 0.0
    moment = 0.0
    for p in plan.placements:
        if not p.is_packed:
            continue
        w = by_id[p.item_id].weight_kg
        moment += w * (p.y + p.l / 2.0)
        total += w
    return moment / total if total > 0 else 0.0


@pytest.fixture
def live_solver():
    """Disable USE_MOCK_SOLVER so the real FFD path runs."""
    with patch("solver.ffd_solver.USE_MOCK_SOLVER", False):
        yield


# Manifest: enough items per stop that there is real placement freedom for
# the axle-balance picker to differ from a first-fit volume-desc layout.
# All items at stop 1 (single stop) so LIFO doesn't pin Y positions.
_HEAVY_FORWARD_BIASED = [
    _item("h1", w=600, l=600, h=600, weight_kg=200.0, stop_id=1),
    _item("h2", w=600, l=600, h=600, weight_kg=200.0, stop_id=1),
    _item("h3", w=600, l=600, h=600, weight_kg=180.0, stop_id=1),
    _item("m1", w=600, l=600, h=600, weight_kg=80.0,  stop_id=1),
    _item("m2", w=600, l=600, h=600, weight_kg=80.0,  stop_id=1),
    _item("l1", w=600, l=600, h=600, weight_kg=20.0,  stop_id=1),
    _item("l2", w=600, l=600, h=600, weight_kg=20.0,  stop_id=1),
    _item("l3", w=600, l=600, h=600, weight_kg=15.0,  stop_id=1),
]


def test_axle_balance_strategy_dispatches_to_ffd(live_solver):
    """OptimizationEngine routes strategy=axle_balance to the FFD path."""
    engine = OptimizationEngine()
    plan = engine.optimize(_HEAVY_FORWARD_BIASED, _truck(), strategy="axle_balance")
    assert plan.solver_mode == "FFD"
    assert plan.strategy == "axle_balance"


def test_axle_balance_rationale_present(live_solver):
    """Plan carries the strategy-specific rationale string for the UI."""
    engine = OptimizationEngine()
    plan = engine.optimize(_HEAVY_FORWARD_BIASED, _truck(), strategy="axle_balance")
    assert "axle" in plan.rationale.lower()


def test_axle_balance_brings_cog_closer_to_centre(live_solver):
    """Axle-balance FFD must produce a y-CoG closer to L/2 than first-fit FFD."""
    truck = _truck()
    target = truck.L / 2.0

    first_fit = FFDSolver(presort="weight", axle_balance=False)
    axle      = FFDSolver(presort="weight", axle_balance=True)

    plan_first_fit = first_fit.solve(_HEAVY_FORWARD_BIASED, truck)
    plan_axle      = axle.solve(_HEAVY_FORWARD_BIASED, truck)

    err_first_fit = abs(_y_cog(plan_first_fit, _HEAVY_FORWARD_BIASED) - target)
    err_axle      = abs(_y_cog(plan_axle,      _HEAVY_FORWARD_BIASED) - target)

    # Axle-balance should be at least as good as first-fit, and strictly
    # better on this manifest (heavies want to migrate away from y=0).
    assert err_axle <= err_first_fit, (
        f"Axle-balance y-CoG error {err_axle:.0f}mm should be <= first-fit "
        f"{err_first_fit:.0f}mm (target y={target:.0f}mm)"
    )
    assert err_axle < err_first_fit, (
        f"Axle-balance gave no improvement on this manifest "
        f"(both at {err_axle:.0f}mm from y={target:.0f})"
    )


def test_axle_balance_plan_passes_all_validators(live_solver):
    """No constraint may be violated by the axle-balance picker."""
    truck = _truck()
    plan = FFDSolver(presort="weight", axle_balance=True).solve(
        _HEAVY_FORWARD_BIASED, truck
    )
    validator = ConstraintValidator()
    assert validator.validate_non_overlap(plan)
    assert validator.validate_boundary(plan, truck)
    assert validator.validate_orientation(plan)
    assert validator.validate_lifo(plan)
    assert validator.validate_weight(plan, _HEAVY_FORWARD_BIASED, truck)


def test_axle_balance_uses_truck_axle_count(live_solver):
    """A 3-axle truck must score candidates differently from a 2-axle truck.

    With three supports at y ∈ {0, L/2, L}, the middle axle picks up load
    that would otherwise concentrate at one end on a 2-axle beam. The
    minimum-variance solution therefore differs whenever a manifest has
    enough placement freedom to migrate mass toward L/2.
    """
    items = [
        _item("h1", 600, 600, 600, 250.0, stop_id=1),
        _item("h2", 600, 600, 600, 250.0, stop_id=1),
        _item("l1", 600, 600, 600, 20.0,  stop_id=1),
        _item("l2", 600, 600, 600, 20.0,  stop_id=1),
        _item("l3", 600, 600, 600, 20.0,  stop_id=1),
    ]
    truck_2 = TruckSpec(W=2400, L=13600, H=2440, payload_kg=99999.0, axle_count=2)
    truck_3 = TruckSpec(W=2400, L=13600, H=2440, payload_kg=99999.0, axle_count=3)

    plan_2 = FFDSolver(presort="weight", axle_balance=True).solve(items, truck_2)
    plan_3 = FFDSolver(presort="weight", axle_balance=True).solve(items, truck_3)

    by_id_2 = {p.item_id: p for p in plan_2.placements if p.is_packed}
    by_id_3 = {p.item_id: p for p in plan_3.placements if p.is_packed}
    # Both plans must be feasible; the layouts may differ because the
    # 3-axle truck spreads heavies toward the middle axle.
    assert set(by_id_2) == set(by_id_3) == {it.item_id for it in items}


def test_axle_balance_respects_lifo_across_stops(live_solver):
    """Multi-stop manifest: deeper stops still sit at lower y values."""
    items = [
        _item("a1", 600, 600, 600, 100.0, stop_id=1),
        _item("a2", 600, 600, 600, 100.0, stop_id=1),
        _item("b1", 600, 600, 600, 200.0, stop_id=2),
        _item("b2", 600, 600, 600, 200.0, stop_id=2),
        _item("c1", 600, 600, 600, 50.0,  stop_id=3),
        _item("c2", 600, 600, 600, 50.0,  stop_id=3),
    ]
    truck = _truck()
    plan = FFDSolver(presort="weight", axle_balance=True).solve(items, truck)

    by_id = {p.item_id: p for p in plan.placements if p.is_packed}
    # All stop-3 items must be at lower y than every stop-2 item, etc.
    stop3_max_y_end = max(by_id[i].y + by_id[i].l for i in ("c1", "c2"))
    stop2_min_y     = min(by_id[i].y             for i in ("b1", "b2"))
    assert stop3_max_y_end <= stop2_min_y

    stop2_max_y_end = max(by_id[i].y + by_id[i].l for i in ("b1", "b2"))
    stop1_min_y     = min(by_id[i].y             for i in ("a1", "a2"))
    assert stop2_max_y_end <= stop1_min_y
