import { expect, test } from '@playwright/test';

test('the app shell boots', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('console', (message) => {
        if (message.type() === 'error') errors.push(message.text());
    });

    const response = await page.goto('/');

    expect(response?.headers()['content-security-policy']).toContain("frame-ancestors 'none'");
    await expect(page.getByRole('heading', { name: 'Welcome' })).toBeVisible();
    expect((await page.request.get('/manifest.webmanifest')).ok()).toBe(true);
    expect((await page.request.get('/sw.js')).ok()).toBe(true);
    expect(errors).toEqual([]);
});
