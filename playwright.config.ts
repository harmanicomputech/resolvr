import { defineConfig, devices } from '@playwright/test';

// Set PLAYWRIGHT_CHROMIUM_PATH to use a preinstalled Chromium instead of `npx playwright install`.
const executablePath = process.env.PLAYWRIGHT_CHROMIUM_PATH || undefined;

const LANDING_URL = 'http://127.0.0.1:4174';
const APP_URL = 'http://127.0.0.1:8001';

export default defineConfig({
    testDir: './e2e',
    fullyParallel: true,
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 2 : 0,
    reporter: process.env.CI ? 'github' : 'list',
    use: {
        trace: 'on-first-retry',
        launchOptions: { executablePath },
    },
    projects: [
        {
            name: 'landing',
            testMatch: 'landing/**/*.spec.ts',
            use: { ...devices['Desktop Chrome'], baseURL: LANDING_URL },
        },
        {
            name: 'app',
            testMatch: 'app/**/*.spec.ts',
            use: { ...devices['Pixel 7'], baseURL: APP_URL },
        },
    ],
    webServer: [
        {
            // Serves the built site; run `npm --prefix landing run build` first.
            command: 'npm --prefix landing run preview -- --port 4174 --strictPort --host 127.0.0.1',
            url: LANDING_URL,
            reuseExistingServer: !process.env.CI,
        },
        {
            // Uses app/public/build; run `npm --prefix app run build` first.
            command: 'php app/artisan serve --host=127.0.0.1 --port=8001',
            url: `${APP_URL}/up`,
            reuseExistingServer: !process.env.CI,
        },
    ],
});
