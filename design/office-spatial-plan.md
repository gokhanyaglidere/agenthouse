# BiBilen — room placement requirements

User requirement, 2026-10-09: keep the approved cozy reception visual direction,
use the exact brand spelling BiBilen, and plan room positions as a real connected
office. Do not carry the arbitrary coordinates of layout revision 108 into the
new design. These requirements are implemented in live layout revision 114.

The map is 77 by 77 native tiles. A single enclosed building contains seventeen
rooms and thirty-six assigned workstations; two connected outdoor garden
zones sit below its south facade. The front entrance leads into reception,
with meeting beside its hallway. Product has platform and delivery/quality
rooms. SEO has three six-person groups: technical/data, content, search/growth.
The chief stays in the private northwest room. Sales, finance and accounting
use compact functional rooms with dedicated agent definitions. Their desks
already include chair art: transparent native seat anchors provide actual
seating and preserve the original furniture without doubled chairs.

## Placement corrections, revision 113

- Fitted sink/oven/coffee/fridge units mount directly on their north wall.
  Their sprite frames have no empty installation margins. Fridge elevation
  compensates for its height so the whole kitchen shares one floor baseline.
- Bookcases and archives use explicit north-wall anchors. Financial charts,
  ledger desks, proposal desks and editorial/search boards identify departments.
- All workstation chairs are ergonomic swivel chairs on the tile adjacent to
  their desk; rendered chairs move four pixels toward the tabletop to remove
  atlas whitespace. Dining chairs remain a different furniture family.
- Window columns are explicit per room and exclude wall panels; plaques sit
  above the wall instead of over presentation boards.
- Four different rugs remain in CEO, reception, rest and coffee sitting groups.
  Kitchen, game, studio, marketing and meeting floors are uncarpeted.
- Garden paths use joined running-bond brick axes between both exterior doors,
  terrace and pond promenade. Paths bypass tree trunks, with
  maple/pine/cherry trees, shrubs, raised flower beds, hedge borders and lamps.
- Tree canopy footprints may overlap; only explicit trunk offsets block walking.
- Automated placement checks reject overlapping physical furniture, footprints
  in walls, disconnected rooms, blocked resident seats and covered windows.

## Entry and circulation

- Put the main entrance on the front/south building boundary.
- Enter directly into reception. The counter must be immediately visible, with
  the waiting group beside the entry route, outside the through-path.
- Connect reception's interior door to one legible common hallway. Every work
  room opens to that hallway; no route traverses another team's room.
- Place the meeting room next to reception/the first hallway junction so a
  visitor reaches it without walking through work areas.

## Adjacencies and privacy

- Group product/engineering, SEO, content and marketing along the shared
  hallway. Put content near marketing; product and SEO form the quiet work wing.
- Put Gökhan's compact private office in the quiet inner wing with its door
  facing the hallway. Keep the chief in that office and exclude other agents.
- Group coffee, kitchen/dining, rest and games on the social side. Put games
  farthest from the quiet work wing, not next to the chief.
- Give the outdoor garden a deliberate exterior door from the social side.
  It is not an indoor green carpet between unrelated rooms.
- Bathroom, storage and winter garden remain removed unless the user asks
  for them again. Do not reintroduce them while filling vacant areas.

## Geometric acceptance rules

Size rooms from functional furniture groups and required circulation, then size
the building around them. Do not allocate large rectangles first and scatter
props. Every door must join walkable space on both sides. The chief's closed
door remains a real collision boundary. Keep one uninterrupted entry-to-hallway
route and clear chair approaches. Render surfaces, objects, shadows, occlusion
and collisions from the same geometry. Validate all routes after relocation.

The approved reception artwork is a visual reference. It is not a sprite atlas
or a fixed live backdrop. Adapt it to native pixel scale, retain the warm oak,
sage, cream and terracotta palette, and use distinct room-specific assets.

## Mobile acceptance

Room navigation fits and centers the selected room in the usable canvas. Keep
doors and furniture legible, avoid a huge empty bottom viewport, and verify the
real scene on a portrait phone after layout integration. Preview art alone does
not satisfy these checks.
