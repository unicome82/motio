# Design specification — PHYSICS LAB

## Authority
Use `reference/approved-design.png` as visual reference. Implement this document and `tokens.json` as the source of truth for repeatable UI. Reference is a collage of concepts, NOT a single page to copy literally.

## Visual language
- Minimal + mid-century editorial + Bauhaus-influenced flat geometry.
- Warm off-white background, black typography, restrained terracotta / navy / mustard accents.
- All physics shapes rendered as flat fills with crisp edges. No gradients, faux 3D, glows, shadows, glass, noise, decorative textures.
- Use whitespace and scale, not effects, for hierarchy. Hairline dividers and restrained borders.
- Typeface: Pretendard via jsDelivr CDN (v1.3.9) (user-approved), with Arial/Helvetica/sans-serif fallback. Logo weight: 900 (Black).
- Buttons: circular outline arrow, simple text actions; sliders and switches with high contrast.

## Desktop layout
- Header: PHYSICS LAB. left; experiments/about/settings right.
- Landing: large left-aligned `Play with Physics.` heading, short Korean supporting text, action; right live flat geometric physics composition.
- Experiment: 3-column grid: info/instructions (approx 20%), simulation canvas (flexible ~60%), settings (~20%). At 1024–1280 widths, adapt rather than force fixed widths.
- Experiments index: seven compact flat preview cards, numbered 01–07; previews are illustrative, not 7 simultaneously running simulations.
- Active scene: one large canvas, subtle 1px boundary, essential controls only; prev/next and index.

## Mobile layout
- Header logo + menu. Full-width simulation area at top after compact scene title.
- Settings appear below simulation or in an accessible panel, never a permanent narrow sidebar.
- Index uses vertical rows with number, small flat icon/thumbnail, title, chevron.
- Minimum interactive target 44x44 CSS px; avoid scroll interception outside canvas.

## Scenes and visual motifs
1 Gravity: circles, triangle ramp, flat floor, vertical obstacle; red/blue/yellow/black.
2 Elastic: linked circles, thin zigzag spring line.
3 Magnetism: blue/red/black small dots, radial distributions.
4 Wave: concentric thin lines or flat bands, blue accent.
5 Cloth: thin grid net in beige, dark anchor points.
6 Chain: domino bars, flat red/yellow/blue/black.
7 Sandbox: simple circles, squares, ramps on beige stage.

## UX
- Landing CTA enters Gravity; experiments index and scene direct links.
- Scene switch preserves URL hash and back navigation; do not keep background simulations alive.
- Each scene has clear instructions, reset, pause, and only relevant parameters.
- Keyboard navigation and focus indicators; reduced-motion preference applies to transitions, not physics calculations.

## Design QA
- No gradient/shadow/glass/3D effect anywhere.
- Consistent color tokens, type scale, whitespace, line weights.
- PC and mobile match reference composition without copying impossible image geometry.
- Controls legible and usable at 320px width.
