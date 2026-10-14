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
