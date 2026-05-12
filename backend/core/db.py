"""SQLAlchemy engine, table definitions, and DB helpers.

Tables:
  job_logs   — every solve job for thesis ANOVA benchmarking (section 3.6).
  users      — user accounts managed by the admin panel.
  audit_logs — admin-panel actions (login, user CRUD, password changes).
"""

from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

import sqlalchemy as sa

import settings

logger = logging.getLogger(__name__)

_engine = sa.create_engine(settings.DATABASE_URL, pool_pre_ping=True)

metadata = sa.MetaData()

# ── Existing table ─────────────────────────────────────────────────────────────

job_logs = sa.Table(
    "job_logs",
    metadata,
    sa.Column("id",           sa.Integer,              primary_key=True, autoincrement=True),
    sa.Column("job_id",       sa.String(36),            nullable=False,   index=True),
    sa.Column("solver_mode",  sa.String(8),             nullable=False),
    sa.Column("n_items",      sa.Integer,               nullable=False),
    sa.Column("v_util",       sa.Float,                 nullable=False),
    sa.Column("t_exec_ms",    sa.Integer,               nullable=False),
    sa.Column("status",       sa.String(8),             nullable=False),
    sa.Column("failed_check", sa.String(32),            nullable=True),
    sa.Column("error",        sa.Text,                  nullable=True),
    sa.Column("created_at",   sa.DateTime(timezone=True), nullable=False),
)

# ── Auth tables ────────────────────────────────────────────────────────────────

users = sa.Table(
    "users",
    metadata,
    sa.Column("id",                   sa.Integer,              primary_key=True, autoincrement=True),
    sa.Column("username",             sa.String(64),            nullable=False,   unique=True, index=True),
    sa.Column("hashed_password",      sa.String(256),           nullable=False),
    sa.Column("role",                 sa.String(16),            nullable=False,   server_default="user"),
    sa.Column("is_active",            sa.Boolean,               nullable=False,   server_default=sa.true()),
    sa.Column("must_change_password", sa.Boolean,               nullable=False,   server_default=sa.false()),
    sa.Column("created_at",           sa.DateTime(timezone=True), nullable=False),
    sa.Column("last_login",           sa.DateTime(timezone=True), nullable=True),
)

audit_logs = sa.Table(
    "audit_logs",
    metadata,
    sa.Column("id",           sa.Integer,              primary_key=True, autoincrement=True),
    sa.Column("username",     sa.String(64),            nullable=False),
    sa.Column("action",       sa.String(32),            nullable=False),
    sa.Column("performed_by", sa.String(64),            nullable=True),
    sa.Column("ip_address",   sa.String(45),            nullable=True),
    sa.Column("detail",       sa.Text,                  nullable=True),
    sa.Column("created_at",   sa.DateTime(timezone=True), nullable=False),
)

# ── Lifecycle ──────────────────────────────────────────────────────────────────

def create_tables() -> None:
    """Create all tables if they don't exist. Called once at app startup."""
    try:
        metadata.create_all(_engine)
    except Exception as exc:
        logger.warning("DB table creation failed (non-fatal): %s", exc)


def seed_admin(hashed_password: str) -> None:
    """Insert the default admin account if no users exist yet."""
    try:
        with _engine.begin() as conn:
            count = conn.execute(sa.select(sa.func.count()).select_from(users)).scalar()
            if count == 0:
                conn.execute(users.insert().values(
                    username="admin",
                    hashed_password=hashed_password,
                    role="admin",
                    is_active=True,
                    must_change_password=False,
                    created_at=datetime.now(timezone.utc),
                    last_login=None,
                ))
                logger.info("Seeded default admin account.")
    except Exception as exc:
        logger.warning("seed_admin failed (non-fatal): %s", exc)

# ── job_logs helper (unchanged) ────────────────────────────────────────────────

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

# ── users helpers ──────────────────────────────────────────────────────────────

def get_user_by_username(username: str) -> Optional[Dict[str, Any]]:
    with _engine.connect() as conn:
        row = conn.execute(
            sa.select(users).where(users.c.username == username)
        ).mappings().first()
        return dict(row) if row else None


def get_user_by_id(user_id: int) -> Optional[Dict[str, Any]]:
    with _engine.connect() as conn:
        row = conn.execute(
            sa.select(users).where(users.c.id == user_id)
        ).mappings().first()
        return dict(row) if row else None


def list_users() -> List[Dict[str, Any]]:
    with _engine.connect() as conn:
        rows = conn.execute(
            sa.select(users).order_by(users.c.created_at.desc())
        ).mappings().all()
        return [dict(r) for r in rows]


def create_user(
    username: str,
    hashed_password: str,
    role: str = "user",
    must_change_password: bool = True,
) -> Dict[str, Any]:
    with _engine.begin() as conn:
        result = conn.execute(
            users.insert().values(
                username=username,
                hashed_password=hashed_password,
                role=role,
                is_active=True,
                must_change_password=must_change_password,
                created_at=datetime.now(timezone.utc),
                last_login=None,
            ).returning(*users.c)
        )
        row = result.mappings().first()
        return dict(row)


def update_user(user_id: int, **kwargs: Any) -> Optional[Dict[str, Any]]:
    with _engine.begin() as conn:
        conn.execute(
            users.update().where(users.c.id == user_id).values(**kwargs)
        )
    return get_user_by_id(user_id)


def deactivate_user(user_id: int) -> None:
    with _engine.begin() as conn:
        conn.execute(
            users.update().where(users.c.id == user_id).values(is_active=False)
        )


def reactivate_user(user_id: int) -> None:
    with _engine.begin() as conn:
        conn.execute(
            users.update().where(users.c.id == user_id).values(is_active=True)
        )


def touch_last_login(username: str) -> None:
    with _engine.begin() as conn:
        conn.execute(
            users.update()
            .where(users.c.username == username)
            .values(last_login=datetime.now(timezone.utc))
        )

# ── audit_logs helpers ─────────────────────────────────────────────────────────

def write_audit_log(
    *,
    username: str,
    action: str,
    performed_by: Optional[str] = None,
    ip_address: Optional[str] = None,
    detail: Optional[str] = None,
) -> None:
    try:
        with _engine.begin() as conn:
            conn.execute(audit_logs.insert().values(
                username=username,
                action=action,
                performed_by=performed_by,
                ip_address=ip_address,
                detail=detail,
                created_at=datetime.now(timezone.utc),
            ))
    except Exception as exc:
        logger.warning("audit_log insert failed (non-fatal): %s", exc)


def list_audit_logs(limit: int = 200) -> List[Dict[str, Any]]:
    with _engine.connect() as conn:
        rows = conn.execute(
            sa.select(audit_logs)
            .order_by(audit_logs.c.created_at.desc())
            .limit(limit)
        ).mappings().all()
        return [dict(r) for r in rows]
