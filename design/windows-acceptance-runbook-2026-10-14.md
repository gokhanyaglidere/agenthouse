# Windows acceptance: isolated tools, subagent and native idle handoff

## Current verified state

Mac -> Windows WSL conversation db89c21f already passed a real text-only request, persisted history and writable reconnect. Original One-Line native sessions were preserved. It is conversation-only; it must not be used to run deployment commands or bypass its no-tools restriction. Full tools, live child state and real native idle handoff still require the Windows steps below. This document is a runbook, not a claim that those tests passed.

## Host-local preparation (Windows operator, WSL ahost account)

1. Preserve local changes, update Agent House main and confirm host identity/credential are unchanged. No reset, clean, credential rotation or native-session termination.
2. Run `bash deploy/claude-user-install.sh` in the host checkout. It pins the currently installed Claude version, uses Anthropic's documented native user installer, verifies the user-owned launcher and read-only agents command, and prepares a late systemd drop-in. No root/global npm permission changes, auto-update disabling, trust forgery, auth-file edits or automatic service restart. Inspect unexpected installer prompts rather than accepting legal/auth changes automatically. Reference: https://code.claude.com/docs/en/setup .
3. Run `node host-acceptance.mjs prepare /mnt/d/One-Line` and preserve its JSON output (workspace id, paths, nonce, exact task instruction). It requires an already Git-ignored path within the existing host allowlist. It creates a standalone test Git repository inside node_modules/.cache; it does not edit parent code, parent git settings or the host allowlist. If the ignore/path check fails, stop and report; do not weaken it. Registration writes only normal project registry metadata. The fixture is deliberately left for evidence, not silently deleted.
4. Safely run `bash deploy/host-deploy.sh` after checking no owned WSL execution task will be interrupted. Native Windows conversations are not stopped by deployment; broker-owned conversations survive reconnect. Verify the actual running service uses ~/.local/bin/claude and the prepared native version. Only a completed disposable test terminal may be explicitly stopped to test a new CLI process; preserve db89c21f history. Existing brokers retain their original CLI until restarted. Verify the old npm-prefix updater error is absent from a new terminal; do not claim that merely installing the launcher fixes an old running process.
5. Refresh central host discovery so the new workspace appears. Repeat isolated GET timings for sessions/work overview; keep a websocket connected when measuring terminal behavior. Mac read deadlines already distinguish slow reads from heartbeat/mutation deadlines. Report durations; do not report a disconnected-client timeout as a host outage.

## Panel tool + subagent test

Select the new acceptance project, not One-Line. New cwd/Git identity separates it from busy parent sessions and prevents admission from degrading it to conversation-only. Verify conversationOnly is false. Trust/login must be answered genuinely by the owner if Claude asks; never write a fake trust record.

Start a new disposable panel session with manual permissions. Use exactly the task instruction returned by prepare. Only proof.txt may be written, and acceptance-reader has Read-only tools over six nonce-bearing fixture files. No Bash, network, package installation, external files, parent project edits or credentials. For any permission request, verify the exact tool/path/content before one-time approval. Record the prompt and decision; do not grant permanent allow rules.

Keep a scoped office websocket observing events before starting the child. Capture the child identity, parent/tool-use link, start/tool/done transitions, and office presence. Six sequential reads give the watcher an opportunity to observe active work; if no live transition was captured, mark live presence unverified even if the final trace contains the child.

Run `node host-acceptance.mjs verify <root-from-prepare>` locally. writeProof must be true. Verify persisted transcript, child result CHILD_OK:<nonce>, zero unrelated tool calls, and writable reconnect to the same conversation. When complete, stop only this disposable panel terminal to release its workspace execution slot.

## Native Windows idle handoff

In the same test directory (windowsRoot from prepare), start a separate native Windows Claude conversation and request only NATIVE_IDLE_OK with no tools; leave it idle. Never use a business session for the stop test. Record its UUID and native process identity. If its first trust prompt requires owner approval, report it; don't silently accept new project permissions.

The host now discovers Windows transcript folders created after workspace startup, without needing another gateway restart. Select that exact disposable idle conversation from Mac and request takeover. Verify: only the chosen idle native process exits; other One-Line native sessions remain untouched; original Windows transcript is unchanged; same UUID continues in the WSL PTY; HANDOFF_OK text-only reply, saved history and reconnect all succeed. Any identity mismatch or failed source-resume check must remain a failure: don't broaden process matching, bypass sandboxing or weaken guards to force a pass.

## Operator report

Return actual commit and user CLI path/version; fixture workspace id/root; before/after session state and latency; exact passed/failed tests and screenshot/log references; any outstanding owner trust/permission action. Never print pairing secrets, credential JSON, auth tokens or complete environment dumps. If blocked, retain fixture/evidence and existing business sessions.

## Preparation verification (Mac, 2026-10-14)

249 backend tests and 105 UI tests passed. Installer Bash syntax and JavaScript syntax checks passed; git diff whitespace check passed. The installer has not been executed on Windows. No Windows fixture, model task, process stop or host deployment was performed during this preparation. Existing Mac-to-Windows text/history/reconnect evidence remains valid.

Host-local execution is still required: the Mac has no administrative deployment channel, and a read-only SSH connection attempt to the Windows WSL host was refused on port 22. Do not work around this by executing administration through a model session or adding an unauthenticated endpoint. A Windows operator must follow this runbook; live tool, child-presence, native handoff and effective user-CLI installation results remain pending until actual evidence is collected.

## Actual panel test after owner approval (2026-10-14)

The owner approved trust and the narrow test scope. In project b13c58e5-5882-49d4-8548-daa475dc3dae, session c50bf2cf-58f4-417b-abd1-2ad9eb663303, the panel answered the genuine trust prompt for agent-house-acceptance-HWheTe. A single Write(proof.txt) approval used Yes once, never acceptEdits. The transcript records the exact nonce-bearing content and successful Write result. Raw host-local host-acceptance verify is still pending.

Custom acceptance-reader failed with Agent type not found while the roles endpoint correctly advertised it. A separate built-in general-purpose child read exactly six input files and returned CHILD_OK:655af784-6c70-4b86-920e-cc791f04b40c. work/overview records six Read events and child completion. A scoped office websocket captured subagentToolStart for input-4, input-5 and input-6, followed by subagentClear and agentToolDone. The observer joined after child creation, so initial child-start was not captured. The same session reconnected writable and full persisted history displayed both attempts. No native Windows business session was stopped or taken over.

Root cause: restricted launch excludes automatic project configuration. Official reference: https://code.claude.com/docs/en/cli-reference . Fix now explicitly supplies scanned, scoped agent prompt/description/model/tools through --agents while keeping --restricted, hooks and sandbox intact. Tools are intersected with the parent's configured tool set. Definition hooks, permissionMode, MCP and filesystem overrides are never transferred; conversation-only sessions receive no custom agents. This is source-tested (251 backend tests), not yet deployed or retested on Windows. It does not claim full skill/customization parity.

Windows operator next: safely deploy latest main, stop/reopen only this completed disposable test terminal to pick up the launch definitions, rerun acceptance-reader without rewriting proof.txt, run host-acceptance verify, then perform the separate disposable native-idle handoff test. Do not simply restart an old broker and assume it acquired new arguments. Owner trust already approved for this fixture; do not ask again unless scope changes. Keep other jobs untouched.
