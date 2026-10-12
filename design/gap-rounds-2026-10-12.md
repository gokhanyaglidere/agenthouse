# Repeated gap rounds — 2026-10-12

Owner requested repeated review/fix cycles until a review round finds no new gap.
Each finding below was turned into a regression case and corrected before the
next review. No live Claude conversation was prompted or deliberately terminated.
Windows host connection and physical-device checks remain expressly deferred.

| Round | New findings | Result |
|---|---:|---|
| 1 | 3 | Fixed and verified |
| 2 | 2 | Fixed and verified |
| 3 | 1 | Fixed and verified |
| 4 | 0 | No additional reproducible defect found in reviewed scope |

## Round 1

- Skill instruction reads trusted the earlier listing while project/root/file
  identity could change. Catalogs now pin the canonical registered root, invoke
  the workspace identity guard, revalidate source boundaries on read, keep the
  original file path for symlink refusal, compare file content with its listed
  hash, and use an identity-checked descriptor with a hard 64,001-byte read limit.
  Directory swapping, content changes and alias retargeting have regressions.
- A failed visual team application could mutate the global roster and mark its
  revision applied before finishing, blocking a retry of identical inventory.
  Roster application rolls back on error; visual rollback is attempted; the
  revision key is committed only after successful application.
- Malformed successful skill instruction responses could stage invalid text.
  Instruction text/name are validated after the response and before using the
  latest draft callback. Existing generation/disposal checks remain enforced.

## Round 2

- Reconciliation only noticed file/active-role changes. Late furniture asset
  availability, removed seats, moved obstacles and changed tiles did not cause
  a retry when source files were unchanged. Synchronization now includes the
  current geometry and asset readiness and commits the post-application key.
  Pure visual changes do not emit spurious skill-generation invalidations.
- Unknown furniture was treated as a one-tile object; proposed workstations were
  not checked against walls or void tiles. Placement now requires catalog entries,
  validates full footprints against bounds/floor, and preserves retained station
  positions and other decor. Regression fixtures use the real catalog geometry.

## Round 3

- An unknown native agent state masked a positive busy process status, allowing
  another root to start in its directory. Task and conversation admission now use
  one shared classifier: explicit terminal state retains precedence, otherwise
  positive work/waiting signals block competing starts. Both paths are tested.

## Round 4 — clean review

Re-read the final changes and traced the real call sites: scoped file discovery
and instruction reads; role add/remove/reorder; invalid/foreign/late payloads;
transaction failure and retry; layout capacity/obstacles/resource readiness;
draft preservation; task/session admission; and existing control authorization
and observer projection boundaries. No further reproducible finding was identified.
Existing full-suite regressions also cover quota invalidation, durable active job
retention, registry locks, CLI bounds, recovery, notifications and read-only grants.

Final checks: **181 backend + 89 UI tests = 270 passing**. TypeScript/Vite build
passed; production audit reports zero known dependency vulnerabilities; diff check
passed. Existing large animation-chunk advisory remains a known build warning.
Deployment uses the existing private gateway LaunchAgent, not another server.

This records a review round with zero new findings, not proof of universal defect
absence. Unvalidated external/Windows/device scenarios and previously accepted or
paused design work are not silently counted as implemented. Independent external
CLI starts and native running-session configuration reload remain documented
ownership/runtime boundaries. Earlier review reports remain historical evidence.
