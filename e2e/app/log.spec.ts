import { expect, test } from "@playwright/test";

import { onboard } from "./helpers";

test("log an incident through the guided flow", async ({ page }) => {
  test.setTimeout(60_000);
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await onboard(page);

  await page.getByRole("button", { name: "Log your first incident" }).click();
  const flow = page.getByRole("dialog", { name: "Log an incident" });
  await expect(
    flow.getByRole("heading", { name: "What happened" }),
  ).toBeVisible();

  // Required fields are explained gently, not blocked silently.
  await flow.getByRole("button", { name: "Next" }).click();
  await expect(flow.getByText("Add a short title")).toBeVisible();

  await flow.getByLabel("Short title").fill("Shouted at in stand-up");
  await flow
    .getByLabel("What happened?")
    .fill(
      'He said "you are useless" in front of the whole team, then walked off.',
    );
  await expect(
    flow
      .getByText("Good detail", { exact: false })
      .or(flow.getByText("A little more detail", { exact: false })),
  ).toBeVisible();
  await flow.getByLabel("Where").fill("Meeting room 2");
  await flow.getByRole("button", { name: "Next" }).click();

  await flow.getByLabel("Search types").fill("verbal");
  await flow.getByRole("button", { name: "Verbal Harassment" }).click();
  await flow.getByRole("button", { name: "Next" }).click();

  await flow.getByRole("button", { name: "High", exact: true }).click();
  await expect(
    flow.getByText("Seriously harmful or threatening"),
  ).toBeVisible();
  await flow.getByRole("button", { name: "Next" }).click();

  await flow
    .getByRole("combobox", { name: "Who was responsible?" })
    .fill("J. Smith");
  await flow
    .getByRole("combobox", { name: "Who was responsible?" })
    .press("Enter");
  await flow
    .getByRole("combobox", { name: "Who saw or heard it?" })
    .fill("Ann Lee");
  await flow
    .getByRole("combobox", { name: "Who saw or heard it?" })
    .press("Enter");
  await flow.getByRole("button", { name: "Review", exact: true }).click();

  await expect(flow.getByRole("heading", { name: "Review" })).toBeVisible();
  await expect(flow.getByText("Responsible: J. Smith")).toBeVisible();
  await flow.getByRole("button", { name: "Lock and save" }).click();

  await expect(
    flow.getByRole("heading", { name: "Saved and sealed" }),
  ).toBeVisible({ timeout: 15_000 });
  await expect(flow.getByText("INC-001")).toBeVisible();
  await flow.getByRole("button", { name: "Done" }).click();
  await expect(page.getByText("1 incident.")).toBeVisible();
  expect(errors).toEqual([]);
});

test("quick capture saves a draft", async ({ page }) => {
  await onboard(page);
  await page.goto("/capture");
  await page.getByRole("heading", { name: "Enter your PIN" }).waitFor();
  // A full page load always starts locked.
  for (const d of "1357") await page.keyboard.press(d);
  await page
    .getByLabel("What is this about?")
    .fill("Comment at the coffee machine");
  await page.getByRole("button", { name: "Save for later" }).click();
  await expect(page.getByText("Captured")).toBeVisible();
  await expect(page).toHaveURL(/\/incidents$/);
});
