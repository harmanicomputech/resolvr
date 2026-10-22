#!/usr/bin/env bash
# Turn a release tarball (from package.sh) into a zip for hosts without SSH.
#
#   deploy/app/package-zip.sh dist/resolvr-app-<version>.tar.gz [output-dir]
#
# The zip holds two folders to upload with DirectAdmin's File Manager:
#   resolvr-app/   the application, placed OUTSIDE public_html
#   public_html/   the public files, with an index.php that loads ../resolvr-app
set -euo pipefail
TARBALL="$(cd "$(dirname "$1")" && pwd)/$(basename "$1")"
OUT="$(mkdir -p "${2:-$(dirname "$TARBALL")}" && cd "${2:-$(dirname "$TARBALL")}" && pwd)"
HERE="$(cd "$(dirname "$0")" && pwd)"
NAME="$(basename "$TARBALL" .tar.gz)"
STAGE="$(mktemp -d)"
trap 'rm -rf "$STAGE"' EXIT

mkdir -p "$STAGE/resolvr-app" "$STAGE/public_html"
tar -xzf "$TARBALL" -C "$STAGE/resolvr-app"
(cd "$STAGE/resolvr-app/public" && tar -c --exclude ./index.php . | tar -x -C "$STAGE/public_html")
rm -rf "$STAGE/resolvr-app/public/build" "$STAGE/resolvr-app/public/ocr"
sed "s#dirname(__DIR__).'/current'#dirname(__DIR__).'/resolvr-app'#" "$HERE/public_html-shim/index.php" > "$STAGE/public_html/index.php"
cp "$HERE/INSTALL-no-ssh.txt" "$STAGE/INSTALL.txt"

# A ready .env: production defaults, a fresh APP_KEY and setup/cron tokens.
# Only the database (and email) details are left to fill in.
rand() { head -c "$1" /dev/urandom | base64 | tr -d '/+=\n' | head -c "$2"; }
INSTALL_TOKEN="$(rand 48 32)"
CRON_TOKEN="$(rand 48 32)"
sed -e "s#^APP_ENV=.*#APP_ENV=production#" \
    -e "s#^APP_DEBUG=.*#APP_DEBUG=false#" \
    -e "s#^APP_KEY=.*#APP_KEY=base64:$(head -c 32 /dev/urandom | base64)#" \
    -e "s#^APP_URL=.*#APP_URL=https://app.resolvrapp.com#" \
    -e "s#^LOG_LEVEL=.*#LOG_LEVEL=warning#" \
    -e "s#^DB_CONNECTION=.*#DB_CONNECTION=mysql#" \
    -e "s#^DB_HOST=.*#DB_HOST=localhost#" \
    -e "s#^\# *DB_#DB_#" \
    -e "s#^SESSION_DRIVER=.*#SESSION_DRIVER=file#" \
    -e "s#^CACHE_STORE=.*#CACHE_STORE=file#" \
    -e "s#^QUEUE_CONNECTION=.*#QUEUE_CONNECTION=database#" \
    "$STAGE/resolvr-app/.env.example" > "$STAGE/resolvr-app/.env"
printf '\n# Browser setup (/install) and the cron URL (/cron/<token>). Clear INSTALL_TOKEN when done.\nINSTALL_TOKEN=%s\nCRON_TOKEN=%s\n' \
    "$INSTALL_TOKEN" "$CRON_TOKEN" >> "$STAGE/resolvr-app/.env"
# Defence in depth, in case the folder ever ends up inside the web root.
printf 'Require all denied\n' > "$STAGE/resolvr-app/.htaccess"
printf 'Setup token: %s\nCron URL:    https://app.resolvrapp.com/cron/%s\n' "$INSTALL_TOKEN" "$CRON_TOKEN" > "$STAGE/YOUR-TOKENS.txt"

(cd "$STAGE" && zip -qr "$OUT/$NAME.zip" resolvr-app public_html INSTALL.txt YOUR-TOKENS.txt)
echo "$OUT/$NAME.zip"
