import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';

import { importSample, onboard, unlock } from './helpers';

test('list, detail, notes, edit, PDF, delete and restore', async ({ page }) => {
    test.setTimeout(90_000);
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
    await page.setViewportSize({ width: 1280, height: 900 });
    await onboard(page);
    await importSample(page);

    await page.goto('/incidents');
    await unlock(page);
    await expect(page.getByText('11 incidents')).toBeVisible();
    await page.getByLabel('Search incidents').fill('threatened');
    await expect(page.getByText('Showing 1 of 11')).toBeVisible();
    await page.getByRole('link', { name: /Threatened with dismissal/ }).click();

    await expect(page.getByRole('heading', { name: 'Threatened with dismissal' })).toBeVisible();
    await expect(page.getByText('Hash verified')).toBeVisible();

    // Notes are timestamped and add a version.
    await page.getByLabel('Add a note').fill('HR emailed to arrange a meeting.');
    await page.getByRole('button', { name: 'Add note', exact: true }).last().click();
    await expect(page.getByRole('region', { name: 'Notes' }).getByText('HR emailed to arrange a meeting.')).toBeVisible();
    await page.getByRole('button', { name: /v2 · Note added/ }).click();
    await expect(page.getByText('Note: HR emailed to arrange a meeting.', { exact: false })).toBeVisible();

    // Edit creates a new version with a visible diff.
    await page.getByRole('button', { name: 'Edit', exact: true }).click();
    const flow = page.getByRole('dialog', { name: 'Edit incident' });
    await flow.getByLabel('Short title').fill('Threatened with dismissal by J. Smith');
    await flow.getByRole('button', { name: 'Next' }).click();
    await flow.getByRole('button', { name: 'Next' }).click();
    await flow.getByRole('button', { name: 'Review', exact: true }).click();
    await flow.getByRole('button', { name: 'Save new version' }).click();
    await flow.getByRole('button', { name: 'View incident' }).click();
    await expect(page.getByRole('heading', { name: 'Threatened with dismissal by J. Smith' })).toBeVisible();
    await page.getByRole('button', { name: /v3 · Edited/ }).click();
    await expect(page.getByText('Title', { exact: true })).toBeVisible();

    // PDF is made on the device.
    const download = page.waitForEvent('download');
    await page.getByRole('button', { name: 'PDF' }).click();
    const file = await download;
    expect(file.suggestedFilename()).toMatch(/^INC-009-.*\.pdf$/);
    const bytes = await readFile((await file.path())!);
    expect(bytes.subarray(0, 4).toString()).toBe('%PDF');

    // Deleting asks for the passcode and goes to a recoverable trash.
    await page.getByRole('button', { name: 'Delete' }).click();
    await page.getByLabel('Your passcode').fill('0000');
    await page.getByRole('button', { name: 'Move to trash' }).click();
    await expect(page.getByText('That passcode is not right.')).toBeVisible();
    await page.getByLabel('Your passcode').fill('1357');
    await page.getByRole('button', { name: 'Move to trash' }).click();
    await expect(page).toHaveURL(/\/incidents$/);
    await expect(page.getByText('10 incidents')).toBeVisible();
    await page.getByRole('link', { name: 'Trash (1)' }).click();
    await page.getByRole('button', { name: 'Restore' }).click();
    await expect(page.getByText('INC-009 restored')).toBeVisible();

    expect(errors).toEqual([]);
});
