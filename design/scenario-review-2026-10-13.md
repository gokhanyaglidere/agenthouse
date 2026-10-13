# Usage scenario verification — 2026-10-13

Version: b366bc6. Live browser tests used the private deployed panel; temporary viewport sizes were 390×600 and 1440×900, then reset. Backend writes/execution used disposable Node test fixtures with a fake Claude executable, isolated HOME and workspace roots. No real Claude prompts, process stops, permission approvals or external notifications were issued.

| Scenario | Steps and observed outcome | Result |
|---|---|---|
| Open existing history | Sessions → existing card → History; correct title and transcript appeared | Passed |
| Read a long conversation | Native browser scroll in mobile history moved `.bb-workspace` to 1200 px and returned to zero | Passed |
| Load older messages | Button entered disabled/loading state on click; UTF-8 pagination/order and duplicate prevention independently verified by session fixtures | UI loading state passed; full pagination covered in fixtures |
| Select existing sessions in split view | Selected two separate externally owned CLI conversations; each displayed its title and explicit takeover action, without automatic takeover | Passed |
| Mobile split switch | Switched between pane 1 and pane 2, then selected three-pane layout | Passed |
| Desktop split layout | Three visible regions, each 400 px wide ×718 px high at 1440×900 | Passed |
| Change project | BiBilen → Agent House; URL workspace changed and selected-project list showed zero open conversations | Passed |
| View other projects | All projects control showed 42 catalog conversations, each with project identity | Passed |
| Preserve task draft | Filled title/prompt, cancelled, reopened; both values preserved. Restored original empty draft; did not submit | Passed |
| New conversation settings | Expanded startup settings; model, effort and permission mode selectors present | Visibility passed; launch arguments covered in fixtures |
| Notification navigation | Opened admin-service-costs-page notification; URL selected its exact session UUID and BiBilen workspace. Native CLI ownership/takeover controls visible | Passed; selected notification marked read as part of normal navigation |
| Write a live reply | In already panel-owned session, typed an unsent draft; Send became enabled; cleared draft without sending | Passed for input; actual model response was not requested |
| Scroll whole live dialog | Native scroll beside terminal moved `.bb-console` from 0 to145 px (727 px content /582 px visible), then back to0 | Passed |

## Isolated execution evidence

`node --test workspace-gateway.test.mjs session-manager.test.mjs task-controls.test.mjs task-manager.test.mjs terminal-broker.test.mjs observer-sharing.test.mjs session-notifications.test.mjs`: **69 passed, 0 failed**.

These scenarios include registering two projects with distinct agents, refreshing project agents, creating scoped sessions/tasks, denying cross-project transcript reads, sharing/revocation with observer data projection, scoped search, concurrent connections without duplicate processes, reconnect/resume identity, task dependency and acceptance behavior, permission-waiting takeover refusal, and session notification behavior. Fixtures exercise real gateway HTTP/WebSocket routing with fake execution, not paid Claude jobs.

UI Vitest suite rerun: **105 passed /34 files**. It covers pane URL/project identity, duplicate selection rejection, corrupt saved layouts, rollover messages, terminal layout scheduling and stale response fences among other logic. These are logic tests, not a substitute for every browser flow.

Local screenshot evidence: `design/verification/scenario-split-2026-10-13.png`, `scenario-live-scroll-2026-10-13.png`.

No new reproducible application defect was found in these scenarios. Physical finger scrolling, software keyboard/microphone, paid model output, push delivery to devices, Slack/finance and Windows connection remain unverified/deferred. These results do not certify every possible scenario.
