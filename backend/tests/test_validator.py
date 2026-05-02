"""Unit tests for core.validator.ConstraintValidator."""

from __future__ import annotations

import json

import pytest

from api.models import FurnitureItem, PackingPlan, Placement, TruckSpec
from core.validator import ConstraintValidator
from settings import MOCK_PLAN_PATH


@pytest.fixture
def truck() -> TruckSpec:
    return TruckSpec()


@pytest.fixture
def mock_plan() -> PackingPlan:
    with open(MOCK_PLAN_PATH, encoding="utf-8") as f:
        return PackingPlan(**json.load(f))


@pytest.fixture
def validator() -> ConstraintValidator:
    return ConstraintValidator()


def _placement(
    *,
    item_id: str = "x",
    x: int = 0,
    y: int = 0,
    z: int = 0,
    w: int = 100,
    l: int = 100,  # noqa: E741 — l_i matches thesis naming per CLAUDE.md
    h: int = 100,
    orientation_index: int = 0,
    stop_id: int = 1,
    is_packed: bool = True,
) -> Placement:
    return Placement(
        item_id=item_id,
        x=x,
        y=y,
        z=z,
        w=w,
        l=l,
        h=h,
        orientation_index=orientation_index,
        stop_id=stop_id,
        is_packed=is_packed,
    )


def _plan(placements: list[Placement]) -> PackingPlan:
    return PackingPlan(
        placements=placements,
        v_util=0.1,
        t_exec_ms=1,
        solver_mode="ILP",
        unplaced_items=[],
    )


def test_mock_plan_passes_all_checks(
    validator: ConstraintValidator, mock_plan: PackingPlan, truck: TruckSpec
) -> None:
    assert validator.validate_all(mock_plan, truck) is True


def test_non_overlap_detects_collision(validator: ConstraintValidator) -> None:
    plan = _plan([
        _placement(item_id="a", x=0, y=0, z=0, w=1000, l=1000, h=1000),
        _placement(item_id="b", x=500, y=500, z=500, w=1000, l=1000, h=1000),
    ])
    assert validator.validate_non_overlap(plan) is False


def test_non_overlap_allows_touching_faces(validator: ConstraintValidator) -> None:
    plan = _plan([
        _placement(item_id="a", x=0, y=0, z=0, w=1000, l=1000, h=1000),
        _placement(item_id="b", x=1000, y=0, z=0, w=1000, l=1000, h=1000),
    ])
    assert validator.validate_non_overlap(plan) is True


def test_boundary_detects_overflow(
    validator: ConstraintValidator, truck: TruckSpec
) -> None:
    plan = _plan([_placement(x=truck.W - 100, w=500)])
    assert validator.validate_boundary(plan, truck) is False


def test_boundary_rejects_negative_coord(
    validator: ConstraintValidator, truck: TruckSpec
) -> None:
    plan = _plan([_placement(x=0, y=0, z=0, w=100, l=100, h=100)])
    # Pydantic allows negatives on int fields; craft one via model_construct.
    bad = Placement.model_construct(
        item_id="neg",
        x=-1,
        y=0,
        z=0,
        w=100,
        l=100,
        h=100,
        orientation_index=0,
        stop_id=1,
        is_packed=True,
    )
    plan.placements.append(bad)
    assert validator.validate_boundary(plan, truck) is False


def test_lifo_detects_out_of_order_stops(validator: ConstraintValidator) -> None:
    plan = _plan([
        _placement(item_id="late", y=1000, l=500, stop_id=3),
        _placement(item_id="early", y=0, l=500, stop_id=1),
    ])
    assert validator.validate_lifo(plan) is False


def test_lifo_allows_correct_ordering(validator: ConstraintValidator) -> None:
    plan = _plan([
        _placement(item_id="late", y=0, l=500, stop_id=3),
        _placement(item_id="early", y=500, l=500, stop_id=1),
    ])
    assert validator.validate_lifo(plan) is True


def test_orientation_rejects_out_of_range(validator: ConstraintValidator) -> None:
    bad = Placement.model_construct(
        item_id="bad",
        x=0,
        y=0,
        z=0,
        w=100,
        l=100,
        h=100,
        orientation_index=7,
        stop_id=1,
        is_packed=True,
    )
    plan = _plan([bad])
    assert validator.validate_orientation(plan) is False


def test_weight_rejects_overload(validator: ConstraintValidator) -> None:
    truck = TruckSpec(payload_kg=100.0)
    items = [
        FurnitureItem(item_id="a", w=100, l=100, h=100, weight_kg=80, stop_id=1),
        FurnitureItem(item_id="b", w=100, l=100, h=100, weight_kg=50, stop_id=1),
    ]
    plan = _plan([
        _placement(item_id="a", x=0, y=0, z=0),
        _placement(item_id="b", x=200, y=0, z=0),
    ])
    assert validator.validate_weight(plan, items, truck) is False


def test_weight_allows_under_payload(validator: ConstraintValidator) -> None:
    truck = TruckSpec(payload_kg=100.0)
    items = [
        FurnitureItem(item_id="a", w=100, l=100, h=100, weight_kg=40, stop_id=1),
        FurnitureItem(item_id="b", w=100, l=100, h=100, weight_kg=50, stop_id=1),
    ]
    plan = _plan([
        _placement(item_id="a", x=0, y=0, z=0),
        _placement(item_id="b", x=200, y=0, z=0),
    ])
    assert validator.validate_weight(plan, items, truck) is True


def test_weight_ignores_unpacked(validator: ConstraintValidator) -> None:
    truck = TruckSpec(payload_kg=100.0)
    items = [
        FurnitureItem(item_id="a", w=100, l=100, h=100, weight_kg=80, stop_id=1),
        FurnitureItem(item_id="b", w=100, l=100, h=100, weight_kg=80, stop_id=1),
    ]
    plan = _plan([
        _placement(item_id="a", x=0, y=0, z=0),
        _placement(item_id="b", x=200, y=0, z=0, is_packed=False),
    ])
    assert validator.validate_weight(plan, items, truck) is True


def test_validate_all_flags_weight(validator: ConstraintValidator) -> None:
    truck = TruckSpec(payload_kg=10.0)
    items = [FurnitureItem(item_id="heavy", w=100, l=100, h=100, weight_kg=999, stop_id=1)]
    plan = _plan([_placement(item_id="heavy")])
    assert validator.validate_all(plan, truck, items) is False
    assert validator.first_failing_check(plan, truck, items) == "weight"


def test_fragile_rejects_stacked_load(validator: ConstraintValidator) -> None:
    """Anything sitting at or above a fragile item's top with xy overlap fails."""
    items = [
        FurnitureItem(item_id="mirror", w=100, l=100, h=100, stop_id=1, fragile=True),
        FurnitureItem(item_id="crate", w=100, l=100, h=100, stop_id=1),
    ]
    plan = _plan([
        _placement(item_id="mirror", x=0, y=0, z=0),
        _placement(item_id="crate", x=0, y=0, z=100),  # directly on the mirror
    ])
    assert validator.validate_no_stack_on_fragile(plan, items) is False


def test_fragile_allows_side_by_side(validator: ConstraintValidator) -> None:
    """A fragile item with no xy footprint overlap from above is fine."""
    items = [
        FurnitureItem(item_id="mirror", w=100, l=100, h=100, stop_id=1, fragile=True),
        FurnitureItem(item_id="crate", w=100, l=100, h=100, stop_id=1),
    ]
    plan = _plan([
        _placement(item_id="mirror", x=0, y=0, z=0),
        _placement(item_id="crate", x=200, y=0, z=0),
    ])
    assert validator.validate_no_stack_on_fragile(plan, items) is True


def test_fragile_allows_load_below(validator: ConstraintValidator) -> None:
    """A fragile item *on top* with nothing above it is fine — only loads above fail."""
    items = [
        FurnitureItem(item_id="base", w=100, l=100, h=100, stop_id=1),
        FurnitureItem(item_id="mirror", w=100, l=100, h=100, stop_id=1, fragile=True),
    ]
    plan = _plan([
        _placement(item_id="base", x=0, y=0, z=0),
        _placement(item_id="mirror", x=0, y=0, z=100),  # mirror above the base
    ])
    assert validator.validate_no_stack_on_fragile(plan, items) is True


def test_validate_all_flags_fragile_stacking(validator: ConstraintValidator) -> None:
    truck = TruckSpec()
    items = [
        FurnitureItem(item_id="mirror", w=100, l=100, h=100, stop_id=1, fragile=True),
        FurnitureItem(item_id="crate", w=100, l=100, h=100, stop_id=1),
    ]
    plan = _plan([
        _placement(item_id="mirror", x=0, y=0, z=0),
        _placement(item_id="crate", x=0, y=0, z=100),
    ])
    assert validator.validate_all(plan, truck, items) is False
    assert validator.first_failing_check(plan, truck, items) == "fragile_stacking"


def test_unpacked_items_ignored_by_spatial_checks(
    validator: ConstraintValidator, truck: TruckSpec
) -> None:
    plan = _plan([
        _placement(item_id="a", x=0, y=0, z=0, w=1000, l=1000, h=1000),
        _placement(
            item_id="ghost",
            x=0,
            y=0,
            z=0,
            w=1000,
            l=1000,
            h=1000,
            is_packed=False,
        ),
    ])
    assert validator.validate_non_overlap(plan) is True
    assert validator.validate_boundary(plan, truck) is True
    assert validator.validate_lifo(plan) is True
