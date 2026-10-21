import { expect, test } from '@playwright/test';

const pages = ['/', '/story.html', '/security.html', '/pricing.html', '/privacy.html', '/terms.html'];

for (const path of pages) {
    test(`${path} renders with the legal disclaimer`, async ({ page }) => {
        const errors: string[] = [];
        page.on('pageerror', (error) => errors.push(error.message));

        await page.goto(path);

        await expect(page.locator('h1')).toBeVisible();
        await expect(page.getByText('Not legal advice.')).toBeVisible();
        expect(errors).toEqual([]);
    });
}
