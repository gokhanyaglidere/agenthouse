# Windows conversation handoff to the panel — implementation and rollout

## Delivered behavior

The WSL host now offers a scoped handoff for a Windows-native conversation in the selected project. Closed histories transfer directly. For an open interactive conversation, an explicit operator takeover first verifies the exact session, Windows cwd, idle state and native Claude executable identity through Windows PowerShell. Only that verified idle process may be stopped. Busy, waiting, blocked, unknown inventories, live child work, paused project policy, missing sandbox readiness and conflicting project work reject takeover. No automatic takeover runs during polling or deployment.

The original Windows transcript remains unchanged. A bounded snapshot of the main conversation and child-agent JSONL/metadata is copied to the WSL Claude project history with exclusive file creation; symlinks, growing files, oversized histories and existing destination records fail closed. It is the same session id and underlying /mnt/<drive> project folder, running through the existing WSL PTY, sandbox and approval hooks after transfer. The user-facing explanation explicitly names the WSL runtime; this is not attaching an arbitrary Windows console or creating a new native Windows PTY. Windows-specific instructions/paths in old messages require translation, and a startup note says so.

The panel can then send input and resize, receive output, answer interactive prompts and reconnect to its persistent PTY. Fresh inventory is requested for handoff and reconnect. If the original UUID is reopened on Windows, input is rejected and subsequent guarded tool calls (including child-agent calls) are blocked. Already-running tool calls cannot be retroactively undone. Do not reopen the old Windows conversation while the panel owns it. CLI inventory is not an operating-system-wide exclusive lock.

Office recovery now rebinds an unchanged session id when its transcript path moves from the Windows mirror to WSL. This prevents a visible character from continuing to watch the obsolete file. The duplicate/history guards remain in place. Remote Control remains an optional external shortcut, not a requirement for panel-owned sessions.

## Verification

237 backend tests passed; 105 UI tests passed; TypeScript/UI build passed. Coverage includes idle handoff through the Windows adapter (mocked native execution), busy/waiting/unavailable rejection, unrelated project work, main and child history preservation, no overwrite, symlink refusal, reopened Windows session input/tool guards, and office watcher rebinding. A real PTY integration scenario (an echo fixture, no model request) exercised transfer -> input/output -> gateway disconnect -> broker recovery to the same process -> rejected input after simulated Windows reopening.

A separate actual Mac Claude startup probe with a synthetic Windows-cwd history was inconclusive: no history marker or explicit resume error appeared within its bounded startup window. No prompt was submitted and the generated test process/files were removed. This is not evidence that Claude accepted the imported history. The native PowerShell stop and actual Windows-to-WSL Claude conversation resume still require verification on the Windows device. Passing adapter mocks is not a claim of an end-to-end Windows run.

## Rollout / acceptance on Windows

1. Preserve local changes (including previously modified lock files); fetch and fast-forward to updated main. Do not reset, clean, or stop native Windows work.
2. Run deploy/host-deploy.sh as the WSL host user after confirming no owned WSL task will be interrupted. It installs exact dependencies, builds UI and patches the office engine. Existing native Windows conversations are not stopped by deployment.
3. Read the selected One-Line sessions API: windowsHandoffAvailable must be true. The prior live host was online but did not yet advertise this field during implementation.
4. On an owner-selected closed conversation, verify the button imports history and opens the same session id with a WSL terminal. No message needs to be sent yet. Trust/auth prompts must be handled interactively, never by editing credential/trust files or bypassing permissions.
5. With explicit owner choice of an idle conversation and no live child work, test takeover. Verify busy/waiting rejection before testing an idle stop, and verify original Windows history remains intact.
6. Send a harmless message, answer one expected permission prompt, reconnect and verify office state. This actual Windows acceptance run is pending. Cross-OS runtime/tool portability and native executable path differences must be reported if encountered; never loosen identity or sandbox checks to make the test pass.

## Remaining scope

Continuous simultaneous typing into an arbitrary pre-existing Windows console, native Windows PTY ownership, and guaranteed cross-OS exclusion when a person manually reopens a session are not delivered here. The implemented path is the same kind of explicit idle transfer that Mac uses, with its controlled continuation in WSL. Other project work remains serialized by the existing admission policy.

## Follow-up: busy-project terminal startup and trust prompt

Windows acceptance reported that test session db89c21f could not start because a different native One-Line CLI was busy. That exposed a terminal-startup lock that prevented even reaching Claude's interactive trust/auth prompt. The test record was left intact; no trust file was edited and no native session was stopped.

The production SessionManager now explicitly supports a conversation-only fallback when a peer CLI is working or the project already has a panel execution owner. This opt-in path keeps same-session duplicate detection and account session limits. Default SessionManager instances retain the original strict behavior unless the integration opts in. The production integration always launches these terminals with plan mode, an empty model-tool list, the existing restricted sandbox, and per-launch immutable hook configuration that denies both PreToolUse and PermissionRequest. No tools, including file edits, shell or child-agent tools, are granted by this fallback. The hook refuses locally even if the guard service cannot be reached. It can display the real trust/login prompt and exchange text while native work continues.

Conversation-only terminals consume account slots but do not reserve a project write slot; their persisted mode is used during broker recovery. The websocket control message and session directory identify this mode. They never upgrade in place: after other work ends, the owner must explicitly stop/reopen the panel terminal to start a normal guarded execution terminal. A spawn failure rolls back the persisted marker. Import and idle transfer can use the same restricted continuation path while unrelated native work remains busy. This does not permit takeover of a busy or permission-waiting source session.

Verification: 241 backend tests, 105 UI tests and UI build passed. The real PTY echo/recovery scenario now runs with a busy peer and verifies conversation-only control metadata. Actual hook-client subprocess tests prove both hook types deny Write without contacting an unreachable guard. Regression checks cover marker persistence, no silent live upgrade, spawn rollback, full-mode reopening after peer completion, same-session conflicts and the default strict lock. No model prompt or Windows stop command was submitted for these tests.

Windows rollout/acceptance still required: deploy the new main, reopen the existing db89c21f test session while native work remains busy, confirm the terminal reports conversation-only mode, and manually accept any genuine Claude trust/login prompt in that terminal. Do not forge trust configuration. Then send a harmless text-only test response request and verify transcript/reconnect through a websocket kept open by the test client. The earlier 14-second disconnected-client read failure is inconclusive, not proof of a host outage.

## Follow-up: acceptance reached the real trust prompt; inventory load

Windows reported 0e90b68 deployed with two native busy sessions preserved. The existing db89c21f conversation opened as writable conversationOnly, remained open after websocket disconnect, and reached Claude's genuine trust prompt. No trust acceptance was performed by this agent. The prompt includes project-configured automatic Edit/Write permissions and remains an owner decision. Theme acceptance reported by the Windows operator is separate from workspace trust. Message, history and real Windows reconnect acceptance remain pending the owner's trust response.

The operator reported API read latency increasing from 0.8 to 7.6 seconds against the central 8-second request deadline. Code inspection found repeated concurrent WSL CLI inventory processes, sequential WSL/Windows queries, and repeated per-session root/canonical-path probes over the Windows mirror. Fixed those concrete sources of overhead: per-TaskManager single-flight CLI queries; detached 1.5-second snapshots only for display polling; fresh default queries for task admission, takeover and terminal launch; parallel WSL/Windows discovery; per-list root and canonical-path reuse; one lstat rather than exists+lstat for transcript metadata. Failed queries never return a previous successful inventory, and project validity is checked even for a cached result.

Central HostManager now allows 20 seconds for API GET reads. Heartbeat/hello and mutating requests retain their previous short deadline; ambiguous writes are not replayed. The change is deliberately limited to reads, not a blanket 45-second timeout. This does not prove a production latency improvement until the Windows host receives the inventory optimization and measurements are repeated.

245 backend tests passed, including query coalescing, detached snapshots, forced fresh control checks, revoked context, failure freshness, no repeated transcript-root resolution, and separate read/heartbeat/mutation deadlines. No UI source changed in this follow-up; the previous 105 UI tests and build passed. The Windows test record was preserved, no model prompt was sent, and no running Windows conversation was stopped.
