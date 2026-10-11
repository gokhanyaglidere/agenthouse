# Garden wildlife and environmental motion

One decorative garden cat, three birds (five in Live mode), pond surface ripples, crown-only tree sway, proximity sliding doors for unlocked rooms. Private CEO door stays closed; geometry and permissions do not change. Decorative animals stay in outdoor coordinates and never create work activity or path obstacles.

Simple mode freezes environmental motion; Balanced and Live use the OS reduced-motion setting. Existing offscreen drawing is culled for furniture and door calculations. The scene paints at approximately 60 fps on high refresh displays; simulation still updates every animation tick. Hidden pages do not paint.

Build: main JS 1,565.32 KB / gzip 330.56 KB, compared to 1,561.63 KB / gzip 329.16 KB before these changes. Increment: 3.69 KB raw, 1.40 KB gzip. Entire built UI still approximately 6.2 MB. No additional image/video downloads required.

33 UI tests pass, including high refresh cap, hidden scene and stopped-loop regression checks. Initial browser sample before paint cap: 144 fps, 1.51 ms average loop cost. Final live browser sample after paint cap: 60.0 fps, 2.73 ms average loop cost. These desktop observations are not physical-phone benchmarks.
