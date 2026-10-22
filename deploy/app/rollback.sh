#!/usr/bin/env bash
# Point `current` back at the previous release.
#
#   rollback.sh <base-dir>
#
# Database migrations are not reversed automatically; Resolvr's migrations
# only add tables and columns, so the previous release keeps working. If a
# release ever needs a down-migration, run `php artisan migrate:rollback`
# from the newer release *before* rolling back.
set -euo pipefail
BASE="${1:?base dir}"
PHP="${PHP:-php}"
CURRENT="$(readlink -f "$BASE/current")"
PREVIOUS="$(ls -1dt "$BASE"/releases/*/ | sed 's#/$##' | grep -vx "$CURRENT" | head -n 1)"
[ -n "$PREVIOUS" ] || { echo "No previous release to roll back to." >&2; exit 1; }
ln -sfn "$PREVIOUS" "$BASE/current.next"
mv -Tf "$BASE/current.next" "$BASE/current"
(cd "$BASE/current" && "$PHP" artisan optimize && "$PHP" artisan queue:restart >/dev/null)
echo "✓ Rolled back to $(basename "$PREVIOUS")"
