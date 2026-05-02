"""Unit tests for solver.ffd_solver.FFDSolver (live, no mock)."""

from __future__ import annotations

from typing import List
from unittest.mock import patch

import pytest

from api.models import FurnitureItem, Placement, TruckSpec
from core.validator import ConstraintValidator
from solver.ffd_solver import FFDSolver


@pytest.fixture
def truck() -> TruckSpec:
    return TruckSpec()


def _item(
    item_id: str,
    w: int,
    l: int,  # noqa: E741 — thesis naming
    h: int,
    stop_id: int,
    side_up: bool = False,
) -> FurnitureItem:
    return FurnitureItem(
        item_id=item_id, w=w, l=l, h=h, weight_kg=10.0, stop_id=stop_id, side_up=side_up
    )


@pytest.fixture
def solver() -> FFDSolver:
    # Bypass the mock-load short-circuit so we exercise the real algorithm.
    with patch("solver.ffd_solver.USE_MOCK_SOLVER", False):
        yield FFDSolver()


def test_lifo_presort_orders_by_stop_desc_then_volume_desc() -> None:
    items: List[FurnitureItem] = [
        _item("small_late", 100, 100, 100, stop_id=3),
        _item("big_late", 500, 500, 500, stop_id=3),
        _item("big_early", 500, 500, 500, stop_id=1),
    ]
    sequence = FFDSolver()._lifo_presort(items)
    assert [it.item_id for it in sequence] == ["big_late", "small_late", "big_early"]


def test_solve_produces_valid_plan_passing_validate_all(
    solver: FFDSolver, truck: TruckSpec
) -> None:
    items = [
        _item("sofa", 2000, 900, 850, stop_id=1),
        _item("wardrobe", 1200, 600, 1800, stop_id=3, side_up=True),
        _item("table", 1500, 900, 750, stop_id=2),
        _item("desk", 1000, 600, 750, stop_id=3),
    ]
    plan = solver.solve(items, truck)

    assert plan.solver_mode == "FFD"
    assert plan.unplaced_items == []
    assert ConstraintValidator().validate_all(plan, truck) is True


def test_solve_records_unplaceable_items(solver: FFDSolver, truck: TruckSpec) -> None:
    # side_up locks h along z; with h > truck.H no orientation can fit it.
    too_big = _item("oversize", 100, 100, truck.H + 1, stop_id=1, side_up=True)
    fits = _item("fits", 500, 500, 500, stop_id=1)
    plan = solver.solve([too_big, fits], truck)

    assert "oversize" in plan.unplaced_items
    assert any(p.item_id == "fits" for p in plan.placements)


def test_side_up_item_keeps_height_along_z(solver: FFDSolver, truck: TruckSpec) -> None:
    rigid = _item("fridge", 700, 700, 1700, stop_id=1, side_up=True)
    plan = solver.solve([rigid], truck)

    placement = plan.placements[0]
    assert placement.orientation_index in {0, 1}
    assert placement.h == 1700


def test_every_placement_has_floor_or_supporter(
    solver: FFDSolver, truck: TruckSpec
) -> None:
    """Single-supporter rule (mirrors ILP _support): every placed box has
    z == 0 or its bottom rests on a placed item whose xy footprint contains
    its footprint. Verified across a heterogeneous manifest exercising the
    greedy walk's z>0 corner-points.
    """
    items = [
        _item("base_a", 1200, 1000, 600, stop_id=1),
        _item("base_b", 1200, 1000, 600, stop_id=1),
        _item("top_a", 800, 800, 400, stop_id=1),
        _item("top_b", 600, 600, 400, stop_id=1),
        _item("desk", 1500, 700, 750, stop_id=2),
    ]
    plan = solver.solve(items, truck)

    for p in plan.placements:
        if p.z == 0:
            continue
        supporter_found = any(
            (q.z + q.h == p.z)
            and (q.x <= p.x and p.x + p.w <= q.x + q.w)
            and (q.y <= p.y and p.y + p.l <= q.y + q.l)
            for q in plan.placements
            if q.item_id != p.item_id
        )
        assert supporter_found, f"{p.item_id} at z={p.z} has no supporter"


def test_supported_rejects_unsupported_overhang() -> None:
    """Direct unit test of the static _supported helper.

    A small base at the origin must reject any candidate whose xy footprint
    extends beyond it, even when the candidate's z matches the base's top.
    """
    base = Placement(
        item_id="base", x=0, y=0, z=0, w=500, l=500, h=400,
        orientation_index=0, stop_id=1, is_packed=True,
    )
    # Floor is always supported regardless of overlap.
    assert FFDSolver._supported(0, 0, 0, 9999, 9999, []) is True
    # Sits exactly on top with footprint contained — supported.
    assert FFDSolver._supported(0, 0, 400, 500, 500, [base]) is True
    # Sits on top but overhangs in x — not supported.
    assert FFDSolver._supported(0, 0, 400, 600, 500, [base]) is False
    # Wrong z (gap above base's top) — not supported.
    assert FFDSolver._supported(0, 0, 401, 500, 500, [base]) is False
