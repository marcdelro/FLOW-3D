"""HTTP route handlers for the FLOW-3D DSS."""

from __future__ import annotations

import uuid
from typing import Dict

from fastapi import APIRouter, HTTPException

from api.models import PackingPlan, SolveRequest
from core.optimizer import OptimizationEngine

router = APIRouter(prefix="/api")

_engine = OptimizationEngine()
_jobs: Dict[str, PackingPlan] = {}


@router.post("/solve")
def post_solve(request: SolveRequest) -> Dict[str, str]:
    job_id = str(uuid.uuid4())
    plan = _engine.optimize(request.items, request.truck)
    _jobs[job_id] = plan
    return {"job_id": job_id, "status": "queued"}


@router.get("/result/{job_id}")
def get_result(job_id: str) -> Dict[str, object]:
    plan = _jobs.get(job_id)
    if plan is None:
        raise HTTPException(status_code=404, detail="job_id not found")
    return {"status": "done", "plan": plan.model_dump()}
