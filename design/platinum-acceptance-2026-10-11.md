# Agent House — reliability and interaction acceptance

Owner authorized the complete upgrade on 2026-10-11. Slack and finance connections remain explicitly deferred.

## Delivered in this pass

- Session and task terminals reconnect with bounded backoff after a transport failure. Normal session closure and permission rejection do not trigger retries. Input is never queued or replayed.
- Task terminal connections depend on stable task/session identity, rather than task object refreshes. Closing a panel disposes its connection and pending retries.
- Project/session-scoped drafts survive closing the panel, reloading the page and network failure within the same browser tab. Drafts expire after 24 hours and clear after explicit submission. They do not sync to another device.
- Full viewport conversation panel; compact reply controls leave room for terminal output and scrollable history. Mobile inputs use 16px text, and terminal shortcuts scroll horizontally.
- Account-wide unread badge, unread/request filters and exact session links. Request history is clearly distinguished from currently waiting work in Operations.
- Visible synchronization state separates current data from pending/stale/offline data. API waits are bounded; state/inventory polls coalesce. Catalog refreshes every five seconds while visible and immediately on focus.
- Private daily snapshots of selected state files, with 14 retained snapshots, SHA-256 validation and staged restoration into a new directory. Credential stores, push keys/subscriptions, terminal sockets and Claude transcript bodies are excluded. Snapshot files are private and never uploaded to GitHub.
- Every concurrent chief session stays inside the private CEO room; distinct session labels remain. Workstation ownership is retained when a requested move is refused.
- Standalone startup no longer guesses a project two parent directories above the app; it retains an existing registered default project or uses its own application directory on a fresh installation.
- Canvas names use readable minimum text size and bounded collision-aware label placement with connectors. Concurrent chief guests start away from the north-wall labels.
- Viewer capacity controls are disabled and save errors are displayed.

## Existing capabilities retained and checked

- Operations show real root sessions, delegated specialists, recorded communication, handoffs, file changes and test evidence. Historical participants never imply current activity.
- Project selection disposes previous sockets through navigation and loads that project's registered roles. Portfolio and notification devices span projects; task storage and work history remain scoped.
- Cozy original furniture, coherent room placement, dedicated CEO room, three SEO teams, indoor/outdoor boundaries and wall-mounted kitchen furniture. Placement/path tests cover overlap, accessible workstations and private CEO door.
- Distinct cozy character styles, shared appearance choices, day/night lighting, smooth camera, moving water/trees/doors and garden wildlife. Environmental motion honors reduced-motion settings. Rendering is capped at 60 Hz and stops drawing hidden views.
- Broker-owned sessions survive gateway restart. Operator/viewer checks remain enforced server-side; private Tailscale exposure is preserved.

## Evidence

- Backend suite: 131 passing tests. Frontend suite: 39 passing tests. TypeScript and production build pass.
- Live gateway restart preserved three existing root sessions.
- Existing panel-owned session: writable reply field verified; draft survives panel close/reopen; test text removed without submitting to Claude.
- At 390×844, conversation history has 513px of scrollable height; a real scroll moved scrollTop to 2146px.
- Live state backup shown in the account panel; separate-directory restore round-trip and corrupt/path-traversal rejection pass.

## Practical limits / follow-up

- Physical iPhone microphone, virtual-keyboard resize and push tap behavior still require verification on that device; browser viewport testing is not a physical-device test.
- Busy external CLI sessions retain their external terminal's control. Idle sessions can be transferred; this panel does not inject input into an arbitrary external terminal.
- Backups cover selected Agent House metadata and office state, not source repositories, full Claude transcripts or disaster recovery from losing this computer. Provider credentials must be reconnected separately. Active restoration intentionally is not exposed as a one-click live overwrite.
- Claude account usage queries rely on an endpoint without a public stability contract; failed/expired readings hide percentages.
- Cross-host aggregation is not implemented. Slack and financial feeds remain deferred.

## Portable backup follow-up

- Operators can download the latest metadata snapshot from Account → Record security → Download backup. Viewer requests are refused server-side.
- Portable JSON includes selected metadata, not credentials or full Claude transcripts. Treat the downloaded file as private; store it on a second device or personal storage.
- `node restore-backup.mjs ARCHIVE.json NEW_DIRECTORY` verifies hashes, size limits, JSON, duplicate paths and the file whitelist before creating a private staging copy. Existing destinations are refused. No live restore or upload to third-party storage happens automatically.
- Physical iPhone checks and additional host setup require the owner's devices. External busy CLI input remains controlled by its actual terminal. Cross-host aggregation is a separate implementation, requiring a registered second host and identity/connection model; it is not enabled by this update.
