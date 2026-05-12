"""Runtime settings loaded from .env via python-dotenv.

Cross-platform: all paths resolve through pathlib.Path so the same code works on
Windows and macOS without modification.
"""

from __future__ import annotations

import os
from pathlib import Path
from typing import Optional

from dotenv import load_dotenv

load_dotenv(Path(__file__).parent.parent / ".env")


def _optional_float(name: str) -> Optional[float]:
    raw = os.getenv(name)
    if raw is None or raw == "":
        return None
    return float(raw)


def _optional_int(name: str) -> Optional[int]:
    raw = os.getenv(name)
    if raw is None or raw == "":
        return None
    return int(raw)


USE_MOCK_SOLVER: bool = os.getenv("USE_MOCK_SOLVER", "True") == "True"

# Auth
JWT_SECRET: str    = os.getenv("JWT_SECRET", "change-me-in-production-please")
JWT_ALGORITHM: str = "HS256"
JWT_EXPIRE_MINUTES: int = int(os.getenv("JWT_EXPIRE_MINUTES", "480"))
SOLVER_THRESHOLD: int = int(os.getenv("SOLVER_THRESHOLD", "20"))
REDIS_URL: str = os.getenv("REDIS_URL", "redis://localhost:6379")
DATABASE_URL: str = os.getenv("DATABASE_URL", "postgresql://localhost/flow3d")

# Gurobi tuning knobs — read once at import. None means "leave Gurobi default".
GUROBI_TIME_LIMIT: Optional[float] = _optional_float("GUROBI_TIME_LIMIT")
GUROBI_MIP_GAP: Optional[float] = _optional_float("GUROBI_MIP_GAP")
GUROBI_THREADS: Optional[int] = _optional_int("GUROBI_THREADS")
GUROBI_OUTPUT_FLAG: int = int(os.getenv("GUROBI_OUTPUT_FLAG", "0"))

MOCK_PLAN_PATH: Path = Path(__file__).parent.parent / "docs" / "mockPlan.json"
