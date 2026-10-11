# BiBilen cozy furniture

Four original transparent sprite atlases and a pond sprite were generated with the built-in
imagegen tool on 2026-10-09. The approved BiBilen reception concept was used
as a style reference only. Final source files are stored in this directory.

## Prompts

Both briefs: original cozy orthographic RPG art, warm oak, cream, moss/sage,
terracotta, readable 16-bit pixel silhouettes, no isometric diagonal geometry,
genuine transparent background. Four rows by four columns, fully isolated
objects with margins, no room backgrounds, characters, labels, UI or grid lines.

`cozy-furniture-1.png` rows:

1. Paneled reception banko with monitor, bell and notebook; moss two-seat sofa;
   matching armchair; round coffee table with mugs, vase and magazine.
2. Executive desk with papers and lamp; executive chair from behind; full framed
   bookcase with books and baskets; low sideboard with plant and folders.
3. Potted monstera; flowering ceramic pot; coat rack with jacket and umbrella;
   framed cork noticeboard.
4. Linen-curtained wooden window; brass wall lamp; terracotta woven rug; green
   woven rug, both fringed and viewed from above.

`cozy-furniture-2.png` rows:

1. Oak work desk with computer and notebook; sage chair from behind; complete
   conference table with papers and water; wooden meeting chair facing forward.
2. Complete kitchen counter with sink, hob and cupboards; sage fridge; dining
   table with plates and food; coffee cabinet with machine and mugs.
3. Complete billiard table with balls and cue; arcade cabinet; studio editing
   desk with dual screens and tablet; camera on tripod.
4. Outdoor wooden bench; potted leafy tree; bicycle; wood-framed whiteboard.

## Build

From repository root:

```sh
node tools/pixel-office/compile-cozy-assets.mjs tools/pixel-office/design/assets/cozy-furniture-1.png tools/pixel-office/design/assets/cozy-furniture-2.png tools/pixel-office/design/assets/cozy-pond.png tools/pixel-office/design/assets/cozy-office-garden-v2.png tools/pixel-office/design/assets/cozy-functional-v113.png
```

The compiler reads RGBA PNGs, identifies 16 opaque connected objects per source,
then fits each to its declared pixel size. Ordinary furniture keeps aspect ratio; fitted wall modules fill their exact frame without transparent installation gaps. The
seamless paving tile fills its square. Chair sprites align at the top of their
seat tile to avoid a false aisle around tables. It
outputs 65 native pixel sprites plus a transparent embedded-seat anchor and footprint metadata to
`webview-ui/src/bibilen/assets/cozy-assets.json`. Generated source margins are
not assumed perfectly uniform; crops follow actual connected sprite bounds.
The result joins the native catalog before layout rebuild. Rugs, windows and
lamps are drawn below actors; furniture participates in native depth ordering.
There is no fixed full-room image obscuring the animated characters.

The pond brief: one isolated top-down RPG pond, irregular oval stone shoreline,
muted teal water, short ripple highlights, lilies with pale peach flowers, moss,
reeds and shore flowers. Crisp pixel art and transparent margin, no ground
rectangle, scene, UI, text or characters. Native target size 112×80. It renders
below characters; its seven-by-five tile collision region is defined in layout.

## Revision 112 atlas — final built-in tool prompt

`cozy-office-garden-v2.png` is a new production asset, not an edit of the old
atlases. Original generated file: `exec-8665a74c-0364-4bf4-a876-8e703873b565.png`.

Use case: stylized-concept. Production asset: true transparent RGBA pixel-art sprite atlas for a cozy original office and lush garden videogame, warm oak cream sage palette, orthographic top-down 3/4 RPG view (look slightly downward, front visible), consistent lighting top left, crisp deliberate pixel shapes, no text, no labels, no floors, no shadows outside objects. EXACTLY 16 fully isolated objects in a uniform 4 by 4 grid, wide transparent gaps, each completely contained in its grid cell, same small game sprite detail level. Row 1 left to right: modern sage ergonomic OFFICE SWIVEL CHAIR seen from BACK, black five-spoke caster base padded back and armrests (absolutely NOT a wooden dining chair); same modern swivel chair from FRONT; tan leather executive swivel chair seen from BACK with caster base; oak dining chair with cream upholstered seat seen from FRONT. Row 2: same oak upholstered dining chair from BACK; large lush natural maple tree with broad irregular canopy and rooted trunk (NO pot); full outdoor evergreen pine tree with rooted trunk (NO pot); outdoor flowering cherry tree with pink cream blossoms and rooted trunk (NO pot). Row 3: dense low horizontal hedge of leafy bushes; long timber-raised flower bed with many varied colorful flowers; round lush leafy shrub (NO pot); large rectangular garden planter with varied ferns grasses flowers. Row 4: a single seamless square warm irregular sandstone paving tile with several tightly fitted organic polygon stones, no gaps outside tile; round cream braided jute rug; muted blue rectangular flat weave rug with simple narrow cream border (not Persian rug); short black garden lantern on a timber post. The four chair sprites must be visibly modern versus dining types. Outdoor vegetation richly layered and warm forest-game cozy with varied silhouettes. Preserve completely transparent background around every object. No scenes, no characters, no brand, no repetitive identical objects.
