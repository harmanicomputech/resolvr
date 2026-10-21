/* global process, document, console */
// Renders PWA icons into app/public/icons. Run from the repo root: node app/build-tools/icons/render.mjs
import { chromium } from '@playwright/test';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const out = resolve(here, '../../public/icons');
const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH || undefined });

async function shoot(file, size, name, maskable = false) {
    const page = await browser.newPage({ viewport: { width: 512, height: 512 }, deviceScaleFactor: size / 512 });
    await page.goto(`file://${resolve(here, file)}`);
    if (maskable) await page.evaluate(() => document.body.classList.add('maskable'));
    await page.evaluate(() => document.fonts.ready);
    await page.screenshot({ path: resolve(out, name) });
    await page.close();
}

for (const [file, prefix] of [['resolvr.html', 'resolvr'], ['calculator.html', 'calculator']]) {
    await shoot(file, 192, `${prefix}-192.png`);
    await shoot(file, 512, `${prefix}-512.png`);
    await shoot(file, 512, `${prefix}-maskable-512.png`, true);
    await shoot(file, 180, `${prefix}-apple-180.png`);
    await shoot(file, 32, `${prefix}-32.png`);
}
await browser.close();
console.log('icons written to', out);
