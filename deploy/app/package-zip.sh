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

(cd "$STAGE" && zip -qr "$OUT/$NAME.zip" resolvr-app public_html INSTALL.txt)
echo "$OUT/$NAME.zip"
