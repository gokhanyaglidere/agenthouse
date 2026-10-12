# Task delivery, project overview and searchable history

## Shipped

- Completed/failed/stopped tasks open a delivery section from History or the
  project overview. It deduplicates edited paths, shows recorded successful
  exits/failures, unresolved work and an evidence-based next step. Missing tests
  are not counted as successful tests. Missing/truncated traces remain disclosed.
- The recorded final lead response is preferred over terminal repaint text when
  available. Stored terminal output remains the fallback; no old records are
  rewritten and no synthetic summaries are generated.
- Tasks contains a collapsed project overview with prioritized watched work and
  the three latest deliveries. Concurrent conversations with identical titles
  have session badges. Idle connected conversations are not labelled active work;
  incomplete overview coverage is disclosed. The office home stays unchanged.
- Team includes work-state filters, distinct linked-work counts and queue counts.
  A task and its matching live session are counted once. Required replies take
  precedence over running/queued states. Missing live data does not imply an
  available agent. Task buttons honour operator privileges.
- Existing four templates are retained, with an explicit planning template added.
  Selecting/applying a template does not submit a task; current draft replacement
  remains explicit.
- History supports task prompt/output/role search and result-status filtering,
  with ten rows at a time. A separate operator-only conversation search examines
  the selected project's visible user/assistant messages, using the existing
  transcript reader. Thinking, sidechains and tool-result bodies are excluded.
  Recorded decisions can be found as messages; no standalone decision register
  or inferred decisions are invented.

## Search bounds

Each request attempts up to 24 transcript pages and stops after the page that
reaches 30 matches. A page may contain up to 120 messages, so all matches from
that page are retained. The continuation encodes session, byte cursor and query,
validated against the current project inventory. No arbitrary paths are accepted.
Unreadable sessions and remaining coverage are disclosed. Results are rendered
10 at a time; users can continue through older pages. Inventory can change during
search, so it is not a frozen full-text index or a global chronological snapshot.
A result opens the conversation; it does not automatically jump to an old matched
message deep in its transcript. The excerpt retains immediate match context.

## Verification

147 backend tests and 71 frontend tests passed. TypeScript and production build
passed. New coverage includes bounded continuation, literal/Turkish text matching,
wrong cursor/query rejection, unreadable/non-progressing histories, workspace
isolation and viewer denial through the real gateway fixture, edited-path
deduplication, missing/failed tests, readable final-response preference and
workload deduplication/priority.

Deployed using the existing private gateway. Live browser confirmed the project
summary, real recorded task delivery, a real message search (23 hits in the first
24 scanned pages), the working-agent filter and the selectable planning template.
No task was created, no Claude message sent, no draft replaced and no real job
stopped. Physical-device checks, Slack and finance remain deferred.

Screenshot: design/verification/task-delivery-2026-10-12.png (local ignored artifact).
