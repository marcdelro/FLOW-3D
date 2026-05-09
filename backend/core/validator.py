"""Independent post-solve constraint validator.

Lives in core/ per the module separation rules in CLAUDE.md — solvers call
this, but never embed it. Each method cites its thesis section and the
time complexity from Table 3.3 (thesis section 3.5.2.4).
"""

from __future__ import annotations

from typing import List, Optional, Set

from api.models import FurnitureItem, PackingPlan, Placement, TruckSpec

# Orientations {0, 1} keep the original vertical axis upright (h along z).
# Restriction imposed on rigid items via the side_up flag per thesis
# section 3.5.2.1 (Rigid Orientation).
UPRIGHT_ORIENTATIONS: frozenset[int] = frozenset({0, 1})


class InfeasiblePackingException(RuntimeError):
    """Raised when ConstraintValidator.repair() cannot produce a valid plan.

    Signals the API layer to return 422 with solver_mode and failure report.
    Carries the last attempted plan so callers can log diagnostics.
    """

    def __init__(self, plan: PackingPlan, truck: TruckSpec, failed_check: str) -> None:
        super().__init__(
            f"Repair failed: plan remains infeasible after repair "
            f"(solver_mode={plan.solver_mode}, failed_check={failed_check})"
        )
        self.plan = plan
        self.truck = truck
        self.failed_check = failed_check


class PlanValidationError(RuntimeError):
    """Raised when a solver-produced PackingPlan fails validate_all().

    Carries the failed plan and truck so callers can inspect or log them.
    Used by AbstractSolver.solve() to enforce the post-solve safety net.
    """

    def __init__(self, plan: PackingPlan, truck: TruckSpec, failed_check: str) -> None:
        super().__init__(
            f"PackingPlan failed {failed_check} (solver_mode={plan.solver_mode})"
        )
        self.plan = plan
        self.truck = truck
        self.failed_check = failed_check


class ConstraintValidator:
    """Checks a PackingPlan against the four domain constraints."""

    def validate_non_overlap(self, plan: PackingPlan) -> bool:
        """Verify pairwise non-overlap.

        For every placed pair (i, j), at least one of the six Big-M
        separation inequalities from thesis section 3.5.2.1 B must hold:

            x_i + w_i <= x_j   or   x_j + w_j <= x_i   (X-axis)
            y_i + l_i <= y_j   or   y_j + l_j <= y_i   (Y-axis)
            z_i + h_i <= z_j   or   z_j + h_j <= z_i   (Z-axis)

        Complexity: O(n^2) worst case over packed pairs.
        """
        packed = [p for p in plan.placements if p.is_packed]
        for i in range(len(packed)):
            a = packed[i]
            for j in range(i + 1, len(packed)):
                b = packed[j]
                separated = (
                    a.x + a.w <= b.x
                    or b.x + b.w <= a.x
                    or a.y + a.l <= b.y
                    or b.y + b.l <= a.y
                    or a.z + a.h <= b.z
                    or b.z + b.h <= a.z
                )
                if not separated:
                    return False
        return True

    def validate_boundary(self, plan: PackingPlan, truck: TruckSpec) -> bool:
        """Verify truck-boundary containment.

            x_i + w_i <= W * b_i
            y_i + l_i <= L * b_i
            z_i + h_i <= H * b_i

        Thesis section 3.5.2.1 C. Complexity: O(n).
        """
        for p in plan.placements:
            if not p.is_packed:
                continue
            if p.x < 0 or p.y < 0 or p.z < 0:
                return False
            if p.x + p.w > truck.W:
                return False
            if p.y + p.l > truck.L:
                return False
            if p.z + p.h > truck.H:
                return False
        return True

    def validate_orientation(self, plan: PackingPlan) -> bool:
        """Verify the orientation_index and side_up flag.

        Thesis section 3.5.2.1 (Rigid Orientation). The Pydantic schema
        bounds orientation_index to [0, 5]; this check enforces the
        upright restriction which the model schema alone cannot express
        (side_up lives on the manifest item, not the placement).
        Complexity: O(n).

        Note: side_up enforcement requires the original manifest, which is
        not carried on a PackingPlan. For the placement-only view we can
        only validate the index range; upright enforcement is covered by
        the solver's orientation constraints and by callers that pass the
        manifest alongside the plan.
        """
        for p in plan.placements:
            if p.orientation_index < 0 or p.orientation_index > 5:
                return False
        return True

    def validate_weight(
        self, plan: PackingPlan, items: List[FurnitureItem], truck: TruckSpec
    ) -> bool:
        """Verify the truck payload constraint.

            sum(weight_kg_i * b_i) <= payload_kg

        Manifest-level constraint — Placement does not carry weight_kg, so
        the original items list is required. Items absent from the manifest
        contribute zero (defensive default; the solver should never emit a
        placement for an unknown item_id). Complexity: O(n).
        """
        weights = {it.item_id: it.weight_kg for it in items}
        total = sum(weights.get(p.item_id, 0.0) for p in plan.placements if p.is_packed)
        return total <= truck.payload_kg

    def validate_no_stack_on_fragile(
        self, plan: PackingPlan, items: List[FurnitureItem]
    ) -> bool:
        """Verify nothing is stacked on top of a fragile item.

        Implementation extension beyond thesis 3.5.2.1 A-E (Extension G).
        Full formal statement and defense Q&A in docs/model_extensions.md.

        For every placed pair (a, b) with b.fragile == True, the xy
        footprints of a and b must not overlap whenever a sits at or above
        b's top surface (a.z >= b.z + b.h). This honours the
        FurnitureItem.fragile contract — "solver must not stack other items
        on top of this one" — and is the post-solve safety net for the ILP
        `sup_fragile_*` constraints and the FFD `_supported` fragile gate.

        Manifest-level constraint — Placement does not carry the fragile
        flag, so the original items list is required. Implementation
        extension beyond thesis 3.5.2.1 A-E. Complexity: O(n^2).
        """
        fragile_ids = {it.item_id for it in items if it.fragile}
        if not fragile_ids:
            return True
        packed = [p for p in plan.placements if p.is_packed]
        for b in packed:
            if b.item_id not in fragile_ids:
                continue
            top = b.z + b.h
            for a in packed:
                if a is b:
                    continue
                if a.z < top:
                    continue
                xy_overlap = (
                    a.x < b.x + b.w
                    and b.x < a.x + a.w
                    and a.y < b.y + b.l
                    and b.y < a.y + a.l
                )
                if xy_overlap:
                    return False
        return True

    def validate_lifo(self, plan: PackingPlan) -> bool:
        """Verify the Sequential Loading Constraint.

            if stop_i > stop_j then  y_i + l_i <= y_j

        Items for later stops sit deeper along the Y-axis. Thesis section
        3.5.2.1 E. Complexity: O(n^2) over packed pairs.
        """
        packed = [p for p in plan.placements if p.is_packed]
        for a in packed:
            for b in packed:
                if a.stop_id > b.stop_id and a.y + a.l > b.y:
                    return False
        return True

    def validate_all(
        self,
        plan: PackingPlan,
        truck: TruckSpec,
        items: Optional[List[FurnitureItem]] = None,
    ) -> bool:
        """Run every check and return True only if all pass.

        The weight check is skipped when `items` is None (placement-only
        callers such as fixture-loading tests). Solvers always pass the
        original manifest, so the safety net in AbstractSolver.solve()
        always exercises it.
        """
        return (
            self.validate_non_overlap(plan)
            and self.validate_boundary(plan, truck)
            and self.validate_orientation(plan)
            and self.validate_lifo(plan)
            and (items is None or self.validate_weight(plan, items, truck))
            and (items is None or self.validate_no_stack_on_fragile(plan, items))
        )

    def first_failing_check(
        self,
        plan: PackingPlan,
        truck: TruckSpec,
        items: Optional[List[FurnitureItem]] = None,
    ) -> str | None:
        """Return the name of the first failing check, or None if all pass.

        Used by AbstractSolver.solve() to attach a meaningful label to the
        PlanValidationError raised when a solver returns an invalid plan.
        Weight is checked last and only when the manifest is supplied.
        """
        if not self.validate_non_overlap(plan):
            return "non_overlap"
        if not self.validate_boundary(plan, truck):
            return "boundary"
        if not self.validate_orientation(plan):
            return "orientation"
        if not self.validate_lifo(plan):
            return "lifo"
        if items is not None and not self.validate_weight(plan, items, truck):
            return "weight"
        if items is not None and not self.validate_no_stack_on_fragile(plan, items):
            return "fragile_stacking"
        return None

    # ------------------------------------------------------------------
    # Repair
    # ------------------------------------------------------------------

    def repair(
        self,
        plan: PackingPlan,
        truck: TruckSpec,
        items: List[FurnitureItem],
    ) -> PackingPlan:
        """Attempt to salvage a failing plan by unpacking offending items.

        Iteratively identifies the first failing constraint, removes the
        minimal set of items responsible, and re-validates. Returns a
        valid PackingPlan (possibly with more unplaced_items than the
        original). Raises InfeasiblePackingException if the plan cannot
        be made valid after exhausting all packed items.
        """
        packed_ids: Set[str] = {p.item_id for p in plan.placements if p.is_packed}

        for _ in range(len(plan.placements) + 1):
            candidate = self._rebuild(plan, packed_ids)
            failed = self.first_failing_check(candidate, truck, items)
            if failed is None:
                return candidate
            offenders = self._offenders(candidate, truck, items, failed)
            if not offenders:
                # Cannot identify specific culprits — give up
                break
            packed_ids -= offenders

        final = self._rebuild(plan, packed_ids)
        failed = self.first_failing_check(final, truck, items)
        if failed is not None:
            raise InfeasiblePackingException(final, truck, failed)
        return final

    @staticmethod
    def _rebuild(plan: PackingPlan, packed_ids: Set[str]) -> PackingPlan:
        """Return a copy of plan with is_packed reflecting packed_ids."""
        new_placements: List[Placement] = []
        new_unplaced: List[str] = []
        for p in plan.placements:
            if p.item_id in packed_ids:
                new_placements.append(p.model_copy(update={"is_packed": True}))
            else:
                new_placements.append(p.model_copy(update={"is_packed": False}))
                new_unplaced.append(p.item_id)
        return plan.model_copy(
            update={"placements": new_placements, "unplaced_items": new_unplaced}
        )

    @staticmethod
    def _offenders(
        plan: PackingPlan,
        truck: TruckSpec,
        items: List[FurnitureItem],
        failed_check: str,
    ) -> Set[str]:
        """Return item_ids to unpack in order to resolve failed_check."""
        packed = [p for p in plan.placements if p.is_packed]

        if failed_check == "boundary":
            return {
                p.item_id
                for p in packed
                if (
                    p.x < 0
                    or p.y < 0
                    or p.z < 0
                    or p.x + p.w > truck.W
                    or p.y + p.l > truck.L
                    or p.z + p.h > truck.H
                )
            }

        if failed_check == "orientation":
            return {
                p.item_id
                for p in packed
                if p.orientation_index < 0 or p.orientation_index > 5
            }

        if failed_check == "lifo":
            # Unpack items whose y-position violates LIFO (the later-stop
            # item that sits too close to the loading door).
            offenders: Set[str] = set()
            for a in packed:
                for b in packed:
                    if a.stop_id > b.stop_id and a.y + a.l > b.y:
                        offenders.add(a.item_id)
            return offenders

        if failed_check == "non_overlap":
            offenders = set()
            for i in range(len(packed)):
                a = packed[i]
                for j in range(i + 1, len(packed)):
                    b = packed[j]
                    separated = (
                        a.x + a.w <= b.x
                        or b.x + b.w <= a.x
                        or a.y + a.l <= b.y
                        or b.y + b.l <= a.y
                        or a.z + a.h <= b.z
                        or b.z + b.h <= a.z
                    )
                    if not separated:
                        # Unpack the item delivered last (higher stop_id leaves first)
                        offenders.add(
                            a.item_id if a.stop_id <= b.stop_id else b.item_id
                        )
            return offenders

        if failed_check == "fragile_stacking":
            fragile_ids = {it.item_id for it in items if it.fragile}
            offenders = set()
            for b in packed:
                if b.item_id not in fragile_ids:
                    continue
                top = b.z + b.h
                for a in packed:
                    if a is b or a.z < top:
                        continue
                    if (
                        a.x < b.x + b.w
                        and b.x < a.x + a.w
                        and a.y < b.y + b.l
                        and b.y < a.y + a.l
                    ):
                        offenders.add(a.item_id)
            return offenders

        if failed_check == "weight":
            weights = {it.item_id: it.weight_kg for it in items}
            by_weight = sorted(
                packed, key=lambda p: weights.get(p.item_id, 0.0), reverse=True
            )
            offenders = set()
            total = sum(weights.get(p.item_id, 0.0) for p in packed)
            for p in by_weight:
                if total <= truck.payload_kg:
                    break
                offenders.add(p.item_id)
                total -= weights.get(p.item_id, 0.0)
            return offenders

        return set()
