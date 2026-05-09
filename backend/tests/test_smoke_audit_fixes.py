"""Smoke tests for the post-audit fixes.

Covers three behaviours that did not exist before the audit:

1. Pydantic rejects zero/negative dimensions and negative weights at the
   API boundary (Fix 2 — gt=0 / ge=0 on FurnitureItem and TruckSpec).
2. ``Placement.model_variant`` round-trips through both solvers so the
   3D viewer renders the user's chosen variant rather than a hash
   default (Fix 1 — added field + solver pass-through).
3. ``PlanValidationError.failed_check`` is surfaced in the 422 detail
   AND passed through to ``log_job`` (Fix 3 — column added to job_logs
   and explicit kwarg in worker/tasks.py).

These tests run against the live ASGI app through an in-process
transport so they do not need a real HTTP server. The Celery eager
fixture in conftest.py runs the solve task synchronously.
"""

from __future__ import annotations

from typing import AsyncIterator, Dict
from unittest.mock import patch

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient

from api.models import PackingPlan
from main import app
from worker.tasks import _engine


@pytest_asyncio.fixture
async def client() -> AsyncIterator[AsyncClient]:
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as c:
        yield c


@pytest.fixture
def live_solver():
    """Disable the mock short-circuit in BOTH solver modules for one test."""
    with patch("solver.ffd_solver.USE_MOCK_SOLVER", False), patch(
        "solver.ilp_solver.USE_MOCK_SOLVER", False
    ):
        yield


@pytest.fixture
def force_ffd():
    """Pin the threshold low so any manifest goes through FFD."""
    original = _engine.threshold
    _engine.threshold = 0
    try:
        yield
    finally:
        _engine.threshold = original


@pytest.fixture
def force_ilp():
    """Pin the threshold high so any small manifest goes through ILP."""
    original = _engine.threshold
    _engine.threshold = 1000
    try:
        yield
    finally:
        _engine.threshold = original


def _item(item_id: str, **overrides) -> Dict[str, object]:
    base = {
        "item_id": item_id,
        "w": 600,
        "l": 600,
        "h": 600,
        "weight_kg": 20.0,
        "stop_id": 1,
        "side_up": False,
    }
    base.update(overrides)
    return base


def _truck(**overrides) -> Dict[str, object]:
    base = {"W": 2400, "L": 13600, "H": 2440, "payload_kg": 3000.0}
    base.update(overrides)
    return base


# ─── Fix 2: input validation ─────────────────────────────────────────────────


@pytest.mark.asyncio
@pytest.mark.parametrize(
    "field,bad_value",
    [("w", 0), ("w", -10), ("l", 0), ("h", 0), ("weight_kg", -1.0)],
)
async def test_solve_rejects_invalid_furniture_item(
    client: AsyncClient, field: str, bad_value: float
) -> None:
    payload = {
        "items": [_item("box_01", **{field: bad_value})],
        "truck": _truck(),
        "stops": [{"stop_id": 1, "address": "Manila"}],
    }
    response = await client.post("/api/solve", json=payload)
    # FastAPI/Pydantic returns 422 for schema violations
    assert response.status_code == 422, (
        f"expected 422 for {field}={bad_value}, got {response.status_code}: "
        f"{response.text}"
    )
    body = response.json()
    # The validation error should mention the offending field name
    assert any(field in str(err.get("loc", [])) for err in body["detail"]), (
        f"422 detail did not reference field {field!r}: {body}"
    )


@pytest.mark.asyncio
@pytest.mark.parametrize("field", ["W", "L", "H", "payload_kg"])
async def test_solve_rejects_invalid_truck_spec(
    client: AsyncClient, field: str
) -> None:
    payload = {
        "items": [_item("box_01")],
        "truck": _truck(**{field: 0}),
        "stops": [{"stop_id": 1, "address": "Manila"}],
    }
    response = await client.post("/api/solve", json=payload)
    assert response.status_code == 422
    body = response.json()
    assert any(field in str(err.get("loc", [])) for err in body["detail"])


# ─── Fix 1: model_variant round-trip ─────────────────────────────────────────


@pytest.mark.asyncio
async def test_model_variant_preserved_through_ilp(
    client: AsyncClient, live_solver, force_ilp
) -> None:
    """Whatever model_variant the user submits MUST appear on the placement
    so the 3D viewer renders the chosen catalog variant. Exercises the ILP
    path."""
    payload = {
        "items": [
            _item("box_a", model_variant=2),
            _item("box_b", model_variant=0),
            _item("box_c"),  # model_variant omitted → expect None
        ],
        "truck": _truck(),
        "stops": [{"stop_id": 1, "address": "Manila"}],
    }
    solve = await client.post("/api/solve", json=payload)
    assert solve.status_code == 202
    job_id = solve.json()["job_id"]

    result = await client.get(f"/api/result/{job_id}")
    assert result.status_code == 200, result.text
    body = result.json()
    assert body["status"] == "done"
    plan = PackingPlan(**body["plan"])
    assert plan.solver_mode == "ILP"

    by_id = {p.item_id: p for p in plan.placements}
    assert by_id["box_a"].model_variant == 2
    assert by_id["box_b"].model_variant == 0
    assert by_id["box_c"].model_variant is None


@pytest.mark.asyncio
async def test_model_variant_preserved_through_ffd(
    client: AsyncClient, live_solver, force_ffd
) -> None:
    """Same as above but on the FFD path so we cover both solvers' Placement
    construction sites."""
    payload = {
        "items": [
            _item("box_a", model_variant=3),
            _item("box_b", model_variant=1),
        ],
        "truck": _truck(),
        "stops": [{"stop_id": 1, "address": "Manila"}],
    }
    solve = await client.post("/api/solve", json=payload)
    job_id = solve.json()["job_id"]
    result = await client.get(f"/api/result/{job_id}")
    plan = PackingPlan(**result.json()["plan"])
    assert plan.solver_mode == "FFD"

    by_id = {p.item_id: p for p in plan.placements}
    assert by_id["box_a"].model_variant == 3
    assert by_id["box_b"].model_variant == 1


# ─── Fix 3: failed_check on validation failure ───────────────────────────────


@pytest.mark.asyncio
async def test_validation_failure_surfaces_failed_check(
    client: AsyncClient,
) -> None:
    """When the validator raises, the 422 response MUST carry the constraint
    label in `failed_check` so the frontend (and job_logs) can attribute the
    failure to a specific thesis-section constraint rather than a generic
    'solve failed'."""
    payload = {
        "items": [_item("box_01")],
        "truck": _truck(),
        "stops": [{"stop_id": 1, "address": "Manila"}],
    }

    # AbstractSolver.solve() calls first_failing_check; if it returns a
    # non-None label, the base raises PlanValidationError(plan, truck, label).
    # Patching this is the cleanest way to inject a deterministic failure.
    with patch(
        "core.validator.ConstraintValidator.first_failing_check",
        return_value="non_overlap",
    ):
        solve = await client.post("/api/solve", json=payload)
        job_id = solve.json()["job_id"]
        result = await client.get(f"/api/result/{job_id}")

    assert result.status_code == 422, result.text
    body = result.json()
    assert body["detail"]["failed_check"] == "non_overlap"
    # str(exc) format from PlanValidationError.__init__
    assert "non_overlap" in body["detail"]["detail"]


@pytest.mark.asyncio
async def test_validation_failure_passes_failed_check_to_log_job(
    client: AsyncClient,
) -> None:
    """The worker must call log_job with failed_check=<label> on a validation
    failure so the audit table can aggregate by constraint
    (SELECT failed_check, COUNT(*) FROM job_logs GROUP BY failed_check).
    """
    payload = {
        "items": [_item("box_01")],
        "truck": _truck(),
        "stops": [{"stop_id": 1, "address": "Manila"}],
    }

    with patch(
        "core.validator.ConstraintValidator.first_failing_check",
        return_value="fragile_stacking",
    ), patch("worker.tasks.log_job") as mock_log:
        solve = await client.post("/api/solve", json=payload)
        job_id = solve.json()["job_id"]
        await client.get(f"/api/result/{job_id}")

    assert mock_log.called, "log_job was not invoked on validation failure"
    # Find the call that recorded the failure (status=failed)
    failed_calls = [
        c for c in mock_log.call_args_list
        if c.kwargs.get("status") == "failed"
    ]
    assert failed_calls, "no log_job call with status='failed' recorded"
    assert failed_calls[-1].kwargs.get("failed_check") == "fragile_stacking"
