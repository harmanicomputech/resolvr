import { expect, test } from '@playwright/test';

test.beforeEach(async ({ context }) => {
    await context.route('https://plausible.io/**', (route) => route.fulfill({ body: '', contentType: 'text/javascript' }));
});

const pages = [
    ['Security', /\/security$/, 'Private by design'],
    ['Story', /\/story$/, 'Built by someone'],
    ['Pricing', /\/pricing$/, 'Start free'],
] as const;

for (const [name, url, heading] of pages) {
    test(`nav: ${name} opens its page`, async ({ page }) => {
        await page.setViewportSize({ width: 1280, height: 800 });
        await page.goto('/');
        await page.locator('.site-nav-links').getByRole('link', { name }).click();
        await expect(page).toHaveURL(url);
        await expect(page.getByRole('heading', { level: page.url().endsWith('pricing') ? 2 : 1 }).first()).toContainText(heading);
    });
}

test('nav: section links scroll to sections on the home page from another page', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/story');
    await page.locator('.site-nav-links').getByRole('link', { name: 'How it works' }).click();
    await expect(page).toHaveURL(/\/#how-it-works$/);
    await expect(page.locator('#how-it-works')).toBeVisible();
});

test('footer: legal links open', async ({ page }) => {
    await page.goto('/');
    await page.locator('footer').getByRole('link', { name: 'Privacy policy' }).click();
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Privacy policy');
    await page.locator('footer').getByRole('link', { name: 'Terms of service' }).click();
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Terms of service');
});
