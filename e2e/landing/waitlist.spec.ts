import { expect, test } from '@playwright/test';

test('waitlist: inline validation, then a real round trip to the app API', async ({ page }) => {
    await page.goto('/#waitlist');
    const form = page.locator('[data-waitlist]');
    const email = form.getByLabel('Email address');

    await form.getByRole('button', { name: 'Join waitlist' }).click();
    await expect(form.getByRole('alert')).toHaveText(/Enter an email address/);
    await expect(email).toHaveAttribute('aria-invalid', 'true');

    const response = page.waitForResponse((r) => r.url().endsWith('/api/waitlist') && r.request().method() === 'POST');
    await email.fill(`e2e-${Date.now()}@example.com`);
    await form.getByRole('button', { name: 'Join waitlist' }).click();

    await expect(form.getByRole('status')).toContainText("You're on the list");
    expect((await response).status()).toBe(202);
    // Still showing success once the server has answered (no rollback).
    await expect(form.getByRole('status')).toBeVisible();
});

test('pricing toggle switches to yearly prices', async ({ page }) => {
    await page.goto('/pricing.html');
    await page.getByRole('button', { name: /Yearly/ }).click();
    await expect(page.getByRole('button', { name: /Yearly/ })).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('.price-amount').nth(1)).toHaveAttribute('aria-label', '60');
});
