"""Smoke tests for the /api/solve and /api/result endpoints."""

from __future__ import annotations

import pytest
from httpx import ASGITransport, AsyncClient

from api.models import PackingPlan
from main import app


@pytest.mark.asyncio
async def test_post_solve_returns_job_id() -> None:
    payload = {
        "items": [
            {
                "item_id": "wardrobe_01",
                "w": 1200,
                "l": 600,
                "h": 1800,
                "weight_kg": 60.0,
                "stop_id": 1,
                "side_up": True,
            }
        ],
        "truck": {"W": 2400, "L": 13600, "H": 2440, "payload_kg": 3000.0},
        "stops": [{"stop_id": 1, "address": "Manila"}],
    }
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.post("/api/solve", json=payload)

    assert response.status_code == 202
    body = response.json()
    assert "job_id" in body


@pytest.mark.asyncio
async def test_get_result_returns_done_plan() -> None:
    payload = {
        "items": [
            {
                "item_id": "desk_01",
                "w": 1000,
                "l": 600,
                "h": 750,
                "weight_kg": 40.0,
                "stop_id": 1,
                "side_up": False,
            }
        ],
        "truck": {"W": 2400, "L": 13600, "H": 2440, "payload_kg": 3000.0},
        "stops": [{"stop_id": 1, "address": "Quezon City"}],
    }
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        solve = await client.post("/api/solve", json=payload)
        job_id = solve.json()["job_id"]
        result = await client.get(f"/api/result/{job_id}")

    assert result.status_code == 200
    body = result.json()
    assert body["status"] == "done"
    plan = PackingPlan(**body["plan"])
    assert plan.solver_mode in ("ILP", "FFD")
    assert 0.0 <= plan.v_util <= 1.0
    assert plan.t_exec_ms >= 0
