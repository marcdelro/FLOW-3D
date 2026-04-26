"""Shared pytest fixtures for the FLOW-3D test suite."""

from __future__ import annotations

import pytest

from worker.celery_app import celery_app


@pytest.fixture(autouse=True)
def celery_eager(monkeypatch):
    """Run Celery tasks synchronously so tests don't need a running broker."""
    celery_app.conf.task_always_eager = True
    celery_app.conf.task_eager_propagates = True
    celery_app.conf.task_store_eager_result = True
    yield
    celery_app.conf.task_always_eager = False
    celery_app.conf.task_eager_propagates = False
    celery_app.conf.task_store_eager_result = False
