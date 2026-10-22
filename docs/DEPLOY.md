# Deploying Resolvr

Two sites from one repo, both on a DirectAdmin server with **no long-running Node process**. Front ends are built in GitHub Actions (or locally) and uploaded as static files.

| Folder | Domain | What gets uploaded |
| --- | --- | --- |
| `landing/` | resolvrapp.com | `landing/dist/*` (including `.htaccess`) → `public_html` |
| `app/` | app.resolvrapp.com | Laravel release (vendor + `public/build`) → release folders, see Phase 2 |

Workflow: [`.github/workflows/ci-deploy.yml`](../.github/workflows/ci-deploy.yml). Path filters mean a change in `landing/` (or the shared tokens/fonts in `app/resources/`) only builds and deploys the landing site, and a change in `app/` only runs the app checks.

---

## Landing site → resolvrapp.com

### One-time server setup (DirectAdmin)

1. **Domain**: make sure `resolvrapp.com` exists under *Account Manager → Domain Setup*.
2. **SSL**: *Account Manager → SSL Certificates → Let's Encrypt* for `resolvrapp.com` and `www.resolvrapp.com`. Turn on *Force SSL with https redirect*.
3. **SSH (preferred)**: *Account Manager → SSH Keys* → add the public half of a new deploy key (`ssh-keygen -t ed25519 -C resolvr-deploy -f resolvr_deploy`). If your plan has no SSH, create an FTP account limited to `domains/resolvrapp.com/public_html` instead.
4. **Apache modules**: `.htaccess` needs `mod_rewrite`, `mod_headers`, `mod_deflate` and `mod_mime`. These are standard on DirectAdmin with Apache or LiteSpeed.

### GitHub secrets (Settings → Secrets and variables → Actions, environment `production`)

| Secret | Example | Notes |
| --- | --- | --- |
| `SSH_HOST` | `server.example.net` | Leave empty to use FTP instead |
| `SSH_PORT` | `22` | Optional |
| `SSH_USER` | `resolvr` | DirectAdmin username |
| `SSH_KEY` | *(private key)* | The private half of the deploy key |
| `LANDING_PATH` | `/home/resolvr/domains/resolvrapp.com/public_html` | For FTP, the path as the FTP user sees it, e.g. `/domains/resolvrapp.com/public_html` |
| `FTP_HOST`, `FTP_USER`, `FTP_PASSWORD` | | Only if not using SSH. Uses FTPS. |

Protect the `production` environment with required reviewers if you want a manual approval before each deploy.

### What the pipeline does

1. `cd landing && npm ci && npm run lint && npm run typecheck && npm test`
2. `npm run build` with `VITE_APP_URL=https://app.resolvrapp.com` → `landing/dist/`
3. Playwright end-to-end tests (landing + app, including a real waitlist round trip)
4. On `main` only: `rsync -az --delete` to `public_html` (excluding `.well-known/` and `cgi-bin/`), or `lftp mirror --reverse --delete` over FTPS
5. Smoke test: home and privacy return 200 and the CSP header is present

### Previews outside the domain

Internal links are written with the `{{link}}` helper. Production builds emit clean URLs (`/security`, `/#features`) that `.htaccess` rewrites. For a preview hosted anywhere else (a sub-folder, a file share, a review tool), build with relative links:

```bash
LINK_STYLE=relative npx vite build --base ./ --outDir ../preview
```

### Deploying by hand

```bash
cd landing
npm ci
VITE_APP_URL=https://app.resolvrapp.com npm run build
rsync -az --delete --exclude '.well-known/' --exclude 'cgi-bin/' \
  dist/ USER@HOST:/home/USER/domains/resolvrapp.com/public_html/
```

### What `.htaccess` handles (`landing/public/.htaccess`, copied into `dist/`)

- HTTPS redirect (works behind proxies that set `X-Forwarded-Proto`)
- Clean URLs: `/story` serves `story.html`; `/story.html` redirects to `/story`
- `/app` and `/app/*` (old prototype links) → `https://app.resolvrapp.com`
- Security headers: CSP (`script-src 'self' https://plausible.io`, `connect-src` limited to the app API and Plausible, no inline scripts or styles), HSTS, X-Frame-Options, Referrer-Policy, Permissions-Policy, COOP
- Caching: hashed assets `max-age=31536000, immutable`; HTML `no-cache`
- Compression with `mod_deflate`

If you change the CSP, re-run the CSP check (see *Verifying* below): the site intentionally has no inline scripts or styles, and Alpine uses its CSP build.

### Verifying a landing deploy

- [ ] `https://resolvrapp.com` loads over HTTPS; `http://` and `www` redirect
- [ ] `/story`, `/security`, `/pricing`, `/privacy`, `/terms` load without `.html`
- [ ] `curl -sI https://resolvrapp.com | grep -i content-security-policy` shows the policy
- [ ] Browser console shows no CSP violations while scrolling the home page
- [ ] `https://resolvrapp.com/app` redirects to `https://app.resolvrapp.com`
- [ ] Waitlist form shows "You're on the list" and the confirmation email arrives (needs the app deployed and mail configured)
- [ ] `/sitemap.xml` and `/robots.txt` load; the Open Graph preview (e.g. a link in a chat app) shows the branded card

### Rollback

Every successful build is kept as the `landing-dist` workflow artifact for 7 days. Re-run an earlier successful *CI and deploy* run (or download its artifact and rsync it) to roll back.

---

## App → app.resolvrapp.com

The app is Laravel 12 + a built front end. Nothing Node-based runs on the server: CI (or your machine) builds everything, the server only runs PHP and cron. The landing site's waitlist form posts to `https://app.resolvrapp.com/api/waitlist`, so **the app must be up for the waitlist to work**.

### One-time server setup (DirectAdmin)

1. **Domain Setup**: add `app.resolvrapp.com`. **PHP 8.3** with `bcmath, ctype, fileinfo, mbstring, openssl, pdo_mysql, tokenizer, xml, gd` (or `imagick`) and `sodium`. `post_max_size` and `upload_max_filesize` at least 5M (backups and shares upload in 4 MB chunks).
2. **SSL**: issue Let's Encrypt certificates for both `resolvrapp.com` and `app.resolvrapp.com`.
3. **MySQL Management**: create a database and a user with all privileges on it.
4. **SSH** (recommended): enable SSH for the user and add the deploy public key to `~/.ssh/authorized_keys`. Without SSH, use the zip route below.
5. Create the shared folder and settings, once:

   ```bash
   cd /home/USER/domains/app.resolvrapp.com
   mkdir -p shared && nano shared/.env      # values below
   chmod 600 shared/.env
   ```

   ```dotenv
   APP_NAME=Resolvr
   APP_ENV=production
   APP_DEBUG=false
   APP_KEY=base64:...            # php -r 'echo "base64:".base64_encode(random_bytes(32)), PHP_EOL;'  (never change it)
   APP_URL=https://app.resolvrapp.com
   LOG_CHANNEL=daily
   LOG_LEVEL=warning
   DB_CONNECTION=mysql
   DB_HOST=localhost
   DB_PORT=3306
   DB_DATABASE=...
   DB_USERNAME=...
   DB_PASSWORD=...
   SESSION_DRIVER=file
   CACHE_STORE=file
   QUEUE_CONNECTION=database
   MAIL_MAILER=smtp
   MAIL_SCHEME=smtps
   MAIL_HOST=mail.resolvrapp.com
   MAIL_PORT=465
   MAIL_USERNAME=resolvrapp@resolvrapp.com
   MAIL_PASSWORD=...
   MAIL_FROM_ADDRESS=resolvrapp@resolvrapp.com
   CORS_ALLOWED_ORIGINS=https://resolvrapp.com
   # AI drafting (optional: without it the studio says drafting is not set up)
   ANTHROPIC_API_KEY=...
   # Reminders (optional): output of `php artisan resolvr:vapid-keys`
   VAPID_PUBLIC_KEY=...
   VAPID_PRIVATE_KEY=...
   ```

6. **Cron Jobs**, every minute (`* * * * *`):

   ```
   cd /home/USER/domains/app.resolvrapp.com/current && php artisan schedule:run >> /dev/null 2>&1
   ```

   The scheduler runs `queue:work --stop-when-empty` (waitlist emails), `reminders:send` (web push, when VAPID keys are set), `shares:prune` hourly and tidies unfinished backup uploads daily. If `php` is not 8.3 on the command line, use the full path DirectAdmin shows (for example `/usr/local/php83/bin/php`).

### Server layout

```
/home/USER/domains/app.resolvrapp.com/
├── releases/20261022094209/   one folder per release; the last 3 are kept
├── shared/.env                production settings (created once, above)
├── shared/storage/            logs, sessions, encrypted backups (app/backups) and shares (app/shares)
├── current -> releases/20261022094209
├── public_html -> current/public          default ("symlink" mode)
└── deploy/                    release scripts, uploaded by CI
```

If the host does not allow `public_html` to be a symlink, set `APP_PUBLIC_MODE=shim`: `public_html/` stays a real folder, each release copies the public assets into it, and `public_html/index.php` (from `deploy/app/public_html-shim/`) boots the app from `../current`.

Encrypted backups and attorney shares are stored under `shared/storage/app/{backups,shares}`, outside the web root; a `Require all denied` `.htaccess` is written there as a second guard. Size limits: `BACKUP_MAX_BYTES` (250 MB), `BACKUP_TOTAL_BYTES` (20 GB) and `SHARE_MAX_BYTES` (100 MB); lower them to fit the plan's disk.

### What the pipeline does (`.github/workflows/ci-deploy.yml`)

Path filters decide what runs: a change under `landing/` (or the shared tokens and fonts) builds and deploys only the landing site; a change under `app/` or `deploy/app/` builds and deploys only the app.

1. **app**: Pint, Larastan, ESLint, TypeScript, Vitest, a production build and Pest.
2. **e2e**: Playwright against both sites.
3. **package-app** (main only): `deploy/app/package.sh` builds the front end and installs Composer packages with `--no-dev --optimize-autoloader` into a clean copy, producing `resolvr-app-<sha>.tar.gz` (no `.env`, no `storage`, no tests or `node_modules`).
4. **deploy-app**: uploads the tarball and `deploy/app/` over SSH, then runs `release.sh`, which:
   - unpacks into `releases/<timestamp>`, links `shared/.env` and `shared/storage`;
   - runs `php artisan migrate --force`, `storage:link` and `optimize` (config, route, view and event caches);
   - **only then** switches `current` atomically, points `public_html` at it (or copies assets in shim mode), runs `queue:restart` and keeps the last 3 releases.

   If a migration fails, the switch never happens and the previous release keeps serving.
5. **Smoke test**: `/up`, the home page, the manifest's content type, `sw.js` not cached, the CSP header and the waitlist CORS preflight.

GitHub secrets (environment `production`): `SSH_HOST`, `SSH_USER`, `SSH_KEY`, optional `SSH_PORT`, `APP_PATH` (for example `/home/USER/domains/app.resolvrapp.com`), optional `APP_PHP` (PHP binary) and `APP_PUBLIC_MODE` (`symlink` or `shim`). The landing job's `LANDING_PATH` and FTP fallback are described above.

### Deploying by hand

```bash
deploy/app/package.sh dist                      # builds dist/resolvr-app-<sha>.tar.gz
scp -r deploy/app dist/resolvr-app-*.tar.gz USER@HOST:/home/USER/domains/app.resolvrapp.com/deploy/
ssh USER@HOST 'bash /home/USER/domains/app.resolvrapp.com/deploy/release.sh /home/USER/domains/app.resolvrapp.com /home/USER/domains/app.resolvrapp.com/deploy/resolvr-app-<sha>.tar.gz'
```

**Rollback**: `bash deploy/rollback.sh /home/USER/domains/app.resolvrapp.com` points `current` at the previous release and rebuilds its caches. Resolvr's migrations only add tables and columns, so the older release keeps working against the newer schema.

### Without SSH (File Manager only)

`deploy/app/package-zip.sh dist/resolvr-app-<sha>.tar.gz` turns a release into a zip with `resolvr-app/` (upload next to `public_html`, never inside it), `public_html/` (with an `index.php` that loads `../resolvr-app`) and `INSTALL.txt`. Migrations run through a one-off cron job (`php artisan migrate --force && php artisan optimize`), removed after it has run once. CI attaches the tarball to every main-branch run, so the zip can be made from it.

### What the app's `.htaccess` handles (`app/public/.htaccess`)

- HTTPS redirect, no directory listings, no dotfiles (except `.well-known`), Laravel's front controller and the `Authorization` header pass-through used by the backup, share and reminder APIs.
- `sw.js` and the manifests are never cached (`no-cache, no-store`) and served with `Service-Worker-Allowed: /`; `.webmanifest` gets `application/manifest+json`; hashed `/build/assets/*` are cached for a year, immutable.
- Compression for text responses **except** `/ai/*`: the drafting stream (server-sent events) must not be compressed or buffered, so it also sends `X-Accel-Buffering: no`, and LiteSpeed is told not to abort or time out the connection. LiteSpeed's page cache is disabled for the app.

### Smoke-test checklist (after the first deploy)

- [ ] `https://resolvrapp.com` and `https://app.resolvrapp.com` load over HTTPS; `http://` redirects.
- [ ] `https://app.resolvrapp.com/up` returns 200.
- [ ] The waitlist form on the landing site succeeds, and the confirmation email arrives (cron is running the queue).
- [ ] The app installs as a PWA from `app.resolvrapp.com` (Chrome: install icon; iPhone: Share > Add to Home Screen), opens offline after the first visit, and DevTools > Application shows the service worker at scope `/`.
- [ ] AI drafting streams text word by word (if `ANTHROPIC_API_KEY` is set). If text only appears at the end, the host is buffering: check the `/ai/` rules above with the host.
- [ ] Settings > Backup > Back up now succeeds, and `shared/storage/app/backups/` holds a `.bin` file.
- [ ] Documents > Share with a lawyer makes a link that opens in a private window.
- [ ] Cron is firing: `storage/logs` shows no scheduler errors, and DirectAdmin's cron log shows runs every minute.
- [ ] Reminders (if VAPID keys are set): turn one on for a minute from now and wait for it.
