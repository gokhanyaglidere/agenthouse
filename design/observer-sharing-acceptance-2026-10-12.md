# Private, project-scoped observer sharing

Owner selected read-only progress/results and each person's own Tailscale identity.
Implemented and deployed on the existing private Serve gateway. No public exposure,
new user invitation or real observer grant was made during implementation.

## Owner workflow

Select a project → Menu → Project sharing. Enter the coworker's exact Tailscale
login identity and an optional display name. Grants last 7, 30 or 90 days; renewing
an identity replaces its expiry. Removing access affects all workspaces of that
canonical project. Each grant and publishing/removal action has an actor/time
record. This does not provision Tailscale network access or send an invitation.
A named coworker and separately scoped network permission are needed for actual
onboarding; the owner's login must not be shared.

Under Shared work, explicitly select a task or conversation and author the visible
title and optional result summary. Progress reflects recorded task state or
verified shared-session signals. Completed tasks do not show live actors from a
subsequently reused session. No result text is automatically published. Selecting
an existing source retrieves its previously approved summary for revision; removal
withdraws it from subsequent reads. Other workspace publications in the same
project are readable/removable but must be edited from their source workspace.
Owner preview renders the same projected data without adding membership.

## Observer workflow and boundaries

Opening the same root URL as a nonowner serves a dedicated read-only portal.
Only assigned projects and explicitly shared items appear. The portal polls every
five seconds while visible and on focus; project/state request timeout is 15 sec.
Authorization or network failures clear displayed data instead of pretending it
is current. Long lists render ten items at a time. A hidden/offline browser cannot
be forced to erase data previously received; revocation denies new reads and the
next successful check clears revoked access. Downloaded/remembered summaries
cannot be recalled.

Only GET viewer/projects and viewer/state are permitted to observers. All legacy
API routes, all writes, native office sockets and terminal sockets are denied,
even for granted observers. Old global catalog/history/notification data is not
shared. The observer static server serves only its HTML and public build assets,
not arbitrary upstream native paths. Responses use no-store, nosniff and a
same-origin CSP with frame-ancestors/base-uri protection.

Project membership is checked before creating/accessing a runtime, and again after
live reads. Workspace/source IDs are resolved inside the permitted project.
Observer responses contain publication aliases, owner-approved text, generic
status and live role/state pairs; no raw task prompts/errors/outputs, transcript,
tool/file/event evidence, source-session IDs, account quotas, device lists or
credentials. Unknown/unavailable state remains unknown. Observer push registration
and automatic push delivery are not enabled; existing owner devices are preserved.

Forwarded identity/headers take priority over the trusted local Host shortcut.
A remote person cannot become local-owner by supplying its marker or a local Host.
Serve remains the trusted identity boundary, with the application loopback-bound.
A local OS user able to edit the service/files remains outside this remote boundary.

## Persistence

Private atomic metadata in ~/.pixel-agents/agent-house-sharing.json; up to 200
project grants, 300 publications, 250 audit records. Corrupt/symlink/oversized stores
fail closed and are not silently overwritten by edits. Expiry is enforced on reads.
Metadata snapshots now include this store. Restoring old permissions requires
owner review; restoration remains into a separate staging directory, not a live
one-click overwrite.

## Verification

153 backend tests and 71 frontend tests passed (224 total); TypeScript and production
build passed. Unit coverage verifies identity/project isolation, exact expiry,
revocation/restart, private file permissions, corrupt-store denial, validation,
publication updates/removal and response-field projection.

Real two-workspace gateway fixture uses raw HTTP for accurate custom Host/Origin
headers (fetch did not preserve the intended Host in this environment). It verifies
an unknown identity sees no projects, Alice sees only Project A, Bob cannot read A,
A grants cannot read B or publish its sources, every private API and write remains
403, native sockets/static metadata remain denied, publication projections omit
raw task prompts and IDs, preview is explicit, and revocation removes access.
Fixtures run only inside a temporary HOME and use a mock Claude executable.

Live browser verified the owner sharing panel, current-project source choices,
empty membership/publication state and separate owner-preview portal. No real
person was added, no private source published, no model prompt sent, no live job
stopped. Actual recipient network access/identity and physical-device checks are
not claimed complete. Higher collaboration roles, comments, contributor terminals,
public browser login and personal observer pushes remain outside the chosen scope.

Local ignored screenshots:
- design/verification/project-sharing-2026-10-12.png
- design/verification/observer-preview-2026-10-12.png
