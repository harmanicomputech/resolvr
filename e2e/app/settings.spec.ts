import { expect, test } from '@playwright/test';

import { go, importSample, onboard, typePin, unlock } from './helpers';

test('appearance, passcode change and a decoy passcode that opens an empty record', async ({ page }) => {
    test.setTimeout(120_000);
    await onboard(page);
    await importSample(page);
    await go(page, 'Settings');
    await expect(page.getByRole('heading', { name: 'Security' })).toBeVisible();

    // Appearance applies at once.
    await page.getByRole('radio', { name: 'Dark' }).click();
    await expect(page.locator('html')).toHaveClass(/dark/);
    await page.getByLabel('Text size').fill('1.2');
    await expect(page.locator('html')).toHaveAttribute('style', /font-size: 120%/);
    await page.getByRole('radio', { name: 'Reduced' }).click();
    await expect(page.locator('html')).toHaveAttribute('data-motion', 'reduce');

    // Change the passcode.
    await page.getByRole('button', { name: 'Change passcode' }).click();
    const change = page.getByRole('dialog', { name: 'Change passcode' });
    await change.getByLabel('Current passcode').fill('1357');
    await change.getByRole('radio', { name: '4 digits' }).click();
    await change.getByLabel('New passcode', { exact: true }).fill('2468');
    await change.getByLabel('New passcode again').fill('2468');
    await change.getByRole('button', { name: 'Change passcode' }).click();
    await expect(page.getByText('Passcode changed')).toBeVisible();

    // A decoy passcode.
    await page.getByRole('button', { name: 'Set up' }).first().click();
    const decoy = page.getByRole('dialog', { name: 'Decoy passcode' });
    await decoy.getByLabel('Decoy passcode', { exact: true }).fill('2468');
    await decoy.getByLabel('Decoy passcode again').fill('2468');
    await decoy.getByRole('button', { name: 'Save decoy' }).click();
    await expect(decoy.getByText('Choose something different from your real passcode.')).toBeVisible();
    await decoy.getByLabel('Decoy passcode', { exact: true }).fill('9090');
    await decoy.getByLabel('Decoy passcode again').fill('9090');
    await decoy.getByRole('button', { name: 'Save decoy' }).click();
    await expect(page.getByText('Decoy passcode set')).toBeVisible({ timeout: 20_000 });

    // The decoy opens an empty record, and hides the decoy setting.
    await page.reload();
    await unlock(page, '9090');
    // A reload keeps the address, so the decoy opens on Settings too.
    await expect(page.getByRole('heading', { name: 'Security' })).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText('Decoy passcode')).toHaveCount(0);
    await expect(page.getByText('Delete this record')).toBeVisible();
    await go(page, 'Log');
    await expect(page.getByText('Threatened with dismissal')).toHaveCount(0);

    // The real passcode still opens the real record, with settings kept.
    await page.reload();
    await unlock(page, '2468');
    await expect(page.getByRole('heading', { name: 'Log', level: 1 })).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText('Threatened with dismissal', { exact: true }).first()).toBeVisible({ timeout: 30_000 });
    await expect(page.locator('html')).toHaveClass(/dark/);
});

test('recovery phrase, online backup, and restoring on a new device', async ({ page, browser }) => {
    test.setTimeout(180_000);
    await onboard(page);
    await importSample(page);
    await go(page, 'Settings');

    await page.locator('#backup').getByRole('button', { name: 'Set up' }).click();
    const dialog = page.getByRole('dialog', { name: 'Recovery phrase' });
    await dialog.getByRole('button', { name: 'Show my words' }).click();
    const words = (await dialog.getByTestId('recovery-words').locator('li .mono:last-child').allInnerTexts()).map((w) =>
        w.trim(),
    );
    expect(words).toHaveLength(12);
    await dialog.getByRole('button', { name: 'I have written them down' }).click();
    for (const label of await dialog.locator('label', { hasText: /^Word \d+$/ }).allInnerTexts()) {
        const n = Number(label.replace(/\D/g, ''));
        await dialog.getByLabel(label, { exact: true }).fill(words[n - 1]!);
    }
    await dialog.getByRole('button', { name: 'Check' }).click();
    await dialog.getByLabel('Your passcode').fill('1357');
    await dialog.getByRole('button', { name: /Save recovery phrase/ }).click();
    await expect(page.getByText('Recovery phrase saved')).toBeVisible({ timeout: 20_000 });

    await page.getByRole('button', { name: 'Back up now' }).click();
    await expect(page.getByTestId('last-backup')).toContainText('Last backed up', { timeout: 30_000 });

    // A new device: empty storage, restore from the phrase.
    const fresh = await browser.newContext({ ...test.info().project.use, storageState: undefined });
    const other = await fresh.newPage();
    await other.goto('/');
    await other.getByRole('button', { name: 'I have a backup' }).click();
    await other.getByLabel('Recovery phrase').fill(words.join(' '));
    await other.getByRole('button', { name: /Find my backup/ }).click();
    await other.getByRole('radio', { name: '4 digits' }).click();
    await typePin(other, '8642');
    await expect(other.getByRole('heading', { name: 'Enter it once more' })).toBeVisible();
    await typePin(other, '8642');
    await expect(other.getByRole('heading', { name: 'Home', level: 1 })).toBeVisible({ timeout: 60_000 });
    await go(other, 'Log');
    await expect(other.getByText('Threatened with dismissal', { exact: true }).first()).toBeVisible({ timeout: 30_000 });
    await fresh.close();
});

test('delete everything asks twice', async ({ page }) => {
    await onboard(page);
    await go(page, 'Settings');
    await page.getByRole('button', { name: 'Delete', exact: true }).click();
    const dialog = page.getByRole('dialog', { name: 'Delete everything?' });
    await dialog.getByRole('button', { name: 'Continue' }).click();
    const confirm = dialog.getByRole('button', { name: 'Delete everything' });
    await expect(confirm).toBeDisabled();
    await dialog.getByLabel('Type DELETE to confirm').fill('delete');
    await confirm.click();
    await expect(page.getByRole('button', { name: 'Get started' })).toBeVisible({ timeout: 20_000 });
});
