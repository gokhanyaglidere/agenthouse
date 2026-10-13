# Windows/WSL2 host connector (implementation record, 2026-10-13)

Implements stage 4 of `project-native-teams-plan-2026-10-12.md`. The Mac gateway stays the only panel.

## Architecture
- **Host** (WSL2 Ubuntu 24.04): the normal gateway run with `AGENT_HOUSE_HOST_MODE=1`, bound to `127.0.0.1:3100`,
  exposed only to the tailnet with `tailscale serve` (never funnel). Projects stay on the Windows drive (`/mnt/d/...`);
  host state lives in the WSL home (`~/.pixel-agents`).
- **Host guard** (`host-mode.mjs`): every request must carry a signed envelope (`host-protocol.mjs`, HMAC-SHA256 over method,
  target, body hash, host id, timestamp, nonce, command id, workspace, expected inventory revision). It re-validates scope
  (per-workspace allowlist, root allowlist, no account-level enumeration), de-duplicates commands in a persistent ledger,
  rejects replays (nonce + 60 s window) and refuses new work while the sandbox prerequisites are missing.
- **Central side** (`host-manager.mjs`, `host-link.mjs`): host registry (`~/.pixel-agents/hosts.json`, secrets in
  `host-secrets.json`, both 0600), signed hello handshake with identity proof and boot id, status
  `unverified|online|stale|offline|rejected`, proxy for workspace-scoped API calls and terminal websockets.
  Remote workspaces are addressed `h~<hostId>~<workspaceId>`; names/ids from two computers never collide.
- **Fail-closed rules**: mutations need a verified, fresh, sandbox-ready host; no automatic retry; an ambiguous result returns the
  command id (`GET /bibilen/api/hosts/<id>/commands/<cmd>`); terminal bridges close when the link leaves `online` and nothing is buffered.
- **Network**: only `*.ts.net` (HTTPS) or Tailscale addresses are accepted as host URLs.
- **Secrets**: `host-cli.mjs init` writes the credential (0600) and a one-time pairing token. The token is never printed to
  chat, logs or Git; it is moved to the Mac over the tailnet (Taildrop) or copied by the owner.

## Central (Mac) API additions (operator only)
`GET /bibilen/api/hosts`, `POST /bibilen/api/hosts {name, baseUrl, pairing}`, `POST /bibilen/api/hosts/<id>/(hello|remove|projects)`,
`GET /bibilen/api/hosts/<id>/commands/<cmd>`. `/bibilen/api/projects` and `/bibilen/api/portfolio` include remote workspaces.
Any workspace-scoped call whose `workspaceId` starts with `h~` is proxied. Optional headers: `x-command-id`, `x-expected-revision`.

## Known limits (not yet done)
- No UI for adding a host or marking remote workspaces; the API works, the webview does not yet show host status.
- Observers/viewers cannot see remote projects (operator only). Push notifications from a host are not routed yet (stage 5).
- Admission limits (3 concurrent) are per gateway; a shared Claude subscription is not capped across hosts.
- The office (pixel) feed `/ws` for remote workspaces is bridged but not verified visually.
- Claude must be logged in inside WSL (`claude` once, interactively); until then sessions cannot start on the host.
- Existing Windows-native Claude sessions are not adopted; only sessions started through the host are managed.
- Pre-existing: `workspace-gateway` test "isolated gateway routes two real workspace contexts" fails on Linux/WSL on `main` too.
