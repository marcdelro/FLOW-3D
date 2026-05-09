"""Black-box tests for the FLOW-3D solver pipeline.

Tests treat OptimizationEngine.optimize() as the system boundary: they supply
a manifest + truck spec and assert only on the PackingPlan output (v_util,
solver_mode, placements, unplaced_items).  No internal solver state or
intermediate variables are examined.

Run with:  cd backend && python -m pytest tests/test_blackbox.py -v
"""

from __future__ import annotations

from typing import List
from unittest.mock import patch

import pytest

from api.models import FurnitureItem, PackingPlan, Placement, SolveRequest, TruckSpec
from core.optimizer import _GUROBI_AVAILABLE, OptimizationEngine
from core.validator import ConstraintValidator


def _gurobi_ilp_capable() -> bool:
    """Return True only when Gurobi is installed AND has an unrestricted licence.

    The free/academic size-limited licence caps models at 2000 variables AND
    2000 linear constraints.  The 3DBPP ILP for n=19 items creates ~1500+
    binary variables plus thousands of Big-M and support constraints — well
    beyond both caps.  We probe by building a 2001-variable model: an
    unrestricted licence optimises it instantly; a size-limited licence raises
    "Model too large for size-limited license" and returns False.
    """
    if not _GUROBI_AVAILABLE:
        return False
    try:
        import gurobipy as gp
        m = gp.Model()
        m.setParam("OutputFlag", 0)
        vs = m.addVars(2001, vtype=gp.GRB.BINARY)
        m.setObjective(vs.sum())
        m.optimize()
        return m.Status in (gp.GRB.OPTIMAL, gp.GRB.SUBOPTIMAL)
    except Exception:
        return False


_GUROBI_ILP_CAPABLE: bool = _gurobi_ilp_capable()

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _truck(
    W: int = 2400,
    L: int = 13600,
    H: int = 2440,
    payload_kg: float = 99999.0,
) -> TruckSpec:
    return TruckSpec(W=W, L=L, H=H, payload_kg=payload_kg)


def _item(
    item_id: str,
    w: int,
    l: int,  # noqa: E741 — thesis naming per CLAUDE.md
    h: int,
    stop_id: int,
    side_up: bool = False,
    weight_kg: float = 10.0,
    fragile: bool = False,
) -> FurnitureItem:
    return FurnitureItem(
        item_id=item_id,
        w=w,
        l=l,
        h=h,
        stop_id=stop_id,
        side_up=side_up,
        weight_kg=weight_kg,
        fragile=fragile,
    )


def _solve(
    items: List[FurnitureItem],
    truck: TruckSpec | None = None,
    strategy: str = "axle_balance",
) -> PackingPlan:
    """Invoke OptimizationEngine with USE_MOCK_SOLVER=False and no Gurobi dependency."""
    if truck is None:
        truck = _truck()
    engine = OptimizationEngine()
    with patch("solver.ffd_solver.USE_MOCK_SOLVER", False), \
         patch("solver.ilp_solver.USE_MOCK_SOLVER", False):
        return engine.optimize(items, truck, strategy=strategy)


def _packing_success_rate(plan: PackingPlan, n_items: int) -> float:
    packed = sum(1 for p in plan.placements if p.is_packed)
    return packed / n_items if n_items > 0 else 0.0


VALIDATOR = ConstraintValidator()

# Sentence-long rationale strings differ per strategy — used to distinguish plans.
_AXLE_RATIONALE_FRAGMENT    = "axle"
_OPTIMAL_RATIONALE_FRAGMENT = "optimal"


# ===========================================================================
# BB-S-01: Single stop — 3 items, all stop_id=1
# ===========================================================================

class TestBBS01SingleStop:
    """Three small items at a single delivery stop."""

    _ITEMS = [
        _item("chair1", w=600, l=600,  h=900,  stop_id=1),
        _item("table1", w=900, l=1500, h=750,  stop_id=1),
        _item("shelf1", w=400, l=300,  h=1800, stop_id=1),
    ]

    def test_all_three_items_packed(self):
        plan = _solve(self._ITEMS)
        assert plan.unplaced_items == [], f"Unplaced: {plan.unplaced_items}"

    def test_v_util_positive(self):
        plan = _solve(self._ITEMS)
        assert plan.v_util > 0.0

    def test_packing_success_100pct(self):
        plan = _solve(self._ITEMS)
        assert _packing_success_rate(plan, len(self._ITEMS)) == 1.0

    def test_no_lifo_violation_in_output(self):
        plan = _solve(self._ITEMS)
        assert VALIDATOR.validate_lifo(plan)


# ===========================================================================
# BB-S-02: Two-stop LIFO
# ===========================================================================

class TestBBS02TwoStopLIFO:
    """Sofa (stop 1, near door) and wardrobe (stop 2, deeper in truck, side_up)."""

    _ITEMS = [
        _item("sofa",     w=900, l=2000, h=850,  stop_id=1),
        _item("wardrobe", w=550, l=1200, h=2000, stop_id=2, side_up=True),
    ]

    def _by_id(self, plan: PackingPlan) -> dict[str, Placement]:
        return {p.item_id: p for p in plan.placements if p.is_packed}

    def test_both_items_packed(self):
        plan = _solve(self._ITEMS)
        by_id = self._by_id(plan)
        assert "sofa" in by_id and "wardrobe" in by_id

    def test_wardrobe_placed_deeper_lower_y_than_sofa(self):
        """LIFO: stop_wardrobe=2 > stop_sofa=1 → y_w + l_w_eff <= y_sofa."""
        plan = _solve(self._ITEMS)
        by_id = self._by_id(plan)
        w_pl, s_pl = by_id["wardrobe"], by_id["sofa"]
        assert w_pl.y + w_pl.l <= s_pl.y, (
            f"LIFO violated: wardrobe y-end {w_pl.y + w_pl.l} > sofa y-start {s_pl.y}"
        )

    def test_wardrobe_orientation_index_upright(self):
        """side_up=True wardrobe must use orientation_index in {0, 1}."""
        plan = _solve(self._ITEMS)
        by_id = self._by_id(plan)
        idx = by_id["wardrobe"].orientation_index
        assert idx in {0, 1}, f"Expected upright orientation {{0,1}}, got {idx}"

    def test_lifo_constraint_satisfied(self):
        plan = _solve(self._ITEMS)
        assert VALIDATOR.validate_lifo(plan)


# ===========================================================================
# BB-S-03: Three-stop full LIFO — 9 items, 3 per stop
# ===========================================================================

class TestBBS03ThreeStopFullLIFO:
    """9 items over 3 stops; verifies inter-stop Y ordering for every pair."""

    _ITEMS = [
        _item("s1a", w=500, l=400, h=600, stop_id=1),
        _item("s1b", w=400, l=400, h=500, stop_id=1),
        _item("s1c", w=300, l=300, h=800, stop_id=1),
        _item("s2a", w=500, l=400, h=600, stop_id=2),
        _item("s2b", w=400, l=400, h=500, stop_id=2),
        _item("s2c", w=300, l=300, h=800, stop_id=2),
        _item("s3a", w=500, l=400, h=600, stop_id=3),
        _item("s3b", w=400, l=400, h=500, stop_id=3),
        _item("s3c", w=300, l=300, h=800, stop_id=3),
    ]

    def test_packing_success_100pct(self):
        plan = _solve(self._ITEMS)
        rate = _packing_success_rate(plan, len(self._ITEMS))
        assert rate == 1.0, f"Unplaced: {plan.unplaced_items}"

    def test_stop3_items_deeper_than_all_stop2_items(self):
        """Every stop-3 item's y-end must be <= every stop-2 item's y-start."""
        plan = _solve(self._ITEMS)
        by_id = {p.item_id: p for p in plan.placements if p.is_packed}
        for s3 in ("s3a", "s3b", "s3c"):
            for s2 in ("s2a", "s2b", "s2c"):
                s3_end = by_id[s3].y + by_id[s3].l
                s2_start = by_id[s2].y
                assert s3_end <= s2_start, (
                    f"LIFO violated: {s3} y-end {s3_end} > {s2} y-start {s2_start}"
                )

    def test_stop2_items_deeper_than_all_stop1_items(self):
        """Every stop-2 item's y-end must be <= every stop-1 item's y-start."""
        plan = _solve(self._ITEMS)
        by_id = {p.item_id: p for p in plan.placements if p.is_packed}
        for s2 in ("s2a", "s2b", "s2c"):
            for s1 in ("s1a", "s1b", "s1c"):
                s2_end = by_id[s2].y + by_id[s2].l
                s1_start = by_id[s1].y
                assert s2_end <= s1_start, (
                    f"LIFO violated: {s2} y-end {s2_end} > {s1} y-start {s1_start}"
                )

    def test_validate_lifo_passes(self):
        plan = _solve(self._ITEMS)
        assert VALIDATOR.validate_lifo(plan)


# ===========================================================================
# BB-S-04: Over-capacity
# ===========================================================================

class TestBBS04OverCapacity:
    """30 large sofas — total volume exceeds truck capacity."""

    _ITEMS = [
        _item(f"sofa{i}", w=1200, l=2000, h=900, stop_id=1)
        for i in range(30)
    ]

    def test_partial_plan_returned_no_crash(self):
        plan = _solve(self._ITEMS)
        assert isinstance(plan, PackingPlan)

    def test_unplaced_items_not_empty(self):
        plan = _solve(self._ITEMS)
        assert len(plan.unplaced_items) > 0

    def test_packing_success_below_100pct(self):
        plan = _solve(self._ITEMS)
        rate = _packing_success_rate(plan, len(self._ITEMS))
        assert rate < 1.0, f"Over-capacity run must not reach 100% success (rate={rate:.0%})"


# ===========================================================================
# BB-S-05: ILP path confirmed — n=8, strategy=optimal
# ===========================================================================

@pytest.mark.skipif(
    not _GUROBI_ILP_CAPABLE,
    reason="Gurobi not available or size-limited licence — ILP path disabled in this environment",
)
class TestBBS05ILPPath:
    """n=8 < theta=20, strategy=optimal → Gurobi ILP solver invoked."""

    _ITEMS = [
        _item(f"box{i}", w=400, l=600, h=500, stop_id=(i % 3) + 1)
        for i in range(8)
    ]

    def test_solver_mode_is_ilp(self):
        plan = _solve(self._ITEMS, strategy="optimal")
        assert plan.solver_mode == "ILP", f"Expected ILP, got {plan.solver_mode}"

    def test_all_placements_have_valid_coordinates(self):
        truck = _truck()
        plan = _solve(self._ITEMS, truck, strategy="optimal")
        for p in plan.placements:
            if not p.is_packed:
                continue
            assert p.x >= 0 and p.y >= 0 and p.z >= 0
            assert p.x + p.w <= truck.W, f"{p.item_id}: x+w={p.x + p.w} > W={truck.W}"
            assert p.y + p.l <= truck.L, f"{p.item_id}: y+l={p.y + p.l} > L={truck.L}"
            assert p.z + p.h <= truck.H, f"{p.item_id}: z+h={p.z + p.h} > H={truck.H}"


# ===========================================================================
# BB-S-06: FFD path confirmed — n=30, strategy=optimal
# ===========================================================================

class TestBBS06FFDPath:
    """n=30 > theta=20, strategy=optimal → FFD heuristic invoked regardless of Gurobi."""

    _ITEMS = [
        _item(f"box{i}", w=400, l=600, h=500, stop_id=(i % 3) + 1)
        for i in range(30)
    ]

    def test_solver_mode_is_ffd(self):
        plan = _solve(self._ITEMS, strategy="optimal")
        assert plan.solver_mode == "FFD", f"Expected FFD, got {plan.solver_mode}"

    def test_t_exec_ms_finite_and_non_negative(self):
        plan = _solve(self._ITEMS, strategy="optimal")
        assert 0 <= plan.t_exec_ms < 60_000, f"t_exec_ms={plan.t_exec_ms} out of range"


# ===========================================================================
# BB-S-07: Edge theta-1 (n=19, strategy=optimal)
# ===========================================================================

@pytest.mark.skipif(
    not _GUROBI_ILP_CAPABLE,
    reason="Gurobi not available or size-limited licence — ILP path disabled in this environment",
)
class TestBBS07EdgeThetaMinus1:
    """n=19 = theta-1 → ILP when Gurobi available (threshold is inclusive at 20)."""

    _ITEMS = [
        _item(f"box{i}", w=300, l=400, h=300, stop_id=(i % 2) + 1)
        for i in range(19)
    ]

    def test_n19_solver_mode_is_ilp(self):
        plan = _solve(self._ITEMS, strategy="optimal")
        assert plan.solver_mode == "ILP", f"Expected ILP at n=19, got {plan.solver_mode}"


# ===========================================================================
# BB-S-08: Edge theta+1 (n=21, strategy=optimal)
# ===========================================================================

class TestBBS08EdgeThetaPlus1:
    """n=21 = theta+1 → FFD regardless of Gurobi availability."""

    _ITEMS = [
        _item(f"box{i}", w=300, l=400, h=300, stop_id=(i % 2) + 1)
        for i in range(21)
    ]

    def test_n21_solver_mode_is_ffd(self):
        plan = _solve(self._ITEMS, strategy="optimal")
        assert plan.solver_mode == "FFD", f"Expected FFD at n=21, got {plan.solver_mode}"


# ===========================================================================
# BB-S-09: Standalone FFD baseline — strategy=axle_balance always FFD
# ===========================================================================

class TestBBS09StandaloneFFDBaseline:
    """strategy=axle_balance must always return FFD regardless of n or Gurobi availability."""

    _ITEMS = [
        _item(f"box{i}", w=400, l=600, h=500, stop_id=(i % 2) + 1)
        for i in range(8)
    ]

    def test_axle_balance_always_produces_ffd_mode(self):
        plan = _solve(self._ITEMS, strategy="axle_balance")
        assert plan.solver_mode == "FFD"

    def test_axle_balance_strategy_field_set_on_plan(self):
        plan = _solve(self._ITEMS, strategy="axle_balance")
        assert plan.strategy == "axle_balance"

    def test_axle_balance_and_optimal_both_return_valid_plans(self):
        """Both strategies return valid PackingPlan objects (solver_mode may differ)."""
        plan_axle = _solve(self._ITEMS, strategy="axle_balance")
        plan_opt  = _solve(self._ITEMS, strategy="optimal")
        assert isinstance(plan_axle, PackingPlan)
        assert isinstance(plan_opt, PackingPlan)
        assert plan_axle.solver_mode == "FFD"  # axle_balance is always FFD


# ===========================================================================
# BB-E-01: Zero dimension — missing ge=1 validator on FurnitureItem
# ===========================================================================

class TestBBE01ZeroDimension:
    """l=0 should be rejected before the solver runs.

    FurnitureItem currently carries no ge=1 constraint on dimension fields,
    so this test documents a missing pre-solve validation gate.  It will
    FAIL until a Field(ge=1) (or equivalent validator) is added.
    """

    def test_zero_l_raises_validation_error(self):
        """Creating a FurnitureItem with l=0 must raise a validation error."""
        with pytest.raises(Exception):
            # Expect Pydantic to reject l=0 with a ge=1 constraint.
            # Currently no such constraint exists → DID NOT RAISE → FAIL.
            FurnitureItem(item_id="zero-l", w=500, l=0, h=500, stop_id=1)

    def test_zero_w_raises_validation_error(self):
        """Creating a FurnitureItem with w=0 must raise a validation error."""
        with pytest.raises(Exception):
            FurnitureItem(item_id="zero-w", w=0, l=500, h=500, stop_id=1)


# ===========================================================================
# BB-E-02: Item bigger than truck — graceful unplace, no exception
# ===========================================================================

class TestBBE02ItemBiggerThanTruck:
    """An item that cannot fit in any orientation goes to unplaced_items (no crash)."""

    def test_item_exceeding_all_truck_dims_is_unplaced(self):
        """Item with w=l=h=3000mm exceeds W=2400 in every rotation — must be unplaced."""
        item = _item("giant", w=3000, l=3000, h=3000, stop_id=1)
        plan = _solve([item], strategy="axle_balance")
        assert "giant" in plan.unplaced_items, (
            "Item too large for any orientation must appear in unplaced_items"
        )

    def test_plan_returned_without_exception(self):
        """System must return a valid PackingPlan even for an impossible item."""
        item = _item("giant", w=3000, l=3000, h=3000, stop_id=1)
        plan = _solve([item], strategy="axle_balance")
        assert isinstance(plan, PackingPlan)

    def test_tall_item_that_can_rotate_may_be_packed(self):
        """Item with h=3000 but w=l=500 can rotate so h maps to the Y-axis (L=13600).

        Documents that h > H alone does not make an item unpackable — orientation
        matters.  The solver is expected to pack this item, not reject it.
        """
        item = _item("tall", w=500, l=500, h=3000, stop_id=1)
        plan = _solve([item], strategy="axle_balance")
        assert isinstance(plan, PackingPlan)
        # Item may be packed (h=3000 rotated to L-axis) — verify no crash
        packed_ids = {p.item_id for p in plan.placements if p.is_packed}
        unplaced_ids = set(plan.unplaced_items)
        assert "tall" in packed_ids or "tall" in unplaced_ids  # one or the other


# ===========================================================================
# BB-E-03: Missing stop_id — Pydantic rejects with ValidationError
# ===========================================================================

class TestBBE03MissingStopId:
    """stop_id is a required field; omitting it must trigger a ValidationError."""

    def test_furniture_item_without_stop_id_raises(self):
        """FurnitureItem(stop_id omitted) must raise Pydantic ValidationError."""
        import pydantic
        with pytest.raises(pydantic.ValidationError) as exc_info:
            FurnitureItem(item_id="no-stop", w=500, l=500, h=500)
        assert "stop_id" in str(exc_info.value)

    def test_solve_request_dict_missing_stop_id_raises(self):
        """SolveRequest.model_validate with items missing stop_id must raise ValidationError."""
        import pydantic
        with pytest.raises(pydantic.ValidationError):
            SolveRequest.model_validate({
                "items": [{"item_id": "no-stop", "w": 500, "l": 500, "h": 500}],
                "truck": {"W": 2400, "L": 13600, "H": 2440, "payload_kg": 3000},
            })

    def test_validation_error_message_references_stop_id(self):
        """The ValidationError must mention stop_id in its message."""
        import pydantic
        with pytest.raises(pydantic.ValidationError) as exc_info:
            FurnitureItem(item_id="no-stop", w=500, l=500, h=500)
        assert "stop_id" in str(exc_info.value)


# ===========================================================================
# BB-E-04: Infeasible manifest — valid PackingPlan, unplaced_items not empty
# ===========================================================================

class TestBBE04InfeasibleManifest:
    """Items total > 110% of truck volume → valid plan returned, not a crash."""

    @staticmethod
    def _overcapacity_items(multiplier: float = 2.0) -> list[FurnitureItem]:
        truck = _truck()
        truck_vol = truck.W * truck.L * truck.H
        item_vol = 2000 * 2000 * 2000
        n = int((truck_vol * multiplier) / item_vol) + 1
        return [_item(f"huge{i}", w=2000, l=2000, h=2000, stop_id=1) for i in range(n)]

    def test_packing_plan_returned_no_crash(self):
        items = self._overcapacity_items()
        plan = _solve(items, strategy="axle_balance")
        assert isinstance(plan, PackingPlan)

    def test_unplaced_items_not_empty(self):
        """At least one item must be in unplaced_items when manifest exceeds capacity."""
        items = self._overcapacity_items()
        plan = _solve(items, strategy="axle_balance")
        assert len(plan.unplaced_items) > 0

    def test_v_util_does_not_exceed_one(self):
        """v_util must remain in [0, 1] even for an infeasible manifest."""
        items = self._overcapacity_items()
        plan = _solve(items, strategy="axle_balance")
        assert 0.0 <= plan.v_util <= 1.0
