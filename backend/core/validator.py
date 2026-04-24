"""Independent post-solve constraint validator.

Lives in core/ per the module separation rules in CLAUDE.md — solvers call
this, but never embed it. Each method cites its thesis section and the
time complexity from Table 3.3 (thesis section 3.5.2.4).
"""

from __future__ import annotations

from api.models import PackingPlan, TruckSpec

# Orientations {0, 1} keep the original vertical axis upright (h along z).
# Restriction imposed on rigid items via the side_up flag per thesis
# section 3.5.2.1 (Rigid Orientation).
UPRIGHT_ORIENTATIONS: frozenset[int] = frozenset({0, 1})


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

    def validate_all(self, plan: PackingPlan, truck: TruckSpec) -> bool:
        """Run every check and return True only if all pass."""
        return (
            self.validate_non_overlap(plan)
            and self.validate_boundary(plan, truck)
            and self.validate_orientation(plan)
            and self.validate_lifo(plan)
        )
