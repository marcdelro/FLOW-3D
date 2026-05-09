"""Shared pytest fixtures for the FLOW-3D test suite.

Live-pipeline tests (test_integration_solve.py, test_smoke.py) hit the API
route, which calls `solve_task.AsyncResult(job_id).state` — that lookup
goes to the configured result backend (Redis). Eager Celery alone is not
enough; if Redis is unreachable on localhost:6379 we skip those tests
with a clear message so a developer without Docker still gets a clean
suite. To run the live tests, start Redis first
(see README "Redis setup").
"""

from __future__ import annotations

import socket

import pytest

from worker.celery_app import celery_app

LIVE_PIPELINE_TESTS = (
    "test_integration_solve.py",
    "test_smoke.py",
    "test_smoke_audit_fixes.py",
)


def _redis_alive(host: str = "localhost", port: int = 6379) -> bool:
    s = socket.socket()
    s.settimeout(0.5)
    try:
        return s.connect_ex((host, port)) == 0
    finally:
        s.close()


def pytest_collection_modifyitems(config, items):
    """Skip live-pipeline tests when Redis is not running on localhost:6379."""
    if _redis_alive():
        return
    skip_marker = pytest.mark.skip(
        reason="Redis not running on localhost:6379 — start Redis to run live tests."
    )
    for item in items:
        if any(name in item.nodeid for name in LIVE_PIPELINE_TESTS):
            item.add_marker(skip_marker)


@pytest.fixture(autouse=True)
def celery_eager():
    """Run Celery tasks synchronously so tests don't need a worker process."""
    celery_app.conf.task_always_eager = True
    celery_app.conf.task_eager_propagates = True
    celery_app.conf.task_store_eager_result = True
    yield
    celery_app.conf.task_always_eager = False
    celery_app.conf.task_eager_propagates = False
    celery_app.conf.task_store_eager_result = False
