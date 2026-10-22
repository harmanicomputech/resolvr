import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

import { go, importSample, onboard } from './helpers';

/*
 * Accessibility (Q2): axe on every main screen, in both themes. Serious and
 * critical violations fail the build; the rest are printed for review.
 */

async function audit(page: Page, label: string) {
    const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze();
    const blocking = results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
    for (const v of results.violations)
        console.log(`[${label}] ${v.impact} ${v.id}: ${v.nodes.slice(0, 3).map((n) => n.target.join(' ')).join(' | ')}`);
    expect.soft(blocking, `${label}: ${blocking.map((v) => v.id).join(', ')}`).toEqual([]);
}

const screens = ['Home', 'Log', 'Vault', 'Timeline', 'People', 'Documents', 'Wellbeing', 'Settings'] as const;

for (const theme of ['light', 'dark'] as const) {
    test(`every screen passes axe (${theme})`, async ({ page }) => {
        test.setTimeout(180_000);
        await page.emulateMedia({ reducedMotion: 'reduce' });
        await page.goto('/');
        await audit(page, `${theme} welcome`);
        await onboard(page);
        await importSample(page);
        if (theme === 'dark') {
            await go(page, 'Settings');
            await page.getByRole('radio', { name: 'Dark' }).click();
        }
        for (const screen of screens) {
            await go(page, screen);
            await page.waitForTimeout(400);
            await audit(page, `${theme} ${screen}`);
        }
        await page.reload();
        await expect(page.getByRole('heading', { name: 'Enter your PIN' })).toBeVisible();
        await audit(page, `${theme} lock`);
    });
}
