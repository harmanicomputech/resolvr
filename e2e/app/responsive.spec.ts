import { expect, test } from '@playwright/test';

import { go, importSample, onboard } from './helpers';

/*
 * Review (Q1): every screen at 360, 768, 1280 and 1920px has no horizontal
 * overflow and logs no console errors; the keyboard basics work.
 */

const screens = ['Home', 'Log', 'Vault', 'Timeline', 'People', 'Documents', 'Wellbeing', 'Settings'] as const;

test('no sideways scrolling and no console errors at any width', async ({ page }) => {
    test.setTimeout(240_000);
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
    await onboard(page);
    await importSample(page);

    for (const width of [360, 768, 1280, 1920]) {
        await page.setViewportSize({ width, height: 900 });
        for (const screen of screens) {
            await go(page, screen);
            await page.waitForTimeout(250);
            const overflow = await page.evaluate(
                () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
            );
            expect.soft(overflow, `${screen} at ${width}px overflows by ${overflow}px`).toBeLessThanOrEqual(0);
        }
    }
    expect(errors).toEqual([]);
});

test('keyboard: skip link, visible focus, and the palette opens and closes', async ({ page }) => {
    await onboard(page);
    await page.keyboard.press('Tab');
    await expect(page.getByRole('link', { name: 'Skip to content' })).toBeFocused();
    await page.keyboard.press('Control+k');
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await page.keyboard.press('Tab');
    const style = await page.evaluate(() => {
        const cs = getComputedStyle(document.activeElement!);
        return `${cs.boxShadow}|${cs.outlineStyle}`;
    });
    expect(style).not.toBe('none|none');
});
