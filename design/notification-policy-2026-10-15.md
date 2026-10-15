# Smart notification policy

## Observed problem

The central live store contained 150 records, 149 unread: 126 conversation completions and 24 waiting events. One conversation alone produced 74 completion records. Normal end-of-turn replies were delivered like task completion, and the worker forced renotify on every replacement. Raw CLI waiting state also generated requests without explicit approval/question evidence.

## Changes applied centrally

- Routine conversation replies are panel-only and read by default. A separate optional sessionReplies preference can enable them; actual task completion, failures, alarms and actionable waiting keep their existing preferences.
- Per-project/session/kind updates form one card with a count. Stable session tags consolidate guard/native sources. Pending attention bursts have a 60-second delivery window; resolving or reading a prior request permits a genuinely new episode immediately. Repeated unresolved failures have a five-minute window.
- Exact event deduplication persists independently of compacted cards across restart (bounded 1000 identities). Delivery timestamps survive suppressed updates.
- Explicit permission and AskUserQuestion signals notify immediately; inferred blocked state must persist ten seconds. Ordinary CLI waiting is not evidence of a question. Completed assistant text and later turn-duration metadata share one completion identity.
- Resolved waiting records are read and excluded from the waiting filter. Legacy routine/waiting records are compacted and retired from unread counts, with a 0600 backup retained at ~/.pixel-agents/notification-history-before-smart-v2.json.
- Worker replacement no longer always renotifies. Existing notification workers check for an update once on app startup; no new permission/subscription prompt is triggered automatically.
- Account-wide notification reads/settings stay on the central gateway even with a remote workspace selected; account_route_not_allowed from forwarding scope=all was reproduced and fixed. Non-owner requests remain denied. Guard approval notifications link to their conversation rather than a nonexistent task id.

## Validation and rollout

Production build and 109 UI tests passed. 28 targeted backend/integration tests passed, including remote-workspace account routing, observer denial, default reply suppression, grouping, later genuine permissions, backup migration and turn evidence. A full sequential run had 256 passes and one existing host reconnect timing failure (502 versus 200); the host connector suite subsequently passed all 19 cases in isolation. No new real push notification was sent as a test.

Deployed to the Mac gateway using its existing LaunchAgent. The owned idle session 5181d3da-7321-4805-9be9-f5f733d748fc remained open and recoverable. Live central state, including when requested from the One-Line context, showed 9 cards and zero unread; sessionReplies=false while waiting/failed/task-completed remained enabled. Card count may grow as distinct sessions are discovered. Browser confirmation screenshot: design/verification/smart-notifications-2026-10-15.png.

Windows-host local PushManager source is updated in the repository but was not administratively deployed here. Its scoped API reported zero registered push devices, so current phone delivery uses the deployed central manager. Windows-local history still has old ungrouped records until that service is updated; this follow-up remains in TODO. A real physical-phone delivery check is still deferred.
