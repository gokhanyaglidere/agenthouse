# Responsive interaction pass

Goal: smoother desktop and mobile control surfaces without restarting Claude work.

- Batched session and task terminal ResizeObserver updates to one animation frame; session terminals send resize only when terminal rows/columns change. Hidden panes do not fit to zero dimensions. Font-ready callbacks cannot revive disposed schedules.
- Full session console follows the visible viewport when a mobile keyboard resizes/pans it; viewport listeners and inline styles are removed on close. Embedded panes keep their own frame geometry.
- Focus mode hides secondary settings/dictation and reduces the reply field while retaining terminal/history navigation, message sending and an explicit restore button.
- Narrow screens show one split pane at a time with labelled tabs. Existing iframe nodes remain mounted across tab changes, preserving terminal and draft ownership. Desktop keeps the concurrent grid.
- Fluid embedded heights, scrollable horizontal control strips, smaller low-height chrome, visible focus and reduced-motion settings preserved.
- Touch PageUp/PageDown in alternate CLI buffers is rate-limited to avoid a page jump for every tiny finger movement; normal scrollback retains line movement.

Validation: 193 backend + 102 UI tests passed; TypeScript/production build passed. Added resize burst coalescing/disposal and keyboard viewport geometry tests. Browser layout checks are simulated responsive sizes, not physical iOS/Android tests or measured FPS certification.

Browser review also found a legacy mobile SVG rule hiding the New conversation icon, and a stale Conversation history heading while split view was active. Restored the icon and added the correct Multi-session heading. Focus and low-height modes keep disconnected/error status visible. Touch gestures use xterm's native mouse protocol when supported; only the alternate-buffer keyboard fallback is rate-limited.

Responsive browser checks used 390×844 and 1440×900. Focus mode expanded the live CLI area at mobile width. Mobile pane tabs appeared without duplicating the grid. Screenshots: design/verification/fluid-mobile-2026-10-13.png and fluid-desktop-2026-10-13.png. Physical keyboard/touch validation remains deferred.

## Whole-session scrolling correction

Owner confirmed dictation works, but reported inability to scroll the complete session screen. The console's outer overflow:hidden plus shrinking flex children allowed only inner terminal/history/footer areas to scroll. Changed the outer session/task console to vertical scrolling, preserved a minimum usable terminal height, and let the footer flow naturally rather than becoming a second clipped scroll region. Mobile close/header remains sticky. Native terminal gestures remain owned by the terminal; history boundary gestures may chain to the outer console. Existing viewport keyboard adaptation remains in place. All 193 backend + 102 UI tests and build passed.

Verified in a 390×600 browser viewport: outer console content 727px versus 582px visible height; a gesture on the footer moved outer scrollTop 0→145 and exposed microphone/send/key controls. Upward gesture outside terminal moved 145→0. Close header stayed visible. Screenshot: design/verification/whole-session-scroll-2026-10-13.png. Physical touch hardware was not used.
