import { palette, randomShapeColor } from '../core/palette.js';
import { loadMatter } from '../core/libraries.js';

const MAX_BODIES = 9;

export function createScene() {
  let M, engine, canvas, context, input, controller, addButton;
  let width = 0, height = 0, dpr = 1, selected = 2, paused = false;
  let bodies = [], springs = [];
  const grabs = new Map();
  const settings = { stiffness: .04, damping: .06 };
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  function release(id, velocity) {
    const grab = grabs.get(id);
    if (!grab) return;
    M.Composite.remove(engine.world, grab.constraint);
    if (velocity && !paused) M.Body.setVelocity(grab.body, limit(velocity));
    grabs.delete(id);
  }
  function releaseAll() { for (const id of grabs.keys()) release(id); }
  function limit(velocity) {
    const speed = Math.hypot(velocity.x, velocity.y);
    return speed > 12 ? { x: velocity.x*12/speed, y: velocity.y*12/speed } : velocity;
  }
  function build(nextWidth, nextHeight) {
    releaseAll();
    M.Composite.clear(engine.world, false);
    M.Engine.clear(engine);
    width = nextWidth; height = nextHeight;
    const radius = clamp(width*.055, 16, 32);
    const colors = Array.from({ length: 3 }, randomShapeColor);
    bodies = colors.map((color, i) => M.Bodies.circle(width*(.30+i*.24), height*.75, radius, {
      restitution: .35, frictionAir: .008, render: { fillStyle: color },
    }));
    const anchor = { x: width*.10, y: height*.75 };
    springs = bodies.map((body, i) => M.Constraint.create({
      ...(i ? { bodyA: bodies[i-1] } : { pointA: anchor }),
      bodyB: body, length: width*(i ? .24 : .20), ...settings,
    }));
    const walls = [
      M.Bodies.rectangle(width/2, height+24, width+96, 48, { isStatic: true }),
      M.Bodies.rectangle(width/2, -24, width+96, 48, { isStatic: true }),
      M.Bodies.rectangle(-24, height/2, 48, height+96, { isStatic: true }),
      M.Bodies.rectangle(width+24, height/2, 48, height+96, { isStatic: true }),
    ];
    M.Composite.add(engine.world, [...walls, ...bodies, ...springs]);
    // A physical initial displacement starts the spring response.
    M.Body.setPosition(bodies[2], { x: bodies[2].position.x, y: height*.38 });
    selected = 2;
    if (addButton) addButton.disabled = false;
  }
  function addBody() {
    if (bodies.length >= MAX_BODIES) return;
    const radius = clamp(width*.055, 16, 32);
    const length = width*.24;
    const previous = bodies.at(-1);
    let position, clearance = -Infinity;
    for (let i = 0; i < 72; i++) {
      const angle = i*Math.PI/36;
      const candidate = { x: previous.position.x+Math.cos(angle)*length, y: previous.position.y+Math.sin(angle)*length };
      if (candidate.x < radius || candidate.x > width-radius || candidate.y < radius || candidate.y > height-radius) continue;
      const nearest = Math.min(...bodies.map(existing => M.Vector.magnitude(M.Vector.sub(candidate, existing.position))));
      if (nearest > clearance) {
        position = candidate;
        clearance = nearest;
      }
    }
    if (!position) return;
    const body = M.Bodies.circle(position.x, position.y, radius, {
      restitution: .35, frictionAir: .008, render: { fillStyle: randomShapeColor() },
    });
    const spring = M.Constraint.create({ bodyA: previous, bodyB: body, length, ...settings });
    bodies.push(body);
    springs.push(spring);
    M.Composite.add(engine.world, [body, spring]);
    selected = bodies.length - 1;
    addButton.disabled = bodies.length >= MAX_BODIES;
  }
  function drawSpring(spring) {
    const start = spring.bodyA ? spring.bodyA.position : spring.pointA;
    const end = spring.bodyB.position;
    const dx = end.x-start.x, dy = end.y-start.y;
    const length = Math.hypot(dx, dy);
    if (length < 1) return;
    const ux = dx/length, uy = dy/length;
    const insetA = spring.bodyA?.circleRadius || 4;
    const insetB = spring.bodyB.circleRadius;
    const visible = Math.max(0, length-insetA-insetB);
    const turns = 16;
    const amplitude = Math.min(clamp(width*.012, 3, 7), visible/8);
    context.beginPath();
    context.moveTo(start.x+ux*insetA, start.y+uy*insetA);
    for (let i = 1; i < turns; i++) {
      const distance = insetA+visible*i/turns;
      const offset = (i%2 ? 1 : -1)*amplitude;
      context.lineTo(start.x+ux*distance-uy*offset, start.y+uy*distance+ux*offset);
    }
    context.lineTo(end.x-ux*insetB, end.y-uy*insetB);
    context.stroke();
  }
  return {
    async init(ctx) {
      M = await loadMatter();
      if (ctx.signal.aborted) return;
      ({ canvas, context, input } = ctx);
      controller = new AbortController();
      ctx.signal.addEventListener('abort', () => controller.abort(), { once: true, signal: controller.signal });
      const options = { signal: controller.signal };
      engine = M.Engine.create({ positionIterations: 8, velocityIterations: 8, constraintIterations: 4 });
      engine.gravity.y = 0;
      addButton = canvas.parentElement?.querySelector('#bounce');
      addButton?.addEventListener('click', addBody, options);
      const controls = (ctx.sceneRoot || canvas.closest('.scene')).querySelector('.scene-controls');
      controls?.querySelectorAll('input[type="range"]').forEach(slider => {
        slider.addEventListener('input', () => {
          settings[slider.name] = clamp(Number(slider.value), slider.name === 'stiffness' ? .005 : 0, slider.name === 'stiffness' ? .2 : .3);
          controls.querySelector(`output[for="${slider.id}"]`).value = slider.value;
          for (const spring of springs) spring[slider.name] = settings[slider.name];
        }, options);
      });
      canvas.addEventListener('pointerdown', event => {
        if (paused || event.button !== 0) return;
        const pointer = input.pointers.get(event.pointerId);
        if (!pointer) return;
        const body = M.Query.point(bodies, pointer).find(body => ![...grabs.values()].some(grab => grab.body === body));
        if (!body) return;
        selected = bodies.indexOf(body);
        const constraint = M.Constraint.create({ pointA: { x: pointer.x, y: pointer.y }, bodyB: body,
          pointB: M.Vector.sub(pointer, body.position), stiffness: .15, damping: .2, length: 0 });
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
        const grab = grabs.get(event.pointerId);
        const fresh = grab && event.timeStamp-grab.pointer.time < 100;
        release(event.pointerId, fresh ? { x: grab.pointer.vx/60, y: grab.pointer.vy/60 } : { x: 0, y: 0 });
      }, options);
      for (const name of ['pointercancel', 'lostpointercapture']) canvas.addEventListener(name, event => release(event.pointerId), options);
      canvas.addEventListener('blur', releaseAll, options);
      canvas.addEventListener('keydown', event => {
        if (event.code === 'KeyN') { selected = (selected+1)%bodies.length; event.preventDefault(); }
        if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.code)) event.preventDefault();
      }, options);
    },
    update(fixedDt) {
      if (!engine || paused) return;
      for (const [id, grab] of grabs) {
        if (!input.pointers.has(id)) { release(id); continue; }
        const target = { x: clamp(grab.pointer.x, 8, width-8), y: clamp(grab.pointer.y, 8, height-8) };
        const delta = limit(M.Vector.sub(target, grab.constraint.pointA));
        grab.constraint.pointA = M.Vector.add(grab.constraint.pointA, delta);
      }
      const body = bodies[selected];
      if (body) M.Body.applyForce(body, body.position, {
        x: (Number(input.keys.has('ArrowRight'))-Number(input.keys.has('ArrowLeft')))*body.mass*.0008,
        y: (Number(input.keys.has('ArrowDown'))-Number(input.keys.has('ArrowUp')))*body.mass*.0008,
      });
      for (const body of bodies) M.Body.setVelocity(body, limit(M.Body.getVelocity(body)));
      M.Engine.update(engine, fixedDt*1000);
      for (const body of bodies) M.Body.setVelocity(body, limit(M.Body.getVelocity(body)));
    },
    render() {
      if (!engine || !context) return;
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
      context.clearRect(0, 0, width, height);
      context.strokeStyle = palette.ink; context.lineWidth = 1.25;
      springs.forEach(drawSpring);
      context.fillStyle = palette.ink; context.beginPath();
      context.arc(springs[0].pointA.x, springs[0].pointA.y, 4, 0, Math.PI*2); context.fill();
      for (const body of bodies) {
        context.fillStyle = body.render.fillStyle;
        context.beginPath(); context.arc(body.position.x, body.position.y, body.circleRadius, 0, Math.PI*2); context.fill();
        if (body === bodies[selected] && canvas.matches(':focus-visible')) { context.lineWidth = 2; context.stroke(); }
      }
    },
    resize(nextWidth, nextHeight, nextDpr) {
      dpr = nextDpr;
      if (engine && (nextWidth !== width || nextHeight !== height)) build(nextWidth, nextHeight);
    },
    pause() { paused = true; releaseAll(); },
    resume() { paused = false; },
    destroy() {
      controller?.abort(); releaseAll();
      if (engine) { M.Composite.clear(engine.world, false); M.Engine.clear(engine); }
      bodies = []; springs = [];
      engine = canvas = context = input = addButton = null;
    },
  };
}
