import { expect, type Page } from "@playwright/test";

export const typePin = async (page: Page, pin: string) => {
  for (const digit of pin) await page.keyboard.press(digit);
};

/** Complete onboarding with a 4-digit PIN and land on the dashboard. */
export async function onboard(page: Page, pin = "1357") {
  await page.goto("/");
  await page.getByRole("button", { name: "Get started" }).click();
  await page.getByRole("button", { name: "Choose a passcode" }).click();
  await page.getByRole("radio", { name: "4 digits" }).click();
  await typePin(page, pin);
  await expect(
    page.getByRole("heading", { name: "Enter it once more" }),
  ).toBeVisible();
  await typePin(page, pin);
  await expect(
    page.getByRole("heading", { name: "Last few things" }),
  ).toBeVisible({ timeout: 20_000 });
  await page.getByText("Resolvr is not legal advice.").click();
  await page.getByRole("button", { name: "Open my record" }).click();
  await expect(
    page.getByRole("heading", { name: "Home", level: 1 }),
  ).toBeVisible();
}

const DAY = 86_400_000;

/** A backup in the original prototype's export format, with dates relative to today. */
export function prototypeBackup(now = Date.now()) {
  const rows: [number, string, string, string, string, string][] = [
    [
      150,
      "Comment about my accent in stand-up",
      "Verbal Harassment",
      "low",
      "J. Smith",
      "Ann Lee",
    ],
    [
      128,
      "Left off the project email thread",
      "Exclusion / Isolation",
      "medium",
      "J. Smith",
      "",
    ],
    [
      110,
      "Shouted at in the corridor",
      "Verbal Harassment; Intimidation / Threats",
      "medium",
      "J. Smith",
      "Bo Diaz",
    ],
    [96, "Reported the behaviour to HR", "Other", "low", "", ""],
    [
      88,
      "Shifts cut the week after my report",
      "Retaliation for Complaint / Protected Activity; Schedule Manipulation / Hours Reduction",
      "high",
      "J. Smith",
      "Ann Lee",
    ],
    [
      70,
      "Performance review rewritten",
      "Unfair Performance Review",
      "high",
      "J. Smith",
      "",
    ],
    [
      55,
      "Excluded from the client meeting",
      "Exclusion / Isolation",
      "medium",
      "R. Patel",
      "Bo Diaz",
    ],
    [
      41,
      "Mocked in front of the team again",
      "Verbal Harassment",
      "high",
      "J. Smith",
      "Ann Lee, Bo Diaz",
    ],
    [
      27,
      "Threatened with dismissal",
      "Intimidation / Threats; Retaliation for Complaint / Protected Activity",
      "critical",
      "J. Smith",
      "",
    ],
    [
      12,
      "Desk moved away from the team",
      "Exclusion / Isolation",
      "medium",
      "J. Smith",
      "",
    ],
    [
      4,
      "Told not to speak to HR again",
      "Retaliation for Complaint / Protected Activity",
      "critical",
      "J. Smith",
      "Ann Lee",
    ],
  ];
  return {
    app: "Resolvr",
    version: "2.0",
    exported: new Date(now).toISOString(),
    incidents: rows.map(
      ([daysAgo, title, type, severity, person, witnesses], i) => ({
        id: 1_700_000_000 + i,
        incId: `INC-${String(i + 1).padStart(3, "0")}`,
        timestamp: new Date(now - daysAgo * DAY).toISOString(),
        title,
        type,
        severity,
        person,
        witnesses,
        location: "Office",
        description: `${title}. It happened during work hours and I wrote this down the same day so I would remember exactly what was said and who was there.`,
        ...(i === 3
          ? {
              reported: "yes",
              reportedTo: "HR",
              reportedDate: new Date(now - daysAgo * DAY)
                .toISOString()
                .slice(0, 10),
            }
          : {}),
        notes:
          i === 4
            ? [
                {
                  ts: new Date(now - 80 * DAY).toISOString(),
                  text: "Rota posted again with fewer hours.",
                },
              ]
            : [],
      }),
    ),
    vault: [
      {
        id: 1,
        name: "rota.png",
        type: "image/png",
        data: "data:image/png;base64,aGVsbG8=",
        date: new Date(now - 88 * DAY).toISOString(),
      },
    ],
    settings: {},
  };
}

/** Import the sample backup through the command palette. */
export async function importSample(page: Page) {
  await page.keyboard.press("Control+k");
  const chooser = page.waitForEvent("filechooser");
  await page.getByRole("option", { name: /Import a backup/ }).click();
  await (
    await chooser
  ).setFiles({
    name: "resolvr-backup.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(prototypeBackup())),
  });
  await expect(page.getByText(/Imported 11 incidents/)).toBeVisible({
    timeout: 15_000,
  });
}

/** After a full page load the app is locked: wait for the lock screen, then enter the PIN. */
export async function unlock(page: Page, pin = '1357') {
    await expect(page.getByRole('heading', { name: 'Enter your PIN' })).toBeVisible();
    await typePin(page, pin);
    // Argon2id is slow on purpose, and slower still when tests run in parallel.
    await expect(page.getByRole('heading', { name: 'Enter your PIN' })).toHaveCount(0, { timeout: 45_000 });
}

/** Navigate inside the app through the command palette (a reload would lock it). */
export async function go(page: Page, screen: 'Home' | 'Log' | 'Settings' | 'Documents' | 'Vault' | 'Timeline' | 'People') {
    await page.keyboard.press('Control+k');
    await page.getByRole('option', { name: new RegExp(`^${screen}`) }).first().click();
    await expect(page.getByRole('heading', { name: screen, level: 1 })).toBeVisible();
}
