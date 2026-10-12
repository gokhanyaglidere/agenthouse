# Project-native capability discovery — local stage

Implemented: read-only project capability inventory, YAML metadata parsing with
bounded files/aliases, canonical directory boundaries, duplicate/invalid metadata
diagnostics, skill source labels and exact project-native agent skill references.
Revision includes file content hashes so instruction-only edits are detected.
Hooks/scripts are neither exported nor executed by discovery.

The roles endpoint supplies project-native names/descriptions/skills. Startup
uses these instead of another project's base roster metadata. A project-defined
chief launches via --agent chief; absent that definition, Gökhan represents the
main Claude session, not an auto-created definition file. Empty projects get no
invented specialist team. Existing optional starter templates remain unchecked.

Registration returns the discovered inventory. Team page shows project-agent and
native-project-skill counts, instruction filenames and diagnostics. Personal
skills and Cursor instructions are separately labeled; Cursor files are not
advertised as native Claude skills. Conversation controls discover skills on
mount while retaining the explicit draft insertion flow.

Future starts refresh the role allowlist, including additions/removals without a
server restart. Queued deleted-role tasks fail clearly rather than selecting a
different agent. Existing running processes and project definitions are preserved.
Project selection reloads the scoped page, preventing late requests from rebinding
another project's team.

Validation: 168 backend tests plus two new native-chief regression tests passed;
74 UI tests passed; TypeScript/Vite build passed; production audit found zero
known vulnerabilities. Isolated gateway tests prove A/B metadata isolation,
new-role detection without restart, registration summary and viewer restrictions.

Still planned: automatic in-place office refresh after definition edits (startup
and project selection already refresh), stable role-based character identity
across team reorder, filesystem watchers with bounded reconciliation, and the
Windows/WSL host connector. Running Claude configuration is not claimed to reload
just because the catalog refreshes. Windows device/Claude environment information
was requested; no Windows service or network grant is installed in this stage.

Official format references:
- https://code.claude.com/docs/en/sub-agents
- https://code.claude.com/docs/en/skills

## Local completion — live synchronization

The active owner panel reconciles capabilities every five seconds while visible,
and on focus/visibility return. One request is in flight; closed-page responses
and mismatched workspace identities cannot change the team. Errors preserve the
last verified roster with a visible warning, rather than clearing it.

Residents now use role-key identities and stable appearance seeds. Reordering or
inserting definitions does not transfer a character's state to a different agent.
Removed idle residents release seats and camera focus. Removed definitions with
real active sessions remain visible with new-work controls disabled; their actual
CLI process is not stopped. Native running-session configuration is still separate
from catalog freshness, and this distinction is displayed.

Only roster-owned workstation pairs are reconciled on membership changes.
Existing station positions and other decor are retained, new pairs check placement
occupancy, and no layout-save command or terminal command is sent by discovery.
Large teams may exceed physical workstation capacity; roles remain available.

The project registration flow now shows discovered counts, agents and diagnostics
before opening the project. Existing definitions need no starter template.
Conversation skill lists follow inventory changes without replacing typed drafts;
a removed skill clears only its selector. Removed-role form selections are shown
explicitly and cannot launch new work.

Validation: full backend suite 170/170 and UI suite 79/79 passed; TypeScript/Vite
build succeeded. Dedicated tests cover request coalescing, disposed/foreign
responses, outage recovery, identity/appearance stability, removed live roles and
workstation/decor preservation. Private gateway deployment uses the existing
LaunchAgent. Windows connection remains deliberately deferred by the owner;
current polling reconciles missed edits without relying on filesystem watchers.
