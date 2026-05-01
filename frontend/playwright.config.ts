import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright config for the FLOW-3D frontend smoke harness.
 *
 * The webServer block boots Vite in *mock mode* on a dedicated port so the
 * harness exercises real React + Three.js render paths without needing the
 * Redis / Celery / FastAPI / Gurobi stack to be up. cross-env is already a
 * devDependency so the env override works on Windows and macOS alike.
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  reporter: [["list"], ["html", { open: "never" }]],
  timeout: 30_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL: "http://localhost:5174",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: "cross-env VITE_USE_MOCK=true vite --port 5174 --strictPort",
    url: "http://localhost:5174",
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
