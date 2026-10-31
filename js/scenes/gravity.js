import { palette, randomShapeColor } from '../core/palette.js';
import { loadMatter } from '../core/libraries.js';
import { TiltInput } from '../core/tilt-input.js';

export function createScene() {
  let M, engine, context, canvas, input, controls, controller, tilt;
  let width = 0, height = 0, dpr = 1;
  let bodies = [], walls = [];
  const grabs = new Map();
  const pushes = new Map();
  let paused = false;
  let selected = -1;
  let removeButton;
  const settings = { gravity: 9.8, restitution: .7, friction: .3 };
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const limit = velocity => {
    const speed = Math.hypot(velocity.x, velocity.y);
    return speed > 12 ? { x: velocity.x * 12 / speed, y: velocity.y * 12 / speed } : velocity;
  };
  function release(id, velocity) {
    const grab = grabs.get(id);
    if (!grab) return;
    M.Composite.remove(engine.world, grab.constraint);
    if (velocity && !paused) M.Body.setVelocity(grab.body, limit(velocity));
    grabs.delete(id);
  }
  function releaseAll() { for (const id of grabs.keys()) release(id); pushes.clear(); }
  function build(nextWidth, nextHeight) {
    releaseAll();
    M.Composite.clear(engine.world, false);
    M.Engine.clear(engine);
    width = nextWidth; height = nextHeight;
    const radius = clamp(width * .065, 16, 36);
    const floor = height - 20;
    const boundary = (x, y, w, h, visible = false) => M.Bodies.rectangle(x, y, w, h, { isStatic: true, friction: settings.friction, render: { visible, fillStyle: palette.black } });
    const rampWidth = Math.min(width * .28, 150);
    const rampHeight = Math.min(height * .26, 140);
    const vertices = [{ x: 20, y: floor-rampHeight }, { x: 20+rampWidth, y: floor }, { x: 20, y: floor }];
    const center = M.Vertices.centre(vertices);
    const ramp = M.Bodies.fromVertices(center.x, center.y, [vertices], { isStatic: true, friction: settings.friction, render: { fillStyle: palette.sand } });
    walls = [boundary(width/2, floor+24, width+96, 48, true), boundary(-24, height/2, 48, height+96), boundary(width+24, height/2, 48, height+96), boundary(width/2, -24, width+96, 48), ramp, boundary(width-28, floor-90, 14, 180, true)];
    bodies = [
      M.Bodies.circle(width*.36, Math.max(radius+8, height*.20), radius, { render: { fillStyle: randomShapeColor() } }),
      M.Bodies.circle(width*.70, height*.45, radius*1.06, { render: { fillStyle: randomShapeColor() } }),
      M.Bodies.circle(width*.55, height*.68, radius*1.13, { render: { fillStyle: randomShapeColor() } }),
      M.Bodies.rectangle(width*.43, height*.43, radius*1.7, radius*1.7, { angle: -.35, render: { fillStyle: randomShapeColor() } }),
    ];
    for (const body of bodies) { body.restitution = settings.restitution; body.friction = settings.friction; body.frictionAir = .004; }
    M.Composite.add(engine.world, [...walls, ...bodies]);
    selected = -1;
    syncSize();
  }
  function status(message) {
    if (controls) controls.querySelector('#tilt-status').textContent = message;
  }
  function syncSize() {
    const slider = controls?.querySelector('#size');
    if (!slider) return;
    const sizeControl = slider.closest?.('.shape-size');
    if (sizeControl) sizeControl.hidden = !bodies[selected];
    slider.disabled = !bodies[selected];
    slider.value = Math.round((bodies[selected]?.plugin.sizeScale || 1) * 100);
    controls.querySelector('output[for="size"]').value = slider.value;
  }
  function applySize(body, scale) {
    const ratio = scale / (body.plugin.sizeScale || 1);
    M.Body.scale(body, ratio, ratio); body.plugin.sizeScale = scale;
    const halfWidth = (body.bounds.max.x - body.bounds.min.x) / 2;
    const halfHeight = (body.bounds.max.y - body.bounds.min.y) / 2;
    M.Body.setPosition(body, { x: clamp(body.position.x, halfWidth, width-halfWidth),
      y: clamp(body.position.y, halfHeight, height-20-halfHeight) });
  }
  function addShape(shape) {
    if (bodies.length >= 30) {
      return;
    }
    const radius = clamp(width * .065, 16, 36);
    const options = { restitution: settings.restitution, friction: settings.friction, frictionAir: .004,
      render: { fillStyle: randomShapeColor() } };
    const x = width * (.35 + Math.random() * .3), y = radius * 2;
    const body = shape === 'circle' ? M.Bodies.circle(x, y, radius, options)
      : M.Bodies.rectangle(x, y, radius * 1.7, radius * 1.7, options);
    bodies.push(body); M.Composite.add(engine.world, body);
    selected = bodies.length - 1; syncSize();
  }
  return {
    async init(ctx) {
      M = await loadMatter();
      if (ctx.signal.aborted) return;
      ({ canvas, context, input } = ctx);
      removeButton = canvas.parentElement?.querySelector?.('#remove-shape');
      controls = (ctx.sceneRoot || canvas.closest('.scene')).querySelector('.scene-controls');
      controller = new AbortController();
      ctx.signal.addEventListener('abort', () => controller.abort(), { once: true, signal: controller.signal });
      const options = { signal: controller.signal };
      canvas.parentElement?.querySelector?.('#bounce')?.addEventListener('click', () => {
        releaseAll();
        for (const body of bodies) {
          M.Sleeping.set(body, false);
          M.Body.setVelocity(body, { x: (Math.random() - .5) * 4, y: -8 });
          M.Body.setAngularVelocity(body, (Math.random() - .5) * .08);
        }
      }, options);
      removeButton?.addEventListener('click', () => {
        const body = bodies[selected];
        if (!body) return;
        releaseAll();
        M.Composite.remove(engine.world, body);
        bodies.splice(selected, 1); selected = -1;
        syncSize();
        removeButton.hidden = true;
      }, options);
      engine = M.Engine.create({ positionIterations: 8, velocityIterations: 8 });
      tilt = new TiltInput(status);
      if (controls) {
        controls.querySelectorAll('[data-gravity-add]').forEach(button => {
          button.addEventListener('click', () => addShape(button.getAttribute('data-gravity-add')), options);
        });
        controls.querySelectorAll('input[type="range"]').forEach(slider => {
          slider.addEventListener('input', () => {
            if (slider.name === 'size') {
              releaseAll();
              if (!bodies[selected]) return;
              applySize(bodies[selected], clamp(Number(slider.value), 50, 150) / 100);
              controls.querySelector(`output[for="${slider.id}"]`).value = slider.value;
              return;
            }
            settings[slider.name] = Number(slider.value);
            controls.querySelector(`output[for="${slider.id}"]`).value = slider.value;
            for (const body of bodies) { body.restitution = settings.restitution; body.friction = settings.friction; }
            for (const wall of walls) wall.friction = settings.friction;
          }, options);
        });
        const toggle = controls.querySelector('#tilt');
        toggle.addEventListener('click', async () => {
          toggle.disabled = true;
          if (tilt.active) tilt.disable(); else await tilt.enable();
          if (controller.signal.aborted) return;
          toggle.disabled = false;
          toggle.setAttribute('aria-pressed', String(tilt.active));
          toggle.textContent = tilt.active ? '기울이기 끄기' : '기울이기 켜기';
        }, options);
        controls.querySelector('#calibrate').addEventListener('click', () => tilt.calibrate(), options);
      }
      canvas.addEventListener('pointerdown', event => {
        if (paused || event.button !== 0) return;
        const pointer = input.pointers.get(event.pointerId);
        if (!pointer) return;
        const body = M.Query.point(bodies, pointer).find(body => ![...grabs.values()].some(grab => grab.body === body));
        if (!body) {
          selected = -1; syncSize();
          if (removeButton) removeButton.hidden = true;
          pushes.set(event.pointerId, { x: pointer.x, y: pointer.y });
          return;
        }
        selected = bodies.indexOf(body);
        syncSize();
        const offset = M.Vector.sub(pointer, body.position);
        const constraint = M.Constraint.create({ pointA: { x: pointer.x, y: pointer.y }, bodyB: body, pointB: offset, stiffness: .18, damping: .2, length: 0 });
        M.Composite.add(engine.world, constraint);
        grabs.set(event.pointerId, { body, constraint, pointer });
        canvas.focus({ preventScroll: true });
      }, options);
      canvas.addEventListener('pointermove', event => {
        const grab = grabs.get(event.pointerId);
        const pointer = input.pointers.get(event.pointerId);
        if (grab && pointer) grab.pointer = pointer;
      }, options);
      canvas.addEventListener('pointerup', event => {
        pushes.delete(event.pointerId);
        const grab = grabs.get(event.pointerId);
        const fresh = grab && event.timeStamp - grab.pointer.time < 100;
        release(event.pointerId, fresh ? { x: grab.pointer.vx / 60, y: grab.pointer.vy / 60 } : { x: 0, y: 0 });
      }, options);
      for (const name of ['pointercancel', 'lostpointercapture']) canvas.addEventListener(name, event => {
        release(event.pointerId); pushes.delete(event.pointerId);
      }, options);
      canvas.addEventListener('blur', releaseAll, options);
      canvas.addEventListener('keydown', event => {
        if (event.code === 'KeyN' && bodies.length) { selected = (selected+1)%bodies.length; syncSize(); event.preventDefault(); }
        if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.code)) event.preventDefault();
      }, options);
    },
    update(fixedDt) {
      if (!engine || paused) return;
      for (const [id, previous] of pushes) {
        const pointer = input.pointers.get(id);
        if (!pointer) { pushes.delete(id); continue; }
        const movement = Math.hypot(pointer.x - previous.x, pointer.y - previous.y);
        previous.x = pointer.x; previous.y = pointer.y;
        if (movement < .5) continue;
        for (const body of bodies) {
          if ([...grabs.values()].some(grab => grab.body === body)) continue;
          const dx = body.position.x - pointer.x, dy = body.position.y - pointer.y;
          const distance = Math.hypot(dx, dy);
          const radius = Math.max(body.bounds.max.x-body.bounds.min.x, body.bounds.max.y-body.bounds.min.y) / 2;
          if (distance >= radius + 28) continue;
          const strength = Math.min(5, 2 + movement * .08);
          M.Sleeping.set(body, false);
          M.Body.setVelocity(body, limit({ x: dx / Math.max(1, distance) * strength,
            y: dy / Math.max(1, distance) * strength - 2 }));
        }
      }
      for (const [id, grab] of grabs) {
        if (!input.pointers.has(id)) { release(id); continue; }
        grab.constraint.pointA = { x: clamp(grab.pointer.x, 8, width-8), y: clamp(grab.pointer.y, 8, height-24) };
      }
      const direction = tilt.active ? tilt.direction : { x: 0, y: 1 };
      engine.gravity.x = direction.x * settings.gravity / 9.8;
      engine.gravity.y = direction.y * settings.gravity / 9.8;
      const body = bodies[selected];
      if (body && input.keys.size) {
        const x = Number(input.keys.has('ArrowRight')) - Number(input.keys.has('ArrowLeft'));
        const y = Number(input.keys.has('ArrowDown')) - Number(input.keys.has('ArrowUp'));
        M.Body.applyForce(body, body.position, { x: x*body.mass*.0012, y: y*body.mass*.0012 });
      }
      for (const body of bodies) M.Body.setVelocity(body, limit(M.Body.getVelocity(body)));
      M.Engine.update(engine, fixedDt*1000);
    },
    render() {
      if (!context || !engine) return;
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
      context.clearRect(0, 0, width, height);
      for (const body of [...walls, ...bodies]) {
        if (body.render.visible === false) continue;
        context.fillStyle = body.render.fillStyle;
        context.beginPath();
        if (body.circleRadius) context.arc(body.position.x, body.position.y, body.circleRadius, 0, Math.PI*2);
        else { body.vertices.forEach((vertex, i) => i ? context.lineTo(vertex.x, vertex.y) : context.moveTo(vertex.x, vertex.y)); context.closePath(); }
        context.fill();
        if (body === bodies[selected]) {
          context.strokeStyle = palette.ink; context.lineWidth = 2; context.stroke();
        }
      }
      if (removeButton) {
        const selectedBody = bodies[selected];
        removeButton.hidden = !selectedBody;
        if (selectedBody) {
          const inset = selectedBody.circleRadius ? selectedBody.circleRadius * .3 : 0;
          removeButton.style.left = `${clamp(selectedBody.bounds.max.x - inset, 22, width - 22)}px`;
          removeButton.style.top = `${(canvas.offsetTop || 0) + clamp(selectedBody.bounds.min.y + inset, 22, height - 22)}px`;
        }
      }
    },
    resize(nextWidth, nextHeight, nextDpr) {
      dpr = nextDpr;
      if (!engine || (nextWidth === width && nextHeight === height)) return;
      if (nextWidth === width && height > 0) {
        const savedBodies = bodies, savedSelection = selected, offset = nextHeight - height;
        build(nextWidth, nextHeight);
        M.Composite.remove(engine.world, bodies);
        bodies = savedBodies; selected = savedSelection;
        for (const body of bodies) {
          const halfHeight = (body.bounds.max.y - body.bounds.min.y) / 2;
          M.Body.setPosition(body, { x: body.position.x,
            y: clamp(body.position.y + offset, halfHeight, height - 20 - halfHeight) });
        }
        M.Composite.add(engine.world, bodies);
        syncSize();
      } else build(nextWidth, nextHeight);
    },
    pause() { paused = true; releaseAll(); },
    resume() { paused = false; },
    destroy() {
      if (removeButton) removeButton.hidden = true;
      removeButton = null;
      controller?.abort();
      tilt?.destroy();
      releaseAll();
      if (engine) { M.Composite.clear(engine.world, false); M.Engine.clear(engine); }
      engine = context = canvas = input = controls = null;
      bodies = []; walls = [];
    },
  };
}