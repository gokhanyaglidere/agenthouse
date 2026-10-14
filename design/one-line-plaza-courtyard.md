# One-Line reference courtyard

2026-10-14. The owner supplied a tropical plaza courtyard reference: pale large-format paving, raised light-stone planters, dense bamboo/broadleaf vegetation, rocks, timber benches and a long rectangular reflecting pool. This update replaces only One-Line's prior outdoor visual layout; the earlier modern-interior note's statement that the garden is unchanged is now superseded.

Implementation: one connected limestone court with two real entrances aligned to existing facade doors, seven raised planting islands, a 22-by-4-tile pool, layered deterministic pixel foliage and restrained animated water reflections. Room navigation provides a single One-Line-only Bahçe · Avlu focus. Existing indoor placement/seat geometry and all other projects are preserved.

The courtyard projection is applied to incoming layout data and generated project layouts, without overwriting Windows layout files. It updates pathfinding tiles together with scenery, removes old outdoor furniture, and supplies two benches and two reachable plant-care stations. Pool/planter cells are blocked. Cosmetic wildlife remains separate from actual Claude activity. No model tasks, Windows service restarts or business-session changes were needed.

Checks: production TypeScript/Vite build passed. 109 UI tests passed, including immutable project isolation, repeatable courtyard projection, unchanged indoor tiles/furniture, blocked water/planting areas, and flood-fill reachability from both exits to both benches and both watering stations. Browser verified live One-Line courtyard. Local screenshot: design/verification/one-line-plaza-courtyard.png.

Visuals are canvas-native pixel artwork rather than a flat background photo. Physical mobile/touch acceptance remains in the existing TODO; this visual pass does not claim that deferred acceptance is complete.
