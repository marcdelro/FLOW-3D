"""HTTP route handlers for the FLOW-3D DSS."""

from __future__ import annotations

import uuid
from typing import Any, Dict

from celery.result import AsyncResult
from fastapi import APIRouter, HTTPException

from api.models import PackingPlan, SolveRequest
from worker.tasks import solve_task

router = APIRouter(prefix="/api")


@router.post("/solve", status_code=202)
def post_solve(request: SolveRequest) -> Dict[str, str]:
    """Enqueue a solve job and return the job_id immediately (<100 ms)."""
    job_id = str(uuid.uuid4())
    solve_task.apply_async(args=[request.model_dump()], task_id=job_id)
    return {"job_id": job_id, "status": "queued"}


@router.get("/result/{job_id}")
def get_result(job_id: str) -> Dict[str, Any]:
    """Poll for job status. Returns pending / done / failed + plan or detail."""
    result: AsyncResult = solve_task.AsyncResult(job_id)

    state = result.state  # PENDING | STARTED | SUCCESS | FAILURE

    if state in ("PENDING", "STARTED"):
        return {"status": "pending", "job_id": job_id}

    if state == "SUCCESS":
        payload: dict = result.result  # dict returned by solve_task
        if payload["status"] == "failed":
            raise HTTPException(
                status_code=422,
                detail={
                    "message": "Solver produced an infeasible plan.",
                    "detail": payload.get("detail"),
                    "failed_check": payload.get("failed_check"),
                },
            )
        plan = PackingPlan.model_validate(payload["plan"])
        return {"status": "done", "plan": plan.model_dump()}

    # FAILURE = unhandled exception inside the task (should not happen normally)
    raise HTTPException(
        status_code=422,
        detail={"message": "Solver task raised an unexpected error.", "detail": str(result.result)},
    )
