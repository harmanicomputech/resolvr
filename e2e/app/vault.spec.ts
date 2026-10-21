import { expect, test } from '@playwright/test';

import { onboard } from './helpers';

test('upload, view, verify, OCR and redact evidence', async ({ page, context }) => {
    test.setTimeout(120_000);
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));

    // A real screenshot with text in it, made by the browser itself.
    const maker = await context.newPage();
    await maker.setViewportSize({ width: 640, height: 200 });
    await maker.setContent('<body style="margin:0;background:#fff;font:600 44px Arial;padding:50px">Meeting moved to Friday</body>');
    const screenshot = await maker.screenshot();
    await maker.close();

    await page.setViewportSize({ width: 1280, height: 900 });
    await onboard(page);
    await page.getByRole('navigation').getByRole('link', { name: 'Vault' }).click();
    await expect(page.getByText('Your vault is empty')).toBeVisible();

    await page.getByTestId('vault-upload').setInputFiles([{ name: 'chat.png', mimeType: 'image/png', buffer: screenshot }]);
    await expect(page.getByText('1 file encrypted and saved')).toBeVisible();
    await page.getByRole('list', { name: 'Files' }).getByRole('button', { name: /chat\.png/ }).click();

    const details = page.getByRole('complementary', { name: 'File details' });
    await details.getByRole('button', { name: 'Check it has not changed' }).click();
    await expect(details.getByText('Matches the fingerprint taken when it was added.')).toBeVisible();

    await details.getByRole('button', { name: 'Make text searchable' }).click();
    await expect(page.getByText('Text found and made searchable')).toBeVisible({ timeout: 90_000 });
    await expect(details.getByText(/Friday/)).toBeVisible();

    // Redact a copy: the original is untouched.
    await details.getByRole('button', { name: 'Redact a copy' }).click();
    const canvas = page.getByLabel('Image to redact. Drag to draw a black box.');
    const box = (await canvas.boundingBox())!;
    await page.mouse.move(box.x + 20, box.y + 20);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width / 2, box.y + box.height - 20, { steps: 5 });
    await page.mouse.up();
    await page.getByRole('button', { name: 'Save redacted copy' }).click();
    await expect(page.getByText('Redacted copy saved')).toBeVisible();
    await expect(page.getByRole('dialog', { name: 'Redact a copy' })).toBeHidden();
    await page.keyboard.press('Escape');
    await expect(details).toBeHidden();

    await page.getByLabel('Search files').fill('friday');
    await expect(page.getByRole('list', { name: 'Files' }).getByRole('listitem')).toHaveCount(1);
    await page.getByLabel('Search files').fill('redacted');
    await expect(page.getByRole('list', { name: 'Files' }).getByRole('listitem')).toHaveCount(1);
    expect(errors).toEqual([]);
});
