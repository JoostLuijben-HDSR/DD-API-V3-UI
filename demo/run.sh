#!/usr/bin/env bash
# Builds the Angular client and runs the DD-API V3 UI server on http://localhost:${PORT:-8080}.
# Used in GitHub Codespaces and in the fork's CI smoke test.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PORT="${PORT:-8080}"
OUT="${OUT:-/tmp/ddapi-ui}"

cd "$ROOT/ddapiv3ui.client"
if [ ! -d node_modules ]; then
  npm ci --no-audit --no-fund
fi
# The server project runs "ng build" before building; make the local Angular CLI available.
export PATH="$PWD/node_modules/.bin:$PATH"

# Build the client first. The server project picks up ddapiv3ui.client/dist when the
# project is loaded, which is before its own "ng build" step runs, so on a clean checkout
# the published wwwroot would otherwise be empty.
ng build --configuration production

cd "$ROOT/DdApiV3UI.Server"
if [ ! -f appsettings.json ]; then
  # appsettings*.json is ignored by git; use the demo settings (AquaDesk DD-API V3).
  cp "$ROOT/demo/demo-settings.json" appsettings.json
fi

dotnet publish -c Release -o "$OUT"

# Safety net: make sure the client is in wwwroot.
if [ ! -f "$OUT/wwwroot/index.html" ]; then
  mkdir -p "$OUT/wwwroot"
  cp -r "$ROOT/ddapiv3ui.client/dist/." "$OUT/wwwroot/"
fi
if [ ! -f "$OUT/wwwroot/index.html" ]; then
  echo "index.html is missing after the build" >&2
  exit 1
fi

cd "$OUT"
echo "Starting the DD-API V3 UI on http://localhost:$PORT"
ASPNETCORE_URLS="http://0.0.0.0:$PORT" exec dotnet DdApiV3UI.Server.dll
