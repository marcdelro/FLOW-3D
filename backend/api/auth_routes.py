"""Authentication routes: login and change-password."""

from __future__ import annotations

from typing import Any, Dict

from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel

from api.deps import get_current_user
from core.auth import create_access_token, hash_password, verify_password
from core.db import get_user_by_username, touch_last_login, update_user, write_audit_log

router = APIRouter(prefix="/api/auth", tags=["auth"])


class LoginRequest(BaseModel):
    username: str
    password: str


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    must_change_password: bool


class ChangePasswordRequest(BaseModel):
    new_password: str


@router.post("/login", response_model=LoginResponse)
def login(body: LoginRequest, request: Request) -> LoginResponse:
    ip = request.client.host if request.client else None
    user = get_user_by_username(body.username.strip().lower())

    if not user or not user["is_active"] or not verify_password(body.password, user["hashed_password"]):
        write_audit_log(
            username=body.username.strip().lower(),
            action="login_fail",
            ip_address=ip,
            detail="Invalid credentials",
        )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password.",
        )

    touch_last_login(user["username"])
    write_audit_log(username=user["username"], action="login_ok", ip_address=ip)

    token = create_access_token({"sub": user["username"], "role": user["role"]})
    return LoginResponse(
        access_token=token,
        must_change_password=bool(user["must_change_password"]),
    )


@router.post("/change-password", status_code=200)
def change_password(
    body: ChangePasswordRequest,
    current_user: Dict[str, Any] = Depends(get_current_user),
) -> Dict[str, str]:
    if len(body.new_password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters.")

    update_user(
        current_user["id"],
        hashed_password=hash_password(body.new_password),
        must_change_password=False,
    )
    write_audit_log(
        username=current_user["username"],
        action="password_changed",
        detail="Password updated via first-login flow",
    )
    return {"message": "Password updated."}
