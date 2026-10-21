import { expect, test } from '@playwright/test';

const pages = ['/', '/story', '/security', '/pricing', '/privacy', '/terms'];

// Tests never reach third parties: answer the analytics script locally.
test.beforeEach(async ({ context }) => {
    await context.route('https://plausible.io/**', (route) => route.fulfill({ body: '', contentType: 'text/javascript' }));
});

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
    await context.route('https://plausible.io/**', (route) => route.fulfill({ body: '', contentType: 'text/javascript' }));
    const page = await context.newPage();
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));

    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Finally heard. Finally resolved.');
    await expect(page.getByText('No organised record.')).toBeVisible();
    expect(errors).toEqual([]);
    await context.close();
});
