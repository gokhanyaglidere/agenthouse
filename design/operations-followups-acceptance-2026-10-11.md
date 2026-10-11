# Operations follow-up acceptance — 2026-10-11

## Shipped

- Selected recorded alarm → backend or security review task with server-resolved evidence and role mapping.
- Duplicate alarm grouping retains codes/resources/channels and all underlying source records. Durable push suppression for identical message/channel within 15 minutes.
- Expense evidence → finance review; no fabricated ledger or automatic financial actions.
- Completed task → QA follow-up with source title, prompt, summary and tail of recorded output. No automatic assumption that completed means correct.
- Durable follow-up source links, duplicate/concurrent request coalescing, work inspector links and status history; owner-only endpoint.
- Account/channel access and external data dependencies recorded in main TODO register T-70–T-74.

## Verified

97 backend tests and 19 UI tests passed (116 total). Production UI build passed.
New tests cover channel/code separation, 15-minute boundary, notification suppression
surviving restart without losing messages, server-resolved sources, concurrent task
idempotency, separate backend/security roles, completed-source QA output capture,
finance evidence validation and rejection of missing/fabricated sources.

Deployed operations GET returned 200 with all four templates, two eligible completed
source tasks, zero Slack alarms and zero follow-ups. Viewer GET and POST returned
403 with explicit role denial. A fabricated source POST returned 400 and no job
was created. Unit fixture runners validate task creation; no invented financial
records or fake Slack alarms were added to the production panel.

Remote UI visibly exposes finance and QA controls, eligible source task options,
empty Slack status and grouping rules. Missing finance/QA inputs keep buttons
disabled. At 390×844, document width equals viewport width and heading text computes
to 15px. Screenshots: operations-followups-desktop-2026-10-11.jpg and
operations-followups-mobile-2026-10-11.jpg.

## Pending

Real Slack grouping/push delivery awaits workspace/channel authorization (T-70,
T-71). Automated ledger collection and cost thresholds await source selection
(T-74). Daily report posting to Slack awaits destination and posting access
(T-72). Review prompts instruct read-only work; existing specialist capabilities
are not globally removed. No claim is made that all external APIs are authorized.
