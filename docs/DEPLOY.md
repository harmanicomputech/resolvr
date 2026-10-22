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

## App → app.resolvrapp.com (waitlist API now, full app in Phase 2)

The landing site's waitlist form posts to `https://app.resolvrapp.com/api/waitlist`, so **the app must be deployed for the waitlist to work**. The full release process (release folders, shared `.env` and `storage`, `current` symlink, migrations, caches, rollback) is prompt **D1** and will be added to this file and to the workflow as the `deploy-app` job.

Minimum the waitlist needs in the meantime:

1. Subdomain `app.resolvrapp.com` with PHP 8.3 (bcmath, ctype, fileinfo, mbstring, openssl, pdo_mysql, tokenizer, xml, sodium) and Let's Encrypt SSL.
2. MySQL database and user (DirectAdmin → MySQL Management).
3. `.env` (outside `public_html`):

   ```dotenv
   APP_ENV=production
   APP_DEBUG=false
   APP_URL=https://app.resolvrapp.com
   DB_CONNECTION=mysql
   DB_HOST=localhost
   DB_DATABASE=...
   DB_USERNAME=...
   DB_PASSWORD=...
   QUEUE_CONNECTION=database
   CACHE_STORE=file
   SESSION_DRIVER=file
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

   Encrypted backups are stored under `storage/app/backups` and attorney shares under `storage/app/shares` (`SHARE_MAX_BYTES`, default 100 MB) (outside `public_html`; a `Require all denied` `.htaccess` is written there too). Set `BACKUP_MAX_BYTES` / `BACKUP_TOTAL_BYTES` to fit the hosting plan's disk. Chunks are 4 MB, so PHP's `post_max_size` must be at least 5M (the DirectAdmin default of 8M is fine).

4. `php artisan migrate --force`, then `config:cache` and `route:cache`.
5. Cron (DirectAdmin → Cron Jobs), every minute:

   ```
   * * * * * cd /home/USER/domains/app.resolvrapp.com/current && php artisan schedule:run >> /dev/null 2>&1
   ```

   The scheduler runs `queue:work --stop-when-empty` each minute (waitlist confirmation emails), `reminders:send` each minute (web push reminders, when VAPID keys are set) and tidies unfinished backup uploads daily, and `shares:prune` hourly (expired attorney shares).

6. If the server sits behind a proxy or CDN, configure trusted proxies so rate limiting sees real client IPs.
