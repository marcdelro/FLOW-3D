"""FastAPI dependency functions for authentication and authorisation."""

from __future__ import annotations

from typing import Any, Dict

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer

from core.auth import decode_access_token
from core.db import get_user_by_username

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")


def get_current_user(token: str = Depends(oauth2_scheme)) -> Dict[str, Any]:
    """Decode the Bearer token and return the matching active user row."""
    credentials_exc = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials.",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        from jose import JWTError
        payload = decode_access_token(token)
        username: str = payload.get("sub", "")
        if not username:
            raise credentials_exc
    except Exception:
        raise credentials_exc

    user = get_user_by_username(username)
    if not user or not user["is_active"]:
        raise credentials_exc
    return user


def require_admin(current_user: Dict[str, Any] = Depends(get_current_user)) -> Dict[str, Any]:
    """Raise 403 if the caller is not an admin."""
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required.")
    return current_user
