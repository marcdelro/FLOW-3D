"""Tests for the BaselineSolver — naive first-fit comparison baseline.

The baseline is a deliberately dumb packer: input-order placement, no LIFO,
no orientation, no vertical support, no fragile guard. Its purpose is to
quantify what the real solvers (ILP / FFD) contribute. These tests verify:

  1. The "baseline" strategy is wired through OptimizationEngine.
  2. The plan respects boundary + non-overlap (geometric invariants).
  3. The plan may freely violate LIFO and support — those are not invariants
     for the baseline by design.
  4. success_rate is populated and consistent with unplaced_items.
  5. V_util of the baseline is at most V_util of the optimal strategy on
     manifests where the route-aware solver has freedom to do better.
"""

from __future__ import annotations

from unittest.mock import patch

import pytest

from api.models import FurnitureItem, TruckSpec
from core.optimizer import OptimizationEngine
from core.validator import ConstraintValidator
from solver.baseline_solver import BaselineSolver


def _truck() -> TruckSpec:
    return TruckSpec(W=2400, L=6000, H=2440, payload_kg=9999.0)


def _item(item_id: str, w: int, l: int, h: int, weight_kg: float, stop_id: int) -> FurnitureItem:  # noqa: E741
    return FurnitureItem(
        item_id=item_id, w=w, l=l, h=h, weight_kg=weight_kg, stop_id=stop_id
    )


_MULTI_STOP = [
    _item("a1", 800, 600, 600, 30.0, stop_id=1),
    _item("a2", 800, 600, 600, 30.0, stop_id=1),
    _item("b1", 800, 600, 600, 30.0, stop_id=2),
    _item("b2", 800, 600, 600, 30.0, stop_id=2),
    _item("c1", 800, 600, 600, 30.0, stop_id=3),
    _item("c2", 800, 600, 600, 30.0, stop_id=3),
]


@pytest.fixture
def live_solver():
    with (
        patch("solver.ffd_solver.USE_MOCK_SOLVER", False),
        patch("solver.ilp_solver.USE_MOCK_SOLVER", False),
    ):
        yield


def test_baseline_strategy_dispatches_to_baseline(live_solver):
    plan = OptimizationEngine().optimize(_MULTI_STOP, _truck(), strategy="baseline")
    assert plan.solver_mode == "BASELINE"
    assert plan.strategy == "baseline"


def test_baseline_rationale_present(live_solver):
    plan = OptimizationEngine().optimize(_MULTI_STOP, _truck(), strategy="baseline")
    assert "baseline" in plan.rationale.lower()


def test_baseline_plan_respects_geometric_invariants(live_solver):
    plan = BaselineSolver().solve(_MULTI_STOP, _truck())
    v = ConstraintValidator()
    assert v.validate_non_overlap(plan), "baseline must never overlap items"
    assert v.validate_boundary(plan, _truck()), "baseline must stay inside W×L×H"
    assert v.validate_weight(plan, _MULTI_STOP, _truck()), "baseline must respect payload"


def test_baseline_success_rate_reflects_unplaced(live_solver):
    """success_rate = (n - unplaced) / n by construction."""
    plan = BaselineSolver().solve(_MULTI_STOP, _truck())
    n = len(_MULTI_STOP)
    expected = (n - len(plan.unplaced_items)) / n
    assert abs(plan.success_rate - expected) < 1e-9


def test_baseline_always_uses_orientation_zero(live_solver):
    """No orientation enumeration — every placement is orientation_index 0."""
    plan = BaselineSolver().solve(_MULTI_STOP, _truck())
    assert all(p.orientation_index == 0 for p in plan.placements if p.is_packed)


def test_baseline_v_util_at_most_optimal(live_solver):
    """A dumb baseline should not beat the route-aware optimal on V_util."""
    engine = OptimizationEngine()
    baseline = engine.optimize(_MULTI_STOP, _truck(), strategy="baseline")
    optimal  = engine.optimize(_MULTI_STOP, _truck(), strategy="optimal")
    assert baseline.v_util <= optimal.v_util + 1e-9, (
        f"baseline V_util {baseline.v_util:.4f} should not exceed "
        f"optimal V_util {optimal.v_util:.4f}"
    )
