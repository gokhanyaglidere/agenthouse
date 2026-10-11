#!/bin/sh
# Application files and the selected project can live in separate directories.
set -eu
PIXEL_TOOL_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
PIXEL_REPO_DIR=${BIBILEN_DEFAULT_CWD:-$PIXEL_TOOL_DIR}
cd "$PIXEL_REPO_DIR"
export BIBILEN_REMOTE_HOST="gkhan-mac-mini.taila04bd7.ts.net"
/opt/homebrew/bin/node "$PIXEL_TOOL_DIR/prepare-ui.mjs"
exec /opt/homebrew/bin/node "$PIXEL_TOOL_DIR/server.mjs"
