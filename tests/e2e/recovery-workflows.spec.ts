import { expect, test, type Page } from "@playwright/test";

async function resetSession(page: Page) {
  await page.goto("/");
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
  await page.reload({ waitUntil: "networkidle" });
}

async function choosePersonRole(page: Page, nickname?: string) {
  await page.goto("/", { waitUntil: "networkidle" });
  await expect(page.getByRole("heading", { name: "Welcome to RecoverAI" })).toBeVisible({
    timeout: 15_000,
  });
  await page.getByRole("button", { name: /I'm in recovery/i }).click();

  if (nickname) {
    await page.getByLabel("Nickname (optional)").fill(nickname);
  }

  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page).toHaveURL("/person");
}

async function completeCheckIn(page: Page, chips: string[] = ["craving"]) {
  for (const chip of chips) {
    await page.getByRole("button", { name: chip, exact: true }).click();
  }

  await page.getByRole("button", { name: "Check in" }).click();
  await expect(page.getByRole("link", { name: "Get Intervention Steps" })).toBeVisible();
}

test.describe("recovery workflows", () => {
  test.beforeEach(async ({ page }) => {
    await resetSession(page);
  });

  test.describe.configure({ timeout: 60_000 });

  test("person check-in -> intervene -> scripts", async ({ page }) => {
    await choosePersonRole(page, "Sam");
    await completeCheckIn(page, ["craving", "alone"]);

    await page.getByRole("link", { name: "Get Intervention Steps" }).click();
    await expect(page).toHaveURL("/intervene");

    await page.getByRole("button", { name: "Get Steps Now" }).click();
    await expect(page.getByText("1. E2E Breathe")).toBeVisible();
    await expect(page.getByText("2. E2E Ground")).toBeVisible();

    await page.getByRole("button", { name: "Generate Dual Scripts →" }).click();
    await expect(page).toHaveURL("/scripts");

    await page.getByRole("button", { name: "Generate Scripts" }).click();
    await expect(page.getByText("E2E person script:")).toBeVisible();
    await expect(page.getByText("E2E caregiver script:")).toBeVisible();
  });

  test("switch to caregiver -> briefing", async ({ page }) => {
    await choosePersonRole(page);
    await completeCheckIn(page, ["anxious"]);

    await page.getByRole("button", { name: /Switch to Caregiver/i }).click();
    await expect(page).toHaveURL("/caregiver");

    await page.getByRole("button", { name: "Get Caregiver Briefing" }).click();
    await expect(page.getByText("E2E briefing:")).toBeVisible();
    await expect(page.getByText("I am here with you.")).toBeVisible();
    await expect(page.getByText("Just stop thinking about it.")).toBeVisible();
  });

  test("learn personalization", async ({ page }) => {
    await choosePersonRole(page);
    await completeCheckIn(page, ["craving"]);

    await page.getByRole("link", { name: "Learn & Prevent" }).click();
    await expect(page).toHaveURL("/learn");

    await page.getByRole("button", { name: /Urge Surfing/i }).click();
    await page.getByRole("button", { name: "Personalize for me" }).click();

    await expect(page.getByText("E2E learn blurb:")).toBeVisible();
  });

  test("deep-link without profile or moment redirects with flash", async ({ page }) => {
    await resetSession(page);
    await page.goto("/intervene");
    await expect(page).toHaveURL("/", { timeout: 15_000 });

    await choosePersonRole(page);
    await page.goto("/intervene");
    await expect(page).toHaveURL("/person", { timeout: 15_000 });
    await expect(
      page.getByRole("status").getByText("Complete a check-in first to use this feature."),
    ).toBeVisible();
  });

  test("reload persists role and moment", async ({ page }) => {
    await choosePersonRole(page, "Alex");
    await completeCheckIn(page, ["tired"]);

    await page.reload();
    await expect(page).toHaveURL("/person");
    await expect(page.getByRole("heading", { name: /Hey Alex/i })).toBeVisible();
    await expect(page.getByRole("button", { name: "tired", pressed: true })).toBeVisible();
    await expect(page.getByRole("link", { name: "Get Intervention Steps" })).toBeVisible();
  });

  test("simulated AI error shows safe message and Safety remains usable", async ({ page }) => {
    await choosePersonRole(page);
    await completeCheckIn(page, ["craving"]);

    await page.route("**/api/ai/intervene", async (route) => {
      await route.fulfill({
        status: 503,
        contentType: "application/json",
        body: JSON.stringify({
          error: {
            code: "PROVIDER_ERROR",
            message: "AI is temporarily unavailable.",
          },
        }),
      });
    });

    await page.getByRole("link", { name: "Get Intervention Steps" }).click();
    await page.getByRole("button", { name: "Get Steps Now" }).click();

    const alert = page.getByRole("alert").filter({ hasText: "AI is temporarily unavailable." });
    await expect(alert).toBeVisible();
    await expect(alert).toContainText("AI is temporarily unavailable.");
    await expect(alert).not.toContainText(/stack|Gemini|secret/i);
    await expect(page.getByRole("button", { name: "Retry" })).toBeVisible();

    await page
      .getByRole("navigation", { name: "Main navigation" })
      .getByRole("button", { name: "Safety" })
      .click();
    await expect(page).toHaveURL("/safety");
    await expect(page.getByRole("heading", { name: "Safety & Grounding" })).toBeVisible();
  });
});
