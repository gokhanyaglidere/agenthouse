#!/bin/bash
# Update an Agent House execution host (run as the host user inside WSL/Linux). Host credential and state are not touched.
#   bash deploy/host-deploy.sh [git-ref-or-path]     default: pull main from origin
set -euo pipefail
cd "$(dirname "$0")/.."
SRC="${1:-origin}"
git fetch -q "$SRC" main && git checkout -q -B main FETCH_HEAD
npm install --no-audit --no-fund
npm install --prefix webview-ui --no-audit --no-fund
npm run build --prefix webview-ui
node prepare-ui.mjs                      # required: patches the bundled office engine so every workspace gets its own engine
grep -q BIBILEN_NATIVE_LAYOUT_PATH node_modules/pixel-agents/dist/cli.js || { echo "office engine patch missing"; exit 1; }
systemctl --user restart agent-house-host
sleep 6; systemctl --user is-active agent-house-host
