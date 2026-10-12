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
