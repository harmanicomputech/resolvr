#!/usr/bin/env bash
# Install a release on the DirectAdmin server (run there over SSH).
#
#   release.sh <base-dir> <tarball>
#   e.g. release.sh /home/USER/domains/app.resolvrapp.com /home/USER/resolvr-app-abc123.tar.gz
#
# Layout under <base-dir>:
#   releases/<timestamp>/   one folder per release (the last KEEP are kept)
#   shared/.env             production settings, created once by hand
#   shared/storage/         logs, sessions, encrypted backups and shares
#   current -> releases/<timestamp>
#   public_html -> current/public          (PUBLIC_MODE=symlink, the default)
#   public_html/ with an index.php shim    (PUBLIC_MODE=shim, if symlinks are blocked)
#
# Migrations run before the switch: if anything fails, `current` still
# points at the previous release and the site keeps running it.
set -euo pipefail

BASE="${1:?base dir}"
TARBALL="${2:?tarball}"
KEEP="${KEEP:-3}"
PHP="${PHP:-php}"
PUBLIC_MODE="${PUBLIC_MODE:-symlink}"
HERE="$(cd "$(dirname "$0")" && pwd)"

TS="$(date +%Y%m%d%H%M%S)"
REL="$BASE/releases/$TS"
SHARED="$BASE/shared"

[ -f "$SHARED/.env" ] || { echo "Missing $SHARED/.env: create it first (see docs/DEPLOY.md)." >&2; exit 1; }

echo "→ Unpacking release $TS"
mkdir -p "$REL" "$SHARED"/storage/app/{public,backups,shares} \
  "$SHARED"/storage/framework/{cache/data,sessions,views} "$SHARED/storage/logs"
tar -xzf "$TARBALL" -C "$REL"
ln -sfn "$SHARED/.env" "$REL/.env"
rm -rf "$REL/storage"
ln -sfn "$SHARED/storage" "$REL/storage"
chmod -R u+rwX,go-rwx "$SHARED/storage"

cd "$REL"
echo "→ Migrating"
"$PHP" artisan migrate --force
"$PHP" artisan storage:link --force >/dev/null 2>&1 || true
echo "→ Caching config, routes, views and events"
"$PHP" artisan optimize

echo "→ Switching current to $TS"
ln -sfn "$REL" "$BASE/current.next"
mv -Tf "$BASE/current.next" "$BASE/current"

if [ "$PUBLIC_MODE" = "shim" ]; then
  # Copy the public assets in, keeping the shim and host-managed files.
  mkdir -p "$BASE/public_html"
  if command -v rsync >/dev/null; then
    rsync -a --delete --exclude 'index.php' --exclude '.well-known/' --exclude 'cgi-bin/' --exclude '.user.ini' \
      "$REL/public/" "$BASE/public_html/"
  else
    find "$BASE/public_html" -mindepth 1 -maxdepth 1 ! -name index.php ! -name .well-known ! -name cgi-bin ! -name .user.ini \
      -exec rm -rf {} +
    (cd "$REL/public" && tar -c --exclude ./index.php . | tar -x -C "$BASE/public_html")
  fi
  cp "$HERE/public_html-shim/index.php" "$BASE/public_html/index.php"
elif [ ! -L "$BASE/public_html" ]; then
  if [ -d "$BASE/public_html" ]; then mv "$BASE/public_html" "$BASE/public_html.before-resolvr.$TS"; fi
  ln -s "$BASE/current/public" "$BASE/public_html"
fi

# Workers started by the scheduler pick up the new code on their next run.
"$PHP" artisan queue:restart >/dev/null

echo "→ Keeping the last $KEEP releases"
ls -1dt "$BASE"/releases/*/ | tail -n +"$((KEEP + 1))" | xargs -r rm -rf

echo "✓ Released $TS ($(cat "$REL/REVISION" 2>/dev/null || echo unknown))"
