# BiBilen living garden and office interactions

## Visual work

BiBilen uses a new Japanese garden atlas: mature sakura, red Japanese maple, potted bonsai and bamboo. Large sakura crowns are the focal points on the west and south edges. Source tree/planter footprints and root anchors remain unchanged. The atlas is loaded only when Japanese garden art is drawn and is reused for all specimens. Approximate added asset size: 2.2 MiB. No inference requests are made by animation.

Tree crowns use eight gently displaced horizontal bands, keeping their roots still. A bounded number of pink petals drifts from sakura canopies. Decorative koi stay clipped within the physical pond, butterflies flutter around planting zones, and existing pets/birds remain. Offscreen trees are skipped; reduced-motion and simple-motion settings freeze the new animations.

Generated with the built-in imagegen tool. Final asset: webview-ui/src/bibilen/assets/japanese-garden-atlas.png. Prompt: production transparent 2×2 pixel-art atlas, majestic mature Japanese sakura, red maple, shallow ceramic bonsai on a stone pedestal and bamboo; cozy top-down three-quarter Stardew-style silhouettes, warm natural palette, separate objects, no text or ground. Frames are sampled directly without removing generated alpha or editing the bitmap.

## Office behavior

Existing monitor glass shows a small animated display only while a visible active agent is seated at its matching desk. Merely having a resident does not imply real Claude activity. The receptionist is a permanent decorative scene character behind the BiBilen counter, labelled “Karşılama · dekoratif”; it is excluded from real agent/session counts, hit testing, saved seats, tasks and role bindings. It faces nearby visitors.

Explicit EnterPlanMode / ExitPlanMode tool signals retain mode across subsequent Read tools; work trace tool events can reconstruct an observed mode on reload. Live Plan children can occupy meeting chairs independently. Six distinct meeting seats are allocated without stealing occupied seats, unrelated children remain at their own workstations, waiting planners stay seated, and mode exit returns available home seats. Original home assignments, not temporary meeting chairs, are persisted. The private CEO owner transitions to the meeting seat without unlocking the CEO office for others. No Claude execution mode, privileges or task status is changed by this visualization.

Limitation: manual CLI mode switches which emit no supported telemetry cannot be inferred from a title. This work does not claim that such switches are observable. No new real Claude job was launched for verification. The initial office reconnecting indicator cleared before the final screenshot. A real live planning transition and active monitor event were not induced during this design review. Visual garden/reception review and isolated state/seat/telemetry tests were performed.

Validation: TypeScript and production build; UI regression suite (118 tests), including garden accessibility, plan entry/exit, stale transcript rejection, meeting capacity, Plan child isolation, persisted home seats, decorative receptionist isolation and active-only screen updates. Screenshot: design/verification/bibilen-japanese-garden-2026-10-15.png.
