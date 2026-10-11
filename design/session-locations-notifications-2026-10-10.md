# Session locations and notification center — 2026-10-10

## Requested outcome

Show who participates in a selected Claude session, what each participant is
doing and where its real office character is. Make sent notifications readable,
configurable, persistent and linked to the relevant task.

## Findings and implementation

The inspector previously focused by generic role, which could select a resident
or another session's character. Conversation details had no participant list.
The bell immediately requested push permission; messages exposed raw role keys
and always linked to the general task board.

- Session details now show participant, recorded status, last tool and room.
  Work inspector cards also show locations. Exact session/tool identity determines
  focus. Residents, removed characters and historical sessions have no live link.
  Overlapping identities are resolved deterministically, accounting for native
  subagent ids counting downward. Clicks re-resolve session/tool identity, rejecting stale bindings after CLI clear.
  Focused location remains correct even outside the eight-group overview limit.
- Focusing shows the real character and a contextual card with room, last tool
  and return links. Tool overlays cannot cover conversation/notification modals.
- Bell opens history and preferences. Device enablement requires a user click;
  existing device subscriptions are preserved. Three event preferences default
  on: input required, failure, completion. Other operations do not send alerts.
- Exact event ids prevent duplicate sends without suppressing a subsequent real
  permission request. Task snapshots preserve their status across asynchronous
  notification callbacks. Records/read state/preferences survive restart privately.
- Completed notifications open the exact archived task from both panel and push
  links. Other alerts open its task inspector. Off-origin push destinations are
  rejected. Notification polling cannot overwrite a newer user action response.
- Device enablement checks server registration too. VAPID renewal prompts
  re-enablement and stale browser key subscriptions are renewed on user action.
  Expired endpoints are removed without discarding concurrently added devices.
  Delivery failures are exposed without endpoint/key disclosure.

## Real acceptance

- Task `7d6826b3-ca45-45fa-b4c8-0678a024411c`, session
  `49e1b3cb-7a49-4520-b6d3-547b076342bf`: chief, senior-qa and gap-reviewer.
  Three participants, two explicit specialist results, task completed. Specialists
  read code; one required permission for an additional read-only shell inspection.
  That individual permission was answered in the browser terminal.
- While gap-reviewer was live, its inspector showed Ürün · Teslim & kalite.
  Ofiste göster moved to that exact native character carrying İş 49E1. Verified
  visually at 390×844; see `session-agent-location-2026-10-10.jpg`.
- Conversation detail displayed all three participants, chief room and worker
  states. After stopping the test-owned background process, the history retained
  all participants/results but no live location links.
- Waiting and completion notices appeared in the notification center. Clicking
  completion opened the correct archived task and persisted its read state.
  Opening the push payload's exact deep link also loaded that task inspector.
- Real review identified the time-window suppression bug, browser-only device
  enablement, completed navigation mismatch and notification refresh race; fixed.
  The QA-only read could not see surrounding one-second render ticks/tests:
  those alleged gaps were checked against the actual parent code and live UI.
- Existing three user-owned external sessions were preserved. Test-only Claude
  background session stopped with `claude stop 49e1b3cb`; no owned test PTY left.

## Validation and limits

72 backend tests and 17 UI tests pass; production build passes. Cases include
exact identities, historical/despawned exclusion, indoor/corridor/outdoor rooms,
newer positive/negative ids, separate permission episodes, persistence, snapshots,
key renewal, preference filtering and concurrent subscription expiry. Compiled
font path and bundle-size warnings are pre-existing; live fonts render normally.

Device OS permission was not granted or revoked by the agent. One pre-existing
server subscription remains. Phone lock-screen display was not independently
verified; browser acceptance verifies panel history and navigation, and injected
unit deliveries verify push filtering/failure handling. Notification settings
were tested with isolated temporary storage, leaving live user defaults intact.

Screenshots: `notifications-mobile-2026-10-10.jpg` (initial mobile layout),
`notifications-desktop-final-2026-10-10.jpg` (real retained notices), and
`session-agent-location-2026-10-10.jpg` (exact live specialist focus).

## Restart recovery found in final acceptance

Native Pixel Agents discarded its office registry after gateway restart. Existing
interactive Claude processes stayed alive, but their character/room links remained
absent until a fresh hook event. Recovery now uses scoped CLI inventory, real
process liveness and an existing transcript to adopt those sessions through the
native lifecycle adapter. It sends no invented prompt/tool activity and does not
start or resume Claude. Unavailable inventory cannot remove existing occupants.
The internal reconciliation message is blocked on the browser gateway.

After restart, native existingAgents returned three actual external UUIDs. The
MacMini-Ana session card showed a real Toplantı odası location and an Ofiste göster
button. Old child work without a live hook/character now explicitly says Son
kayıtta rather than claiming live activity. The hybrid session count counts real
root UUIDs, not the number of distinct role bindings. Root recovery does not
fabricate old child characters whose current liveness cannot be established.

The conversation summary shows native-connected participants first. Historical
or unverified old children stay under an expandable count, retaining the full
trace without filling the live conversation with dozens of old agent instances.
Past sessions initially show up to six participants with the rest expandable.

## iPhone notification appearance follow-up

The user's lock-screen screenshot confirms actual iPhone delivery of the latest permission notification. Older alerts still show the former `chief` suffix; already delivered notifications cannot be rewritten by changing server payloads.

Removed the repeated `BiBilen ·` prefix from push titles because the installed application identity already appears separately. Added opaque PNG versions of the existing bi SVG at 180, 192 and 512 pixels, an Apple touch icon and explicit Apple application title. The manifest and service worker now use PNG icons. Existing subscriptions and notification history are preserved. iOS controls the lock-screen layout and installed app identity; the appearance of an already installed icon still needs verification on the phone.

Validation: all seven PushManager tests passed; production UI build and deployed icon/manifest requests checked. No new Claude task or artificial push was sent for this appearance change.
