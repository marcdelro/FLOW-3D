"""Empirical breakeven benchmark for the hybrid switching threshold theta.

Thesis section 3.5.2.3: "the threshold theta is not an arbitrary constant —
it is the empirically determined breakeven point where the ILP solver's
solve time would exceed the DSS's acceptable response window, and your
pilot experiments should be what justifies its specific value."

This script runs ILP and FFD on seeded synthetic manifests at varying n,
records median t_exec_ms, and reports the smallest n where the ILP path
crosses configurable response-time budgets (1 s, 5 s, 10 s, 30 s).

Usage (from backend/):
    venv/Scripts/python.exe -m benchmarks.threshold_bench
    venv/Scripts/python.exe -m benchmarks.threshold_bench --quick
    venv/Scripts/python.exe -m benchmarks.threshold_bench --output ../docs/benchmarks/run.md
"""

from __future__ import annotations

import argparse
import datetime as dt
import random
import statistics
import sys
import time
from pathlib import Path
from typing import List, Tuple
from unittest.mock import patch

# Make this script runnable as `python -m benchmarks.threshold_bench` from backend/.
_HERE = Path(__file__).resolve()
_BACKEND = _HERE.parents[1]
if str(_BACKEND) not in sys.path:
    sys.path.insert(0, str(_BACKEND))

from api.models import FurnitureItem, PackingPlan, TruckSpec  # noqa: E402

# Manifest sizes to sweep. Default range is wide enough to clearly straddle
# the ILP/FFD breakeven on a typical academic-license workstation.
DEFAULT_SIZES: Tuple[int, ...] = (4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24)
QUICK_SIZES: Tuple[int, ...] = (4, 8, 12, 16, 20)
TRIALS_PER_SIZE = 3
ILP_TIME_LIMIT_S = 60.0  # per-trial wall-time cap; surfaced as Gurobi TimeLimit

# Response-time budgets evaluated when picking the recommended theta.
BUDGETS_MS: Tuple[int, ...] = (1_000, 5_000, 10_000, 30_000)


def make_manifest(n: int, seed: int) -> List[FurnitureItem]:
    """Synthetic furniture-like manifest, deterministic per (n, seed).

    Mixes small parcels and bulky items, distributes across 3 stops, and
    flags ~20% as side_up so orientation binaries actually do work. Volumes
    are kept comfortably below truck capacity so feasibility isn't gated on
    n — we want to measure solve time, not infeasibility.
    """
    rng = random.Random(seed * 1000 + n)
    items: List[FurnitureItem] = []
    for i in range(n):
        # Roughly 60% small, 40% bulky.
        if rng.random() < 0.6:
            w = rng.randint(300, 800)
            l = rng.randint(300, 800)  # noqa: E741 — l_i matches thesis
            h = rng.randint(300, 700)
            weight = rng.uniform(5.0, 25.0)
        else:
            w = rng.randint(800, 1500)
            l = rng.randint(700, 1500)  # noqa: E741 — l_i matches thesis
            h = rng.randint(700, 1400)
            weight = rng.uniform(25.0, 80.0)
        items.append(
            FurnitureItem(
                item_id=f"i{i:02d}",
                w=w,
                l=l,
                h=h,
                weight_kg=weight,
                stop_id=rng.randint(1, 3),
                side_up=rng.random() < 0.2,
            )
        )
    return items


def time_solver(
    solver_factory, items: List[FurnitureItem], truck: TruckSpec
) -> Tuple[int, float, int, bool]:
    """Run a solver once and return (t_wall_ms, v_util, unplaced_count, ok)."""
    solver = solver_factory()
    t0 = time.perf_counter()
    try:
        plan: PackingPlan = solver.solve(items, truck)
    except Exception:
        t_wall_ms = int((time.perf_counter() - t0) * 1000)
        return t_wall_ms, 0.0, len(items), False
    t_wall_ms = int((time.perf_counter() - t0) * 1000)
    return t_wall_ms, plan.v_util, len(plan.unplaced_items), True


def run_one_size(n: int, truck: TruckSpec) -> dict:
    """Run TRIALS_PER_SIZE trials of both solvers at manifest size n."""
    from solver.ffd_solver import FFDSolver
    from solver.ilp_solver import ILPSolver

    ilp_times: List[int] = []
    ffd_times: List[int] = []
    ilp_utils: List[float] = []
    ffd_utils: List[float] = []
    ilp_failures = 0

    for trial in range(TRIALS_PER_SIZE):
        items = make_manifest(n, seed=trial + 1)

        # FFD trial
        t_ffd, u_ffd, _, ok = time_solver(lambda: FFDSolver(), items, truck)
        if ok:
            ffd_times.append(t_ffd)
            ffd_utils.append(u_ffd)

        # ILP trial — Gurobi TimeLimit caps the model's internal search.
        def make_ilp() -> ILPSolver:
            s = ILPSolver()
            return s

        # Patch settings to force the per-trial time limit.
        with patch("solver.ilp_solver.GUROBI_TIME_LIMIT", ILP_TIME_LIMIT_S), patch(
            "solver.ilp_solver.GUROBI_OUTPUT_FLAG", 0
        ):
            t_ilp, u_ilp, _, ok = time_solver(make_ilp, items, truck)
        if ok:
            ilp_times.append(t_ilp)
            ilp_utils.append(u_ilp)
        else:
            ilp_failures += 1

    return {
        "n": n,
        "ilp_median_ms": int(statistics.median(ilp_times)) if ilp_times else None,
        "ilp_max_ms": max(ilp_times) if ilp_times else None,
        "ilp_v_util": round(statistics.median(ilp_utils), 3) if ilp_utils else None,
        "ilp_failures": ilp_failures,
        "ffd_median_ms": int(statistics.median(ffd_times)) if ffd_times else None,
        "ffd_max_ms": max(ffd_times) if ffd_times else None,
        "ffd_v_util": round(statistics.median(ffd_utils), 3) if ffd_utils else None,
    }


def render_markdown(results: List[dict], truck: TruckSpec) -> str:
    today = dt.date.today().isoformat()
    lines: List[str] = []
    lines.append(f"# Threshold benchmark — {today}")
    lines.append("")
    lines.append(
        "Empirical justification for the hybrid switching threshold "
        "`SOLVER_THRESHOLD` (thesis section 3.5.2.3). Each row is the "
        f"median of {TRIALS_PER_SIZE} seeded trials. ILP runs include the "
        f"single-supporter constraint and use a {ILP_TIME_LIMIT_S:.0f} s "
        "Gurobi TimeLimit per trial."
    )
    lines.append("")
    lines.append(
        f"Truck: W={truck.W} L={truck.L} H={truck.H} mm, payload "
        f"{truck.payload_kg:.0f} kg."
    )
    lines.append("")
    header = (
        "| n  | ILP median (ms) | ILP max (ms) | ILP V_util "
        "| FFD median (ms) | FFD max (ms) | FFD V_util |"
    )
    sep = (
        "|----|----------------:|-------------:|-----------:"
        "|----------------:|-------------:|-----------:|"
    )
    lines.append(header)
    lines.append(sep)
    for r in results:
        lines.append(
            f"| {r['n']:>2} | "
            f"{_fmt_ms(r['ilp_median_ms'])} | "
            f"{_fmt_ms(r['ilp_max_ms'])} | "
            f"{_fmt_util(r['ilp_v_util'])} | "
            f"{_fmt_ms(r['ffd_median_ms'])} | "
            f"{_fmt_ms(r['ffd_max_ms'])} | "
            f"{_fmt_util(r['ffd_v_util'])} |"
        )
    lines.append("")

    # Recommended theta per response-time budget.
    lines.append("## Recommended theta per response-time budget")
    lines.append("")
    lines.append("Largest n whose ILP median solve time stays under the budget:")
    lines.append("")
    lines.append("| Budget | Recommended theta |")
    lines.append("|--------|------------------:|")
    for budget in BUDGETS_MS:
        recommended = _largest_n_under_budget(results, budget)
        lines.append(f"| {budget // 1000} s | {recommended} |")
    lines.append("")

    # Failures / time-limit hits.
    failed = [r for r in results if r.get("ilp_failures")]
    if failed:
        lines.append("## ILP trial failures")
        lines.append("")
        for r in failed:
            lines.append(f"- n={r['n']}: {r['ilp_failures']} failure(s)")
        lines.append("")

    lines.append("## Caveats")
    lines.append("")
    lines.append(
        "- **Trial count.** Each row is the median of "
        f"{TRIALS_PER_SIZE} seeded trials; defense-grade reporting should "
        "raise this to 10+ to smooth the seed-to-seed variance visible "
        "between adjacent sizes."
    )
    lines.append(
        "- **Density regime.** The synthetic generator produces manifests "
        "that fill ~3-22% of the default truck volume. Dense manifests "
        "(V_util > 0.5) tighten the LP relaxation and are expected to "
        "increase ILP solve time materially; the recommended theta from "
        "this run is therefore an *upper* bound on what's safe in "
        "production with full trucks."
    )
    lines.append(
        "- **Hardware.** Numbers are wall-clock on the workstation that "
        "ran this script; rerun on the demo machine before final theta "
        "selection."
    )
    lines.append("")

    return "\n".join(lines) + "\n"


def _fmt_ms(v) -> str:
    return "—" if v is None else f"{v:>6}"


def _fmt_util(v) -> str:
    return "—" if v is None else f"{v:.3f}"


def _largest_n_under_budget(results: List[dict], budget_ms: int) -> int:
    best = 0
    for r in results:
        if r["ilp_median_ms"] is not None and r["ilp_median_ms"] <= budget_ms:
            best = max(best, r["n"])
    return best


def main() -> int:
    parser = argparse.ArgumentParser(description="Threshold benchmark")
    parser.add_argument("--quick", action="store_true", help="Use a smaller size sweep")
    parser.add_argument(
        "--output",
        default=None,
        help="Markdown output path (default: docs/benchmarks/threshold_bench_<date>.md)",
    )
    args = parser.parse_args()

    sizes = QUICK_SIZES if args.quick else DEFAULT_SIZES
    truck = TruckSpec()

    # Force live solvers regardless of .env / settings.
    with patch("solver.ilp_solver.USE_MOCK_SOLVER", False), patch(
        "solver.ffd_solver.USE_MOCK_SOLVER", False
    ):
        results: List[dict] = []
        for n in sizes:
            print(f"  n={n:>2}  ...", flush=True)
            r = run_one_size(n, truck)
            results.append(r)
            print(
                f"    ILP median={r['ilp_median_ms']} ms  "
                f"FFD median={r['ffd_median_ms']} ms  "
                f"V_util ILP={r['ilp_v_util']} FFD={r['ffd_v_util']}",
                flush=True,
            )

    md = render_markdown(results, truck)

    if args.output is None:
        out_dir = _BACKEND.parent / "docs" / "benchmarks"
        out_dir.mkdir(parents=True, exist_ok=True)
        out_path = out_dir / f"threshold_bench_{dt.date.today().isoformat()}.md"
    else:
        out_path = Path(args.output)
        out_path.parent.mkdir(parents=True, exist_ok=True)

    out_path.write_text(md, encoding="utf-8")
    print(f"\nWrote {out_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
