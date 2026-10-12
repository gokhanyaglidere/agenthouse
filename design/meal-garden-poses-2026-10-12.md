# Cue grip, dining and garden poses

Corrected billiards to approach the west side of the table, facing right. The cue starts at the right hand and extends horizontally into the table rather than vertically through the torso/head. Ball motion originates near that stroke direction. A render-command test checks the cue stays outside the torso.

Dining uses the actual unassigned north-side kitchen chairs and the current dining table. Social pathfinding temporarily permits only the selected unassigned chair destination; it never reassigns the agent's work seat. Seated body/leg poses, a table-level anchor, plates and a raised spoon replace the standing apple snack. Starting a real task still interrupts the cosmetic visit.

Outdoor visits now derive from placed garden benches and flower beds. Bench visitors sit centered and turn book pages. Plant visitors face the bed and hold a watering can with animated drops. Invalid/blocked approach positions are omitted. The old arbitrary garden/binocular and standing-snack targets no longer drive office idle selection. Reading armchairs use the same seated treatment. Interaction slots are cached per layout placement signature and refresh when furniture changes.

Preview now includes meals, bench reading and watering, using the same render paths as the office. Missing preview fixtures fail explicitly rather than showing unrelated conversation characters. Garden previews choose an actually reachable flower bed. All objects are cosmetic; watering does not modify plants or trigger real Claude actions.

Validation: 57 UI tests passed, production build passed, browser preview inspected cue direction and meal/table alignment plus centered bench pose and watering beside a real flower bed. Physical device verification remains deferred.
