# Review fixes

- Paused Magnetism polarity and Wave cursor changes redraw immediately.
- Matter loader: 12-second timeout, shared request, retry and stale callback protection.
- Vendored MIT Matter.js 0.20.0 fixture; run node scripts/check.mjs without installation or temporary files.
- Canvas palette reads Sass-generated SVG fill classes; no duplicated JS colors or CSS variable bridge.
- Home uses a real Matter scene through the central manager, retaining static SVG for file preview and loading fallback.
- Legacy #main route still maps to home.
- CSS compiled with installed Live Sass Compiler 6.1.5 bundled Dart Sass.

All 13 test files pass, including 100 actual home/seven-scene switches. Browser screenshots, real-device input and frame-time profiling remain unverified.
