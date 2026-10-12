# Session page cleanup

Problem observed in live panel: repeated scope controls, default rendering of 49 sessions, equally prominent secondary actions, and expanded conversation controls consuming almost the entire terminal height.

Changes:
- Open sessions are the initial directory view. History and all sessions remain accessible in a single status control.
- Removed the duplicated local/all-project control above the catalog. Workspace/project filtering remains in Filters; the global project selector still controls new work.
- One search row, compact refresh action and one primary New conversation action.
- History lists render 10 rows initially and extend by 10. All records stay searchable and sortable before pagination.
- Compact cards use short dates and a desktop/tablet horizontal arrangement; narrow widths stack the actions.
- Detail views have a working return to the catalog. Team/location details and secondary operations are collapsed.
- Conversation settings open over the terminal rather than consuming its height. Added an explicit close action. Terminal keys are collapsed by default.
- New conversation connection diagnostics are collapsed unless blocked.

Verification: 48 UI tests passed, TypeScript and production build passed. Live browser confirmed 3 open sessions on initial load, 10 history rows then 20 after More, returning to open sessions, closing the settings overlay and returning from a conversation to the catalog. No messages were submitted, session settings changed, or active jobs stopped. Physical device tests remain deferred.

Screenshots: local ignored artifacts in design/verification/sessions-clean-2026-10-12.png and session-console-clean-2026-10-12.png.
