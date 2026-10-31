import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import { readSource as readFile } from './helpers.mjs';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const Matter = require(process.argv[2] || fileURLToPath(new URL('./vendor/matter-0.20.0.cjs', import.meta.url)));
assert.equal(Matter.version, '0.20.0');
globalThis.window = { Matter };
let engine;
const originalCreate = Matter.Engine.create;
Matter.Engine.create = options => (engine = originalCreate(options));
const source = (await readFile(new URL('../js/scenes/elastic.js', import.meta.url), 'utf8'))
  .replace("import { loadMatter } from '../core/libraries.js';", 'const loadMatter = async () => window.Matter;');
const { createScene } = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
const sliders = ['stiffness', 'damping'].map(name => {
  const slider = new EventTarget(); Object.assign(slider, { name, id: name, value: name === 'stiffness' ? '.04' : '.06' }); return slider;
});
const outputs = {};
const controls = { querySelectorAll: () => sliders, querySelector: selector => outputs[selector] ||= {} };
const canvas = new EventTarget();
canvas.closest = () => ({ querySelector: () => controls });
const bounceButton = new EventTarget();
 bounceButton.disabled = false;
canvas.parentElement = { querySelector: selector => selector === '#bounce' ? bounceButton : null };
canvas.matches = () => false;
canvas.focus = () => {};
let lineSegments = 0;
const context = new Proxy({}, { get: (_, key) => key === 'lineTo' ? () => lineSegments++ : () => {}, set: () => true });
const input = { pointers: new Map(), keys: new Set() };
const dynamic = () => Matter.Composite.allBodies(engine.world).filter(body => !body.isStatic);
function slide(name, value) {
  const slider = sliders.find(slider => slider.name === name);
  slider.value = String(value); slider.dispatchEvent(new Event('input'));
}
function pointer(type, id, time = 20) {
  const event = new Event(type); Object.assign(event, { pointerId: id, button: 0 });
  Object.defineProperty(event, 'timeStamp', { value: time }); canvas.dispatchEvent(event);
}
let steps = 0;
for (const width of [280, 720]) {
  for (const stiffness of [.005, .2]) for (const damping of [0, .3]) {
    const scene = createScene();
    await scene.init({ canvas, context, input, signal: new AbortController().signal });
    scene.resize(width, 400, 2); scene.resume();
    slide('stiffness', stiffness); slide('damping', damping);
    assert.equal(Matter.Composite.allConstraints(engine.world).length, 3);
    for (const spring of Matter.Composite.allConstraints(engine.world)) {
      assert.equal(spring.stiffness, stiffness); assert.equal(spring.damping, damping);
    }
    const body = dynamic()[2];
    input.pointers.set(1, { x: body.position.x, y: body.position.y, vx: 10000, vy: -10000, time: 10 });
    pointer('pointerdown', 1);
    assert.equal(Matter.Composite.allConstraints(engine.world).length, 4);
    input.pointers.set(1, { x: width-10, y: 10, vx: 10000, vy: -10000, time: 10 });
    pointer('pointermove', 1);
    for (let i = 0; i < 120; i++) scene.update(1/60);
    pointer('pointerup', 1); input.pointers.clear();
    assert.equal(Matter.Composite.allConstraints(engine.world).length, 3);
    assert.ok(Matter.Body.getSpeed(body) <= 12.001);
    for (let i = 0; i < 2400; i++) {
      scene.update(1/60); steps++;
      for (const body of dynamic()) {
        assert.ok(Number.isFinite(body.position.x) && Number.isFinite(body.position.y));
        assert.ok(body.position.x >= -2 && body.position.x <= width+2);
        assert.ok(body.position.y >= -2 && body.position.y <= 402);
        assert.ok(Matter.Body.getSpeed(body) < 30, 'bounded spring response');
      }
    }
    scene.render(); assert.ok(lineSegments >= 48);
    scene.pause(); const time = engine.timing.timestamp;
    scene.update(1/60); assert.equal(engine.timing.timestamp, time);
    scene.resume(); scene.update(1/60); assert.ok(engine.timing.timestamp > time);
    scene.resize(width+20, 320, 1);
    assert.equal(dynamic().length, 3);
    assert.equal(Matter.Composite.allConstraints(engine.world).length, 3);
    assert.equal(Matter.Composite.allConstraints(engine.world)[0].stiffness, stiffness);
    scene.destroy();
    assert.equal(Matter.Composite.allBodies(engine.world).length, 0);
    assert.equal(Matter.Composite.allConstraints(engine.world).length, 0);
  }
}
const scene = createScene();
await scene.init({ canvas, context, input, signal: new AbortController().signal });
scene.resize(600, 400, 1); scene.resume();
let initial = 0, final = 0;
for (let i = 0; i < 1200; i++) {
  scene.update(1/60);
  const energy = dynamic().reduce((sum, body) => sum+Matter.Body.getSpeed(body)**2, 0);
  if (i < 60) initial += energy;
  if (i >= 1140) final += energy;
}
assert.ok(final < initial*.01, 'default oscillation decays');
const body = dynamic()[0];
input.pointers.set(2, { x: body.position.x, y: body.position.y, vx: 0, vy: 0, time: 10 });
pointer('pointerdown', 2); assert.equal(Matter.Composite.allConstraints(engine.world).length, 4);
scene.pause(); assert.equal(Matter.Composite.allConstraints(engine.world).length, 3);
scene.resume();
input.keys.add('ArrowRight');
const before = dynamic()[0].position.x;
for (let i = 0; i < 10; i++) scene.update(1/60);
assert.ok(dynamic()[0].position.x > before, 'keyboard force moves the selected circle');
input.keys.clear();
input.pointers.set(3, { x: body.position.x, y: body.position.y, vx: 0, vy: 0, time: 10 });
pointer('pointerdown', 3);
assert.equal(Matter.Composite.allConstraints(engine.world).length, 4);
pointer('pointercancel', 3);
assert.equal(Matter.Composite.allConstraints(engine.world).length, 3);
scene.destroy(); input.pointers.clear();
for (let i = 0; i < 100; i++) {
  const next = createScene();
  await next.init({ canvas, context, input, signal: new AbortController().signal });
  next.resize(390, 400, 1); next.destroy();
}
slide('stiffness', .1); pointer('pointerdown', 1);
assert.equal(Matter.Composite.allBodies(engine.world).length, 0);
assert.equal(Matter.Composite.allConstraints(engine.world).length, 0);
const adding = createScene();
await adding.init({ canvas, context, input, signal: new AbortController().signal });
adding.resize(600, 400, 1);
assert.equal(dynamic().length, 3);
for (let i = 0; i < 6; i++) bounceButton.dispatchEvent(new Event('click'));
assert.equal(dynamic().length, 9, 'plus adds a body each time up to the cap');
assert.equal(Matter.Composite.allConstraints(engine.world).length, 9, 'each added body gets a connecting spring');
assert.equal(bounceButton.disabled, true, 'plus is disabled at the body limit');
assert.ok(Matter.Composite.allConstraints(engine.world).every(spring => spring.stiffness === .04 && spring.damping === .06));
for (const spring of Matter.Composite.allConstraints(engine.world).slice(3)) {
  const actualLength = Matter.Vector.magnitude(Matter.Vector.sub(spring.bodyB.position, spring.bodyA.position));
  assert.ok(Math.abs(spring.length-600*.24)<.001, 'added spring keeps the original rest length');
  assert.ok(Math.abs(actualLength-spring.length)<.001, 'added spring starts at its rest length');
}
bounceButton.dispatchEvent(new Event('click'));
assert.equal(dynamic().length, 9, 'body count stays capped');
adding.destroy();
console.log(`PASS: ${steps} spring stability steps across widths/extreme controls, decay, drag/release, pause, resize, rendering and 100 create/destroy cycles.`);
