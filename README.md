# Resolvr

Private workplace-evidence app: log incidents with tamper-evident timestamps, store evidence encrypted on device, spot patterns, and generate HR-ready documents. Not legal advice.

| Folder | What | Deploys to | Stack |
| --- | --- | --- | --- |
| [`landing/`](landing/) | Marketing site | resolvrapp.com | Vite + TypeScript multi-page, Tailwind v4, GSAP, Lenis, Motion, Alpine (static) |
| [`app/`](app/) | Web app (PWA) + public API | app.resolvrapp.com | Laravel 12, Inertia v2 + React + TypeScript, MySQL |
| [`e2e/`](e2e/) | Playwright tests for both | — | Playwright |
| [`docs/`](docs/) | Build prompts, design system, data layer, deployment | — | — |

Both run on a DirectAdmin server. Front-end assets are built with Vite before upload; the server runs no Node process.

## Folder map

```
resolvr/
├── CLAUDE.md                 project context (auto-loaded by Claude Code)
├── docs/                     PROMPTS.md, DESIGN.md, DEPLOY.md, reference/prototype-v2.html
├── landing/
│   ├── src/pages/            index, story, security, pricing, privacy, terms (.html)
│   ├── src/partials/         head, nav, footer (Handlebars)
│   ├── src/scripts/          TypeScript entry points
│   ├── src/styles/main.css   Tailwind + ../app/resources/css/tokens.css
│   ├── src/pages.config.ts   per-page title/description
│   ├── src/content.ts        FAQ, pricing, steps, moments… (also feeds JSON-LD)
│   ├── src/assets/photos/    responsive WebP photos ({{photo}} helper)
│   ├── build/                icon + photo helpers, SEO/sitemap, brand renderer
│   └── public/               .htaccess, robots.txt, og.png, icons
├── app/
│   ├── app/Http/Middleware/  SecurityHeaders (CSP nonce, HSTS…), HandleInertiaRequests
│   ├── config/cors.php       only /api/waitlist, only https://resolvrapp.com
│   ├── resources/css/tokens.css   shared design tokens (owned here)
│   ├── resources/js/
│   │   ├── components/{ui,app}
│   │   ├── lib/{model,crypto,integrity,db,scoring,patterns,laws,migration}   see docs/DATA.md
│   │   └── pages/
│   └── routes/{web,api}.php
├── e2e/{landing,app}/        Playwright specs
└── playwright.config.ts
```

## Requirements

Node 22+, PHP 8.3+ with Composer, MySQL/MariaDB (SQLite works for local dev).

## landing/

```bash
cd landing
npm ci
npm run dev        # http://localhost:5174
npm run build      # → landing/dist (upload to public_html, including .htaccess)
npm run preview
npm run lint && npm run typecheck && npm test
npm run brand      # re-render og.png and icons (needs Playwright's Chromium)
```

Copy `.env.example` to `.env` to point the waitlist form at a local app (`VITE_APP_URL`).

## app/

```bash
cd app
composer install
npm ci
cp .env.example .env && php artisan key:generate
# local: set DB_CONNECTION=sqlite (or fill the MySQL DB_* values), then
php artisan migrate
composer dev       # artisan serve + queue:listen + vite
```

Checks:

```bash
composer lint      # Pint (composer lint:check in CI)
composer analyse   # Larastan
composer test      # Pest
npm run lint && npm run typecheck && npm test   # ESLint, tsc, Vitest
npm run build      # → app/public/build
```

## End-to-end

```bash
npm ci
npm --prefix landing run build && npm --prefix app run build
npx playwright install chromium   # or set PLAYWRIGHT_CHROMIUM_PATH to an existing Chromium
npm run e2e
```

## Deploying

See [`docs/DEPLOY.md`](docs/DEPLOY.md). GitHub Actions ([`ci-deploy.yml`](.github/workflows/ci-deploy.yml)) tests every PR and deploys the landing site from `main`.

## Building with Claude

`CLAUDE.md` holds the project context. Build step by step with the prompts in [`docs/PROMPTS.md`](docs/PROMPTS.md). The original prototype is kept for reference in [`docs/reference/prototype-v2.html`](docs/reference/prototype-v2.html).
