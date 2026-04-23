"""Runtime settings loaded from .env via python-dotenv.

Cross-platform: all paths resolve through pathlib.Path so the same code works on
Windows and macOS without modification.
"""

from __future__ import annotations

import os
from pathlib import Path

from dotenv import load_dotenv

load_dotenv(Path(__file__).parent.parent / ".env")

USE_MOCK_SOLVER: bool = os.getenv("USE_MOCK_SOLVER", "True") == "True"
SOLVER_THRESHOLD: int = int(os.getenv("SOLVER_THRESHOLD", "20"))
REDIS_URL: str = os.getenv("REDIS_URL", "redis://localhost:6379")
DATABASE_URL: str = os.getenv("DATABASE_URL", "postgresql://localhost/flow3d")

MOCK_PLAN_PATH: Path = Path(__file__).parent.parent / "docs" / "mockPlan.json"
