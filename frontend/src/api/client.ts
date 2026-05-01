import { buildPlansFromRequest } from "../data/planBuilder";
import type { PackingPlan, SolveRequest } from "../types";

const USE_MOCK = import.meta.env.VITE_USE_MOCK !== "false";
const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

const POLL_INTERVAL_MS = 500;
const POLL_TIMEOUT_MS = 60_000;
const MOCK_DELAY_MS = 800;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Returns 3 alternative packing plans for comparison. */
export async function fetchSolutions(
  request: SolveRequest,
): Promise<PackingPlan[]> {
  if (USE_MOCK) {
    await delay(MOCK_DELAY_MS);
    return buildPlansFromRequest(request);
  }
  // Real API: 3 parallel requests — backend may return identical plans for
  // deterministic solvers; UI still handles all three correctly.
  return Promise.all([
    fetchSolution(request),
    fetchSolution(request),
    fetchSolution(request),
  ]);
}

export async function fetchSolution(
  request: SolveRequest,
): Promise<PackingPlan> {
  if (USE_MOCK) {
    await delay(MOCK_DELAY_MS);
    return buildPlansFromRequest(request)[0];
  }

  const solveResponse = await fetch(`${API_URL}/api/solve`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  });
  if (!solveResponse.ok) {
    throw new Error(`Solve failed: HTTP ${solveResponse.status}`);
  }
  const { job_id } = (await solveResponse.json()) as { job_id: string };

  const deadline = Date.now() + POLL_TIMEOUT_MS;
  while (Date.now() < deadline) {
    await delay(POLL_INTERVAL_MS);
    const resultResponse = await fetch(`${API_URL}/api/result/${job_id}`);
    if (!resultResponse.ok) {
      throw new Error(`Result fetch failed: HTTP ${resultResponse.status}`);
    }
    const body = (await resultResponse.json()) as {
      status: string;
      plan?: PackingPlan;
    };
    if (body.status === "done" && body.plan) {
      return body.plan;
    }
  }
  throw new Error(
    `Solver poll timed out after ${POLL_TIMEOUT_MS / 1000}s (job ${job_id}). ` +
      "Check that the Celery worker is running.",
  );
}
