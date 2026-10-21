import { expect, test } from '@playwright/test';

test.beforeEach(async ({ context }) => {
    await context.route('https://plausible.io/**', (route) => route.fulfill({ body: '', contentType: 'text/javascript' }));
});

test('light by default; dark mode toggles and persists across pages', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/');
    const html = page.locator('html');
    await expect(html).not.toHaveClass(/dark/);

    const toggle = page.locator('.site-nav-ctas [data-theme-toggle]');
    await toggle.click();
    await expect(html).toHaveClass(/dark/);
    await expect(toggle).toHaveAttribute('aria-pressed', 'true');

    await page.goto('/pricing.html');
    await expect(html).toHaveClass(/dark/);

    await page.locator('.site-nav-ctas [data-theme-toggle]').click();
    await expect(html).not.toHaveClass(/dark/);
});
