# Agent House

The live application now runs from `/Users/gokhanyaglidere/agent-house`.
BiBilen is a registered project, not the application's source directory.
The existing private URL, account state, notification subscriptions, project IDs and Claude histories are preserved.
The compatibility service label remains `com.bibilen.pixel-office`.

Build: `npm run build --prefix webview-ui`, then `node prepare-ui.mjs`.
Restart the existing LaunchAgent; never start a second gateway on port 3100.
The LaunchAgent supplies `BIBILEN_DEFAULT_CWD` for the existing default project.
Source-only changes belong here; the old `bibilen/tools/pixel-office` is the migration snapshot.
Source repository: https://github.com/gokhanyaglidere/agenthouse. Runtime records and credentials are excluded from Git.

A fresh installation defaults to its own application directory; an existing installation keeps its registered default project. Set `BIBILEN_DEFAULT_CWD` explicitly to choose a project directory.

Daily private metadata backups and interaction/recovery checks are documented in [the acceptance record](design/platinum-acceptance-2026-10-11.md).

## Existing implementation reference

# Agent House

Local BiBilen workspace built on Pixel Agents 1.4.1. Only Claude Code sessions
are connected; Cursor native agents are outside this integration.

## Use

Open http://127.0.0.1:3100 and refresh after an upgrade. The macOS LaunchAgent
`com.bibilen.pixel-office` supervises the service. Do not start another instance.

The office contains Gökhan (the main coordinator) and 35 specialist residents.
Idle residents use the native wandering/rest/desk animation engine; they are
visual characters, not running or paid Claude sessions. A directly launched specialist binds to its resident using the Claude session
identity and task role. An unassigned main session replaces Gökhan's resident;
when several such main sessions exist the newest one takes this role. Explicit
Claude subagent types, including native Subtask labels, bind to their specialists. Explore/Plan and unknown roles remain temporary characters.
Skills are capabilities and rules, not separate background processes.

Use **Ekip** to focus an agent and read its role/skill references. The command
center has Ofis, Görevler, Ekip and Geçmiş sections. It shows queued, running,
waiting and completed work plus researching, coding and testing phases. Use
the appearance selector for BiBilen studio, night office or garden studio,
automatic day/night lighting and per-character colors. The native Layout
editor remains available for furniture/floors/walls. The initial custom layout
is 77×77 with 36 assigned workstations, 17 indoor rooms and two connected garden zones. Main entry opens into
reception; the nearby meeting room and team rooms join shared corridors. The
private CEO room is closed to other agents. Coffee, rest, games and kitchen
occupy the social wing with exterior doors to the garden. Bathroom, storage
and winter garden are removed.

Sales, finance and accounting now have `sales-lead`, `finance-analyst` and
`accounting-analyst` project agents and seated residents. Their compound desk
art includes a chair; a transparent native seat anchor avoids drawing a second
chair. Only the desk body blocks walking. These definitions do not imply a
running Claude session or access to customer/financial data.

The office uses 65 original generated furniture/decor sprites compiled into the
native catalog, with footprints and depth ordering. Furniture is independent
of the floor/wall scenery, not a fixed room backdrop. Production sources and
generation briefs are in `design/assets/`; compile them with
`compile-cozy-assets.mjs`. `design/office-spatial-plan.md` records the placement
rules. Existing character sprites/fonts remain compatible. First visit to a
new layout opens the live reception; **Plan** navigates the connected rooms.
Room navigation clamps the camera to the map to avoid blank space on phones.
Idle characters can make visual coffee/rest/game/meal/garden visits; those
animations never count as paid Claude work and stop when real work starts.
Layout revision 114 extends the revision 113 enclosed plaster-and-oak building.
Three six-person SEO rooms separate technical/data, content and search/growth;
product is split into platform and delivery/quality. North-wall installation
anchors fitted kitchen units, bookshelves and arcades to their rear wall.
Finance, accounting and sales use dedicated functional furniture and boards.
Four distinct rugs are restricted to sitting areas. The outside terrace and
grove use connected brick paths, clustered trees, understory, flower beds and
a pond. Tree canopies overlap naturally while only trunks block walking.
`design/master-plan-v113.md` records the design diagnosis and building plan.

### Give tasks from the browser

Click **Yeni görev**. No management key is required within the private tailnet.
Give the task a title, write the request,
choose Gökhan or a specialist and set priority. Gökhan receives an orchestration
prompt and may use the specialists in `.claude/agents`; a directly selected
specialist starts with Claude Code's `--agent`. Work is launched as a real
Claude background task. **Oturumu aç** attaches an interactive terminal for
questions and permission prompts. Claude starts in the repository root with
permission mode `default`; this integration does not disable its prompts.

Closing a task terminal keeps its Claude background task running. One controller may type in each task terminal while other
tabs can watch. Claude's normal transcripts remain in `~/.claude`. The terminal
replay buffer is bounded to 64 KiB and cleared on service restart. Browser push
notifications can report completion or attention after the user enables them.

## Access controls

- Gateway binds to 127.0.0.1:3100; native server to 127.0.0.1:3101.
- Local access and the saved Tailscale owner identity grant command access; other identities receive read-only viewer access. There is no separate management key.
- API writes and terminal/office sockets require the exact browser origin and Host.
  Missing or cross-site origins are rejected for writes and sockets.
- Unexpected Host values and cross-site sockets are rejected. Public/LAN
  hosting is not enabled; no ports are exposed on 0.0.0.0.
- The local macOS user remains trusted. These controls do not isolate the
  panel from malware or another process running as that same OS user.

Remote phone/tablet access is configured through private Tailscale Serve at
`https://gkhan-mac-mini.taila04bd7.ts.net/`. The gateway accepts that exact
HTTPS host/origin plus localhost; wildcard and public/LAN hosts remain denied.
Only devices signed into the owner's tailnet can reach the address. Viewer devices can inspect sessions and office activity but cannot write API settings, launch terminals or send mutating office messages. Tailscale Serve supplies and strips identity headers; only the configured owner login can give commands.
Tailscale Funnel is not enabled. Remote phone access and the exact Tailscale HTTPS endpoint were
visually validated. For iPhone/iPad background notifications, add the page to
the Home Screen and enable notifications from operator mode (iOS 16.4+).

## Install / rebuild

```sh
npm ci --prefix tools/pixel-office
npm ci --prefix tools/pixel-office/webview-ui
npm run build --prefix tools/pixel-office/webview-ui
node tools/pixel-office/prepare-ui.mjs
launchctl kickstart -k gui/$(id -u)/com.bibilen.pixel-office
```

When the supervised service is stopped, `sh tools/pixel-office/start.sh` runs
it manually. The launcher reapplies the custom UI, bundled layout and exact
version-pinned subtype-label patch before starting the gateway. Build output
and dependencies are ignored. prepare-ui fixes the native PTY helper's
executable permission, including installs where npm skipped install scripts.
See UPSTREAM.md and UPSTREAM-LICENSE for copied frontend/engine provenance.

Global Pixel Agents hooks are installed and preserve the pre-existing hooks;
Claude settings have the native backup. Runtime/layout/service backups before
this upgrade are under ~/.pixel-agents/backups/bibilen-premium-20261008.

## Validation / limits

UI TypeScript/build, native idle motion/seat/role tests, task-manager and
authorization unit tests, HTTP health and live socket rejection checks passed.
The private remote page was visually checked in desktop-browser automation at a
phone-sized viewport. A real background-task probe reached Claude Code but the
Anthropic organization currently rejects subscription access; enable Claude
subscription access for the organization or configure an Anthropic API key
before browser-created tasks can execute.

The task view and task composer show execution readiness. **Bağlantıyı kontrol
et** makes one tool-free, non-persistent Claude print request and stores only
its sanitized outcome in `~/.pixel-agents/bibilen-execution-health.json`.
Checks are explicit, never an automatic polling loop; they can count toward
Claude usage. A known blocked result prevents creating doomed tasks until a
new check succeeds. Login alone does not prove model access. Native idle
sessions containing a machine-readable Claude error are marked failed, not
completed; failures and sessionless task details remain visible in the panel.


### Agent audit — 2026-10-10

All 35 agent definitions, the 36-character roster, guidance paths, models,
turn limits and relevant tool permissions are checked by
`python3 tools/check_agent_system.py`. All 18 SEO specialists explicitly read
main + role guidance and use the bundled SEO launcher. Drift compares the
historical baseline before any explicitly requested refresh. Paid MCP calls
require available tools, cost preflight and owner scope; missing services fail closed.

Task lifecycle follows Claude's `working/blocked/done/failed/stopped` states;
interactive `idle` alone is not completion. Polls coalesce, canceled inflight
launches retain their capacity reservation until confirmed stopped, and push
delivery never blocks the queue. Persisted starting jobs reconnect by unique
session name after restart. Resident binding uses stable identities rather than
translated display labels. Native metadata patches are version-checked and idempotent.

Independent read-only review found no remaining confirmed issues after fixes.
Unit checks do not prove live completion by every specialist. The prior real
Claude execution probe was rejected by organization policy. SEO runtime diagnosis
also reports the managed Python environment and Chromium unavailable; main SEO
guidance requires an explicit `/seo setup` or dependency-repair instruction for
installation. No paid SEO calls or additional Claude jobs were launched in this audit.
See `design/agent-audit-2026-10-10.md` for findings, proof and remaining limits.

### Conversations / Oturumlar

**Oturumlar** lists Claude transcripts and interactive/background sessions for
this repository. It reads only the repository's Claude project directory;
Cursor native sessions and other projects are excluded. **Konuşmayı gör** reads
saved user/assistant text and tool names in chronological pages. Thinking,
sidechain records, tool arguments/results and account metadata are not exported.
Each page reads at most 512 KiB and displays at most 120 entries; very long
message text is bounded to 40,000 characters. **Önceki mesajları yükle** loads
older pages. Task cards link to their conversation when a session identity exists.

**Yeni konuşma** selects Gökhan or a specialist, assigns a UUID and opens an
interactive Claude terminal. **Kaldığım yerden devam et** uses `--resume` with
the existing UUID and never passes `--fork-session`. Background sessions use
`claude attach`. An interactive session running in another terminal remains
read-only in this panel until that terminal is closed; unavailable inventory
also blocks starts rather than risking duplicate sessions.

Closing the browser panel leaves an owned interactive session running. Reopening
reconnects to its bounded replay buffer. At most five panel conversation terminals
can be open. One connected viewer controls input; control transfers on disconnect.
A background attach is detached when its last viewer disconnects. A detached private terminal worker owns each new interactive PTY. A gateway
restart disconnects the browser without closing that Claude process; the gateway
recovers its PID and bounded replay over a mode-0600 Unix socket. Explicit stop
terminates the owned process. External terminal sessions remain read-only; their
terminal cannot be taken over by this gateway. Session metadata is persisted with mode 0600 in
`~/.pixel-agents/bibilen-sessions.json`. Transcript history stays in `~/.claude`.

Known Claude execution blocks disable new/continued sessions; history remains
readable. The UI feature does not repair organization subscription permissions.

Live acceptance on 2026-10-10 subsequently verified model access, a real chief
task with senior-qa and gap-reviewer, recorded SendMessage, native office identity,
terminal permission responses, conversation replay/resume, /help, /compact and
/clear. CLI session UUID changes are reconciled by the owned process PID;
previous transcripts stay in history. Escape reaches Claude while the terminal
is focused. See `design/live-acceptance-2026-10-10.md` for fixes and coverage.

### Ekip ve iş akışı

Task cards and conversation details open a shared work inspector. The team page
lists work groups for up to eight active repository sessions. Real Claude
Agent/Task delegations, nested subagent metadata, explicit results, SendMessage
records, task-list updates and file tool activity provide the recorded work tree.
Selecting a participant shows its parent, instructions, last tool and response.
Launch acknowledgements and ordinary assistant replies do not imply completion.

Historical statuses are separate from live Pixel Agents tool signals. Only real
characters bound to the exact session/tool identity receive a shared work badge
and color; idle residents remain unbadged. Movement, desks and CEO rules stay
intact. Thinking, shell commands and arbitrary tool arguments are excluded.
Unlogged communication cannot be reconstructed. This is not a source diff viewer.

Details refresh every four seconds and group inventory every five. Incremental
reads coalesce. Limits: 200 participants, latest 150 communication/delegation
records, 100 tool events and 100 files. Missing child transcripts and skipped
oversized/malformed records are disclosed. See the work-flow review in design/.

### Oturum katılımcıları ve canlı konum

Conversation details now include **Bu oturumun ekibi**. The list identifies each
participant, its recorded status, last tool and actual room. Location uses the
exact Claude session UUID and subagent parent tool id, rather than a generic role
or idle resident. **Ofiste göster** selects and follows that exact character;
the contextual card links back to its conversation and work inspector. Positions
refresh with the office's one-second render tick. Trace records refresh every
four seconds. Missing/despawned characters and historical sessions have no live
location link. Failed trace reads hide the location list until verification
recovers. Native tool overlays are hidden outside the office and behind modals.

### Bildirim merkezi

The header bell opens notification history and settings without asking for browser
permission. Device permission is requested only by **Bu cihazda bildirimi aç**.
On iPhone/iPad, open the Safari Home Screen installation before enabling push.
Device status checks both browser permission/subscription and server registration.
Disabling a device unregisters it; event preferences apply to all registered
devices. Completion, failure and waiting-for-input alerts default to enabled;
ordinary starts/tool operations do not send alerts. Disabled event preferences
still retain panel history. Each distinct permission episode is delivered;
retries of the same event are deduplicated by event id, not a time window.

Notifications use human-readable Turkish messages and link to the exact task's
work inspector, under Geçmiş for completed tasks and Görevler otherwise. Push
clicks reject off-origin destinations. The last 150 notices, read state and
preferences are persisted in `~/.pixel-agents/bibilen-notifications.json` with
mode 0600. Expired subscriptions are removed; key renewal and delivery failures
are surfaced in the panel. Delivery counts mean push-service acceptance, not
verified display on a device's lock screen. See
`design/session-locations-notifications-2026-10-10.md` for real test proof.

Verified live repository sessions are recovered into the native office after
restart without waiting for a new hook or launching Claude. Recovery requires
a valid session UUID, scoped CLI inventory, existing transcript and (for an
interactive session) a live process. Browser clients cannot submit reconciliation
commands. Historical child activity without a live connection is labeled
**Son kayıtta**; no child character is fabricated from old logs.

### Completion pass — 2026-10-10

The notification center supports quiet hours in Europe/Istanbul, lock-screen
privacy, per-session mute and an explicit delivery test. Quiet/muted events
remain in panel history. External and owned non-task sessions are monitored
using verified permission signals, failed state and new end-turn transcript
evidence; initial historical records are baselined rather than replayed as pushes.
Session notices open `?view=sessions&session=<uuid>`. Task notices retain exact
task links. No permission/subscription setting is changed automatically.

Work details show one searchable timeline with type and participant filters,
recorded test/control output, and on-demand git diffs for files with recorded
editing provenance. Diffs reflect the shared working tree, including changes
from concurrent sessions, rather than falsely attributing them to one agent.
Arbitrary shell commands are not exposed. Long messages collapse; unverified
old participants are separated from live characters. Terminal UI loads on demand
and hidden office views skip expensive canvas painting.

SEO isolated runtime and Chromium doctor both report ready. All 35 specialist
roles completed real read-only Claude smoke runs. These are launch/reference
checks, not evidence of authenticated production execution for every external
integration. No paid MCP operation or external data modification was attempted.
See `design/completion-acceptance-2026-10-10.md` and restart/smoke artifacts.

### Usage and Slack alarm connections

Open the header link icon **Kullanım ve bağlantılar**. Claude limits come from the
supported statusLine payload through `usage-statusline.mjs`, configured in project
settings. The panel shows account-shared five-hour/weekly snapshots, capture time,
reset time and unknown/stale/expired states. It does not derive quotas from token
counts or fetch private OAuth endpoints. An active CLI with a first API response
provides data; a display refresh rereads that capture.

MCP health is checked with `claude mcp list`; connection status and configured
service credentials are distinct from verified API operations. Connection details
and Slack history are owner-only. Secrets are never returned by these endpoints.

For continuous Slack alarms, open the Slack setup disclosure and supply a channel
ID and bot token. Add the bot to that channel and grant `channels:read` plus
`channels:history` (or `groups:read`/`groups:history` for a private channel). The
bridge verifies auth/channel/history before saving the token privately under
`~/.pixel-agents/slack/<channel-id>/bibilen-slack-private.json`. Up to eight explicitly selected channels share one bot connection. Incoming webhooks alone cannot read
messages. Initial history does not generate pushes. New channel messages appear
in the panel and use the Slack notification preference, quiet hours and privacy.
The hub makes at most one history request per 65 seconds and rotates channels; with eight channels each is checked approximately every 8 minutes 40 seconds. Rate-limit responses back off. No public webhook exposure
or Tailscale Funnel is needed.

Live channel connection is pending channel/access information. See
[acceptance](design/usage-slack-acceptance-2026-10-10.md).


### Daily reports and shared character looks — 2026-10-11

**Operasyon sorumlusu** prepares an actual Claude task from recorded Slack source
messages at 09:00 Europe/Istanbul. Configure the time and prepare today's report
in **Kullanım ve bağlantılar**. Reports link to the task work inspector and reuse
task completion push preferences. Disconnected or stale channel coverage blocks
report generation; reports describe retention/sampling limits. Scheduling and
same-day deduplication survive restart. This agent cannot execute commands,
change files or send Slack messages. A separate Slack posting destination has
not been configured. MCP OAuth access alone does not configure the bot reader.

The default **Cozy ekip** contains 48 code-native animated human character looks,
with natural skin/hair colors and separate outfits. In **Ofis ayarları → Karakter
görünümü**, select a specialist and its look. Owner-only writes save appearance
under `~/.pixel-agents/bibilen-character-looks.json`; all devices read the same
preferences. The original character set remains selectable. The team directory
uses matching character portraits. The roster has 36 specialist definitions plus
Gökhan. The operations reporter occupies the sixth desk in the delivery/QA room.

See [acceptance](design/operations-cozy-acceptance-2026-10-11.md) for verification
and the remaining Slack account/channel connection requirement.

### Operations follow-ups — 2026-10-11

In **Kullanım ve bağlantılar → Operasyon ve takip işleri**, create an expense
review for `finance-analyst` from supplied dated/currency-labelled records, or
select a completed task for `senior-qa` to review its actual recorded outcome.
The server resolves source tasks and alarm text; clients cannot submit replacement
alarm evidence. Completed status is not treated as proof of correct behavior.

Recorded Slack alarms are grouped by channel and whitespace-normalized exact
text in a 15-minute window. Error codes, resource names and severity are preserved.
Repeated messages remain recorded, while device pushes are suppressed within the
notification window using durable per-channel state. Alarm groups link to actual
`senior-backend` or `security-pen-testing` review jobs. No automatic remediation,
financial transaction, release or Slack posting is started.

Follow-up creation is owner-only. Duplicate clicks/concurrent requests and gateway
restarts reuse a recorded task for the same kind/source. The last 250 follow-up
records are privately persisted in `~/.pixel-agents/bibilen-operations.json`.
The UI links each result to its real work inspector and displays task status.
Live Slack alarms remain pending channel authorization; no sample alarms are
injected into production storage for demonstration. Deferred connections are
tracked as T-70 through T-74 in `docs/todo/TODO.md`.

### Unified Operation Center — 2026-10-11

Open the new **Operasyon** navigation item or `/?view=operations`. Active owned
tasks and verified connected project sessions share one view, joined by exact
session UUID or task id. Queue entries without a session stay visible. Each job
shows responsible role when recorded, current task stage, verified participants,
assigned work, parent/delegator, recorded tool/file, real office location and
recorded communication/delegation history. Unknown lead roles say Ana oturum.

Connected sessions are not assumed to be working. Live running/waiting signals,
last recorded states and historical/unverified participants are distinct. The
UI does not show fabricated blockers, completion, communication or locations.
Read failures hide the affected live rows/counters and show a warning. Records
refresh every five seconds (task state every three); positions update each second.
Search/filter by work/agent/state; open the exact work inspector/session or follow
a verified character. Remote/mobile navigation includes the new section.

Overview detail remains bounded to eight live session traces; the server reports
total connected session count and truncation explicitly. Other sessions remain
in Oturumlar. Active owned tasks are not dropped by this trace limit. Existing
trace retention/coverage restrictions remain disclosed in the detail inspector.

### Project presence and account notifications — 2026-10-11
Project roles are loaded before rendering; namespaced layouts and session connections remain separate. Team cards now use current CLI work signals, distinguish idle from required answers, and count concurrent sessions of the same role. Closed or historical traces do not count as current work.
The notification center defaults to all projects, with a selected-project filter. Notification clicks reload into the owning workspace before opening the session/task. Project mute suppresses device delivery while retaining panel records; shared device registration, privacy and quiet-hour preferences are preserved.
Slack authorization and an actual second-project acceptance run remain follow-ups; the isolated two-project gateway fixture covers project/task/session/notification separation without launching user work.

### Readability and placement refinement — 2026-10-11
Conversation readers render Markdown headings, lists, code and horizontally scrollable tables without raw HTML execution. Notification settings collapse so recent notices are immediately visible. Mobile action groups, filter selection and narrow work cards share consistent wrapping and touch sizing.
Layout revision 116 moves the default finance printer beside the archive. Revision 115 migrates only that default position and preserves owner furniture; an occupied destination is left unchanged. Native terminal inputs retain their own sizing and typography.
