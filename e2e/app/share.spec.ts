import { expect, test } from '@playwright/test';

import { go, importSample, onboard } from './helpers';

test('share incidents with a lawyer: encrypted link, read-only viewer, view log, turn off', async ({ page, browser }) => {
    test.setTimeout(120_000);
    await onboard(page);
    await importSample(page);
    await go(page, 'Documents');
    await page.getByRole('link', { name: /Share with a lawyer/ }).click();

    await page.getByRole('button', { name: 'None', exact: true }).click();
    await page.getByRole('checkbox', { name: /Threatened with dismissal/ }).check();
    await page.getByRole('checkbox', { name: /Shifts cut the week after my report/ }).check();
    await page.getByLabel('Note to the reader (optional)').fill('Ahead of our call on Friday.');
    await page.getByRole('radio', { name: '24 hours' }).click();
    await page.getByRole('button', { name: 'Create link' }).click();

    const link = (await page.getByTestId('share-link').innerText()).trim();
    expect(link).toMatch(/\/s\/[0-9a-f]{32}#[A-Za-z0-9_-]{43}$/);
    await page.keyboard.press('Escape');

    // The lawyer opens it in their own browser.
    const lawyer = await (await browser.newContext()).newPage();
    const errors: string[] = [];
    lawyer.on('pageerror', (e) => errors.push(e.message));
    await lawyer.goto(link);
    await expect(lawyer.getByRole('heading', { name: 'Threatened with dismissal' })).toBeVisible();
    await expect(lawyer.getByRole('heading', { name: 'Shifts cut the week after my report' })).toBeVisible();
    await expect(lawyer.getByRole('heading', { name: 'Told not to speak to HR again' })).toHaveCount(0);
    await expect(lawyer.getByText('Ahead of our call on Friday.')).toBeVisible();
    await expect(lawyer.getByText(/Not legal advice/).first()).toBeVisible();
    expect(errors).toEqual([]);

    // Without the key, nothing can be read.
    await lawyer.goto(link.split('#')[0]!);
    await expect(lawyer.getByRole('heading', { name: 'The link is incomplete' })).toBeVisible();

    // The owner sees the view and turns the link off.
    await page.reload();
    await page.getByRole('heading', { name: 'Enter your PIN' }).waitFor();
    for (const d of '1357') await page.keyboard.press(d);
    await expect(page.getByText(/Opened 1 time/)).toBeVisible({ timeout: 30_000 });
    await page.getByRole('button', { name: 'Turn off' }).click();
    await expect(page.getByText('Link turned off')).toBeVisible();

    await lawyer.goto(link);
    await expect(lawyer.getByRole('heading', { name: 'This link is no longer active' })).toBeVisible();
});
