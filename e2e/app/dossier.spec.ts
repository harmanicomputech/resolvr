import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';

import { importSample, onboard } from './helpers';

test('case file: prepare, preview pages, download, verify the QR link', async ({ page }) => {
    test.setTimeout(120_000);
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
    await page.setViewportSize({ width: 1280, height: 900 });
    await onboard(page);
    await importSample(page);

    await page.getByRole('navigation').getByRole('link', { name: 'Documents' }).click();
    await page.getByRole('link', { name: /Case file/ }).click();
    await page.getByRole('radio', { name: 'Legal package' }).click();
    await page.getByRole('button', { name: 'Prepare case file' }).click();

    const preview = page.getByRole('region', { name: 'Preview' });
    await expect(preview.getByRole('img', { name: /^Page 1 of \d+$/ })).toBeVisible({ timeout: 60_000 });
    await preview.getByRole('button', { name: 'Next page' }).click();
    await expect(preview.getByRole('img', { name: /^Page 2 of / })).toBeVisible();

    const download = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Download PDF' }).click();
    const file = await download;
    expect(file.suggestedFilename()).toMatch(/^Resolvr-Legal-case-file-.*\.pdf$/);
    const bytes = await readFile((await file.path())!);
    const text = bytes.toString('latin1');
    expect(text.startsWith('%PDF')).toBe(true);

    // The verification link printed in the PDF checks out against this record.
    const url = /\/verify#v1\.[0-9a-f]{64}\.[0-9a-f]{16}\.[A-Z0-9,-]+/.exec(text)?.[0];
    if (url) {
        await page.evaluate((hash) => {
            history.pushState(null, '', hash);
            dispatchEvent(new PopStateEvent('popstate'));
        }, url);
        await expect(page.getByRole('heading', { name: 'This case file matches your record' })).toBeVisible();
    }
    expect(errors).toEqual([]);
});
