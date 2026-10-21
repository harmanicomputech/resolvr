import { expect, test } from '@playwright/test';

import { importSample, onboard, unlock } from './helpers';

test('timeline on desktop and phone, with pattern explain', async ({ page }) => {
    test.setTimeout(60_000);
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.setViewportSize({ width: 1280, height: 900 });
    await onboard(page);
    await importSample(page);
    await page.getByRole('navigation').getByRole('link', { name: 'Timeline' }).click();

    await expect(page.getByRole('list', { name: 'Legend' })).toBeVisible();
    await expect(page.getByRole('link', { name: /^INC-\d{3}, / })).toHaveCount(11);
    await page.getByRole('radio', { name: 'Month' }).click();
    await page.getByRole('button', { name: 'Explain' }).first().click();
    await expect(page.getByText(/Highlighting \d+ incidents?\./)).toBeVisible();

    await page.getByRole('link', { name: /^INC-009, / }).click();
    await expect(page).toHaveURL(/\/incidents\//);

    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/timeline');
    await unlock(page);
    await expect(page.getByText(/^Reported to HR/)).toBeVisible();
    await expect(page.getByText('30 days after the report').first()).toBeVisible();
    expect(errors).toEqual([]);
});
