import { mockPlan } from "../data/mockPlan";
import type { PackingPlan, SolveRequest } from "../types";

const USE_MOCK = import.meta.env.VITE_USE_MOCK !== "false";
const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

const POLL_INTERVAL_MS = 500;
const MOCK_DELAY_MS = 800;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function fetchSolution(
  request: SolveRequest,
): Promise<PackingPlan> {
  if (USE_MOCK) {
    await delay(MOCK_DELAY_MS);
    return mockPlan;
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

  while (true) {
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
}
