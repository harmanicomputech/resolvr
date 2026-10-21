import { expect, test } from "@playwright/test";

import { importSample, onboard } from "./helpers";

test("first run guide, then a full dashboard after importing a backup", async ({
  page,
}) => {
  test.setTimeout(60_000);
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));

  await onboard(page);
  await expect(
    page.getByRole("heading", { name: "Let’s start your record" }),
  ).toBeVisible();

  await importSample(page);
  await expect(
    page.getByText(
      /11 incidents over 5 months, mostly involving J\. Smith, trending more severe\./,
    ),
  ).toBeVisible();
  await expect(
    page.getByRole("region", { name: "Evidence strength" }),
  ).toBeVisible();
  await expect(
    page.getByRole("list", { name: "Case readiness" }),
  ).toBeVisible();
  await expect(
    page.getByRole("table", { name: "Incidents per month" }),
  ).toBeAttached();
  await expect(
    page
      .getByRole("region", { name: "Patterns" })
      .getByText(/J\. Smith/)
      .first(),
  ).toBeVisible();

  await page.getByRole("button", { name: "What makes this up?" }).click();
  await expect(
    page.getByRole("dialog", { name: "Evidence strength" }),
  ).toBeVisible();
  await expect(
    page.getByText("It is not a prediction of any outcome.", { exact: false }),
  ).toBeVisible();
  await page.keyboard.press("Escape");

  // Navigation: the sidebar on desktop.
  await page
    .getByRole("navigation", { name: "Main" })
    .getByRole("link", { name: "Vault" })
    .click();
  await expect(page).toHaveURL(/\/vault$/);
  await expect(
    page.getByRole("heading", { name: "Vault", level: 1 }),
  ).toBeVisible();

  expect(errors).toEqual([]);
});

test("mobile tab bar and quick actions", async ({ page }) => {
  test.setTimeout(60_000);
  await page.setViewportSize({ width: 390, height: 844 });
  await onboard(page);
  const tabs = page.getByRole("navigation", { name: "Main" });
  await tabs.getByRole("button", { name: "Quick actions" }).click();
  await expect(
    page.getByRole("menuitem", { name: "Voice note" }),
  ).toBeVisible();
  await page.getByRole("menuitem", { name: "Log incident" }).click();
  await expect(page).toHaveURL(/\/log$/);
  await page.getByRole("button", { name: "Close (your draft is kept)" }).click();
  await expect(page).toHaveURL(/\/incidents$/);
  await tabs.getByRole("button", { name: "More" }).click();
  await page
    .getByRole("dialog", { name: "More" })
    .getByRole("link", { name: "Settings" })
    .click();
  await expect(
    page.getByRole("heading", { name: "Settings", level: 1 }),
  ).toBeVisible();
});
