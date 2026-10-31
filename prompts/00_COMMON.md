# 00 — Common prompt (apply at start of EVERY Codex stage)

You are implementing PHYSICS LAB. Read `design/DESIGN_SPEC.md`, `design/tokens.json`, `TECH_SPEC.md`, and `reference/approved-design.png` first. These are project constraints. Do not reinterpret the visual direction.

Goal: lightweight, precise, responsive interactive physics lab with seven independent experiments. Prioritize actual physics, reliable inputs, performance, and maintainability over visual flourishes.

Use semantic HTML5, SCSS compiled to CSS, vanilla ES modules for core physics and lifecycle, concise jQuery only for simple UI DOM interactions, GSAP for UI transitions only, and Matter.js CDN for rigid-body scenes. No React, bundler, npm install, or unnecessary dependencies. No unnecessary wrapper divs, duplicate styles, high-specificity selectors, deep nesting, or redundant event handlers.

Only one scene may update/render at a time. All scene modules must expose a consistent lifecycle (init/start/pause/resume/resize/destroy); remove all event listeners, RAF loops, Matter engines/runners, timers, and WebGL resources on destroy. Use a single central simulation scheduler; avoid overlapping RAF loops.

Before editing: inspect existing files and briefly state intended changes. After editing: list modified files, manual verification steps, and unresolved issues. Do not claim browser/mobile tests you did not run. Never replace simulation physics with CSS/GSAP keyframe illusions.
