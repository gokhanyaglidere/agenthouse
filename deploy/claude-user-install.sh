#!/bin/bash
# Host-local migration to Anthropic's native user installation. No sudo, chmod,
# auth/trust edits, service restart or running-process termination.
# Official source: https://code.claude.com/docs/en/setup
set -euo pipefail
umask 077
[[ "$(uname -s)" == Linux ]] || { echo 'Run this inside the WSL host account.' >&2; exit 1; }
[[ "$(id -u)" != 0 ]] || { echo 'Run as the unprivileged host user, not root.' >&2; exit 1; }
[[ "$HOME" =~ ^/[a-zA-Z0-9_./-]+$ ]] || { echo 'Unsupported home path; configure the service explicitly.' >&2; exit 1; }
version="${1:-}"
if [[ -z "$version" ]]; then
  current_cli="${BIBILEN_CLAUDE_PATH:-$(command -v claude)}"
  current_version="$("$current_cli" --version)"
  version="${current_version%% *}"
fi
[[ "$version" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]] || { echo 'An exact installed Claude version is required.' >&2; exit 1; }
native="$HOME/.local/bin/claude"
drop_dir="$HOME/.config/systemd/user/agent-house-host.service.d"
drop_file="$drop_dir/zz-claude-user.conf"
expected="$(printf '[Service]\nEnvironment="BIBILEN_CLAUDE_PATH=%s/.local/bin/claude"\nEnvironment="PATH=%s/.local/bin:/usr/local/bin:/usr/bin:/bin"\n' "$HOME" "$HOME")"
if [[ -f "$drop_file" ]] && [[ "$(cat "$drop_file")" != "$expected" ]]; then
  echo 'Existing Claude service override differs; preserve and review it manually.' >&2; exit 1
fi
if [[ -e "$native" || -L "$native" ]]; then
  native_real="$(readlink -f "$native")"
  [[ "$native_real" == "$HOME/.local/share/claude/versions/"* ]] || { echo 'Custom user launcher detected; not replacing it.' >&2; exit 1; }
fi
if [[ ! -x "$native" ]] || [[ "$("$native" --version)" != "$version "* ]]; then
  installer="$(mktemp)"
  trap 'rm -f "$installer"' EXIT
  curl --proto '=https' --proto-redir '=https' --tlsv1.2 -fsSL https://claude.ai/install.sh -o "$installer"
  bash "$installer" "$version"
fi
native_real="$(readlink -f "$native")"
[[ "$native_real" == "$HOME/.local/share/claude/versions/"* ]] && [[ -O "$native_real" ]] && [[ -w "$(dirname "$native_real")" ]] || { echo 'Native install is not user-owned/writable; service unchanged.' >&2; exit 1; }
[[ "$("$native" --version)" == "$version "* ]] || { echo 'Requested CLI version not verified; service unchanged.' >&2; exit 1; }
timeout 20 "$native" agents --json --all >/dev/null || { echo 'Native inventory query failed; service unchanged.' >&2; exit 1; }
mkdir -p "$drop_dir"
if [[ ! -f "$drop_file" ]]; then
  # Exclusive creation: never overwrite a concurrently edited override.
  (set -o noclobber; printf '%s\n' "$expected" > "$drop_file")
fi
systemctl --user daemon-reload
printf 'User CLI verified: %s\nService override prepared. No process was stopped.\nApply it with the next safe host deployment; existing broker terminals keep their original CLI until explicitly restarted.\n' "$native"
