#!/usr/bin/env bash
# Build a production release of app/ as a tarball (run in CI, or locally).
#
#   deploy/app/package.sh [output-dir]
#
# Produces <output-dir>/resolvr-app-<version>.tar.gz containing the Laravel
# app with production-only vendor/ and the built front end (public/build).
# Excluded: .env, storage contents, node_modules, tests and other dev files;
# the server keeps .env and storage in shared/ (see release.sh).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
OUT="$(mkdir -p "${1:-$ROOT/dist}" && cd "${1:-$ROOT/dist}" && pwd)"
VERSION="$(git -C "$ROOT" rev-parse --short HEAD 2>/dev/null || date +%Y%m%d%H%M%S)"
APP="$ROOT/app"
STAGE="$(mktemp -d)"
trap 'rm -rf "$STAGE"' EXIT

cd "$APP"
npm ci --no-audit --no-fund
npm run build

# Copy the source, then install production dependencies into the copy so a
# developer's vendor/ (with dev packages) is never shipped.
mkdir -p "$STAGE/app"
tar -c \
  --exclude './.env' --exclude './.env.*' --exclude './node_modules' --exclude './vendor' \
  --exclude './tests' --exclude './storage' --exclude './database/database.sqlite' \
  --exclude './.phpunit.result.cache' --exclude './public/hot' --exclude './public/storage' \
  --exclude '*.test.ts' --exclude '*.test.tsx' --exclude './.git*' \
  . | tar -x -C "$STAGE/app"
cp .env.example "$STAGE/app/.env.example"
cd "$STAGE/app"
composer install --no-dev --optimize-autoloader --no-interaction --no-progress --prefer-dist
# If Composer had to fall back to git clones, drop their history.
find vendor -name .git -type d -prune -exec rm -rf {} +
# Runtime folders; on the server, storage/ is replaced by a link to shared/storage.
mkdir -p storage/app/public storage/framework/{cache/data,sessions,views} storage/logs bootstrap/cache
echo "$VERSION" > REVISION

tar -czf "$OUT/resolvr-app-$VERSION.tar.gz" -C "$STAGE/app" .
echo "$OUT/resolvr-app-$VERSION.tar.gz"
