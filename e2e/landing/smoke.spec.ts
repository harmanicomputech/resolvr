import { expect, test } from '@playwright/test';

const pages = ['/', '/story', '/security', '/pricing', '/privacy', '/terms'];

for (const path of pages) {
    test(`${path} renders with the legal disclaimer and no errors`, async ({ page }) => {
        const errors: string[] = [];
        page.on('pageerror', (error) => errors.push(error.message));
        page.on('console', (message) => {
            if (message.type() === 'error') errors.push(message.text());
        });

        await page.goto(path === '/' ? '/' : `${path}.html`);

        await expect(page.locator('h1')).toHaveCount(1);
        await expect(page.locator('footer').getByText('Not legal advice.')).toBeVisible();
        expect(errors).toEqual([]);
    });
}

test('reduced motion: content is visible and nothing errors', async ({ browser }) => {
    const context = await browser.newContext({ reducedMotion: 'reduce' });
    const page = await context.newPage();
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));

    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Finally heard. Finally resolved.');
    await expect(page.getByText('No organised record.')).toBeVisible();
    expect(errors).toEqual([]);
    await context.close();
});
