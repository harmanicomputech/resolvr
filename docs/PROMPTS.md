# Resolvr rebuild — prompt pack

Run these in order, one per Claude message, and review each result before moving on. `CLAUDE.md` at the repo root carries the master context, so Claude Code loads it automatically; in Claude Code you can simply say "Run P1.2 from docs/PROMPTS.md".

Order: **P0 → P0.1 → Phase 1 (P1.1–P1.9, in `landing/`) → Phase 2 (P2.0–P2.13, in `app/`) → Phase 3 (optional) → D1 deploy.** Run Q1 after every big prompt, and Q2–Q3 before each phase ships.

Placeholders look like `[LIKE THIS]`; fill them before sending.

---

## Foundation

### P0 — Design system

```text
Using CLAUDE.md, create Resolvr's design system as code and documentation.

Direction: "Quiet Armour" - calm, protective, premium. Think Linear's precision + Apple's restraint + Arc/Raycast's glow, with editorial warmth.

Deliver:
1. Colour tokens for light and dark (dark is the hero theme):
   - Ink: #07090D base, #0D1117 surface, #141A22 raised, hairline borders at 6-10% white.
   - Paper (light): #F7F5F0 base, #FFFFFF surface, warm greys.
   - Accent: teal #14B8A6 -> aurora gradient (#14B8A6, #22D3EE, #A78BFA) used sparingly for glows, focus rings and primary CTAs.
   - Severity scale that is readable but not screaming: low #34D399, medium #FBBF24, high #FB923C, critical #F43F5E, each with 10% tint and 24% border variants.
   - Semantic: success, warning, danger, info. All text pairs must pass 4.5:1.
2. Typography: display serif "Instrument Serif" or "Fraunces" (italic for the wordmark and key phrases), UI sans "Inter" or "Geist", mono "Geist Mono" for incident IDs and hashes. Fluid type scale with clamp() from 12px to 96px. Self-host the fonts.
3. Spacing (4px base), radii (6/10/16/24/full), elevation (soft layered shadows + inner highlight for glass), blur levels (8/16/32px).
4. Glass surface recipe: translucent fill, backdrop-blur, 1px gradient border, subtle noise texture overlay.
5. Motion tokens: durations (120/200/320/560/900ms), easings (out-expo for entrances, spring config for interactive elements, in-out-quart for page transitions). Rules: motion explains hierarchy or state; nothing loops forever except ambient background; everything collapses to opacity fades under prefers-reduced-motion.
6. Iconography: Lucide or Phosphor (duotone), 1.5px stroke. No emoji in the UI.
7. Core components spec: Button (primary glow, secondary glass, ghost, danger), Input, Textarea, Select, Chip/Tag, Severity pill, Card, Stat, Sheet/Drawer, Dialog, Toast, Tooltip, Tabs, Segmented control, Empty state, Skeleton.

Output: app/resources/css/tokens.css (CSS variables + a Tailwind v4 @theme block) that landing/ also imports, and docs/DESIGN.md explaining usage with do/don't examples. Then build a /design route in app/ (local environment only) that renders every token and component in both themes so I can review it.
```

### P0.1 — Scaffold both folders

```text
In the resolvr repo:
1. landing/: create a Vite multi-page TypeScript project (pages: index, story, security, pricing, privacy, terms) with Tailwind CSS v4, GSAP + ScrollTrigger, Lenis, Motion and Alpine.js. Import ../app/resources/css/tokens.css. Shared head/nav/footer partials. npm scripts: dev, build (outputs dist/), preview. Add an .htaccess template for clean URLs, caching and security headers that gets copied into dist/.
2. app/: create a Laravel 12 project (PHP 8.3, MySQL) with Inertia.js v2 + React + TypeScript, Tailwind v4, shadcn/ui, Motion, Dexie. Configure: database queue, file cache/sessions, SMTP mail, security headers middleware (CSP, HSTS, X-Frame-Options, Referrer-Policy, Permissions-Policy), CORS allowing only https://resolvrapp.com for /api/waitlist. Folders: resources/js/components/{ui,app}, resources/js/lib/{crypto,db,scoring,patterns,laws}, resources/js/pages.
3. Tooling: Pint, Larastan, Pest (app); ESLint, Prettier, Vitest in both; Playwright e2e at repo root.
4. Root: update .gitignore and README with the folder map and commands.
Do not build pages yet. Commit as "chore: scaffold landing and app".
```

---

## Phase 1 — Landing page (`landing/`)

The page tells one story as you scroll: the problem (isolation), the turn (a private record), the proof (the product in motion), and the invitation (start now).

### P1.1 — Shell, nav, smooth scroll

```text
Build the marketing layout: Lenis smooth scrolling synced with GSAP ScrollTrigger; a floating glass navbar (logo wordmark in italic serif, links: Features, How it works, Security, Story, Pricing; CTAs: "Open the app" primary -> https://app.resolvrapp.com, "Join waitlist" ghost). Navbar shrinks and gains blur after 40px scroll, hides on scroll-down and returns on scroll-up. Mobile: full-screen menu with staggered link reveal. Add a scroll progress hairline in the aurora gradient at the top. Add a custom cursor glow on desktop only (follows pointer with spring lag, grows over interactive elements). Footer: 4 columns, "Not legal advice" line, quick-exit note, contact email, legal links.
```

### P1.2 — Hero

```text
Build a full-viewport hero.
- Background: animated aurora mesh gradient (WebGL shader or layered blurred blobs) over ink, with a fine noise overlay and a slow-drifting particle field. Mouse parallax on 3 depth layers (max 12px).
- Centre-left: eyebrow pill "Now in beta" with a pulsing dot; headline "Finally heard. *Finally resolved.*" where the italic phrase is serif with an animated gradient sheen; words reveal with a staggered mask-up animation. Subhead about documenting incidents with tamper-evident timestamps, storing evidence privately and generating HR-ready complaints.
- CTAs: "Start documenting - free" (magnetic button with glow) and "See how it works" (scrolls to section).
- Trust row: encrypted on device, works offline, installable, not legal advice.
- Right: a 3D-tilted phone mockup (Three.js or CSS 3D) showing the real app dashboard UI built in HTML, not a screenshot. Tilt follows the cursor. Floating glass cards orbit it ("INC-014 logged · 09:42", "Pattern detected: 4 incidents, same person", "Evidence score 78") with parallax.
- On scroll, the phone scales down and pins, handing off to the next section.
Performance: hero LCP under 2.0s on mid-range mobile; lazy-load the 3D; static fallback when reduced motion or low-power.
```

### P1.3 — The problem (scroll story)

```text
Build a pinned scroll section titled "When something goes wrong at work, you're on your own."
As the user scrolls, three statements take over the screen one at a time with text that blurs in and out: No organised record / HR protects the company first / Patterns get missed. Behind them, scattered fragments (sticky notes, a blurry screenshot, a calendar) drift apart, then on the final beat snap together into one organised timeline card - visual metaphor for Resolvr. Use GSAP ScrollTrigger scrub. Include a small, carefully sourced stat line with a citation placeholder [SOURCE] I will fill in.
```

### P1.4 — Features (bento + live demos)

```text
Build a bento grid of 6 feature tiles with different sizes. Each tile contains a small live, looping-on-hover UI demo built in code, not images:
1. Incident log - a form auto-fills, timestamp locks with a padlock animation and a hash appears.
2. Evidence vault - files drop in and arrange into a grid with blur-up.
3. Timeline + pattern detection - dots appear along a line, then a red bracket groups three with "Escalating".
4. AI complaint letter - text streams in like typing, then the page folds into a PDF icon.
5. Stealth mode - the app flips into a calculator and back.
6. Case dossier - pages fan out like a deck.
Tiles have a spotlight effect following the cursor, a gradient border that lights up on hover, and stagger into view. Mobile: single column, demos autoplay once in view.
```

### P1.5 — How it works (sticky stepper)

```text
Build a 4-step section: Log the incident / Add your evidence / Watch the pattern / Generate your complaint. Layout: steps on the left in a sticky column with a vertical progress line that fills as you scroll; on the right, a pinned device that crossfades between four real app screens matching the active step. Each step number counts in, active step text is full contrast, others dimmed to 40%.
```

### P1.6 — Security & privacy

```text
Build a dark section "Everything you need. Nothing they can touch." Centre: an animated shield/lock built from concentric rings that rotate slowly and lock into place on scroll. Around it, six glass cards: Encrypted on your device (AES-256), PIN and biometric lock, Stealth calculator mode, Tamper-evident timestamps (hash chain), Optional end-to-end encrypted backup, No ads and no trackers. Add a short "What we can and can't see" two-column comparison. Plain, precise language - no overclaiming.
```

### P1.7 — Story, testimonials, FAQ

```text
1. Founder story: large serif pull-quote from Ayodapo Ige that reveals line by line, with a portrait placeholder in a soft-masked frame and parallax.
2. Testimonials: infinite, pause-on-hover marquee of anonymised quotes (placeholders flagged as such - do not invent real-sounding people).
3. FAQ: accordion with smooth height animation covering: Is this legal advice? Where is my data? Can my employer see it? What if I lose my phone? Does it work offline? Is it free? Which countries' laws are covered?
```

### P1.8 — Pricing, final CTA, waitlist

```text
Pricing: three cards (Free / Plus / Legal-ready) with a monthly/yearly toggle that animates prices with a number roll; the middle card has a rotating conic-gradient border. Use [PLACEHOLDER] prices.
Final CTA: a full-width section with the aurora returning, headline "Start your record today. It takes 60 seconds." and a primary button to https://app.resolvrapp.com.
Waitlist form: email field with inline validation, submit via fetch to the app's API (POST https://app.resolvrapp.com/api/waitlist, CORS limited to resolvrapp.com; build that endpoint in app/) which stores the email in MySQL and sends a confirmation with Laravel Mail over SMTP, optimistic success state with a check-draw animation and confetti that respects reduced motion. Honeypot + rate limiting.
Also build /privacy and /terms as clean long-form pages with a sticky table of contents, migrating the current policy text from resolvrapp.com.
```

### P1.9 — Safety details, SEO, polish

```text
- Add a "Quick exit" button (Esc key or a fixed corner button) that instantly replaces the page with a neutral site and clears it from history where possible.
- SEO: metadata, a designed Open Graph image in brand style with per-page meta from a shared head partial in landing/, JSON-LD (SoftwareApplication, Organization, FAQPage), sitemap, robots.
- Page transitions between pages using cross-document View Transitions with a Motion fallback.
- Audit every animation for prefers-reduced-motion and 60fps on a mid-range Android. Report Lighthouse scores and fix anything under 90.
```

---

## Phase 2 — PWA web app (`app/`)

Do P2.0–P2.2 before any screen: the data and security layer is what makes the app real.

### P2.0 — Data model & encrypted storage

```text
Read docs/reference/prototype-v2.html: its incident object, vault object and scoring/pattern functions. Then:
1. Define TypeScript types + Zod schemas for Incident (all prototype fields plus: id, incId, version, createdAt, occurredAt, hash, prevHash, attachments[], tags[], jurisdiction), Annotation, EvidenceFile, Person (normalised from free text), Witness, CaseProfile, Settings.
2. Store everything in IndexedDB via Dexie. Large files go in a blobs table, never base64 in localStorage.
3. Encrypt every record and blob with AES-GCM using a key derived from the PIN (Argon2id via WASM, or PBKDF2 with 600k iterations as fallback) plus a random salt. Keep the key only in memory; wipe it on lock.
4. Tamper-evidence: each incident stores SHA-256(prevHash + canonical JSON). Edits create a new version rather than overwriting; show a verifiable chain.
5. Migration: import an old prototype JSON export.
6. Port calcScore, pattern detection and legal coverage into pure, unit-tested functions in resources/js/lib.
```

### P2.1 — PWA foundation

```text
Make app/ an installable PWA with vite-plugin-pwa (Workbox); the service worker and manifest are built by Vite and served as static files from app/public/, scoped to the app.resolvrapp.com root: manifest (name, short_name, maskable icons, theme colours for both themes, shortcuts for "Log incident" and "Quick capture"), offline-first app shell, runtime caching, an "Update available" toast, a custom install prompt shown after the user logs their first incident (never on first visit), iOS install instructions sheet, and a disguised alternate manifest/icon set used when stealth mode is on ("Calculator").
```

### P2.2 — Lock, onboarding, stealth

```text
1. Onboarding (4 swipeable screens with shared-element transitions): what Resolvr is, privacy promise, set PIN, optional biometrics (WebAuthn passkey to unlock), choose jurisdiction, "Not legal advice" acknowledgement.
2. Lock screen: frosted aurora background, PIN dots that morph on entry, haptic feedback (navigator.vibrate) on mobile, shake on error, lockout timer ring. Unlock animation: the lock dissolves into the dashboard.
3. Stealth calculator: pixel-accurate, fully working calculator; PIN + "=" unlocks with a subtle transition. Also a "panic" gesture (triple-tap the logo or shake device) that instantly switches to the calculator.
4. Auto-lock, lock on hide, and wipe decrypted data from memory on lock.
```

### P2.3 — App shell & navigation

```text
Desktop: collapsible glass sidebar with sections (Home, Log, Vault, Timeline, People, Documents, Settings) and a command palette (Cmd+K) to jump anywhere, search incidents, or run actions. Mobile: floating bottom tab bar with a centre "+" that morphs into a radial quick-action menu (Log incident, Voice note, Snap photo, Upload). Route transitions with View Transitions API. A gentle "synced" indicator instead of pull-to-refresh. Top bar shows lock button and an offline badge.
```

### P2.4 — Dashboard

```text
Rebuild the dashboard as a calm "case home":
- Hero: greeting + one sentence summary of the case in plain English ("12 incidents over 4 months, mostly involving J. Smith, trending more severe").
- Case readiness as an animated journey path with 4 milestones and a single clear next action button.
- Evidence score as an animated radial gauge with a breakdown drawer explaining each factor and how to improve it.
- Bento grid of cards: stats with count-up numbers, 6-month trend (animated area chart), severity donut with hover detail, 16-week heatmap (cells pop in on scroll), legal coverage chips, pattern detection cards, recent incidents.
- Cards are draggable to reorder (dnd-kit), state persisted.
- Skeletons while decrypting; empty state with an illustrated first-run guide.
```

### P2.5 — Log incident (guided flow)

```text
Replace the long form with a guided, multi-step sheet (full-screen on mobile, side panel on desktop): 1 What happened (title, description, date/time, location), 2 Type (searchable chips grouped by legal category with law badges), 3 Severity (a slider with colour and plain descriptions), 4 People (person responsible with autocomplete from the People directory, witnesses, others affected), 5 Reporting, 6 Impact (chips + statement), 7 Evidence (attach from camera, files, vault, or record a voice note), 8 Review with the locked timestamp and hash animation.
Also: progress bar, autosave drafts every keystroke (encrypted), "Quick capture" mode that saves just a title + voice note/photo in 10 seconds to finish later, and smart prompts ("Quote exact words if you can").
```

### P2.6 — Incident list & detail

```text
List view with search, filters (severity, type, person, date range, reported), sort, saved views, and swipe actions on mobile. Detail view as a document-style page: header with ID, severity, hash-verified badge; sections matching the form; attachments gallery; annotations thread; version history (append-only, shows diffs); actions: annotate, add evidence, link to other incidents, export this incident as PDF. Deleting requires PIN and moves to a 30-day recoverable trash.
```

### P2.7 — Evidence vault

```text
Masonry grid with folders and smart filters (images, PDFs, audio, linked/unlinked). Upload by drag-drop, paste, camera capture, or share-target (Web Share Target API so users can share a screenshot from their phone straight into Resolvr). Show upload progress, blur-up thumbnails, EXIF capture date, SHA-256 fingerprint, optional OCR of screenshots (Tesseract.js, on device) so text is searchable, and an image redaction tool (draw boxes to black out names). Lightbox with zoom, swipe and linked incidents.
```

### P2.8 — Timeline & patterns

```text
A horizontal, zoomable timeline (day/week/month) on desktop and a vertical one on mobile. Incidents are nodes sized by severity, coloured by type, with lanes per person. Overlays: reported-to-HR markers, retaliation windows (30 days after reports, shaded), escalation trend line. Pattern panel lists detected patterns with an "explain" link that highlights the incidents involved. Smooth zoom and pan with gestures.
```

### P2.9 — People directory

```text
New screen: auto-built list of people mentioned (responsible, witnesses, HR contacts) with merge-duplicates, role, relationship, incident count, and a per-person timeline. Witness cards track whether they have been asked to give a statement.
```

### P2.10 — AI complaint studio

```text
Rebuild the generator as a document studio. A Laravel controller (POST /ai/complaint) calls the Anthropic API with Laravel's HTTP client (key in .env only) and streams tokens back with a StreamedResponse (server-sent events); only the incident fields the user selects are sent, shown in a "What will be sent" preview. Steps: details, select incidents, tone, outcome, jurisdiction. The letter streams into a rich editor (Tiptap) where the user can edit, regenerate a single paragraph, or change tone. Also offer document types: HR complaint, witness statement request, follow-up email after a meeting, EEOC/ACAS intake summary, and a lawyer briefing. Export to PDF (barryvdh/laravel-dompdf), DOCX (phpoffice/phpword), or copy. Rate-limit and add abuse safeguards.
```

### P2.11 — Case dossier export

```text
Rebuild the HR and Legal dossiers as real generated PDFs with the same 7 sections as the prototype, plus: hash-chain verification appendix, evidence thumbnails, table of contents with page numbers, and a QR code that verifies the export's checksum. Preview in-app with page flipping animation before download.
```

### P2.12 — Settings, backup, notifications

```text
Settings grouped as cards: Security (PIN, passkey, auto-lock, stealth, panic gesture, decoy PIN that opens an empty vault), Appearance (theme, reduced motion, text size), Jurisdiction, Backup (end-to-end encrypted backup, uploaded as ciphertext to the Laravel API and stored on disk outside public_html, with a recovery phrase; restore on a new device; encrypted export file), Notifications (gentle reminders via web push to log while memory is fresh; disguised notification text option), Data (export, import, delete everything with double confirmation).
```

### P2.13 — Micro-interactions pass

```text
Go through every screen and add: spring-based button presses, list item enter/exit animations with layout transitions, number count-ups, success check-draw, toast stack with swipe-to-dismiss, haptics on key actions, skeleton shimmer, focus rings in the aurora gradient, and subtle parallax on dashboard cards tied to device tilt (opt-in). Keep everything under 300ms in the app; no animation should delay a task.
```

---

## Phase 3 — Later features (`app/`)

### P3.1 — Jurisdiction packs & deadlines

```text
Move all legal content into versioned JSON packs (app/resources/js/lib/laws/{us,uk,ng,ca}.json): statutes, which incident types trigger them, filing agencies, limitation periods, and plain-language summaries reviewed by [LAWYER]. Add a deadline tracker on the dashboard that calculates the earliest filing deadline from the first relevant incident and shows a calm countdown with a "talk to a lawyer" link. Always label as general information, not legal advice.
```

### P3.2 — Secure attorney share

```text
Let the user generate a read-only share of selected incidents and files. Encrypt the bundle in the browser with a random key; upload ciphertext to Laravel; the key travels only in the URL fragment (#), so the server never sees it. Links expire (24h/7d), can be revoked, and log each view. Build the viewer as a minimal Blade page that decrypts client-side.
```

### P3.3 — Wellbeing

```text
Add an optional, private daily check-in (5-point mood + one line) whose trends can be included in the impact section of exports. Show support resources by jurisdiction. Tone: warm, never clinical, never streaks or badges.
```

---

## QA, deployment and launch

### Q1 — Review what you just built

```text
Review the code you just wrote as a strict senior reviewer. Check: matches CLAUDE.md and the design tokens, no hard-coded colours, responsive at 360/768/1280/1920px, keyboard navigable, prefers-reduced-motion respected, no layout shift, no console errors, TypeScript and PHP static analysis clean. List issues by severity, then fix them.
```

### Q2 — Accessibility & performance

```text
Run axe and Lighthouse on every page of landing/ and every screen of app/. Target: Accessibility 100, Performance 90+ on mobile, CLS < 0.05, LCP < 2.5s. Check colour contrast in both themes, focus order, screen-reader labels on charts (provide text summaries), and that GSAP/Three.js only load where used. Fix everything and report before/after.
```

### Q3 — Security & privacy audit

```text
Audit as a security engineer: verify evidence is encrypted before it touches IndexedDB or the network; the key never persists; the hash chain detects edits (write a test that tampers with a record); CSP blocks inline scripts except hashed ones; CSRF on all Laravel POST routes; rate limiting on /api/waitlist and AI routes; AI route only receives fields the user approved; uploads are stored outside public_html with random names; .env, storage and vendor are not web-accessible. Write Pest and Vitest tests for each finding.
```

### D1 — Deploy both folders to DirectAdmin

```text
Prepare docs/DEPLOY.md, scripts and a GitHub Actions workflow for a DirectAdmin server hosting two sites from this repo.

landing/ -> resolvrapp.com
1. CI: cd landing && npm ci && npm run build.
2. Upload landing/dist/* (including .htaccess) to /home/USER/domains/resolvrapp.com/public_html via rsync over SSH (FTP fallback with lftp mirror). Delete stale files.
3. .htaccess: clean URLs, HTTPS redirect, long cache for hashed assets, short cache for HTML, security headers, redirect old /app links to https://app.resolvrapp.com.

app/ -> app.resolvrapp.com
1. In DirectAdmin: create the app subdomain, select PHP 8.3 with bcmath, ctype, fileinfo, mbstring, openssl, pdo_mysql, tokenizer, xml, gd/imagick, sodium; create the MySQL database and user; issue Let's Encrypt SSL for both domains.
2. CI: cd app && composer install --no-dev --optimize-autoloader && npm ci && npm run build.
3. Server layout: /home/USER/domains/app.resolvrapp.com/releases/<timestamp>, a shared/ folder (.env, storage), and a current symlink; public_html becomes a symlink to current/public. If symlinks are blocked, use an index.php shim in public_html with corrected paths.
4. After upload: link shared .env and storage, then php artisan migrate --force, storage:link, config:cache, route:cache, view:cache, queue:restart; swap the current symlink; keep the last 3 releases for rollback.
5. .env: APP_ENV=production, APP_DEBUG=false, APP_URL, DB_*, MAIL_*, ANTHROPIC_API_KEY, VAPID keys, CORS origin https://resolvrapp.com.
6. Cron (DirectAdmin > Cron Jobs): * * * * * cd /home/USER/domains/app.resolvrapp.com/current && php artisan schedule:run >> /dev/null 2>&1, with the scheduler running queue:work --stop-when-empty.
7. app/public/.htaccess: Laravel rewrites, no-cache for sw.js and manifest.webmanifest, correct MIME for .webmanifest, compression except on the AI streaming route (some hosts buffer output; disable buffering there).

Workflow: one GitHub Actions file with path filters so a change in landing/ only deploys the landing site and a change in app/ only deploys the app. Secrets: SSH host, user, key, paths.
Finish with a smoke-test checklist: both domains on HTTPS, waitlist from landing reaches the app API, PWA installs from app.resolvrapp.com, service worker scope correct, AI streaming works, cron is firing.
```

### Q4 — Launch checklist

```text
Create a launch checklist: migrate existing waitlist emails, redirect old /app links, import tool for prototype JSON exports, updated privacy policy describing the new encryption and backup accurately, "Not legal advice" on every generated document, error monitoring (Sentry or Flare), uptime check, database backups via DirectAdmin's backup system, and a rollback plan.
```
