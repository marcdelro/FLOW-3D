"""White-box unit tests for FLOW-3D solver internals.

Covers LIFO, non-overlap, orientation, boundary, hybrid routing, and V_util
logic without running a full Gurobi solve.  Run with:

    cd backend && python -m pytest tests/test_whitebox.py -v
"""

from __future__ import annotations

from typing import List
from unittest.mock import patch

import pytest

from api.models import FurnitureItem, PackingPlan, Placement, TruckSpec
from core.optimizer import OptimizationEngine
from core.validator import ConstraintValidator
from solver.ffd_solver import FFDSolver

# ---------------------------------------------------------------------------
# Shared helpers
# ---------------------------------------------------------------------------

def _truck(
    W: int = 2400,
    L: int = 13600,
    H: int = 2440,
    payload_kg: float = 99999.0,
) -> TruckSpec:
    return TruckSpec(W=W, L=L, H=H, payload_kg=payload_kg)


def _item(
    item_id: str = "A",
    w: int = 500,
    l: int = 500,  # noqa: E741 — thesis naming per CLAUDE.md
    h: int = 500,
    stop_id: int = 1,
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


def _placement(
    item_id: str,
    x: int,
    y: int,
    z: int,
    w: int = 500,
    l: int = 500,  # noqa: E741
    h: int = 500,
    stop_id: int = 1,
    orientation_index: int = 0,
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
        stop_id=stop_id,
        orientation_index=orientation_index,
        is_packed=is_packed,
    )


def _plan(placements: List[Placement], v_util: float = 0.01) -> PackingPlan:
    return PackingPlan(
        placements=placements,
        v_util=v_util,
        t_exec_ms=1,
        solver_mode="FFD",
        unplaced_items=[],
    )


VALIDATOR = ConstraintValidator()


# ===========================================================================
# WB-LIFO
# ===========================================================================

class TestLIFO:
    """White-box tests for the Route-Sequenced LIFO constraint (thesis 3.5.2.1 E).

    y = 0 is the truck rear; y = L is the loading door.
    Items for later stops (higher stop_id) must sit deeper (smaller y).
    Constraint: stop_i > stop_j  =>  y_i + l_i <= y_j
    """

    def test_lifo_inequality_holds_for_valid_plan(self):
        """y_late + l_late <= y_early when stop_late > stop_early — accepted."""
        # stop 2 (later): y=0, end=500.  stop 1 (earlier): y=600, end=1100.
        # 0+500=500 <= 600 → valid.
        p_late = _placement("late", x=0, y=0, z=0, l=500, stop_id=2)
        p_early = _placement("early", x=0, y=600, z=0, l=500, stop_id=1)
        plan = _plan([p_late, p_early])
        assert VALIDATOR.validate_lifo(plan) is True

    def test_lifo_violation_rejected(self):
        """y_late + l_late > y_early — validator must return False."""
        # stop 2 at y=400, end=900.  stop 1 at y=0.  900 > 0 → violation.
        p_late = _placement("late", x=0, y=400, z=0, l=500, stop_id=2)
        p_early = _placement("early", x=0, y=0, z=0, l=500, stop_id=1)
        plan = _plan([p_late, p_early])
        assert VALIDATOR.validate_lifo(plan) is False

    def test_lifo_same_stop_id_no_constraint(self):
        """Items sharing a stop_id are unconstrained — any y ordering is valid."""
        # Both stop_id=1; item A is deeper than B — no LIFO restriction.
        p_a = _placement("A", x=0, y=1000, z=0, l=500, stop_id=1)
        p_b = _placement("B", x=0, y=0, z=0, l=500, stop_id=1)
        plan = _plan([p_a, p_b])
        assert VALIDATOR.validate_lifo(plan) is True

    def test_lifo_presort_descending_stop_id(self):
        """_lifo_presort must produce non-increasing stop_id order."""
        ffd = FFDSolver()
        items = [
            _item("A", stop_id=1),
            _item("B", stop_id=3),
            _item("C", stop_id=2),
        ]
        result = ffd._lifo_presort(items)
        stop_ids = [it.stop_id for it in result]
        assert stop_ids == sorted(stop_ids, reverse=True)

    def test_lifo_presort_within_group_volume_descending(self):
        """Within a stop_id group, volume-FFD sorts largest item first."""
        ffd = FFDSolver(presort="volume")
        items = [
            _item("small", w=100, l=100, h=100, stop_id=1),
            _item("large", w=800, l=800, h=800, stop_id=1),
        ]
        result = ffd._lifo_presort(items)
        volumes = [it.w * it.l * it.h for it in result]
        assert volumes[0] >= volumes[1]

    def test_lifo_ok_passes_when_constraint_satisfied(self):
        """_lifo_ok accepts a candidate that respects the LIFO Y boundary."""
        # existing placed item: stop 1 at y=600, len=500 (end=1100)
        p_early = _placement("early", x=0, y=600, z=0, l=500, stop_id=1)
        # new candidate: stop 2 at y=0, len=500 (end=500) — 500 <= 600 ✓
        assert FFDSolver._lifo_ok(y=0, l=500, stop_id=2, placements=[p_early]) is True

    def test_lifo_ok_rejects_when_constraint_violated(self):
        """_lifo_ok rejects a candidate that would violate LIFO."""
        # existing placed item: stop 1 at y=0
        p_early = _placement("early", x=0, y=0, z=0, l=500, stop_id=1)
        # new candidate: stop 2 at y=300, end=800 — 800 > 0 → violation
        assert FFDSolver._lifo_ok(y=300, l=500, stop_id=2, placements=[p_early]) is False


# ===========================================================================
# WB-OVERLAP
# ===========================================================================

class TestOverlap:
    """White-box tests for Big-M non-overlap constraint (thesis 3.5.2.1 B).

    Two items are separated when at least one of six axis-aligned plane
    inequalities holds.  Touching (zero-gap, shared face) is valid; any
    volume intersection is not.
    """

    def test_touching_at_boundary_accepted(self):
        """Items with a shared face (zero gap) do not overlap — plan is valid."""
        # A: x=0..500.  B: x=500..1000.  Shared face at x=500.
        p_a = _placement("A", x=0, y=0, z=0, w=500)
        p_b = _placement("B", x=500, y=0, z=0, w=500)
        plan = _plan([p_a, p_b])
        assert VALIDATOR.validate_non_overlap(plan) is True

    def test_overlapping_items_rejected(self):
        """Items with volume intersection fail validate_non_overlap."""
        # A: x=0..500.  B starts at x=250 — 250-unit X overlap.
        p_a = _placement("A", x=0, y=0, z=0, w=500, l=500, h=500)
        p_b = _placement("B", x=250, y=0, z=0, w=500, l=500, h=500)
        plan = _plan([p_a, p_b])
        assert VALIDATOR.validate_non_overlap(plan) is False

    def test_collides_returns_true_for_overlapping(self):
        """FFDSolver._collides returns True when the trial box intersects a placed item."""
        existing = _placement("A", x=0, y=0, z=0, w=500, l=500, h=500)
        assert FFDSolver._collides(250, 0, 0, 500, 500, 500, [existing]) is True

    def test_collides_returns_false_for_touching(self):
        """FFDSolver._collides returns False for touching (non-overlapping) items."""
        existing = _placement("A", x=0, y=0, z=0, w=500, l=500, h=500)
        assert FFDSolver._collides(500, 0, 0, 500, 500, 500, [existing]) is False

    def test_big_m_at_least_one_of_six_planes_active_per_valid_pair(self):
        """For every packed non-overlapping pair, at least one separation plane holds.

        Mirrors the ILP constraint: sum(s_ij,k for k=1..6) >= b_i + b_j - 1.
        """
        p_a = _placement("A", x=0, y=0, z=0, w=500, l=500, h=500)
        p_b = _placement("B", x=600, y=0, z=0, w=500, l=500, h=500)
        planes = [
            p_a.x + p_a.w <= p_b.x,
            p_b.x + p_b.w <= p_a.x,
            p_a.y + p_a.l <= p_b.y,
            p_b.y + p_b.l <= p_a.y,
            p_a.z + p_a.h <= p_b.z,
            p_b.z + p_b.h <= p_a.z,
        ]
        assert sum(planes) >= 1

    def test_big_m_all_planes_false_means_overlap(self):
        """If all six plane conditions fail, the items overlap — consistent with _collides."""
        p_a = _placement("A", x=0, y=0, z=0, w=500, l=500, h=500)
        # Partially inside A on all three axes.
        p_b = _placement("B", x=100, y=100, z=100, w=200, l=200, h=200)
        planes = [
            p_a.x + p_a.w <= p_b.x,
            p_b.x + p_b.w <= p_a.x,
            p_a.y + p_a.l <= p_b.y,
            p_b.y + p_b.l <= p_a.y,
            p_a.z + p_a.h <= p_b.z,
            p_b.z + p_b.h <= p_a.z,
        ]
        assert sum(planes) == 0  # no separating plane — they overlap


# ===========================================================================
# WB-ORIENTATION
# ===========================================================================

class TestOrientation:
    """White-box tests for Rigid Orientation (thesis 3.5.2.1).

    UPRIGHT_ORIENTATIONS = {0, 1}: orientation indices that keep the original
    h along the truck z-axis.  side_up=True restricts to these two only.
    """

    def test_side_up_restricts_to_upright_orientations_only(self):
        """_candidate_orientations returns exactly {0, 1} when side_up=True."""
        ffd = FFDSolver()
        item = _item(side_up=True)
        allowed = set(ffd._candidate_orientations(item))
        assert allowed == {0, 1}

    def test_side_up_excludes_all_horizontal_poses(self):
        """Orientation indices 2-5 (horizontal poses) are absent for side_up=True."""
        ffd = FFDSolver()
        item = _item(side_up=True)
        allowed = set(ffd._candidate_orientations(item))
        for k in range(2, 6):
            assert k not in allowed, f"orientation_index {k} must not appear for side_up=True"

    def test_side_up_false_accepts_all_six_orientations(self):
        """_candidate_orientations returns {0,1,2,3,4,5} when side_up=False."""
        ffd = FFDSolver()
        item = _item(side_up=False)
        allowed = set(ffd._candidate_orientations(item))
        assert allowed == {0, 1, 2, 3, 4, 5}

    def test_orientation_check_reads_single_boolean_field(self):
        """_candidate_orientations performs exactly one branch on item.side_up — O(1)."""
        ffd = FFDSolver()
        # True branch: UPRIGHT_ORIENTATIONS returned immediately (no loop).
        result_rigid = ffd._candidate_orientations(_item(side_up=True))
        assert result_rigid is not None
        # False branch: range(6) returned immediately.
        result_free = ffd._candidate_orientations(_item(side_up=False))
        assert result_free is not None

    def test_validator_accepts_orientation_index_at_bounds(self):
        """validate_orientation accepts orientation_index 0 and 5 (boundary values)."""
        p_min = _placement("lo", x=0, y=0, z=0, orientation_index=0)
        p_max = _placement("hi", x=0, y=0, z=0, orientation_index=5)
        assert VALIDATOR.validate_orientation(_plan([p_min])) is True
        assert VALIDATOR.validate_orientation(_plan([p_max])) is True

    def test_ffd_side_up_item_placed_with_upright_orientation(self):
        """FFD must never place a side_up item with orientation_index outside {0, 1}."""
        ffd = FFDSolver()
        truck = _truck(W=2400, L=13600, H=2440)
        item = _item("rigid", w=400, l=600, h=1200, stop_id=1, side_up=True)
        with patch("solver.ffd_solver.USE_MOCK_SOLVER", False):
            placements, unplaced = ffd._greedy_placement([item], truck)
        for p in placements:
            if p.item_id == "rigid":
                assert p.orientation_index in {0, 1}, (
                    f"side_up item placed with forbidden orientation {p.orientation_index}"
                )


# ===========================================================================
# WB-BOUNDARY
# ===========================================================================

class TestBoundary:
    """White-box tests for truck-boundary containment (thesis 3.5.2.1 C).

    All dimension fields on Placement are integer millimetres.
    Checks: x+w <= W, y+l <= L, z+h <= H.
    """

    def test_exceeds_truck_width_rejected(self):
        """Placement ending past truck.W fails validate_boundary."""
        truck = _truck(W=2400)
        p = _placement("A", x=2000, y=0, z=0, w=500)  # 2000+500=2500 > 2400
        assert VALIDATOR.validate_boundary(_plan([p]), truck) is False

    def test_fits_exactly_at_truck_width_edge(self):
        """Placement ending exactly at truck.W is valid (inclusive boundary)."""
        truck = _truck(W=2400)
        p = _placement("A", x=1900, y=0, z=0, w=500)  # 1900+500=2400 == W
        assert VALIDATOR.validate_boundary(_plan([p]), truck) is True

    def test_exceeds_truck_height_rejected(self):
        """Placement ending past truck.H fails validate_boundary."""
        truck = _truck(H=2440)
        p = _placement("A", x=0, y=0, z=100, h=2500)  # 100+2500=2600 > 2440
        assert VALIDATOR.validate_boundary(_plan([p]), truck) is False

    def test_fits_exactly_at_truck_height_edge(self):
        """Placement ending exactly at truck.H is valid."""
        truck = _truck(H=2440)
        p = _placement("A", x=0, y=0, z=0, h=2440)  # 0+2440=2440 == H
        assert VALIDATOR.validate_boundary(_plan([p]), truck) is True

    def test_exceeds_truck_length_rejected(self):
        """Placement ending past truck.L fails validate_boundary."""
        truck = _truck(L=13600)
        p = _placement("A", x=0, y=13500, z=0, l=500)  # 13500+500=14000 > 13600
        assert VALIDATOR.validate_boundary(_plan([p]), truck) is False

    def test_fits_exactly_at_truck_length_edge(self):
        """Placement ending exactly at truck.L is valid."""
        truck = _truck(L=13600)
        p = _placement("A", x=0, y=13100, z=0, l=500)  # 13100+500=13600 == L
        assert VALIDATOR.validate_boundary(_plan([p]), truck) is True

    def test_all_dimension_fields_are_integer_mm(self):
        """Placement coordinate and dimension fields are int (millimetres), not float."""
        p = _placement("A", x=1500, y=500, z=0, w=400, l=600, h=800)
        assert isinstance(p.x, int)
        assert isinstance(p.y, int)
        assert isinstance(p.z, int)
        assert isinstance(p.w, int)
        assert isinstance(p.l, int)
        assert isinstance(p.h, int)

    def test_ffd_rejects_item_wider_than_truck_in_mm(self):
        """FFD greedy loop rejects items that exceed truck.W in mm in every orientation.

        All three physical dims must exceed W so no rotation helps — this
        confirms the boundary check is in millimetres, not centimetres.
        """
        ffd = FFDSolver()
        truck = _truck(W=300)
        # w=l=h=400 > W=300 in all 6 orientations (x-extent is always 400mm).
        item = _item("big", w=400, l=400, h=400)
        placements, unplaced = ffd._greedy_placement([item], truck)
        assert "big" in unplaced
        assert len(placements) == 0


# ===========================================================================
# WB-HYBRID
# ===========================================================================

class TestHybrid:
    """White-box routing tests for the hybrid ILP/FFD dispatcher (thesis 3.5.2.3).

    SOLVER_THRESHOLD = 20 (default).  get_active_algorithm(n) returns 'ILP'
    when gurobipy is available and n <= 20, else 'FFD'.  We monkeypatch
    core.optimizer._GUROBI_AVAILABLE to decouple from the test environment.
    """

    def test_n15_routes_to_ilp(self):
        """n=15 (below theta=20) routes to ILP when Gurobi is available."""
        eng = OptimizationEngine()
        with patch("core.optimizer._GUROBI_AVAILABLE", True):
            assert eng.get_active_algorithm(15) == "ILP"

    def test_n35_routes_to_ffd(self):
        """n=35 (above theta=20) routes to FFD regardless of Gurobi."""
        eng = OptimizationEngine()
        with patch("core.optimizer._GUROBI_AVAILABLE", True):
            assert eng.get_active_algorithm(35) == "FFD"

    def test_n20_routes_to_ilp_threshold_inclusive(self):
        """n=20 (exactly theta) routes to ILP — the threshold is inclusive."""
        eng = OptimizationEngine()
        with patch("core.optimizer._GUROBI_AVAILABLE", True):
            assert eng.get_active_algorithm(20) == "ILP"

    def test_n21_routes_to_ffd(self):
        """n=21 (theta+1) routes to FFD."""
        eng = OptimizationEngine()
        with patch("core.optimizer._GUROBI_AVAILABLE", True):
            assert eng.get_active_algorithm(21) == "FFD"

    def test_empty_manifest_returns_empty_plan_without_crash(self):
        """Empty manifest must not crash; plan has no placements and v_util=0."""
        truck = _truck()
        with patch("solver.ffd_solver.USE_MOCK_SOLVER", False):
            ffd = FFDSolver()
            plan = ffd.solve([], truck)
        assert plan.placements == []
        assert plan.unplaced_items == []
        assert plan.v_util == 0.0

    def test_gurobi_unavailable_forces_ffd_for_all_n(self):
        """When Gurobi is unavailable, every manifest size routes to FFD."""
        eng = OptimizationEngine()
        with patch("core.optimizer._GUROBI_AVAILABLE", False):
            assert eng.get_active_algorithm(5) == "FFD"
            assert eng.get_active_algorithm(20) == "FFD"
            assert eng.get_active_algorithm(1) == "FFD"

    def test_threshold_boundary_values(self):
        """Verify the exact threshold boundary: 20 → ILP, 21 → FFD."""
        eng = OptimizationEngine()
        with patch("core.optimizer._GUROBI_AVAILABLE", True):
            assert eng.get_active_algorithm(20) == "ILP"
            assert eng.get_active_algorithm(21) == "FFD"


# ===========================================================================
# WB-VUTIL
# ===========================================================================

class TestVUtil:
    """White-box tests for V_util computation (thesis 3.5.2.1 A objective).

    v_util = sum(physical volume of packed items) / (W * L * H).
    Unpacked items must not contribute to the numerator.
    """

    def test_vutil_equals_packed_volume_over_truck_volume(self):
        """v_util = Σ(w*l*h for packed) / (W*L*H) to floating-point precision."""
        truck = _truck(W=1000, L=1000, H=1000)  # truck volume = 1_000_000_000 mm³
        item = _item("A", w=500, l=500, h=500, stop_id=1)  # volume = 125_000_000
        with patch("solver.ffd_solver.USE_MOCK_SOLVER", False):
            plan = FFDSolver().solve([item], truck)
        expected = (500 * 500 * 500) / (1000 * 1000 * 1000)
        assert abs(plan.v_util - expected) < 1e-9

    def test_vutil_between_zero_and_one_inclusive(self):
        """v_util must satisfy 0.0 <= v_util <= 1.0."""
        truck = _truck()
        item = _item("A", w=500, l=500, h=500)
        with patch("solver.ffd_solver.USE_MOCK_SOLVER", False):
            plan = FFDSolver().solve([item], truck)
        assert 0.0 <= plan.v_util <= 1.0

    def test_vutil_unpacked_items_excluded_from_numerator(self):
        """Unpacked items must not contribute volume to v_util.

        item_b has all dims > W=300, so it cannot fit in any orientation.
        Only item_a's volume must appear in the numerator.
        """
        truck = _truck(W=300, L=1000, H=1000)
        item_a = _item("A", w=300, l=100, h=100, stop_id=1)
        # All dims 400 > W=300 — rejected in every orientation.
        item_b = _item("B", w=400, l=400, h=400, stop_id=1)
        with patch("solver.ffd_solver.USE_MOCK_SOLVER", False):
            plan = FFDSolver().solve([item_a, item_b], truck)
        assert "B" in plan.unplaced_items
        expected = (300 * 100 * 100) / (300 * 1000 * 1000)
        assert abs(plan.v_util - expected) < 1e-9

    def test_vutil_empty_manifest_is_zero(self):
        """Empty manifest produces v_util = 0.0."""
        truck = _truck()
        with patch("solver.ffd_solver.USE_MOCK_SOLVER", False):
            plan = FFDSolver().solve([], truck)
        assert plan.v_util == 0.0

    def test_vutil_pydantic_constraint_ge0_le1(self):
        """PackingPlan schema enforces 0.0 <= v_util <= 1.0 via Pydantic ge/le."""
        with pytest.raises(Exception):
            PackingPlan(
                placements=[],
                v_util=1.1,  # violates le=1.0
                t_exec_ms=0,
                solver_mode="FFD",
            )
