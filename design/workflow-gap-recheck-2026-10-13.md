# Workflow additions: gap recheck — 2026-10-13

Scope: prerequisites, delivery decisions, project decisions/snapshots, elapsed-time policies, observer permissions and task detail navigation. This is a bounded review, not a claim that every possible system defect is eliminated.

## Round 1 — reproducible findings and fixes

1. WorkDetail retained the previous task/trace while a new target loaded; TaskResult reused its note state. A delayed decision could restore an old task into a different target. Clear target data on change, key TaskResult by task ID and reject late decision/stop results for a different target. Fetch concurrency is effect-local, so a previous request cannot unlock a new target's pending request.
2. Persisted prerequisites were trusted after creation. Unknown conditions could release a task; non-array/null entries could break scheduling or saving. Validate shape, allowed conditions, duplicates and count on each eligibility check; malformed records block work and remain saved for recovery. Regression tests cover these cases and valid legacy records.
3. Delivery review lacked an explicit project/workspace check on stored records. Reject foreign records before changing acceptance; regression test verifies no acceptance is written.

## Round 2 — recheck

Re-read prerequisite retention and eligibility, fresh native-state gating for time stops, review scope, observer routing, scoped decisions, immutable memory snapshots and task-target switching. No additional actionable gap found within this scope. Earlier tests cover prerequisite starvation/retention, outdated acceptance, one-shot notifications, completed-native-job stop safety, memory reuse and observer/project isolation.

Verification: backend 193/193; UI 90/90; UI TypeScript/build succeeded; diff whitespace check passed. Existing private gateway updated through its LaunchAgent; browser showed Claude connection ready and scoped task options. No real task was created, accepted or stopped for verification. Browser image: design/verification/gap-recheck-2026-10-13.png.

Deferred by owner: physical-device tests, Windows/WSL connection, Slack and financial data connection. Per-task token/cost enforcement remains unavailable without reliable measurement; elapsed limits do not claim to measure it. Build still reports a large animation asset chunk, which is a performance follow-up rather than a failed build.
