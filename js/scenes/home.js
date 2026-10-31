import { palette } from '../core/palette.js?v=green-2';
import { loadMatter } from '../core/libraries.js';

export function createScene() {
  let M, engine, context, canvas, fallback, controller;
  let width = 0, height = 0, dpr = 1, paused = false, pointer = null;
  let bodies = [], walls = [];
  let dirty = true;
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  function drop(body, initial = false) {
    const margin = body.plugin.radius;
    M.Body.setPosition(body, {
      x: margin + Math.random() * Math.max(1, width - margin * 2),
      y: initial && Math.random() < .2 ? -margin + Math.random() * height * .3 : -margin - Math.random() * height * 2.5,
    });
    M.Body.setAngle(body, Math.random() * Math.PI * 2);
    M.Body.setVelocity(body, { x: (Math.random() - .5) * 1.4, y: initial ? Math.random() * 2 : 0 });
    M.Body.setAngularVelocity(body, (Math.random() - .5) * .04);
    body.plugin.cooldown = 0;
  }
  function build() {
    dirty = true;
    M.Composite.clear(engine.world, false); M.Engine.clear(engine);
    const colors = [palette.terracotta, palette.blue, palette.mustard, palette.green, palette.sand];
    for (let i = colors.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [colors[i], colors[j]] = [colors[j], colors[i]];
    }
    const count = colors.length;
    bodies = Array.from({ length: count }, (_, i) => {
      const radius = clamp(Math.min(width, height) * (.035 + Math.random() * .03), 12, 34) * 5.28;
      const options = { restitution: .65, friction: .06, frictionAir: .004,
        render: { fillStyle: colors[i] } };
      const body = M.Bodies.circle(0, 0, radius, options);
      body.plugin.radius = radius * 1.5;
      drop(body, true); return body;
    });
    walls = [M.Bodies.rectangle(-32, height / 2, 64, height * 20 + 10000, { isStatic: true }),
      M.Bodies.rectangle(width + 32, height / 2, 64, height * 20 + 10000, { isStatic: true }),
      M.Bodies.rectangle(width / 2, height + 64, width + 512, 128, { isStatic: true, friction: .25, restitution: .3 })];
    M.Composite.add(engine.world, [...walls, ...bodies]);
  }
  return {
    maxDpr: 1.5,
    async init(ctx) {
      M = await loadMatter(); if (ctx.signal.aborted) return;
      ({ canvas, context } = ctx);
      engine = M.Engine.create({ positionIterations: 6, velocityIterations: 6, enableSleeping: true });
      engine.gravity.y = .45;
      controller = new AbortController();
      ctx.signal.addEventListener('abort', () => controller.abort(), { once: true, signal: controller.signal });
      const options = { signal: controller.signal };
      // Track the viewport in capture phase, including text/button overlays.
      const target = window.addEventListener ? window : canvas;
      const locate = event => {
        if (event.target?.closest?.('.index-section')) { pointer = null; return; }
        const bounds = canvas.getBoundingClientRect();
        const boxWidth = bounds.width || width, boxHeight = bounds.height || height;
        const x = event.clientX - bounds.left, y = event.clientY - bounds.top;
        pointer = x >= 0 && y >= 0 && x <= boxWidth && y <= boxHeight
          ? { x: x * width / boxWidth, y: y * height / boxHeight } : null;
      };
      const capture = { ...options, capture: true };
      target.addEventListener('PointerEvent' in window ? 'pointermove' : 'mousemove', locate, capture);
      target.addEventListener('pointerdown', locate, capture);
      for (const name of ['blur', 'pointercancel']) target.addEventListener(name, () => { pointer = null; }, options);
      target.addEventListener('pointerout', event => { if (!event.relatedTarget) pointer = null; }, options);
      target.addEventListener('pointerup', event => { if (event.pointerType === 'touch') pointer = null; }, options);
      fallback = canvas.parentElement.querySelector('svg');
      if (fallback) fallback.style.visibility = 'hidden';
    },
    update(dt) {
      if (!engine || paused) return;
      for (let i = 0; i < bodies.length; i++) {
        const body = bodies[i];
        body.plugin.cooldown = Math.max(0, body.plugin.cooldown - dt);
        if (pointer && !body.plugin.cooldown) {
          const dx = body.position.x - pointer.x, dy = body.position.y - pointer.y;
          const distance = Math.hypot(dx, dy);
          if (distance < body.plugin.radius + 36) {
            M.Sleeping.set(body, false);
            M.Body.setVelocity(body, { x: dx / Math.max(1, distance) * 2.5, y: -3 - Math.abs(dy) / Math.max(1, distance) * .8 });
            M.Body.setAngularVelocity(body, (dx >= 0 ? 1 : -1) * .015);
            body.plugin.cooldown = 1;
          }
        }
        const velocity = M.Body.getVelocity(body), speed = Math.hypot(velocity.x, velocity.y);
        if (speed > 12) M.Body.setVelocity(body, { x: velocity.x * 12 / speed, y: velocity.y * 12 / speed });
        if (body.bounds.min.y > height + 60) drop(body);
      }
      if (bodies.some(body => !body.isSleeping)) {
        M.Engine.update(engine, dt * 1000);
        dirty = true;
      }
    },
    render() {
      if (!engine || !context || !width || !height || !dirty) return;
      dirty = false;
      context.setTransform(dpr, 0, 0, dpr, 0, 0); context.clearRect(0, 0, width, height);
      for (const body of bodies) {
        context.fillStyle = body.render.fillStyle; context.beginPath();
        context.arc(body.position.x, body.position.y, body.circleRadius, 0, Math.PI * 2);
        context.fill();
      }
    },
    resize(w, h, nextDpr) {
      dirty = true;
      dpr = nextDpr;
      if (w === width && h === height) return;
      width = w; height = h; pointer = null;
      if (engine && w > 0 && h > 0) build();
    },
    pause() { paused = true; pointer = null; },
    resume() { paused = false; },
    destroy() {
      controller?.abort();
      if (fallback) fallback.style.removeProperty('visibility');
      if (engine) { M.Composite.clear(engine.world, false); M.Engine.clear(engine); }
      engine = context = canvas = fallback = pointer = null; bodies = []; walls = [];
    },
  };
}
