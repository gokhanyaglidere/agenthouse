# Usage, API access and Slack alarms — 2026-10-10

## Delivered and observed

- Header link icon opens Usage and connections. Claude's official statusLine JSON supplies five-hour/seven-day used percentage and reset epoch; project settings retain existing hooks and add a local script. No OAuth token extraction or private usage endpoint.
- Real owned Claude verification produced provider data: 2% used five-hour / 0% weekly, model Sonnet 5.5 at 23:45 Istanbul. Percentages are account-shared snapshots, not separate model quotas. Unknown windows stay unknown; expired windows stop showing percentages; snapshots older than 15 minutes are explicitly stale. UI refresh rereads cache, not provider usage.
- MCP health check uses `claude mcp list` without an LLM request. Current result: 4 connected (Claude Docs, Supermetrics Marketing Analytics, Google Drive, Supabase), 10 require authentication, 2 not configured (Calendar/Gmail). Connected means MCP connection, not proof of all operations or permission scopes.
- Environment configuration presence for Gemini, Maps, RevenueCat and Supabase client is shown separately, without exposing credentials or claiming requests succeeded. No arbitrary API proxy or privileged browser credentials added.
- Slack alarm bridge can be configured by owner from the panel: bot token is write-only, privately stored, channel history permission verified before config is saved. It polls selected channel every 65 seconds, persists checkpoint/pagination, baselines old history, deduplicates new alerts, handles 429 backoff and shares existing quiet/privacy/device preferences.
- Slack alerts have a separate notification preference and panel deep link. Slack source/channel details are hidden in private device payloads. API connection details/Slack messages are owner-only; viewer notification history excludes Slack messages.
- Existing outbound Slack webhook code does not provide permission to read a channel. Local Claude Slack MCP requires authentication; Codex Slack plugin was not connected at inspection. Live bridge remains **not configured** until channel and bot access are provided. No Slack message was sent or fake alarm pushed.

## Verification

- 89 backend tests pass, including unknown/stale/expired limits, secret-free persistence, MCP parsing/coalescing, Slack baseline/new alerts/pagination/restart state, backoff, invalid config, alarm preference/deep link/privacy.
- 18 UI tests pass; production TypeScript/Vite build succeeds.
- GET usage returns real official capture; integrations endpoint reports actual MCP statuses; phone subscription still 1.
- Owner-only integration access and writes enforced by existing origin/access middleware. Selected channel history requires the bot be a member, with channels:read/history or groups:read/history as appropriate.

## Pending user-dependent connection

- Identify Slack workspace and alarm channel, authenticate Slack for interactive Claude/Codex access, and provide dedicated read-only bot/channel authorization for continuous server polling. Connector login alone does not supply this server with a persistent bot token.
- Optional Codex/OpenAI usage inclusion was asked; no reply yet. This pass monitors Claude, the office's current agent runtime. No Codex stale snapshot is presented as live.

Sources: https://code.claude.com/docs/en/statusline ; https://docs.slack.dev/reference/methods/conversations.history/ ; https://docs.slack.dev/authentication/tokens/
