import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
    // Never leave the test sandbox: answer the neutral site locally.
    await page.route('https://www.google.com/**', (route) => route.fulfill({ body: '<title>Weather</title>neutral', contentType: 'text/html' }));
});

test('quick exit button leaves for a neutral page and replaces history', async ({ page }) => {
    await page.goto('/pricing.html');
    await page.goto('/');
    await page.getByRole('button', { name: 'Quick exit' }).click();
    await page.waitForURL(/google\.com/);
    await page.goBack();
    // Back skips the replaced home page and lands on the previous entry.
    await expect(page).toHaveURL(/pricing/);
});

test('Escape triggers quick exit', async ({ page }) => {
    await page.goto('/');
    await page.keyboard.press('Escape');
    await page.waitForURL(/google\.com/);
});

test('mobile menu opens, traps nothing, and closes on Escape without exiting', async ({ browser }) => {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true });
    const page = await context.newPage();
    await page.goto('/');

    const toggle = page.getByRole('button', { name: 'Menu' });
    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-expanded', 'true');
    await expect(page.locator('#mobile-menu')).toHaveAttribute('data-open', 'true');
    await expect(page.locator('#mobile-menu').getByRole('link', { name: 'Features' })).toBeFocused();

    await page.keyboard.press('Escape');
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await expect(page).toHaveURL(/127\.0\.0\.1/);
    await context.close();
});
