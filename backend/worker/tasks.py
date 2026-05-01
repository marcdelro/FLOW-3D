"""Celery task: runs the solver pipeline and stores the result.

The task is the only entry point into the solver from the async layer.
It returns a dict that matches the PackingPlan JSON contract defined in CLAUDE.md.
"""

from __future__ import annotations

import logging
import sys
from pathlib import Path

# Ensure backend/ is in sys.path so imports work from worker/ subdirectory
sys.path.insert(0, str(Path(__file__).parent.parent))

from api.models import PackingPlan, SolveRequest
from core.db import log_job
from core.optimizer import OptimizationEngine
from core.validator import PlanValidationError
from worker.celery_app import celery_app

logger = logging.getLogger(__name__)

_engine = OptimizationEngine()


@celery_app.task(bind=True, name="worker.tasks.solve_task")
def solve_task(self, request_dict: dict) -> dict:
    """Run solver + validator pipeline for a SolveRequest payload.

    Returns a dict with keys: status, plan (on success) or detail (on failure).
    Conforms to the async job contract used by GET /api/result/{job_id}.
    """
    try:
        request = SolveRequest.model_validate(request_dict)
        plan: PackingPlan = _engine.optimize(
            request.items, request.truck, request.strategy
        )

        log_job(
            job_id=self.request.id,
            solver_mode=plan.solver_mode,
            n_items=len(request.items),
            v_util=plan.v_util,
            t_exec_ms=plan.t_exec_ms,
            status="done",
        )

        return {"status": "done", "plan": plan.model_dump()}

    except PlanValidationError as exc:
        logger.error("Plan validation failed for job %s: %s", self.request.id, exc)
        log_job(
            job_id=self.request.id,
            solver_mode=getattr(exc.plan, "solver_mode", "unknown"),
            n_items=len(request_dict.get("items", [])),
            v_util=getattr(exc.plan, "v_util", 0.0),
            t_exec_ms=getattr(exc.plan, "t_exec_ms", 0),
            status="failed",
            error=str(exc),
        )
        return {"status": "failed", "detail": str(exc), "failed_check": exc.failed_check}

    except Exception as exc:
        logger.error("Solver error for job %s: %s", self.request.id, exc)
        log_job(
            job_id=self.request.id,
            solver_mode="unknown",
            n_items=len(request_dict.get("items", [])),
            v_util=0.0,
            t_exec_ms=0,
            status="failed",
            error=str(exc),
        )
        return {"status": "failed", "detail": str(exc)}
