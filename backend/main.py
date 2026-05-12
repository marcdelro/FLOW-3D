"""FastAPI entry point for the FLOW-3D DSS backend."""

from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from api.admin_routes import router as admin_router
from api.auth_routes import router as auth_router
from api.routes import router as api_router
from core.auth import hash_password
from core.db import create_tables, seed_admin


@asynccontextmanager
async def lifespan(app: FastAPI):
    create_tables()
    seed_admin(hash_password("admin123"))
    yield


app = FastAPI(title="FLOW-3D", version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(admin_router)
app.include_router(api_router)
