import { expect, test, type Page } from "@playwright/test";

const typePin = async (page: Page, pin: string) => {
  for (const digit of pin) await page.keyboard.press(digit);
};

test("onboarding, lock, wrong PIN, unlock and panic to calculator", async ({
  page,
}) => {
  test.setTimeout(60_000);
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));

  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Your evidence, your protection." }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Get started" }).click();
  await expect(
    page.getByRole("heading", { name: "Only you can open it." }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Choose a passcode" }).click();

  await page.getByRole("radio", { name: "4 digits" }).click();
  await typePin(page, "1357");
  await expect(
    page.getByRole("heading", { name: "Enter it once more" }),
  ).toBeVisible();
  await typePin(page, "1357");

  await expect(
    page.getByRole("heading", { name: "Last few things" }),
  ).toBeVisible({ timeout: 20_000 });
  const open = page.getByRole("button", { name: "Open my record" });
  await expect(open).toBeDisabled();
  await page.getByText("United Kingdom").click();
  await page.getByText("Resolvr is not legal advice.").click();
  await open.click();
  await expect(page.getByRole("heading", { name: "Home" })).toBeVisible();

  // A reload locks the app: the key only ever lived in memory.
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Enter your PIN" }),
  ).toBeVisible();
  await typePin(page, "0000");
  await expect(page.getByText("4 tries left before a short pause")).toBeVisible(
    { timeout: 20_000 },
  );
  await typePin(page, "1357");
  await expect(page.getByRole("heading", { name: "Home" })).toBeVisible({
    timeout: 20_000,
  });

  // Panic: Escape twice switches straight to a working calculator.
  await page.keyboard.press("Escape");
  await page.keyboard.press("Escape");
  const display = page.locator("output.calc-display");
  const calculator = page.getByRole("main", { name: "Calculator" });
  await expect(calculator).toBeVisible();
  await expect(page).toHaveTitle("Calculator");
  await calculator.getByRole("button", { name: "7", exact: true }).click();
  await calculator.getByRole("button", { name: "Multiply" }).click();
  await calculator.getByRole("button", { name: "6", exact: true }).click();
  await calculator.getByRole("button", { name: "Equals" }).click();
  await expect(display).toHaveText("42");

  // The passcode followed by "=" unlocks.
  await typePin(page, "1357");
  await page.keyboard.press("=");
  await expect(page.getByRole("heading", { name: "Home" })).toBeVisible({
    timeout: 20_000,
  });

  expect(errors).toEqual([]);
});
