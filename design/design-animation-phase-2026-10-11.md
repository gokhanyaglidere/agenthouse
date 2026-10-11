# Agent House: design and animation phase

Implemented: compact hybrid status card gives the office more vertical space; warm graphite and sage control palette; legible UI text separate from pixel canvas; updated Agent House reception plaque; 420 ms cancellable room camera transitions; pond highlights and four subtle butterflies restricted to outdoor garden; optional ambience animation and operating-system reduced-motion support.

Existing room geometry, door permissions, furniture footprints and saved custom furniture positions are preserved. This phase does not claim a complete furniture/character asset redesign. Further visual work should use live room screenshots, not room names alone.

Acceptance: UI build and 30 UI tests including spatial placement and collision checks; production visual check of hybrid view and room navigation. Review remaining department density, character-label crowding and additional interaction animations in a separate pass.

## Owner-approved next design pass — 2026-10-11

These are requested changes and reported defects, not completed work. Start with a finished CEO/meeting-room sample, visually inspect it, then apply the same quality criteria room by room.

### Visual direction

- Cozy pixel-art office with coherent scale, warm wood, cream, sage and restrained terracotta accents.
- Glass partitions for CEO and meeting rooms: thin wood frames, subtle reflections, partial wood base, visible occupants. Preserve private CEO access and collision boundaries.
- Compact CEO room: desk, properly positioned working chair, two guest seats and a small bookshelf. Avoid furniture scattered across an oversized floor.
- Office-focused mobile presentation: unobtrusive status strip and agent details on selection, preserving space for the office.

### Room identity and functional staging

- Every room must communicate its purpose through furniture, equipment, grouping and lighting before its name is read. Audit all rooms, not only the named examples.
- Game room: current sofa/table/plants and lighting feel unrelated. Arrange actual play stations, screens/controllers/arcades and seating around the activity; use suitable localized lighting. Decorations support the activity rather than fill arbitrary gaps.
- Content studio: camera and lights currently appear unrelated in the middle of the room. Build a clear production setup with backdrop/subject area, camera aimed at it, lights oriented toward it, a separate editing desk and equipment storage. Maintain walking space around the setup.
- Finance: reporting/analysis desks, document storage and relevant dashboard/board; do not define the room solely by its label.
- Development and SEO: coherent working groups, chairs aligned with usable desks and screens, task boards placed away from windows.
- Kitchen: continuous wall-aligned counter/appliances, correctly oriented sink and refrigerator, sensible meal seating and circulation.
- Avoid repeated rugs everywhere; choose floor treatment and furnishing density by room function. Resize oversized empty rooms instead of adding random props.

### Garden and indoor/outdoor distinction

- Reported defect: square paving cuts off abruptly. Design continuous paths with proper corner, junction, edge and end pieces; deliberate transitions into grass, entrances and seating pads. No arbitrary chopped-off tile strips.
- Clearly connect the main garden route to the building entrance. Group trees, shrubs and flower beds; create shaded seating and a modest water feature.
- Make building envelope, interior corridors and exterior surfaces unmistakably different. Outdoor furniture and lighting must fit their surroundings.

### Lighting, text and animation defects

- Light placement/color/intensity must reflect room activity: focused work/studio lights, softer rest areas, restrained game-room accent light and garden path lighting.
- Reported defect: office labels degrade when zooming in. Reproduce at multiple zoom levels and device pixel ratios; check pixel scaling, font rasterization, label bounds, overlaps and clipping. Keep UI/agent text legible independently of world zoom; do not mark fixed based solely on a build.
- Work animations should reflect observed real states: typing, meeting groups and breaks. Ambient door/tree/water/wildlife animations respect reduced motion and mobile performance.

### Acceptance before declaring design complete

- Inspect room screenshots at whole-room and close-up scales, desktop and narrow mobile viewport.
- Check furniture orientation, chair-to-desk distance, wall anchoring, functional groups, doors, walkability, private-room permissions and indoor/outdoor boundary.
- Check room identity without relying on labels, appropriate density, lighting and continuous garden path edges.
- Verify text across zoom/device scales and actual agent positions. Record remaining defects explicitly.
