import { expect, test } from '@playwright/test';

test('the app shell boots', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('console', (message) => {
        if (message.type() === 'error') errors.push(message.text());
    });

    const response = await page.goto('/');

    expect(response?.headers()['content-security-policy']).toContain("frame-ancestors 'none'");
    await expect(page.getByText('Your evidence, your protection.')).toBeVisible();
    expect(errors).toEqual([]);
});
