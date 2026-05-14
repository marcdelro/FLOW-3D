"""Admin-only routes: user management and audit log."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel

from api.deps import require_admin
from core.auth import hash_password
from core.db import (
    create_user,
    deactivate_user,
    get_user_by_id,
    get_user_by_username,
    list_audit_logs,
    list_users,
    reactivate_user,
    update_user,
    write_audit_log,
)

router = APIRouter(prefix="/api/admin", tags=["admin"])


# ── Pydantic shapes ────────────────────────────────────────────────────────────

def _fmt(dt: Optional[datetime]) -> Optional[str]:
    if dt is None:
        return None
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.isoformat()


class UserOut(BaseModel):
    id: int
    username: str
    role: str
    is_active: bool
    created_at: str
    last_login: Optional[str]

    @classmethod
    def from_row(cls, row: Dict[str, Any]) -> "UserOut":
        return cls(
            id=row["id"],
            username=row["username"],
            role=row["role"],
            is_active=row["is_active"],
            created_at=_fmt(row["created_at"]) or "",
            last_login=_fmt(row.get("last_login")),
        )


class LogOut(BaseModel):
    id: int
    username: str
    action: str
    performed_by: Optional[str]
    ip_address: Optional[str]
    detail: Optional[str]
    created_at: str

    @classmethod
    def from_row(cls, row: Dict[str, Any]) -> "LogOut":
        return cls(
            id=row["id"],
            username=row["username"],
            action=row["action"],
            performed_by=row.get("performed_by"),
            ip_address=row.get("ip_address"),
            detail=row.get("detail"),
            created_at=_fmt(row["created_at"]) or "",
        )


class CreateUserRequest(BaseModel):
    username: str
    password: str
    role: str = "user"


class UpdateUserRequest(BaseModel):
    username: Optional[str] = None
    password: Optional[str] = None
    role: Optional[str] = None


# ── Endpoints ──────────────────────────────────────────────────────────────────

@router.get("/users", response_model=List[UserOut])
def get_users(admin: Dict[str, Any] = Depends(require_admin)) -> List[UserOut]:
    return [UserOut.from_row(r) for r in list_users()]


@router.post("/users", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def post_user(
    body: CreateUserRequest,
    request: Request,
    admin: Dict[str, Any] = Depends(require_admin),
) -> UserOut:
    uname = body.username.strip().lower()
    if not uname:
        raise HTTPException(status_code=400, detail="Username cannot be empty.")
    if get_user_by_username(uname):
        raise HTTPException(status_code=409, detail="Username already taken.")

    row = create_user(
        username=uname,
        hashed_password=hash_password(body.password),
        role=body.role,
        must_change_password=True,
    )
    write_audit_log(
        username=uname,
        action="user_created",
        performed_by=admin["username"],
        ip_address=request.client.host if request.client else None,
        detail="New account created — must change password on first login",
    )
    return UserOut.from_row(row)


@router.put("/users/{user_id}", response_model=UserOut)
def put_user(
    user_id: int,
    body: UpdateUserRequest,
    request: Request,
    admin: Dict[str, Any] = Depends(require_admin),
) -> UserOut:
    target = get_user_by_id(user_id)
    if not target:
        raise HTTPException(status_code=404, detail="User not found.")

    kwargs: Dict[str, Any] = {}
    if body.username is not None:
        uname = body.username.strip().lower()
        existing = get_user_by_username(uname)
        if existing and existing["id"] != user_id:
            raise HTTPException(status_code=409, detail="Username already taken.")
        kwargs["username"] = uname
    if body.password:
        kwargs["hashed_password"] = hash_password(body.password)
    if body.role is not None:
        kwargs["role"] = body.role

    if not kwargs:
        raise HTTPException(status_code=400, detail="Nothing to update.")

    updated = update_user(user_id, **kwargs)
    write_audit_log(
        username=updated["username"],
        action="user_modified",
        performed_by=admin["username"],
        ip_address=request.client.host if request.client else None,
        detail="Account details updated",
    )
    return UserOut.from_row(updated)


@router.delete("/users/{user_id}", status_code=200)
def delete_user(
    user_id: int,
    request: Request,
    admin: Dict[str, Any] = Depends(require_admin),
) -> Dict[str, str]:
    target = get_user_by_id(user_id)
    if not target:
        raise HTTPException(status_code=404, detail="User not found.")
    if target["role"] == "admin":
        raise HTTPException(status_code=400, detail="Admin accounts cannot be deactivated.")

    deactivate_user(user_id)
    write_audit_log(
        username=target["username"],
        action="user_deactivated",
        performed_by=admin["username"],
        ip_address=request.client.host if request.client else None,
        detail="Account deactivated",
    )
    return {"message": f"User '{target['username']}' deactivated."}


@router.post("/users/{user_id}/reactivate", response_model=UserOut)
def reactivate_user_endpoint(
    user_id: int,
    request: Request,
    admin: Dict[str, Any] = Depends(require_admin),
) -> UserOut:
    target = get_user_by_id(user_id)
    if not target:
        raise HTTPException(status_code=404, detail="User not found.")
    if target["is_active"]:
        raise HTTPException(status_code=400, detail="User is already active.")

    reactivate_user(user_id)
    write_audit_log(
        username=target["username"],
        action="user_reactivated",
        performed_by=admin["username"],
        ip_address=request.client.host if request.client else None,
        detail="Account reactivated by admin",
    )
    return UserOut.from_row(get_user_by_id(user_id))


@router.post("/users/{user_id}/force-reset", response_model=UserOut)
def force_password_reset(
    user_id: int,
    request: Request,
    admin: Dict[str, Any] = Depends(require_admin),
) -> UserOut:
    target = get_user_by_id(user_id)
    if not target:
        raise HTTPException(status_code=404, detail="User not found.")
    if target["role"] == "admin" and target["id"] == admin["id"]:
        raise HTTPException(status_code=400, detail="Cannot force-reset your own account.")

    updated = update_user(user_id, must_change_password=True)
    write_audit_log(
        username=target["username"],
        action="force_password_reset",
        performed_by=admin["username"],
        ip_address=request.client.host if request.client else None,
        detail="Admin forced password reset on next login",
    )
    return UserOut.from_row(updated)


@router.get("/logs", response_model=List[LogOut])
def get_logs(admin: Dict[str, Any] = Depends(require_admin)) -> List[LogOut]:
    return [LogOut.from_row(r) for r in list_audit_logs(limit=200)]
