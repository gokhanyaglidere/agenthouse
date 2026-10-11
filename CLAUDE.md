# Agent House

Project-independent control panel for local Claude Code agents. Only Claude Code is integrated.
Application source lives here; selected project working directories are supplied by ProjectRegistry. Never read or write another project without explicit scope.
The production gateway runs through the existing macOS LaunchAgent on 127.0.0.1:3100, with private Tailscale access. Never create public exposure or a duplicate server.
Run npm test and npm run test --prefix webview-ui for relevant logic changes. Build with npm run build --prefix webview-ui and node prepare-ui.mjs. Preserve broker-owned sessions and compatibility state paths during upgrades.
Never log OAuth credentials or Slack tokens. Usage endpoints may change; failed validation must hide stale percentages.
Slack and finance integrations are deferred by the owner. Design and animation are the next separate phase; do not mix them into integration work.
