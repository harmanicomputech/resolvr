// Renders the OG image and app icons into landing/public. Run: npm run brand
import { chromium } from '@playwright/test';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const pub = resolve(here, '../../public');
const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH || undefined });

const shoot = async (file, width, height, out, scale = 1) => {
    const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: scale });
    await page.goto(`file://${resolve(here, file)}`);
    await page.evaluate(() => document.fonts.ready);
    await page.screenshot({ path: resolve(pub, out) });
    await page.close();
};

await shoot('og.html', 1200, 630, 'og.png');
for (const [size, name] of [
    [512, 'icon-512.png'],
    [192, 'icon-192.png'],
    [180, 'apple-touch-icon.png'],
    [32, 'favicon-32.png'],
]) {
    await shoot('icon.html', 512, 512, name, size / 512);
}
await browser.close();
console.log('brand assets written to', pub);
