# Evidence-based additions

| Suggestion | Existing evidence | Necessary delta |
|---|---|---|
| Delivery/approval | TaskResult.tsx, delivery-model.ts and changes.mjs already package outputs, recorded checks and diffs. | Persist owner acceptance/change-request decision; preserve execution status separately. No automatic merge/deploy. |
| Startup check | ProjectCapabilities, IntegrationsPanel and ExecutionHealth already discover definitions/connections and check Claude access. | Show repository-local instruction/script/manifests before starting, without executing project scripts or external APIs. |
| Project memory | CLAUDE.md and native session history already preserve instructions/context. | Explicit owner-approved project decisions with archive/revision and scoped inclusion in new task prompts. No rewriting project rules or running sessions. |
| Dependencies | WorkFlow/work-tracker and Operations show delegation and manual follow-ups; scheduler only orders by priority/time. | New task dependencies requiring successful completion or owner acceptance; same workspace; blocked work cannot starve eligible jobs; retain referenced prerequisite history. |
| Work limits | CLI client calls have bounds; account quota exists. | Optional elapsed task time with notify/stop policy, only on newly configured tasks. No fabricated per-task token/cost limit. |
| Recovery | ManagementCenter already has health/recovery and links to original sessions; bounded clients and uncertain-launch recovery are implemented. | Keep existing flow; no duplicate recovery center or automatic replays. |

Implementation: scoped project-context read/decision endpoints and management tab;
existing TaskResult acceptance controls; task dependency/time options in composer;
scheduler/retention/admission regressions and real isolated gateway checks. Existing
sessions remain untouched. Windows/device/Slack/finance remain owner-deferred.

## Implemented and verified

- Owner review decisions persist separately from execution completion, with note,
  actor/time, completion identity and bounded prior-decision history. Acceptance
  releases only dependencies explicitly configured to require it; no merge/deploy.
- New task dependencies are restricted to known same-workspace records. Failed,
  stopped, missing, or unaccepted prerequisites do not release queued work.
  Referenced terminal prerequisites survive retention while dependents are active.
  Blocked prerequisites do not monopolize the account-wide admission queue.
- Optional 1–1440 minute elapsed limits default to a one-shot notification. Stop
  policy is explicitly selected on creation; stopping requires fresh positive
  native work evidence. Terminal/unknown native state does not trigger a stop.
  Monitor latency means this is not an exact-second hard real-time guarantee.
- Scoped owner decisions can be added/archived in Management → Project decisions.
  New task/session creation captures a decision snapshot; same-history resume
  retains it. Existing open sessions and repository instruction files are not
  modified. Archived decisions do not enter new snapshots. Active text exceeding
  12000 characters is rejected rather than silently truncated. Decision files
  join the existing metadata backup whitelist.
- The same tab shows discovered manifests, available executable names and npm
  script names. It does not run project scripts or claim integration readiness;
  actual account/integration checks remain in their existing screens.
- Existing delivery packages, diff/test evidence and recovery center are retained.
  No second recovery center, automatic replay, fabricated token budget or task cost
  accounting was added.

Validation: 190 backend and 90 UI tests passed, build passed, production audit
zero known vulnerabilities. Tests cover dependency gating, acceptance identity,
retention, cross-project isolation, observer mutation denial, decision snapshots,
resume semantics, time-alert content and terminal/unknown-state stop safety.
Gateway tests run isolated fixtures, not real model jobs or recipient messages.
Windows/device/Slack/finance scopes remain deferred.
