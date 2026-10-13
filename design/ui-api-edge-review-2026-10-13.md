# UI and API edge review — 2026-10-13

This is a bounded, evidence-based review, not a guarantee that every possible interaction or external service works. Existing Claude jobs were preserved. No live task prompts, stops, approvals, grants, integration configuration, test notifications or paid provider checks were submitted.

## Fixed in this review

- Polling responses arriving after a settings mutation could overwrite the saved state or replace it with a stale error. Shared synchronous request fences now protect management, integrations, reports, operations and appearance. Notification polling additionally coalesces overlapping loads and rejects stale errors.
- Rapid submissions could issue duplicate task/session creation, provider checks, delivery reviews or stop requests. Synchronous guards reject repeat requests before React renders the disabled button.
- Task links in daily reports and follow-up operations omitted workspace scope. They now preserve the selected project.
- Project inventory failures were swallowed. The switcher now retains its cached selection, shows a retry control and reports the failure.
- Forms could be edited while saving and lose the newer draft. Relevant fields and dismiss controls are disabled while the operation is pending.
- Shared modal viewport handling now follows the visible viewport, including keyboard resize. Task console and new conversation form use the shared focus/viewport hooks. Reception preview now traps/restores focus and supports Escape. Native terminal Tab handling is preserved.
- Long forms, management content, diffs and mobile notification settings have bounded scroll layouts. Sticky dismiss headers remain reachable.
- Owner API requests using unsupported HTTP verbs are rejected with 405 rather than falling through to a read handler. Observer access routing remains unchanged.

## Evidence and scope

| Area | Verification | Result / boundary |
|---|---|---|
| UI logic | 34 Vitest files, 105 tests | Passed; includes stale-response fences, request lifecycle and workspace task-link regression |
| Backend and gateway | 193 Node tests | Passed; fixture checks include observer isolation, Origin checks, workspace routing and unsupported PUT/DELETE |
| Production compilation | TypeScript + Vite | Passed; large animation chunk warning remains |
| Live API | 21 read-only route paths in each of two registered workspaces (42 GETs) | All HTTP 200 and JSON; slowest 814 ms under concurrent run. Does not certify external integrations |
| Live mobile viewport | 390 × 600 | Main Office/Operations/Tasks/Sessions pages had no document horizontal overflow. Management tabs, notifications/settings, expanded task form, integrations and appearance opened. Task form content 1589 px within 582 px scroll height. No saves triggered |
| Live desktop viewport | 1440 × 900 | Sessions page had no document horizontal overflow. Temporary viewport override reset |
| Live CLI | Existing session view opened read-only | Native terminal and separate conversation controls present; no terminal commands submitted in this audit |
| Accessibility | Shared focus trap and Escape code review, live dialog opening | Not a full screen-reader conformance audit |

Live read routes: projects, portfolio, roles, capabilities, state, appearance, sessions, session-catalog, work/overview, usage, notifications, approvals, project-policy, project-context, backups, sharing, operations, reports, integrations, skills, push-key. Safe status/timing-only local evidence: `design/api-read-audit-2026-10-13.json` (ignored runtime artifact).

Screenshots (ignored local evidence): `design/verification/audit-mobile-form-2026-10-13.png`, `audit-mobile-sessions-2026-10-13.png`, `audit-desktop-sessions-2026-10-13.png`.

## Explicitly unverified or deferred

- Physical iPhone/iPad/Windows touch scrolling, software keyboard and microphone behavior. Viewport emulation cannot certify them. Dictation is user-confirmed working.
- Slack, finance sources and Windows host connection remain owner-deferred.
- Real push delivery, paid model/provider execution and granting/revoking real collaborator access were not exercised.
- Production write endpoint behavior is covered by local fixtures/code review where available, not by issuing live writes to every endpoint.
- Performance under long-running load and all browser/assistive-technology combinations is not proven. Current evidence does not justify a universal 9.5 UX score.
