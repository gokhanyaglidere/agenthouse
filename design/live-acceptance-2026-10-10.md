# Live acceptance — 2026-10-10

User requested real execution after Claude access became available. Execution
health returned ready. All tests used this panel and repository; existing user
sessions were preserved. Test-owned sessions were stopped after verification.

## Real execution proof

- Chief task `04c7eabe-98d1-4782-8007-96dd90cfd6ee`, Claude session
  `83c8f8ac-f017-439f-8171-2459cd3533ea`, completed with two real specialists:
  senior-qa and gap-reviewer. Both returned explicit results.
- Work inspector: three participants, two delegations, one real SendMessage,
  seven file records, no skipped records or missing child transcripts.
- A working specialist showed a live native tool signal. Gökhan's actual office
  character carried the matching `İş 83C8` badge. No idle character was fabricated.
- Task terminal attached, showed specialist permission requests, accepted the
  authorized read/test commands and reattached after closing the viewer.
- A new conversation returned BIBILEN_SESSION_OK. /compact completed. /clear
  opened a new UUID, leaving old history intact. Resume restored the previous
  compacted conversation. Browser /help worked; Escape dismissed CLI help while
  the panel remained open. Browser /clear reconnected to the new UUID and returned
  BIBILEN_AFTER_CLEAR_OK. Closing/reopening replayed this response.
- Two real socket viewers: second initially received writable=false, then
  writable=true when the controlling browser disconnected. No duplicate process.
- Completed work remains accessible from Geçmiş after test process cleanup.

## Bugs fixed during live testing

1. LaunchAgent's minimal PATH omitted node for Claude background hooks. Gateway
   child processes now inherit Homebrew/local binary paths. The retry had live
   native signals and a real office badge instead of node-not-found hook errors.
2. A completion notification arriving before the final child transcript scan
   could preserve an empty summary. Notification result text and late child text
   now survive; return events identify specialist → actual parent.
3. /clear changed Claude UUID while the panel retained the old live identity.
   Ownership now follows the exact process PID within this repository; sockets
   receive the new identity and the UI reconnects without another CLI process.
4. Escape closed session/task panels instead of reaching CLI menus/interrupts.
   Terminal focus now preserves Escape for Claude, and writable session control
   focuses the terminal automatically.
5. Gap-reviewer found late attach exit could delete a replacement viewer's lock.
   Task attach cleanup now checks exact process ownership before releasing it.
6. Explicit completion overrides stale native activity; stopped specialists and
   root tasks retain a stopped state rather than being mislabeled failed/waiting.

## Final checks

- Backend: 61 tests passed across six files, including new race, late result,
  PID identity, explicit completion and stopped-state regressions.
- Frontend: 11 tests passed. TypeScript and Vite production build passed.
- Agent checker: PASS for 35 definitions, chief/specialist roster, models,
  turn limits, tool allowlists, routing/guidance paths and hook files.
- Live HTTP: originless writes, foreign-origin writes and invalid Host returned
  403; malformed session UUID returned 400.
- Live WebSocket: foreign Origin and wrong control protocol returned 403.
- Work dialog desktop width/scrollWidth both 1098px; 390px viewport both 372px.
- Screenshots: live-team-completed-2026-10-10.jpg and
  live-cli-after-clear-2026-10-10.jpg.

The initial failed hook test is kept as a stopped task in history. The completed
review transcript records findings as they existed before our subsequent fixes;
this report documents the final state. Native activity depends on connected
office clients; transcript completion overrides stale live activity. Unrecorded
communication is unavailable. Push delivery to a physical phone and every
specialist's external service/tool execution were not tested. This verifies the
panel's core Claude execution flow, not all possible CLI commands or agent skills.
