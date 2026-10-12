# Agent House follow-up register

Updated 2026-10-12. This register belongs to the standalone Agent House repository;
older acceptance reports refer to a TODO file in the former parent project.

## Completed in the final maintenance pass

- Preview playback stops drawing while paused or hidden. Returning to the page
  resets its clock rather than advancing through time spent away. Pet animation
  uses the same actual frame duration as characters; long stalls are bounded.
- Reduced-motion users see a still preview initially and can explicitly resume.
- The README links to this local register instead of a missing parent-project file.
- The broker recovery test now waits for asynchronous socket-owner release,
  retaining the same PID, replay and explicit-stop assertions. An immediate
  reconnect raced remote teardown under parallel test load; the isolated test
  passed before the fix, and the complete suite passes with the bounded wait.

Validation: 144 backend tests and 67 frontend tests passed; TypeScript and
production build passed. Deployed to the existing private gateway. Browser
confirmed eight preview scenes and pause/resume controls. Physical devices and
paid Claude operations were not used for this maintenance pass.

## Deferred by the owner

- Slack alarm channels, daily reporting destination and posting permissions.
  No messages or external connection tests are sent until this work is resumed.
- Financial source collection and provider integrations.
- Physical iPhone/iPad microphone, keyboard, installed icon and push-tap checks.
- Glass walls, door scale and corners: revisit only when the owner resumes design.
- Current character looks and activity animations are accepted as-is. No further
  appearance or choreography changes are planned without a new request.

## Separate future scope

- A second computer's sessions would require host registration, identity and
  connection handling; cross-host aggregation is not currently implemented.
- Metadata backups exclude source repositories, full Claude transcripts and
  provider credentials; complete machine-loss recovery needs separate backups.
- Provider-specific workflows depend on credentials and source selection. A
  passing local suite does not establish all external API access.
- Formal performance, accessibility, security and physical-device acceptance
  remain distinct from local regression tests. No guaranteed 9.5 UX score or
  perfect security claim is made.

Busy external CLI conversations remain controlled by their original terminal.
This is a disclosed ownership boundary, not a missing permission to inject input.

## Team collaboration — proposed 2026-10-12

The owner requested a complete project-sharing model. The current global
operator/viewer system is not project-isolated multiuser access. See
[team collaboration architecture](team-collaboration-2026-10-12.md) for verified
current gaps, role/capability matrix, identity and invitation flow, scoped session
visibility, notifications, attribution, execution identities and rollout tests.
The owner chose read-only Tailscale observers. Project-scoped grants, explicit
progress/result publication, revocation, expiry and an isolated observer portal
are implemented; see [acceptance](observer-sharing-acceptance-2026-10-12.md).
Actual coworker identities/network permissions are still needed for onboarding.
Other collaboration roles, personal observer push and public access remain future scope.

## Full-system review — resolved 2026-10-12

All eight reproduced findings are addressed. See [remediation and operational
boundaries](gap-fixes-2026-10-12.md) for implementation, regression checks and
remaining external-process/device boundaries. The original review remains
historical evidence.
