"""End-to-end integration tests for /api/solve and /api/result.

These tests exercise the full HTTP pipeline with USE_MOCK_SOLVER=False so
the real FFDSolver / ILPSolver run, the AbstractSolver template-method
safety net invokes ConstraintValidator, and the PackingPlan contract
(api/models.py) round-trips through FastAPI.

See backend/tests/INTEGRATION_TESTS.md for the test plan and thesis-section
mapping.
"""

from __future__ import annotations

from typing import AsyncIterator, Dict
from unittest.mock import patch

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient

from api.models import PackingPlan
from core.validator import ConstraintValidator
from main import app
from worker.tasks import _engine


def _item_payload(
    item_id: str,
    w: int,
    l: int,  # noqa: E741 — thesis l_i naming per CLAUDE.md
    h: int,
    stop_id: int,
    side_up: bool = False,
    weight_kg: float = 25.0,
) -> Dict[str, object]:
    return {
        "item_id": item_id,
        "w": w,
        "l": l,
        "h": h,
        "weight_kg": weight_kg,
        "stop_id": stop_id,
        "side_up": side_up,
    }


@pytest.fixture
def live_solver() -> None:
    """Disable the mock short-circuit in BOTH solver modules for one test."""
    with patch("solver.ffd_solver.USE_MOCK_SOLVER", False), patch(
        "solver.ilp_solver.USE_MOCK_SOLVER", False
    ):
        yield


@pytest.fixture
def force_ffd() -> None:
    """Pin the engine threshold to 0 so any manifest dispatches to FFD."""
    original = _engine.threshold
    _engine.threshold = 0
    try:
        yield
    finally:
        _engine.threshold = original


@pytest.fixture
def force_ilp() -> None:
    """Pin the engine threshold high so any small manifest dispatches to ILP."""
    original = _engine.threshold
    _engine.threshold = 1000
    try:
        yield
    finally:
        _engine.threshold = original


@pytest_asyncio.fixture
async def client() -> AsyncIterator[AsyncClient]:
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as c:
        yield c


def _gurobi_available() -> bool:
    """True iff gurobipy imports AND a tiny model can solve (license check)."""
    try:
        import gurobipy as gp  # noqa: F401
        from gurobipy import GRB

        m = gp.Model("license_probe")
        m.setParam("OutputFlag", 0)
        x = m.addVar(vtype=GRB.BINARY)
        m.setObjective(x, GRB.MAXIMIZE)
        m.optimize()
        return m.Status == GRB.OPTIMAL
    except Exception:
        return False


# -- FFD path -----------------------------------------------------------------

@pytest.mark.asyncio
async def test_ffd_solve_round_trip_validates(
    client: AsyncClient, live_solver: None, force_ffd: None
) -> None:
    """Full POST /api/solve -> GET /api/result on the FFD path.

    Asserts: solver_mode == 'FFD', PackingPlan contract round-trips through
    JSON, and the returned plan independently passes ConstraintValidator
    (the safety net in AbstractSolver.solve already enforced this server
    side; we re-check from the client perspective).
    """
    payload = {
        "items": [
            _item_payload("sofa", 2000, 900, 850, stop_id=1),
            _item_payload("wardrobe", 1200, 600, 1800, stop_id=3, side_up=True),
            _item_payload("table", 1500, 900, 750, stop_id=2),
            _item_payload("desk", 1000, 600, 750, stop_id=3),
        ],
        "truck": {"W": 2400, "L": 13600, "H": 2440, "payload_kg": 3000.0},
        "stops": [
            {"stop_id": 1, "address": "Manila"},
            {"stop_id": 2, "address": "Quezon City"},
            {"stop_id": 3, "address": "Makati"},
        ],
    }

    solve = await client.post("/api/solve", json=payload)
    assert solve.status_code == 202
    job_id = solve.json()["job_id"]

    result = await client.get(f"/api/result/{job_id}")
    assert result.status_code == 200
    body = result.json()
    assert body["status"] == "done"

    plan = PackingPlan(**body["plan"])
    assert plan.solver_mode == "FFD"
    assert plan.unplaced_items == []
    assert 0.0 <= plan.v_util <= 1.0
    assert plan.t_exec_ms >= 0
    assert {p.item_id for p in plan.placements} == {
        "sofa", "wardrobe", "table", "desk"
    }
    assert ConstraintValidator().validate_all(
        plan, _truck_from_payload(payload["truck"])
    ) is True


@pytest.mark.asyncio
async def test_ffd_lifo_orders_later_stops_deeper_in_y(
    client: AsyncClient, live_solver: None, force_ffd: None
) -> None:
    """Thesis 3.5.2.1 E end-to-end.

    For any pair (i, j), if stop_i > stop_j then y_i + l_i <= y_j: items
    bound for later drops must sit deeper along Y so the loading door
    (y = L) reveals the next stop's items first.
    """
    payload = {
        "items": [
            _item_payload("first_drop", 800, 500, 500, stop_id=1),
            _item_payload("second_drop", 800, 500, 500, stop_id=2),
            _item_payload("third_drop", 800, 500, 500, stop_id=3),
        ],
    }
    solve = await client.post("/api/solve", json=payload)
    job_id = solve.json()["job_id"]
    plan = PackingPlan(**(await client.get(f"/api/result/{job_id}")).json()["plan"])

    by_stop = {p.stop_id: p for p in plan.placements}
    assert by_stop[3].y + by_stop[3].l <= by_stop[2].y
    assert by_stop[2].y + by_stop[2].l <= by_stop[1].y


@pytest.mark.asyncio
async def test_ffd_records_unplaced_when_item_cannot_fit(
    client: AsyncClient, live_solver: None, force_ffd: None
) -> None:
    """Oversize side_up item must land in unplaced_items, not crash the API."""
    payload = {
        "items": [
            _item_payload("oversize_rigid", 100, 100, 9999, stop_id=1, side_up=True),
            _item_payload("normal_box", 500, 500, 500, stop_id=1),
        ],
        "truck": {"W": 2400, "L": 13600, "H": 2440, "payload_kg": 3000.0},
    }
    solve = await client.post("/api/solve", json=payload)
    plan = PackingPlan(
        **(await client.get(f"/api/result/{solve.json()['job_id']}")).json()["plan"]
    )
    assert "oversize_rigid" in plan.unplaced_items
    assert any(p.item_id == "normal_box" for p in plan.placements)


@pytest.mark.asyncio
async def test_ffd_side_up_item_keeps_h_on_z_axis(
    client: AsyncClient, live_solver: None, force_ffd: None
) -> None:
    """Rigid Orientation end-to-end: side_up restricts orientation_index to {0, 1}."""
    payload = {
        "items": [_item_payload("fridge", 700, 700, 1700, stop_id=1, side_up=True)],
    }
    solve = await client.post("/api/solve", json=payload)
    plan = PackingPlan(
        **(await client.get(f"/api/result/{solve.json()['job_id']}")).json()["plan"]
    )
    placement = plan.placements[0]
    assert placement.orientation_index in {0, 1}
    assert placement.h == 1700


# -- ILP path -----------------------------------------------------------------

@pytest.mark.asyncio
@pytest.mark.skipif(
    not _gurobi_available(), reason="gurobipy not installed or no usable license"
)
async def test_ilp_solve_round_trip_validates(
    client: AsyncClient, live_solver: None, force_ilp: None
) -> None:
    """Full pipeline on the exact ILP path. Skipped without a Gurobi license."""
    payload = {
        "items": [
            _item_payload("box_a", 1000, 800, 700, stop_id=1),
            _item_payload("box_b", 900, 700, 600, stop_id=2),
        ],
        "truck": {"W": 2400, "L": 13600, "H": 2440, "payload_kg": 3000.0},
    }
    solve = await client.post("/api/solve", json=payload)
    plan = PackingPlan(
        **(await client.get(f"/api/result/{solve.json()['job_id']}")).json()["plan"]
    )
    assert plan.solver_mode == "ILP"
    assert ConstraintValidator().validate_all(
        plan, _truck_from_payload(payload["truck"])
    ) is True


@pytest.mark.asyncio
@pytest.mark.skipif(
    not _gurobi_available(), reason="gurobipy not installed or no usable license"
)
async def test_ilp_supports_vertical_stacking(
    client: AsyncClient, live_solver: None, force_ilp: None
) -> None:
    """Single-supporter disjunction: every packed item rests on the floor or
    on top of another packed item whose xy footprint contains it.

    Truck is sized so two same-stop boxes only fit if stacked (W and L match a
    single box). The optimum must therefore stack one on the other; the test
    asserts that exactly one item is at z=0 and the other sits at z = h_floor.
    """
    payload = {
        "items": [
            _item_payload("lower", 1000, 1000, 500, stop_id=1),
            _item_payload("upper", 1000, 1000, 500, stop_id=1),
        ],
        "truck": {"W": 1000, "L": 1000, "H": 2000, "payload_kg": 1000.0},
    }
    solve = await client.post("/api/solve", json=payload)
    plan = PackingPlan(
        **(await client.get(f"/api/result/{solve.json()['job_id']}")).json()["plan"]
    )
    assert plan.unplaced_items == []
    assert plan.solver_mode == "ILP"

    floors = [p for p in plan.placements if p.z == 0]
    stacked = [p for p in plan.placements if p.z > 0]
    assert len(floors) == 1
    assert len(stacked) == 1
    base = floors[0]
    top = stacked[0]
    # Top must rest exactly on base's top surface.
    assert top.z == base.z + base.h
    # XY footprint of top must be contained in base's footprint.
    assert top.x >= base.x
    assert top.y >= base.y
    assert top.x + top.w <= base.x + base.w
    assert top.y + top.l <= base.y + base.l


# -- helpers ------------------------------------------------------------------

def _truck_from_payload(truck_dict: Dict[str, object]):
    from api.models import TruckSpec

    return TruckSpec(**truck_dict)
