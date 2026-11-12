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

cd "$ROOT/DdApiV3UI.Server"
if [ ! -f appsettings.json ]; then
  # appsettings*.json is ignored by git; use the demo settings (AquaDesk DD-API V3).
  cp "$ROOT/demo/appsettings.demo.json" appsettings.json
fi

dotnet publish -c Release -o "$OUT"

cd "$OUT"
echo "Starting the DD-API V3 UI on http://localhost:$PORT"
ASPNETCORE_URLS="http://0.0.0.0:$PORT" exec dotnet DdApiV3UI.Server.dll
