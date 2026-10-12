# Authored cozy pose foundation

Implemented the first quality pass across the proposed sequence:

1. Directional body poses replace typing-frame reuse for arcade, billiards, pet play, watering and conversation. Crouching bends knees and lowers the head/torso; seated reading/dining uses separate leg geometry. Portrait, hair and skin identity remain tied to the selected palette.
2. Shared palm ports attach cups, spoons, watering cans and cues to the drawn forearms. Skin color follows the portrait. Authored pose accessories no longer repaint generic hands over the joints. Fixed 16x32 anchors preserve occupancy and depth sorting; required prop extensions remain outside the sprite.
3. A visit includes a 0.7-second preparation and finish phase, with corresponding body poses and captions. Existing WALK paths handle approach/departure. Real work still preempts decorative behavior. This is discrete pixel animation, not continuous skeletal interpolation or game physics.
4. Team clothing families: management suit details, engineering hoodie/badge details, SEO lanyards, creative aprons, marketing scarf accents and business waistcoat/buttons. The explicit runtime wardrobe role is separate from a custom portrait palette; cache keys include the wardrobe context. Original character style remains supported through its existing fallback.
5. Shared frame cache is capped at 1024 authored frames. Tests sweep all 48 portraits, directions and special poses; existing crowd simulations check unique reservations. Actual office loaded without console errors, live lead characters appeared in the CEO room, and the standalone preview was visually checked in paused/slow motion. No physical device or formal FPS benchmark was performed.

Preview adds pause/resume and half-speed playback, cycling preparation/action/finish. These controls affect only staged preview characters and make no Claude requests.

Validation: 144 backend tests and 65 frontend tests passed; TypeScript and production build passed. Working Claude sessions were neither prompted nor modified. No native permission policy, Slack or finance integration changes.
