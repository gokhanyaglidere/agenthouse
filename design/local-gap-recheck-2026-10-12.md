# Local project-team gap recheck

Scope: source review of the current local capability discovery, live roster,
workstation reconciliation, session skill staging, execution checks and existing
full-system regression suite. This is not a Windows/physical-device or independent
penetration test. Original eight system findings remain addressed.

Additional reproduced issues and implemented fixes:

1. Duplicate native agent identifiers previously selected the first valid file.
   Conflicting identifiers now have no executable project role and a diagnostic.
   Ambiguous skill references similarly remain unresolved rather than arbitrarily
   choosing one file. Manual-only skills are shown as not preloadable.
2. A delayed skill read held an old draft callback; text typed while waiting could
   be overwritten. Staging now reads the latest callback and checks selection,
   inventory generation and component lifetime before touching a draft.
3. Desk-only or chair-only workstation pairs were skipped. Missing halves are
   reconstructed relative to the retained item without moving it. Full catalog
   footprint bounds and furniture occupancy are checked. A missing physical
   workstation is disclosed rather than implying every role has a desk.
4. A malformed successful inventory response could enter reconciliation. The UI
   now validates required structures, scope and duplicate identifiers before
   publishing, preserving the last verified team on invalid/foreign responses.
5. Catalog limits silently omitted entries after 200. The boundary is now disclosed.
   Project instruction content edits also affect the inventory revision.
6. The parser rejected header-free skills and synthesized names for agent files
   missing the required native name. Skills accept plain content, while agent
   files without names are diagnosed. Native-safe identifiers are retained without
   truncation. Skill frontmatter handling was checked against primary docs.

Validation: 176 backend tests and 85 UI tests passed (261 total), including delayed
response/draft races, disposed-session responses, duplicate identities, missing
names, plain skills, disabled preload, bounded catalogs, instruction revisions,
missing furniture halves and real furniture footprint bounds. TypeScript/Vite
build passed. Production dependency audit reported zero known vulnerabilities.
The existing large animation bundle warning is unrelated and remains recorded.

No unresolved reproduced defect remains in this reviewed local scope. This does
not guarantee absence of all defects. Explicitly deferred: Windows/WSL host
connection, real coworker onboarding/network grants, physical phone/tablet tests,
Slack/finance integrations and previously paused glass-wall/art changes. External
CLI concurrency and provider configuration reload limits remain as documented.

Primary references:
- https://code.claude.com/docs/en/sub-agents
- https://code.claude.com/docs/en/skills
