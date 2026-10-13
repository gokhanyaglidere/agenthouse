#!/bin/bash
# Update an Agent House execution host (run as the host user inside WSL/Linux). Host credential and state are not touched.
#   bash deploy/host-deploy.sh [git-remote]     default: fast-forward current branch from origin/main
set -euo pipefail
cd "$(dirname "$0")/.."
SRC="${1:-origin}"
if [[ -n "$(git status --porcelain)" ]]; then
  echo "Deployment refused: commit or preserve local changes first." >&2
  exit 1
fi
git fetch -q "$SRC" main
git merge --ff-only FETCH_HEAD
npm ci --no-audit --no-fund
npm ci --prefix webview-ui --no-audit --no-fund
npm run build --prefix webview-ui
node prepare-ui.mjs                      # required: patches the bundled office engine so every workspace gets its own engine
grep -q BIBILEN_NATIVE_LAYOUT_PATH node_modules/pixel-agents/dist/cli.js || { echo "office engine patch missing"; exit 1; }
systemctl --user restart agent-house-host
sleep 6; systemctl --user is-active agent-house-host
