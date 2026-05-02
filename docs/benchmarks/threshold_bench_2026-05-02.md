# Threshold benchmark — 2026-05-02

Empirical justification for the hybrid switching threshold `SOLVER_THRESHOLD` (thesis section 3.5.2.3). Each row is the median of 3 seeded trials. ILP runs include the single-supporter constraint and use a 60 s Gurobi TimeLimit per trial.

Truck: W=2400 L=13600 H=2440 mm, payload 3000 kg.

| n  | ILP median (ms) | ILP max (ms) | ILP V_util | FFD median (ms) | FFD max (ms) | FFD V_util |
|----|----------------:|-------------:|-----------:|----------------:|-------------:|-----------:|
|  4 |     72 |    183 | 0.027 |      0 |      0 | 0.027 |
|  6 |    102 |    138 | 0.057 |      0 |      0 | 0.057 |
|  8 |    205 |    264 | 0.050 |      0 |      1 | 0.050 |
| 10 |    323 |    562 | 0.064 |      1 |      1 | 0.064 |
| 12 |    466 |    472 | 0.115 |      0 |      0 | 0.115 |
| 14 |    933 |    964 | 0.106 |      1 |      2 | 0.106 |
| 16 |    956 |   1076 | 0.132 |      1 |      2 | 0.132 |
| 18 |   1388 |   1392 | 0.142 |      1 |      1 | 0.142 |
| 20 |   1703 |   1900 | 0.143 |      1 |      2 | 0.118 |
| 22 |   2067 |   2764 | 0.223 |      3 |      5 | 0.193 |
| 24 |   1233 |   1347 | 0.183 |      2 |      3 | 0.183 |

## Recommended theta per response-time budget

Largest n whose ILP median solve time stays under the budget:

| Budget | Recommended theta |
|--------|------------------:|
| 1 s | 16 |
| 5 s | 24 |
| 10 s | 24 |
| 30 s | 24 |

## Recommendation

The current default `SOLVER_THRESHOLD = 20` is empirically defensible: at n=20 ILP completes in **1.7 s median** (1.9 s worst-case across the three trials) and produces a strictly better packing than FFD (V_util 0.143 vs 0.118) on the same manifest. Raising theta to 22 keeps median solve time near 2 s and gives ILP one more size class where its V_util advantage holds; raising it further than 24 is not supported by this run because variance dominates the trend past that point.

For a strict 1 s response budget the data supports lowering theta to 16. For the standard DSS budget (5 s including network and serialization), the binding constraint becomes worst-case rather than median ILP time and a value of theta in [20, 24] is appropriate.

## Caveats

- **Trial count.** Each row is the median of 3 seeded trials; defense-grade reporting should raise this to 10+ to smooth the seed-to-seed variance visible between adjacent sizes (e.g. n=22 came in slower than n=24 in this run).
- **Density regime.** The synthetic generator produces manifests that fill ~3-22% of the default truck volume. Dense manifests (V_util > 0.5) tighten the LP relaxation and are expected to increase ILP solve time materially; the recommended theta from this run is therefore an *upper* bound on what's safe in production with full trucks.
- **Support constraint.** Numbers reflect the post-2026-05-02 ILP model with the single-supporter disjunction (n^2 binaries `u[i,j]` plus `floor[i]`). Older logs from before the support constraint will look ~2x faster at the same n and should not be compared directly.
- **Hardware.** Numbers are wall-clock on the workstation that ran this script (academic Gurobi license). Rerun on the demo machine before final theta selection.

