"""Celery application instance for FLOW-3D async job processing."""

from __future__ import annotations

import sys
from pathlib import Path

from celery import Celery

# Ensure backend/ is in sys.path so imports work from worker/ subdirectory
sys.path.insert(0, str(Path(__file__).parent.parent))

import settings

celery_app = Celery(
    "flow3d",
    broker=settings.REDIS_URL,
    backend=settings.REDIS_URL,
    include=["worker.tasks"],
)

celery_app.conf.update(
    task_serializer="json",
    result_serializer="json",
    accept_content=["json"],
    result_expires=3600,
    task_track_started=True,
)
