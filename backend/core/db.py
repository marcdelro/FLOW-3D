"""SQLAlchemy engine and job-log table for ANOVA benchmarking.

Every solve job (ILP or FFD, success or failure) is written here so that
thesis section 3.6 ANOVA comparisons can be reproduced from raw data.
"""

from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Optional

import sqlalchemy as sa

import settings

logger = logging.getLogger(__name__)

_engine = sa.create_engine(settings.DATABASE_URL, pool_pre_ping=True)

metadata = sa.MetaData()

job_logs = sa.Table(
    "job_logs",
    metadata,
    sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
    sa.Column("job_id", sa.String(36), nullable=False, index=True),
    sa.Column("solver_mode", sa.String(8), nullable=False),
    sa.Column("n_items", sa.Integer, nullable=False),
    sa.Column("v_util", sa.Float, nullable=False),
    sa.Column("t_exec_ms", sa.Integer, nullable=False),
    sa.Column("status", sa.String(8), nullable=False),
    # Constraint label from ConstraintValidator.first_failing_check, e.g.
    # "non_overlap", "lifo", "fragile_stacking". NULL on success.
    sa.Column("failed_check", sa.String(32), nullable=True),
    sa.Column("error", sa.Text, nullable=True),
    sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
)


def create_tables() -> None:
    """Create all tables if they don't exist. Called once at app startup."""
    try:
        metadata.create_all(_engine)
    except Exception as exc:
        logger.warning("DB table creation failed (non-fatal): %s", exc)


def log_job(
    *,
    job_id: str,
    solver_mode: str,
    n_items: int,
    v_util: float,
    t_exec_ms: int,
    status: str,
    error: Optional[str] = None,
    failed_check: Optional[str] = None,
) -> None:
    """Insert one row into job_logs. Swallows DB errors so solve pipeline is unaffected."""
    try:
        with _engine.begin() as conn:
            conn.execute(
                job_logs.insert().values(
                    job_id=job_id,
                    solver_mode=solver_mode,
                    n_items=n_items,
                    v_util=v_util,
                    t_exec_ms=t_exec_ms,
                    status=status,
                    failed_check=failed_check,
                    error=error,
                    created_at=datetime.now(timezone.utc),
                )
            )
    except Exception as exc:
        logger.warning("job_log insert failed for job %s (non-fatal): %s", job_id, exc)
