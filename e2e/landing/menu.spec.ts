import { expect, test } from '@playwright/test';

test('mobile menu opens, focuses its first link and closes on Escape', async ({ browser }) => {
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
