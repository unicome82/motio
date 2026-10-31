# Technical specification

## Stack and loading
HTML5, SCSS->CSS, ES modules, optional jQuery 3.7.1, GSAP CDN (UI only), Matter.js 0.20.0 CDN for rigid bodies. Pin CDN versions, use defer/order correctly; do not use npm or bundlers. Prefer native DOM where jQuery adds no value. Use local HTTP server for ES module development; iOS orientation permissions require HTTPS secure context in production/testing.

## Scene lifecycle
SceneManager owns current scene, abortable async scene loading, single RAF loop, resize, visibility pause, hash navigation. Scene interface: `init(ctx)`, `update(fixedDt, input)`, `render(alpha)`, `resize(width,height,dpr)`, `pause()`, `resume()`, `destroy()`. `start()` may be a manager-level operation. Scene never starts independent RAF or Matter.Runner while central scheduler is active. Ensure no double physics stepping.

## Physics and rendering
Use fixed 1/60 s accumulator with capped catch-up steps (e.g. max 4) and delta clamp to avoid spiral of death. Matter.Engine.update(engine, 1000/60) only once per fixed step. Physics and rendering must be separate. Canvas2D initially for 2D scenes; WebGL only if profiling proves necessary. DPR cap <=2 and adaptive to device. Avoid DOM per particle.

## Per-scene engine
- Gravity, Elastic, Chain, Sandbox: Matter.js rigid-body engine (constraints for springs).
- Magnetism: custom approximate inverse-distance force with softening and capped acceleration; label approximation, not exact electromagnetic field.
- Wave: stable finite-difference 2D wave/ripple simulation; no claim of full fluid dynamics.
- Cloth: Verlet/PBD constraints, capped iterations; no self-collision initially.

## Input
Pointer Events for mouse/touch/pen; pointer capture for dragging, velocity estimation for throwing; proper touch-action only on simulation region. DeviceOrientation API only after user gesture and permission on iOS where required; neutral calibration, low-pass filter, orientation remapping, touch fallback, graceful unsupported/denied state. Avoid claiming shake detection unless explicitly implemented.

## Navigation and performance
One `index.html`, hash routes (`#gravity` etc.), back/forward, direct refresh. Lazy-load scene modules and optional libraries; only current scene updates. Pause on document.hidden, clean all listeners/resources, ResizeObserver for canvas. Static index thumbnails. Target 60fps where supported; no guarantees. Profile frame time and memory on mobile and desktop. Reduced motion disables decorative transitions.

## Testing acceptance
Collision and restitution believable; no bodies tunnel through static walls at intended velocities; stable stacked objects; spring does not explode; wave decays; cloth constraints stable; direct hash links work; switching 100x causes no duplicate listeners/RAF or monotonic memory leak; tilt denial still usable; viewport resize/rotation correct; mobile touch works without accidental page scroll; keyboard controls accessible.
