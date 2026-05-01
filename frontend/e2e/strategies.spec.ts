import { expect, test } from "@playwright/test";

/**
 * End-to-end smoke for the 3-strategy DSS layer.
 *
 * Runs against the Vite dev server in mock mode (VITE_USE_MOCK=true) so all
 * three strategies are served from the canned mockPlans fixture without the
 * Redis/Celery/FastAPI stack needing to be up. The mock fixture is curated
 * to mirror what the live backend would produce — three structurally
 * distinct plans (different placements, different unplaced sets).
 */

test.describe("DSS 3-plan diversity", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("empty state advertises all three strategies", async ({ page }) => {
    await expect(
      page.getByText("No packing plan loaded", { exact: true }),
    ).toBeVisible();

    // Strategy chips on the empty hero
    for (const name of ["Optimal", "Balanced", "Stability"]) {
      await expect(page.getByText(name, { exact: true }).first()).toBeVisible();
    }
  });

  test("solving produces three plans, each with its own rationale", async ({
    page,
  }) => {
    // ManifestForm is pre-populated with 5 default items, so Solve is enabled.
    await page.getByRole("button", { name: "Solve Packing Plan" }).click();

    // Results tab auto-activates and PlanSelector renders three cards.
    const planA = page.getByRole("button", { name: /Plan A/ });
    const planB = page.getByRole("button", { name: /Plan B/ });
    const planC = page.getByRole("button", { name: /Plan C/ });

    await expect(planA).toBeVisible();
    await expect(planB).toBeVisible();
    await expect(planC).toBeVisible();

    // Each card carries its strategy label.
    await expect(planA).toContainText("Optimal");
    await expect(planB).toContainText("Balanced");
    await expect(planC).toContainText("Stability");

    // The "Why This Plan" rationale section reflects the selected card.
    // Plan A is selected by default — Optimal rationale should be visible.
    const rationale = page
      .locator("section, div")
      .filter({ hasText: /Maximum volumetric utilization via exact ILP/ })
      .first();
    await expect(rationale).toBeVisible();

    // Click Plan B → rationale switches to balanced.
    await planB.click();
    await expect(
      page.getByText(/Fast deterministic FFD with volume-descending presort/),
    ).toBeVisible();

    // Click Plan C → rationale switches to stability AND unplaced section appears.
    await planC.click();
    await expect(
      page.getByText(/FFD with weight-descending presort/),
    ).toBeVisible();
    await expect(page.getByText("Unplaced Items").first()).toBeVisible();
    await expect(page.getByText("bookshelf_01").last()).toBeVisible();

    // Click Plan A → unplaced section disappears.
    await planA.click();
    await expect(
      page.getByText(/Maximum volumetric utilization via exact ILP/),
    ).toBeVisible();
    await expect(page.getByText("Unplaced Items")).toHaveCount(0);
  });

  test("plan cards show different solver-mode badges", async ({ page }) => {
    await page.getByRole("button", { name: "Solve Packing Plan" }).click();

    const planA = page.getByRole("button", { name: /Plan A/ });
    const planB = page.getByRole("button", { name: /Plan B/ });
    const planC = page.getByRole("button", { name: /Plan C/ });

    // Plan A is the ILP optimal mock; B and C are FFD variants.
    await expect(planA).toContainText("ILP");
    await expect(planB).toContainText("FFD");
    await expect(planC).toContainText("FFD");
  });
});
