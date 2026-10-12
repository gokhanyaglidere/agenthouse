# Agent House — project sharing and team collaboration

Status: proposed architecture, not enabled. No identities have been invited, no
permissions expanded, and no public endpoint has been created.

## Current verified boundary

AccessPolicy has global operator/viewer roles. Project listings, account catalog,
portfolio, several transcript/work GET routes and office sockets are not filtered
by per-person project membership. Command input is owner-only, but transport
access currently grants broad viewer reads. Push subscriptions/preferences are
account-level, not person-level. This is a personal panel with guarded commands,
not a completed team permission system. Do not onboard coworkers by adding them
to the global owners list or sharing the owner's login.

## User experience

Example: the owner registers Project A and adds Ayşe as a contributor and Mehmet
as an observer. Each uses their own verified identity. Their landing page lists
only Project A. They cannot discover Project B by changing a URL, API query,
workspace header, socket message, search cursor, notification link or catalog key.

Ayşe sees shared task requests, current agent work, shared conversations permitted
by the project, deliveries and her notifications. She can submit a structured
request to Gökhan, comment or provide requested information, and follow its
progress. Whether that request is auto-admitted or requires owner review is a
project policy. Mehmet sees progress and deliberately shared result summaries.
The owner sees who requested each task, who controls its conversation, who
approved tools and releases, and person/project use against shared capacity.

The office shows project agents, not one duplicate virtual employee for every
human viewer. Human presence belongs in a separate people indicator. Switching
projects changes agents, shared work and permissions together. An agent can
participate in multiple sessions, with session identity preserved.

## Proposed roles

| Role | Project visibility | Requests / comments | Session control | Administrative powers |
| --- | --- | --- | --- | --- |
| Owner | All projects | All | All permitted owned sessions | Membership, provider accounts, budgets, sensitive approvals, system settings |
| Project manager | Assigned projects | Triage / assign / review | No raw terminal by default | Project workflow and approved membership delegation only |
| Contributor | Assigned projects | Submit and collaborate | Structured replies in authorized shared work; raw terminal separately granted | No membership, keys or sensitive approvals |
| Observer | Assigned projects | None by default | None | None |

Raw terminal, source diff/transcript access, tool approval and publishing are
separate capabilities, not implicit consequences of a broad role. Observers see
shared status/result views, not automatic raw logs or private conversation text.
Default observer/contributor admission and project-manager delegation await the
owner's preferences. Guests may have an expiry and the observer capability set.
A manager cannot grant a capability they do not possess.

## Identity and network

Two independent gates: access to the server and permission inside Agent House.
Initial recommendation uses each person's Tailscale identity, verified by the
existing private Serve proxy. Network grants restrict coworkers to this service,
not SSH or unrelated ports/devices. Tailscale reachability does not grant app
membership. Invites link one verified identity to a named project/role and expire;
forwarding an invitation must not let another identity claim it.

An optional later browser-only path needs an authenticated TLS gateway/identity
provider, MFA/session protection, revocation, origin/CSRF protections, rate limits
and WebSocket authorization. It cannot be achieved by enabling Funnel on the
current globally-readable gateway. Preserve loopback binding and private Serve
until the owner explicitly chooses and reviews that deployment.

Primary references:
- https://tailscale.com/docs/features/tailscale-serve
- https://tailscale.com/docs/features/access-control/grants
- https://tailscale.com/docs/reference/inviting-vs-sharing

## Domain and persisted records

User: internal ID, verified provider subject, display name, active/disabled state.
ProjectMembership: user/project IDs, capability set, role, expiry, revision.
Invite: hashed one-use token, intended identity, project, inviter, expiry/status.
Task: requester, executor identity, project/workspace, assignee, reviewers.
SessionAccess: owner, project, private/shared visibility and explicit participants.
ControlLease: one human controller, session, expiry and handoff history.
Comment: author, task/session, timestamp, append-only history and visibility.
AuditEvent: actor, project, action, target, time, decision and correlation ID;
never credentials, raw terminal input, private reasoning or indiscriminate logs.
DeviceSubscription: user/device binding, preferences and authorized delivery scope.

Human membership and Claude agent roles are different concepts. A caller cannot
choose the requester identity through a task body. Canonical project identity
covers its registered workspaces; private sessions keep their additional audience
constraint. Existing root history and discovery remain owner-only until explicitly
shared; migration must not publish the owner's accumulated conversations.

## Server enforcement

- Default deny for unknown people, unassigned projects and missing capabilities.
- Check identity, project membership and object-level visibility before reading
  data, creating a runtime or attaching any terminal/socket. UI hiding is not
  authorization. Apply the same policy to HTTP, native office messages, static
  proxy paths, streams, exports and all workspace aliases.
- Filter projects, portfolio, account catalog, traces, source diffs, search,
  notifications and backup exports. An observer's response is a dedicated
  projected view, not a full payload with a hidden button.
- Recheck long-lived terminal/office streams on membership revision or revocation;
  close unauthorized connections, clear control leases and cancel undelivered
  notifications. Already-started work needs an explicit owner policy; revoking a
  viewer is not an instruction to kill a running job.
- Allow safe office camera navigation locally. Layout/appearance edits, project
  registration and global settings remain separately privileged.
- Private state files, atomic updates, corruption fail-closed, last-owner protection.
  Never permit a member to edit policy files via agent tools or escalate through
  owner/session/task IDs supplied by the browser.

## Collaboration and execution

Structured task requests are safer defaults than raw interactive terminal access.
One session has one active writer; others observe or comment. Show who holds
control, request handoff and prevent duplicate/replayed submissions. Busy external
CLI sessions retain their original terminal owner. Comments do not automatically
become agent instructions; explicit send/assignment records the human author.

Concurrent edits to one project need isolated Git worktrees and reviewable diffs,
plus merge handling; for non-Git projects use serialized write work or a dedicated
workspace. Separate worktrees alone are not a security sandbox. Per-project tool
policies, secret isolation and explicit owner approval remain enforced. Workers
must never change other projects' code merely because the server hosts them.

Execution identity (the actual Claude account) is distinct from panel identity.
Connecting a coworker to the panel does not sign them into Claude or entitle them
to the owner's account. Choose supported per-user/team/API execution and validate
provider account permissions before enabling shared execution. Do not expose
OAuth/API keys. Existing account quota remains shared for jobs using that account;
show attribution, queue limits and project/person admission thresholds without
inventing exact token/cost telemetry. Owner limits cannot be increased by members.

## Notifications and lifecycle

Each person registers their own device and quiet-hour preferences. Deliver only
assigned work, mentions, approvals they can decide and subscribed shared events.
Permission is checked both at delivery and when opening a link. Privacy-sensitive
content defaults to a generic push; no cross-project title/excerpt leakage.

Invite → accept → membership active → scoped work → review/result → archive.
Support member expiry, removal, project archive/read-only state, owner handover,
account disable and device removal. Keep author attribution after departure,
without retaining their live access. Deleted projects cannot be resurrected by a
cached browser tab. Export/retention policies distinguish comments, task metadata,
transcripts, source repositories and secrets.

## Implementation sequence and acceptance

1. Build membership/capability model and deny-by-default server projections.
   Preserve owner-only personal access; no real coworker grants during development.
2. Apply policy to all catalogs/routes/socket paths, private/shared session access,
   source views, exports and revocation. Test as two users across two projects.
3. Add People & Access UI, identity-bound expiring invites, audit and guest expiry.
   Actual network/app invitations require named recipients and approved scope.
4. Add author attribution, structured replies, comments/control handoff and
   isolated/serialized execution with person/project queue limits.
5. Bind push delivery/preferences to people; test offboarding and stale deep links.
6. Run end-to-end acceptance with the owner's selected coworker identity and
   devices. Separately review browser-only access if selected.

Acceptance includes forged workspace headers, direct session IDs, catalog search,
notification and export leaks, raw native office messages, revoked open sockets,
expired/forwarded invites, simultaneous writers, budget exhaustion, interrupted
jobs, restart persistence, corrupt membership files and last-owner protection.
No claim of complete multiuser isolation before those boundaries are implemented
and exercised. Physical devices and external identities require their owners.
