# BiBilen reception — design sample v1

Generated with the built-in imagegen tool on 2026-10-09. This is a design
reference, not an engine-ready sprite sheet or a replacement for live furniture.
Current preview asset: `../webview-ui/public/bibilen/reception-concept-v2.png`.

## Direction

Compact cozy RPG reception: warm oak, cream plaster, sage paneling, moss seating,
terracotta woven rug, brass fittings. A dedicated counter and a cohesive waiting
group frame one open path between the entrance and the office doorway. Original
artwork inspired by the cozy feeling of farming games; no copied game assets.

## Generation brief

Square orthographic RPG interior, no isometric diagonal walls, no people or UI.
Custom wooden reception counter at upper left with monitor, bell, notebook and
flowers, chair behind it. Back wall: exact text “BiBilen”, noticeboard, cabinet.
Right waiting group: moss two-seat sofa, armchair, round coffee table, magazine
and mugs, terracotta rug. Two doorways, coat rack, curtained window, varied plants.
Furniture faces logically, objects rest on surfaces, circulation remains open,
no oversized empty hall. Hard pixel-art edges, consistent scale, warm daylight
and contact shadows.

## Before implementation

The concept has more shading detail than the current tiny character sprites.
Translate it into one consistent sprite scale and reduce the palette rather than
using the whole image as a fixed backdrop. Register actual furniture bounds,
depth ordering and collisions. Do not hide animated agents behind a static image.
Validate the actual room on mobile after the assets and geometry are integrated.

## Implemented

Live revision 111 uses independent sprites derived from two new furniture
atlases in `design/assets` plus a separate pond. Thirty-three sprites have native footprint metadata;
the reception, other rooms and corridors are rebuilt around functional groups.
The concept image remains a reference, not a scene-wide live backdrop. The
scaled game sprites simplify the reference to match native characters.

## Approved direction and brand correction

The user approved the visual direction on 2026-10-09. The brand is exactly
**BiBilen**, not biBilen. The v2 preview changes only the sign lettering using
the built-in imagegen tool; other visual choices remain as approved.
