"""Pydantic v2 contract models.

Field names match docs/mockPlan.json and the thesis variable naming in
CLAUDE.md exactly. All dimension fields are int (millimetres) — never float.
"""

from __future__ import annotations

from typing import List, Literal

from pydantic import BaseModel, Field

# DSS plan-selection strategies (thesis section 3.5.2 — decision support layer).
# Each strategy maps to a distinct objective trade-off:
#   optimal       — max V_util via exact ILP (Gurobi B&B for n <= threshold).
#   axle_balance  — FFD with axle-aware position picker; minimises longitudinal
#                   centre-of-mass offset so front and rear axles share load
#                   evenly (LTO axle-weight regulation friendly).
#   stability     — FFD with weight-desc presort; heavy items sit at z=0 to
#                   lower the vertical centre of gravity.
SolveStrategy = Literal["optimal", "axle_balance", "stability"]


class FurnitureItem(BaseModel):
    item_id: str = Field(..., description="Unique item identifier")
    w: int = Field(..., ge=1, description="Width w_i in millimetres")
    l: int = Field(..., ge=1, description="Length l_i in millimetres")
    h: int = Field(..., ge=1, description="Height h_i in millimetres")
    weight_kg: float = Field(0.0, ge=0.0, description="Item mass in kilograms")
    stop_id: int = Field(..., description="Delivery stop (LIFO key)")
    side_up: bool = Field(
        False,
        description="If true, restricts orientation_index to upright poses",
    )
    model_variant: int | None = Field(
        None,
        description="Optional 0-based index into the catalog variants for this prefix",
    )
    boxed: bool = Field(
        False,
        description="Item is packed in a cardboard box — viewer renders a box wrapper",
    )
    fragile: bool = Field(
        False,
        description="Fragile — solver must not stack other items on top of this one",
    )


class TruckSpec(BaseModel):
    W: int = Field(2400, ge=1, description="Internal width W in millimetres")
    L: int = Field(13600, ge=1, description="Internal length L in millimetres")
    H: int = Field(2440, ge=1, description="Internal height H in millimetres")
    payload_kg: float = Field(3000.0, gt=0.0, description="Maximum payload in kilograms")


class DeliveryStop(BaseModel):
    stop_id: int = Field(..., description="Chronological stop index (1 = first drop)")
    address: str = Field("", description="Human-readable delivery address")


class SolveRequest(BaseModel):
    items: List[FurnitureItem]
    truck: TruckSpec = Field(default_factory=TruckSpec)
    stops: List[DeliveryStop] = Field(default_factory=list)
    strategy: SolveStrategy = Field(
        "optimal",
        description="Plan-selection strategy: optimal | axle_balance | stability",
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
    model_variant: int | None = Field(
        None,
        description="0-based index into the catalog variants — passed through "
                    "from the input FurnitureItem so the 3D viewer renders the "
                    "user's chosen model rather than a hash-derived one",
    )


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
