# Resolvr

Private workplace-evidence app: log incidents with tamper-evident timestamps, store evidence encrypted on device, spot patterns, and generate HR-ready documents. Not legal advice.

| Folder | What | Deploys to | Stack |
| --- | --- | --- | --- |
| [`landing/`](landing/) | Marketing site | resolvrapp.com | Vite + TypeScript, Tailwind v4, GSAP, Lenis, Three.js (static) |
| [`app/`](app/) | Web app (PWA) + API | app.resolvrapp.com | Laravel 12, Inertia + React + TypeScript, MySQL |
| [`docs/`](docs/) | Build prompts, design system, deployment | — | — |

Both run on a DirectAdmin server; front-end assets are built with Vite before upload (no Node process on the server).

## Building with Claude

`CLAUDE.md` holds the project context and is loaded automatically by Claude Code. Build step by step with the prompts in [`docs/PROMPTS.md`](docs/PROMPTS.md), starting with P0 (design system) and P0.1 (scaffold).

The original prototype is kept for reference in [`docs/reference/prototype-v2.html`](docs/reference/prototype-v2.html).
