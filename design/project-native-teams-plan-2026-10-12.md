# Project-native teams and Windows hosts

Status: implementation plan, not an implemented Windows connection.
Owner intent: each newly registered project supplies its own agents and skills
without manual copying. A common office roster must not replace that team.

## Existing foundation and verified gaps

ProjectRegistry.context currently enumerates local .claude/agents/*.md names.
The roles endpoint and configureRoster already supply a basic project-dependent
roster. However runtime role sets are cached, metadata is not fully parsed, chief
is injected unconditionally, and known display names/descriptions can come from
the BiBilen base roster. SkillCatalog lists .claude/skills, .cursor/skills and the
local user's personal Claude skills, but listing is different from Claude-native
availability. UI skill selection currently copies text to the draft. Only one
host is implemented; Windows folders are not local Mac project folders.

## Target behavior

Register a host-local folder -> discover its instructions, agent definitions and
skills -> display a discovery summary -> load that project's team into the office.
Opening a different project replaces the displayed team and skill selection, not
its running processes. Other projects keep running on their registered hosts.
No onboarding writes, generated agents or copied skills are required for an
existing project. Missing definitions produce an honest empty state.

## 1. Canonical project capability inventory

Create one ProjectCapabilities service used by registration, roles, skills,
startup validation and office UI. Records contain hostId, projectId, workspaceId,
revision, scannedAt, source path, scope and diagnostics. Validate canonical paths,
file types, bounded sizes and symlink boundaries. Parse supported agent metadata
(name, description, model, tools, skills) and SKILL.md metadata without executing
hooks, scripts or imports. Verify current Claude format against primary docs
before implementation. Resolve agent skill references explicitly; unresolved
references become diagnostics rather than guessed matches.

Default display and task choices contain the project's own definitions. Personal,
built-in and plugin capabilities are separate source-labeled inventories, never
presented as project-defined agents. Cursor skill files are labeled instructions
unless an explicit adapter makes them Claude-compatible. Do not advertise
unsupported discovery paths as native functionality.

Acceptance: distinct A/B inventories with identical filenames stay isolated;
metadata is rendered accurately; missing/malformed definitions are diagnosed;
registration does not alter project files.

## 2. Live synchronization and execution consistency

Scan on registration and selection; add debounced file watching with bounded
periodic reconciliation after missed events or reconnect. Publish inventory
revisions over the existing project-scoped channel. Discard late responses from
a previously selected workspace. Atomically update task role allowlists and
appearance inventory for future work. Avoid global mutable roster state leaking
between projects.

Running sessions retain the configuration they actually started with. A catalog
change refreshes future starts and explains if reopening is required; do not
claim that an already running Claude process has loaded new definitions. Removed
agents with active work remain as labeled historical/live instances. Queued work
whose agent disappeared requires reselection, never a silent substitute.

Acceptance: add/edit/remove a definition without gateway restart; switch projects
during a delayed fetch; reconnect after missed edits; active sessions continue.

## 3. Project-derived office and sessions

Use project metadata for name, description, grouping and skills. Preserve current
accepted sprite/animation assets; map new agent identities to stable appearances
within their workspace. Assign room groups from explicit metadata or user mapping,
not fabricated expertise. Separate a configured agent's idle resident from its
session instances so one active identity does not appear as misleading duplicates.
Concurrent instances show session badges and real state/location links.

Gökhan remains the chosen coordinator label when the project has an appropriate
coordinator mapping; do not create a chief definition silently. If no custom
agents exist, show the main Claude session and 'no project agents defined'. Offer
optional starter templates separately from automatic read-only discovery.

Skill UI distinguishes defined, available to Claude, explicitly referenced and
missing integration access. A skill file is not an API credential; no promise
that every available skill is always executed.

Acceptance: project without custom agents, small/large teams, duplicate names,
multiple live instances, missing skill reference, and source-specific labels.

## 4. Windows host connector

Keep the Mac gateway as central panel initially. Add a narrowly authenticated
host service on Windows; provision a host identity and project allowlist over
private Tailscale. Discover files and operate Claude on the target host, not by
interpreting Windows paths on the Mac. Support WSL2 first to retain the required
Claude sandbox boundary; native Windows needs separate terminal IPC and security
validation, not a silent unsandboxed fallback.

Commands carry host/workspace/session identity, unique command ID and expected
inventory revision. Host validates scope and operator permission again. Include
acknowledgements, idempotency, reconciliation and stale/offline status. Do not
replay ambiguous start/write commands after disconnect or send old queued terminal
keystrokes on reconnection. No new work starts while host status is unverified.
Apply folder write serialization and account limits across hosts; account identity
must be explicit if hosts use different Claude subscriptions.

Windows projects remain on Windows; sessions/results/events are aggregated.
Migration is a separate flow: paths and memberships must be revalidated, active
processes are not movable, and metadata backups do not include source/transcripts.

Acceptance: real WSL host test, offline/reconnect, duplicate request, foreign
workspace, expired host credential, missed event, rejected unsandboxed execution,
and recovery without duplicate jobs. Needs actual Windows device access.

## 5. Remote onboarding, sharing and notifications

Project add dialog selects an authorized host then a host-local folder. Show
found agents/skills, diagnostics and instruction sources before opening the team.
Filesystem browsing is constrained to the host allowlist. Remote Git clone is
optional separate work, not necessary to register an existing folder.

Retain existing read-only Tailscale project grants and explicit publication.
Observers see only permitted published progress/results; they cannot see private
instructions, skill bodies, terminal data, source or another project's inventory.
Project selection is a view filter, not an execution stop or a notification mute.
Notify according to project subscriptions with project/host/session attribution,
deduplication and direct links; do not broadcast private details to observers.

Acceptance: owner A/B switch while both execute; observer grant A cannot access B;
revocation/expiry; notification resolves the correct host/session; same names on
two computers remain distinct.

## Delivery order

1. Local capability inventory with metadata and scope regressions.
2. Live refresh and atomic execution/UI integration.
3. Project-derived office, coordinator mapping and onboarding summary.
4. Windows/WSL connector with lifecycle and security tests.
5. Cross-host sessions, notification routing and observer regression pass.

Complete each stage's checks before deployment. Maintain the current Mac gateway
and existing broker processes. User has asked for a plan here; no Windows setup,
agent rewrites, grants, public exposure or migration are performed by this plan.
