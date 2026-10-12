# Furniture-aware idle interactions

Replaces the generic front-facing handheld game animation with actual furniture-bound interactions. Arcade and pool approach slots derive from the current placed cabinet/table coordinates. They face up toward the object, with a small visual offset placing hands near the controls. Removed/moved furniture cancels outdated activity targets. Cafe/kitchen coffee machines also provide a short preparation phase, followed by drinking.

Arcade screen animates a tiny paddle game while the visitor presses the cabinet controls. Pool activity shows the character's cue stroke and rolling balls on the table. These are decorative ambient animations, not interactive game physics or a Claude task.

Idle visitors within three tiles can pair for a 5–9 second decorative conversation. Both face each other, gesture and alternate speech bubbles. Active work, departure, expiry or a missing partner cancels the pairing. Machine use takes priority over conversations. The label explicitly marks conversation as visual; no messages, real agent cooperation records or task handoffs are invented.

The standalone activity-preview.html uses the production renderer, sprites and placed furniture to make each behavior reviewable. It clearly labels staged characters as examples and makes no backend calls. Office idle selection prefers a free social station; saturated locations still fall back to roaming rather than shared standing spots.

Validation: 55 UI tests pass, production build passes. Furniture-aware tests initialize the installed catalog, validate usable approach slots and relocation/removal, orientation, pair preemption, and animated cabinet drawing. A resident test now checks interruption when a natural visit occurs rather than assuming a random visit exists at the last simulation frame. Browser verification shows the cabinet-facing player, pool table/cue, coffee preparation and facing chat partners.
