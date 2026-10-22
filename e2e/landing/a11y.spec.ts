import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

/* Accessibility (Q2): axe on every landing page, light and dark, mobile and desktop. */

test.beforeEach(async ({ context }) => {
    await context.route('https://plausible.io/**', (route) => route.fulfill({ body: '', contentType: 'text/javascript' }));
});

const pages = ['/', '/story.html', '/security.html', '/pricing.html', '/privacy.html', '/terms.html'];

for (const theme of ['light', 'dark'] as const) {
    for (const width of [390, 1280]) {
        test(`landing pages pass axe (${theme}, ${width}px)`, async ({ page }) => {
            test.setTimeout(120_000);
            await page.emulateMedia({ reducedMotion: 'reduce' });
            await page.setViewportSize({ width, height: 900 });
            await page.addInitScript((t) => localStorage.setItem('resolvr-theme', t), theme);
            for (const path of pages) {
                await page.goto(path);
                // The hero's miniature phone is an aria-hidden picture; its tiny labels are
                // incidental text in an image (WCAG 1.4.3 exception), so contrast is not checked there.
                const results = await new AxeBuilder({ page })
                    .exclude('.hero-visual')
                    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
                    .analyze();
                for (const v of results.violations)
                    console.log(`[${theme} ${width} ${path}] ${v.impact} ${v.id}: ${v.nodes.slice(0, 3).map((n) => n.target.join(' ')).join(' | ')}`);
                const blocking = results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
                expect.soft(blocking.map((v) => v.id), `${theme} ${width} ${path}`).toEqual([]);
            }
        });
    }
}
