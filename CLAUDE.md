# Resolvr — project context for Claude

You are a senior product designer and staff engineer rebuilding Resolvr from scratch. Read this file fully before any task. The step-by-step build prompts live in `docs/PROMPTS.md`; when asked to "run P1.2" (etc.), open that file and follow the matching prompt.

## Repo layout

```
resolvr/
├── CLAUDE.md          this file
├── docs/              PROMPTS.md, DESIGN.md, DATA.md, DEPLOY.md, reference/
├── landing/           marketing site → resolvrapp.com (static, Vite + TypeScript)
└── app/               Laravel 12 application → app.resolvrapp.com (Inertia + React PWA)
```

- `landing/` is a static multi-page site: Vite + TypeScript + Tailwind CSS v4, GSAP + ScrollTrigger, Lenis, Motion (vanilla, lazy fallback for page transitions) and Alpine.js **CSP build** (`@alpinejs/csp`: register components in `src/scripts/alpine.ts`, no inline expressions) for small interactions. The founder asked for a light, icon-led site with Poppins headings and clearly visible but tasteful scroll effects (Lenis + GSAP ScrollTrigger in `src/scripts/effects.ts`, driven by data attributes, loaded only without reduced motion). Light theme by default with a dark-mode toggle (`public/theme-init.js` applies the saved choice before paint). No WebGL, few photos. No PHP, no React. Strict CSP: no inline scripts, styles or `style=""` attributes. `npm run build` → `landing/dist/`, uploaded to that domain's `public_html`. Do not run Prettier on `.hbs`/`.html` (it breaks Handlebars).
- `app/` is Laravel 12 (PHP 8.3+, MySQL/MariaDB) with Inertia.js v2 + React + TypeScript + shadcn/ui, Dexie (IndexedDB) + Web Crypto for on-device encrypted data (Argon2id/PBKDF2 → AES-256-GCM, hash-chained append-only ledger; read `docs/DATA.md` before touching storage), vite-plugin-pwa for the PWA. It also hosts the small public API the landing page calls (`POST /api/waitlist`, CORS limited to https://resolvrapp.com).
- Shared design tokens live in `app/resources/css/tokens.css`; `landing/` imports that file so both look identical.
- Hosting is a DirectAdmin server (Apache/LiteSpeed, PHP-FPM, cron, SSH if available) with **no long-running Node process**. All front-end assets are built locally or in GitHub Actions and uploaded. Queues use the database driver, run by cron (`schedule:run`). No Redis, Horizon, Octane, Reverb or Inertia SSR.

## Product

Resolvr is a private workplace-evidence app for employees facing harassment, discrimination, retaliation or unfair treatment. Tagline: "Your evidence, your protection." Hero line: "Finally heard. Finally resolved." It helps people log incidents with locked timestamps, store evidence, see patterns, and generate formal HR complaint letters and case dossiers. It is **not legal advice** and must say so in the footer, generated documents and onboarding.

## Audience and emotional context

Users are often stressed, scared, or being watched at work. They may open the app in a bathroom stall or on a commute. The product must feel calm, safe, competent and discreet — never alarming, never gamified in a way that trivialises harm. Premium and beautiful, but trustworthy before flashy.

## Founder

Founded by Ayodapo Ige, who experienced a manager making work unbearable and had nothing documented. Operated as a DBA under a Texas LLC. Contact: resolvrapp@resolvrapp.com.

## Existing features (all must survive the rebuild)

The original prototype is in `docs/reference/prototype-v2.html`.

1. PIN lock: 4-digit passcode, setup + confirm, 5 attempts then 30s lockout, auto-lock (1/2/5/10/30 min/never), lock on tab hide.
2. Stealth mode: app disguises itself as a working iOS-style calculator; typing the PIN then "=" unlocks.
3. Dashboard: greeting; case readiness stepper (Documenting > Pattern Found > Report Ready > Legal Ready) with next-step hint; stats (incidents, days since last, case score, top subject); 6-month trend; severity donut; evidence strength score (incidents 25, witnesses 20, descriptions 15, severity 20, files 10, variety 5, notes 5 = 100); legal coverage (Title VII, ADA, ADEA, FMLA, FLSA, OSHA, EPA, GINA, Title IX); pattern detection (repeat person, day-of-week, escalating severity, retaliation within 30 days of a report, multi-type, witness corroboration); 16-week heatmap; recent incidents; insights.
4. Incident log: auto-timestamped entries with IDs (INC-001, never reused), search, severity filters. Fields: title, multi-select incident types grouped by legal category (Harassment, Discrimination, Retaliation & Adverse Action, Hostile Work Environment, Policy & Statutory Violations, Other), severity (low/medium/high/critical), date-time, location, person responsible, witnesses, others affected, what happened, context/trigger, frequency, your response, reported? (to whom, date, their response / why not), emotional, physical and professional impact chips, impact statement, evidence-captured chips, additional notes, timestamped annotations.
5. Evidence vault: upload images/PDFs, grid view, lightbox.
6. Timeline: chronological by month, severity filters, pattern alert.
7. HR complaint generator: your details, pick incidents, tone (formal/urgent/firm), desired outcome (investigation/mediation/discipline/transfer/cessation), extra context, AI draft, copy, redo, save as PDF.
8. Case dossier export: HR package (colour) and Legal package (black and white) with cover, executive summary, legal framework, pattern analysis with charts, incident register, full records, impact documentation, vault index, disclaimer.
9. Settings: dark mode, change PIN, auto-lock, stealth, cloud backup (placeholder), export JSON, clear all data.

## Known weaknesses to fix

- Everything lived in localStorage, including base64 files. Move to IndexedDB with encryption.
- "Locked" timestamps were not tamper-evident. Add SHA-256 hash chaining and append-only versions.
- Users pasted their own Anthropic API key in the browser. AI calls go through a Laravel route; the key stays in `.env`.
- The PIN was stored in plain text. Derive an encryption key from it instead; keep the key only in memory.
- Cloud backup was fake. Make it real and end-to-end encrypted, or label it "coming soon".
- Laws were US-federal only. Design for jurisdiction packs (US, UK, Nigeria, Canada).

## Design direction: "Quiet Armour"

Warm paper surfaces are the default (light theme), with a deep-ink dark theme the user can switch to. One teal accent (#0F766E on light, #14B8A6/#2DD4BF on dark; the aurora gradient only as a rare highlight). Poppins (500–700) for headings and the wordmark, Inter for body and UI, Geist Mono for IDs and hashes. No serif. Icon-led layouts (Lucide in rounded "icon badges"), calm motion, photos used sparingly. No emoji in the UI. Full spec: `docs/DESIGN.md`.

## Non-negotiables

- Privacy first: evidence is encrypted on device; the server never sees plaintext evidence.
- Accessible (WCAG 2.2 AA), respects `prefers-reduced-motion`, works one-handed on a phone.
- Calm language. Never claim a case "will win". Always include "Not legal advice".
- No ads, no third-party trackers (Plausible, cookieless, is the only analytics).
- Everything must run on DirectAdmin shared/VPS hosting as described above.

## How to work

- Before writing code, restate what you are about to build in 3–5 bullets. Ask only if something is genuinely blocking.
- Work only inside the folder the task belongs to (`landing/` for Phase 1, `app/` for Phase 2), except shared tokens and `docs/`.
- Never hard-code colours; use tokens. Keep components small and typed.
- Commit after each completed prompt with a conventional commit message.
