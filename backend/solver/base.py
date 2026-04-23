# No HTTP imports permitted in this module — CLAUDE.md module separation rule
# Cross-platform: use pathlib.Path for all file I/O in this module
"""Abstract solver base class.

Concrete solvers (ILPSolver, FFDSolver) extend this and override solve().
load_mock() reads docs/mockPlan.json via pathlib so the same code runs on
Windows and macOS without change.
"""

from __future__ import annotations

import json
from abc import ABC, abstractmethod
from typing import List

from api.models import FurnitureItem, PackingPlan, TruckSpec
from settings import MOCK_PLAN_PATH


class AbstractSolver(ABC):
    """Contract every solver implementation must satisfy."""

    @abstractmethod
    def solve(self, items: List[FurnitureItem], truck: TruckSpec) -> PackingPlan:
        """Produce a PackingPlan for the given manifest and truck."""

    def load_mock(self) -> PackingPlan:
        """Load mockPlan.json using pathlib — works on Windows and macOS."""
        with open(MOCK_PLAN_PATH, encoding="utf-8") as f:
            return PackingPlan(**json.load(f))
