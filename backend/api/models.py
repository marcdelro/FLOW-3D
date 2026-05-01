"""Pydantic v2 contract models.

Field names match docs/mockPlan.json and the thesis variable naming in
CLAUDE.md exactly. All dimension fields are int (millimetres) — never float.
"""

from __future__ import annotations

from typing import List, Literal

from pydantic import BaseModel, Field

# DSS plan-selection strategies (thesis section 3.5.2 — decision support layer).
# Each strategy maps to a distinct objective trade-off: optimal = max V_util via
# ILP, balanced = fast deterministic FFD by volume, stability = FFD by weight so
# heavy items sit at the bottom (low center of gravity).
SolveStrategy = Literal["optimal", "balanced", "stability"]


class FurnitureItem(BaseModel):
    item_id: str = Field(..., description="Unique item identifier")
    w: int = Field(..., description="Width w_i in millimetres")
    l: int = Field(..., description="Length l_i in millimetres")
    h: int = Field(..., description="Height h_i in millimetres")
    weight_kg: float = Field(0.0, description="Item mass in kilograms")
    stop_id: int = Field(..., description="Delivery stop (LIFO key)")
    side_up: bool = Field(
        False,
        description="If true, restricts orientation_index to upright poses",
    )


class TruckSpec(BaseModel):
    W: int = Field(2400, description="Internal width W in millimetres")
    L: int = Field(13600, description="Internal length L in millimetres")
    H: int = Field(2440, description="Internal height H in millimetres")
    payload_kg: float = Field(3000.0, description="Maximum payload in kilograms")


class DeliveryStop(BaseModel):
    stop_id: int = Field(..., description="Chronological stop index (1 = first drop)")
    address: str = Field("", description="Human-readable delivery address")


class SolveRequest(BaseModel):
    items: List[FurnitureItem]
    truck: TruckSpec = Field(default_factory=TruckSpec)
    stops: List[DeliveryStop] = Field(default_factory=list)
    strategy: SolveStrategy = Field(
        "optimal",
        description="Plan-selection strategy: optimal | balanced | stability",
    )


class Placement(BaseModel):
    item_id: str
    x: int = Field(..., description="x_i position in millimetres")
    y: int = Field(..., description="y_i position in millimetres")
    z: int = Field(..., description="z_i position in millimetres")
    w: int = Field(..., description="Width w_i in millimetres")
    l: int = Field(..., description="Length l_i in millimetres")
    h: int = Field(..., description="Height h_i in millimetres")
    orientation_index: int = Field(..., ge=0, le=5, description="Orientation 0-5")
    stop_id: int = Field(..., description="Delivery stop id")
    is_packed: bool = Field(..., description="b_i packing status flag")


class PackingPlan(BaseModel):
    placements: List[Placement]
    v_util: float = Field(..., ge=0.0, le=1.0, description="V_util in [0, 1]")
    t_exec_ms: int = Field(..., description="T_exec in milliseconds")
    solver_mode: Literal["ILP", "FFD"]
    unplaced_items: List[str] = Field(default_factory=list)
    strategy: SolveStrategy = Field(
        "optimal",
        description="DSS strategy that produced this plan",
    )
    rationale: str = Field(
        "",
        description="Human-readable justification for choosing this plan",
    )
