# One-Line reference courtyard

2026-10-14. The owner supplied a tropical plaza courtyard reference: pale large-format paving, raised light-stone planters, dense bamboo/broadleaf vegetation, rocks, timber benches and a long rectangular reflecting pool. This update replaces only One-Line's prior outdoor visual layout; the earlier modern-interior note's statement that the garden is unchanged is now superseded.

Implementation: one connected limestone court with two real entrances aligned to existing facade doors, seven raised planting islands, a 22-by-4-tile pool, layered deterministic pixel foliage and restrained animated water reflections. Room navigation provides a single One-Line-only Bahçe · Avlu focus. Existing indoor placement/seat geometry and all other projects are preserved.

The courtyard projection is applied to incoming layout data and generated project layouts, without overwriting Windows layout files. It updates pathfinding tiles together with scenery, removes old outdoor furniture, and supplies two benches and two reachable plant-care stations. Pool/planter cells are blocked. Cosmetic wildlife remains separate from actual Claude activity. No model tasks, Windows service restarts or business-session changes were needed.

Checks: production TypeScript/Vite build passed. 109 UI tests passed, including immutable project isolation, repeatable courtyard projection, unchanged indoor tiles/furniture, blocked water/planting areas, and flood-fill reachability from both exits to both benches and both watering stations. Browser verified live One-Line courtyard. Local screenshot: design/verification/one-line-plaza-courtyard.png.

Visuals are canvas-native pixel artwork rather than a flat background photo. Physical mobile/touch acceptance remains in the existing TODO; this visual pass does not claim that deferred acceptance is complete.

## Reference fidelity correction — botanical v2

The owner correctly identified repetitive geometric foliage and overly simple construction in the first courtyard pass. The revision uses a generated transparent botanical atlas guided by the supplied reference: irregular bamboo clusters, broad tropical leaves, ferns and embedded natural boulders. The unmodified source PNG is stored in the repository (approximately 2.2 MB); individual silhouettes are sampled via explicit source rectangles at render time. Alpha is preserved and the scene cache invalidates once the atlas has loaded. The first procedural foliage remains only as a load-failure fallback.

Structures now have deeper light-stone coping/front faces, visible joints and restrained grounding shadows. Side planting continues into the north beds to form L-shaped boundaries; stone-plinth timber benches sit against those beds. The pool is now 31 by 4 tiles and shifted right, with a separate central south planting island and a low south-west bed, following the reference composition more closely. The two interactive plant-care targets moved with their beds; their old trough sprites are hidden only in One-Line because the new scenery renders the same physical bed. Collision and interaction identities remain intact.

The generated artwork was inspected, then checked inside the actual office renderer. Production build and 109 UI tests passed after the geometry changes, including both entrances and all four outdoor interaction routes. Screenshot: design/verification/one-line-plaza-courtyard-v2.png. The result follows the reference materials and planting style; it is not a pixel-for-pixel reproduction of the reference's different site proportions.
