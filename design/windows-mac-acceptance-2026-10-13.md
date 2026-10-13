# Windows host: Mac integration acceptance

Integrated origin/windows-host-connector (283d5a09f8f802cf7568853be943b539381586a7) into the current Mac branch without losing clientless observer, navigation, scroll or quota changes. Merge conflicts were resolved in package.json and gateway lifecycle handling.

## Proven live from Mac

- Signed hello verified `https://gokhan-win-wsl.taila04bd7.ts.net`, online, Linux/WSL, sandbox prerequisites ready.
- Only One-Line (`/mnt/d/One-Line`) appears in the remote allowlisted inventory.
- Host registered in the existing gateway. Two existing local projects preserved; project list now contains three projects. Pairing credential persisted in host-secrets.json with0600; verified matching transferred credential, then removed Downloads/pairing.token. No secret was printed or committed.
- Remote state, capabilities, sessions, central projects and catalog API reads returned200. State context carries the central qualified workspace id. Capabilities:5 project agents and60 skills; no remote sessions yet.
- Browser can select `One-Line · Windows WSL`, open its sessions screen and return to the local BiBilen project. No remote model task/session was started.

## Integration fixes and tests

- Global projects/portfolio/catalog remain central across a remote selection; catalogs include remote sessions and route remote transcript reads correctly.
- Remote JSON workspace/project identities are qualified, preventing frontend wrong-project rejection.
- Scoped signed requests cannot enumerate host account-wide projects, backups, sharing or discovery catalogs. Changes to the host guard require deploying this merged version to Windows too.
- Canonical allowed-root comparison resolves macOS `/var` vs `/private/var` aliases without admitting symlink escapes.
- Remote terminal websocket control paths retain owner Origin/protocol validation. No keystrokes replayed after reconnect.
- Missing visual-layout messages no longer block the entire panel behind Loading. Navigation and project records render independently; office placeholder reports missing layout. Canvas, scene reconciliation, resident creation and layout editing remain gated until real layout is ready.
- UI labels remote host name and distinguishes local concurrency slots from per-host limits.

214 backend tests passed (17 host tests, including two added regressions);105 UI logic tests passed. TypeScript/Vite build passed. Physical Windows/user login and actual model execution are not covered by these numbers.

## Not completed / next Windows work

A real signed `/ws?workspaceId=...` connection opens from Mac, both directly to WSL and through the central bridge, but `webviewReady` yields no `layoutLoaded` message before12 seconds. WSL's native office engine/feed needs investigation on that machine; this is not a verified working remote office. UI explicitly reports this instead of showing a false office.

Claude interactive authentication in the WSL ahost account is still required before real session execution. No login credentials or model prompt were sent from Mac.

Deploy the merged main to WSL (including npm dependencies), then investigate native pixel-office process/readiness, websocket message handling and assets there. Recheck layoutLoaded from Mac and conduct one owner-approved controlled Claude session after login. Existing Windows-native sessions remain outside takeover support. Cross-host push delivery, remote observer sharing and shared subscription admission enforcement remain tracked follow-ups.

## Follow-up: Windows office repaired and verified from Mac

After the Windows operator repaired the native office installation, a fresh Mac-origin signed bridge test received `layoutLoaded` successfully. The host remains online with sandbox prerequisites ready and the allowlist still contains only One-Line. The private browser selected `One-Line · Windows WSL` and rendered the office and garden; the missing-layout placeholder is gone. No task, session or login command was submitted. Local screenshot: design/verification/windows-office-confirmed-2026-10-13.png.

This supersedes the missing-layout issue above. WSL interactive Claude authentication and an owner-approved model execution test are still unverified. Other documented cross-host limits remain.

## Follow-up: office-engine fix and first execution attempt

Merged windows-office-engine-fix51c76ddd8f34ccca80b23145be7f17961c248dc4. Its deployment helper originally reset main with checkout-B; changed it to reject dirty worktrees and use fast-forward-only update of the current branch. Bash syntax and gateway syntax checked;215 backend tests passed. No UI source changed in this follow-up; previously105 UI tests passed.

Pre-execution Mac verification: signed hello online, sandboxReady true, officeEngine patched, layoutLoaded received through the central websocket bridge.

The panel retained an old blocked execution check despite the reported WSL login. One explicit UI connection probe was run (small paid Claude response, no tools/persistence); it returned ready. Then exactly one UI task was submitted: “Mac–Windows bağlantı testi · dosya sayımı”, restricted to `find . -maxdepth 1 -type f | wc -l`, no file content reads/writes, networking, git, package installs or subagents. Task55eb0d24-e6dc-401f-a16c-b1254fa6291a failed before getting a session id, with workspace-not-trusted for `/mnt/d/One-Line`. No count result was produced and no retry was submitted. Failure is visible in the remote project's History screen; screenshot windows-trust-block-2026-10-13.png. The owner must accept Claude's interactive project-trust prompt as ahost before a new execution test. Account authentication is now independently confirmed by the successful connection probe; project trust is the remaining execution prerequisite.
