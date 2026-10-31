import assert from 'node:assert/strict';
import { palette as testPalette, readSource as readFile } from './helpers.mjs';
import { performance } from 'node:perf_hooks';
const source = await readFile(new URL('../js/scenes/magnetism.js', import.meta.url), 'utf8');
const appSource = await readFile(new URL('../js/app.js', import.meta.url), 'utf8');
const { createScene, fieldAcceleration } = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
assert.match(appSource, /id="particle-count"[^>]*min="120" max="600"[^>]*value="300"/, 'particle count defaults to 300 and ranges up to 600');
assert.match(source, /Math\.max\(particleRadius\*2\+COLLISION_PADDING,\s*8\)/, 'collision grid cells keep a safe minimum size');
assert.match(source, /function ensureCollisionCapacity\(required\)/, 'collision buffers grow safely when particle capacity grows');
assert.match(appSource, /item\.id === 'magnetism' \? 'blur_on'/, 'magnetism bounce uses the blur_on symbol');
assert.match(appSource, /item\.id === 'wave' \? 'waves'/, 'wave bounce uses the waves symbol');
assert.match(appSource, /<div class="control-actions"><button id="center-field"[\s\S]*?<button id="polarity"/,
  'gravity and polarity buttons share a flex row');
assert.ok(fieldAcceleration({ x: 0, y: 0, polarity: -1 }, { x: 10, y: 0, polarity: 1 }, 1).x > 0);
assert.ok(fieldAcceleration({ x: 0, y: 0, polarity: 1 }, { x: 10, y: 0, polarity: 1 }, 1).x < 0);
assert.deepEqual(fieldAcceleration({ x: 10, y: 10, polarity: 1 }, { x: 10, y: 10, polarity: 1 }, 3), { x: -0, y: -0 });
assert.equal(Math.abs(fieldAcceleration({ x: 0, y: 0, polarity: 1 }, { x: 10, y: 0, polarity: -1 }, 0).x), 0);
const accelerationBuffer = { x: 0, y: 0 };
assert.equal(fieldAcceleration({ x: 0, y: 0, polarity: 1 }, { x: 10, y: 0, polarity: -1 }, 1, accelerationBuffer), accelerationBuffer,
  'field acceleration reuses the supplied result object');
assert.equal(accelerationBuffer.x, 10*24000/(100+28*28));
fieldAcceleration({ x: 0, y: 0, polarity: 1 }, { x: 0, y: 10, polarity: -1 }, 1, accelerationBuffer);
assert.equal(accelerationBuffer.x, 0);
assert.equal(accelerationBuffer.y, 10*24000/(100+28*28));
function makeButton() {
  const element = new EventTarget();
  element.attributes = {}; element.setAttribute = (key, value) => element.attributes[key] = value;
  return element;
}
function makeSlider(value) { const element = new EventTarget(); element.value = value; return element; }
const button = makeButton(), centerButton = makeButton();
const slider = makeSlider('1'), countSlider = makeSlider('300'), sizeSlider = makeSlider('3');
const output = {}, countOutput = {}, sizeOutput = {}, status = {};
const controls = { querySelector: selector => ({
  '#polarity': button, '#force': slider, '#polarity-status': status,
  '#center-field': centerButton,
  '#particle-count': countSlider, '#particle-size': sizeSlider,
  'output[for="force"]': output, 'output[for="particle-count"]': countOutput,
  'output[for="particle-size"]': sizeOutput,
})[selector] };
const canvas = new EventTarget();
canvas.closest = () => ({ querySelector: () => controls });
const bounceButton = new EventTarget();
canvas.parentElement = { querySelector: selector => selector === '#bounce' ? bounceButton : null };
canvas.getBoundingClientRect = () => ({ left: 0, top: 0 });
const arcs = [];
let fillStyle;
const context = new Proxy({}, {
  get: (_, key) => key === 'arc' ? (x,y,r) => arcs.push({x,y,r,color:fillStyle}) : key === 'fillStyle' ? fillStyle : () => {},
  set: (_, key, value) => { if (key === 'fillStyle') fillStyle = value; return true; },
});
const input = { pointers: new Map(), keys: new Set() };
function snapshot(scene) { arcs.length = 0; scene.render(); return arcs.filter(arc => arc.r < 10); }
function event(name, props = {}) { const event = new Event(name); Object.assign(event, props); canvas.dispatchEvent(event); }
const start = performance.now();
let steps = 0;
for (const width of [280, 720]) for (const force of [0, 3]) {
  const scene = createScene();
  scene.init({ canvas, context, input, signal: new AbortController().signal });
  scene.resize(width, 400, 2); scene.resume();
  slider.value = String(force); slider.dispatchEvent(new Event('input'));
  assert.equal(output.value, String(force));
  for (let id = 0; id < 8; id++) input.pointers.set(id, { x: width/2, y: 200 });
  let previous = snapshot(scene);
  assert.equal(previous.length, 300);
  assert.ok(previous.every(dot => Object.values(testPalette).includes(dot.color)), 'dots use the shared shape palette');
  assert.equal(arcs.filter(arc => arc.r === 10).length, 4, 'central field has no visible black marker');
  bounceButton.dispatchEvent(new Event('click'));
  scene.update(1/60);
  const bounced = snapshot(scene);
  assert.notDeepEqual(bounced.map(({x,y})=>[x,y]), previous.map(({x,y})=>[x,y]), 'bounce spreads the particles');
  previous = bounced;
  for (let i = 0; i < 1200; i++) {
    if (i === 600) button.dispatchEvent(new Event('click'));
    scene.update(1/60); steps++;
    const current = snapshot(scene);
    for (let j = 0; j < current.length; j++) {
      const particle = current[j];
      assert.ok(Number.isFinite(particle.x) && Number.isFinite(particle.y));
      assert.ok(particle.x >= particle.r && particle.x <= width-particle.r);
      assert.ok(particle.y >= particle.r && particle.y <= 400-particle.r);
      const displacement = Math.hypot(particle.x-previous[j].x, particle.y-previous[j].y);
      if (displacement > 3.001) {
        assert.ok(previous.some((other, k) => k !== j
          && Math.hypot(other.x-previous[j].x, other.y-previous[j].y) <= particle.r+other.r+6.001),
        'large position correction follows a possible collision');
      }
      for (let k = j+1; k < current.length; k++) {
        const dx = particle.x-current[k].x, dy = particle.y-current[k].y;
        const minimumDistance = particle.r+current[k].r-.5;
        if (dx*dx+dy*dy < minimumDistance*minimumDistance) {
          const distance = Math.hypot(dx, dy);
          assert.fail(`particles do not overlap at width ${width}, force ${force}, step ${i}, pair ${j}/${k}: gap ${distance-(particle.r+current[k].r)}, points ${particle.x},${particle.y} and ${current[k].x},${current[k].y}`);
        }
      }
    }
    previous = current;
  }
  scene.pause(); const stopped = snapshot(scene); scene.update(1/60); assert.deepEqual(snapshot(scene), stopped);
  arcs.length = 0; button.dispatchEvent(new Event('click'));
  assert.ok(arcs.length > 0, 'paused polarity changes redraw immediately');
  scene.resume(); input.pointers.clear();
  event('pointermove', { pointerType: 'mouse', buttons: 0, clientX: 20, clientY: 30 });
  snapshot(scene); assert.equal(arcs.filter(arc => arc.r === 10).length, 1);
  event('pointerleave'); snapshot(scene); assert.equal(arcs.filter(arc => arc.r === 10).length, 0);
  event('keydown', { code: 'ArrowRight' }); input.keys.add('ArrowRight'); scene.update(1/60); input.keys.clear();
  snapshot(scene); assert.equal(arcs.filter(arc => arc.r === 10).length, 1);
  const prior = button.attributes['aria-pressed'];
  event('keydown', { code: 'KeyP', repeat: false }); assert.notEqual(button.attributes['aria-pressed'], prior);
  assert.equal(button.textContent, prior === 'true' ? '+극' : '−극');
  scene.resize(width === 280 ? 720 : 280, 300, 1);
  const resized = snapshot(scene); assert.equal(resized.length, 300);
  scene.destroy(); const pressed = button.attributes['aria-pressed']; button.dispatchEvent(new Event('click'));
  assert.equal(button.attributes['aria-pressed'], pressed);
  assert.deepEqual(snapshot(scene), []);
}
{
  const scene = createScene();
  scene.init({ canvas, context, input, signal: new AbortController().signal });
  scene.resize(720, 400, 1); scene.resume();
  slider.value = '0'; slider.dispatchEvent(new Event('input'));
  const before = snapshot(scene)[0];
  bounceButton.dispatchEvent(new Event('click'));
  scene.update(1/60);
  const after = snapshot(scene)[0];
  const radialX = before.x-360, radialY = before.y-200;
  const movedX = after.x-before.x, movedY = after.y-before.y;
  assert.ok(radialX*movedX+radialY*movedY > 0, 'bounce moves dots away from the center');
  assert.ok(Math.abs(radialX*movedY-radialY*movedX) < 1e-6, 'bounce has no upward or tangential bias');
  scene.destroy();
}
{
  const scene = createScene();
  scene.init({ canvas, context, input, signal: new AbortController().signal });
  scene.resize(720, 400, 1); scene.resume();
  assert.equal(snapshot(scene).length, 300);
  const initialDots = snapshot(scene);
  const initialMeanRadius = initialDots.reduce((sum, dot) => sum + Math.hypot(dot.x-360, dot.y-200), 0)/initialDots.length;
  for (let i=0;i<60;i++) scene.update(1/60);
  const attractedDots = snapshot(scene);
  const attractedMeanRadius = attractedDots.reduce((sum, dot) => sum + Math.hypot(dot.x-360, dot.y-200), 0)/attractedDots.length;
  assert.ok(attractedMeanRadius < initialMeanRadius, 'default center field attracts particles inward');
  const beforeGrow = snapshot(scene);
  countSlider.value = '600'; countSlider.dispatchEvent(new Event('input'));
  const afterGrow = snapshot(scene);
  assert.equal(afterGrow.length, 600);
  assert.deepEqual(afterGrow.slice(0, beforeGrow.length), beforeGrow, 'increasing count preserves existing dots and their colors');
  assert.ok(afterGrow.slice(beforeGrow.length).every(dot => Object.values(testPalette).includes(dot.color)),
    'newly added dots use the shared shape palette');
  assert.equal(countOutput.value, '600');
  sizeSlider.value = '6'; sizeSlider.dispatchEvent(new Event('input'));
  assert.ok(snapshot(scene).every(dot => dot.r === 6), 'size slider updates all dots');
  scene.update(1/60);
  assert.equal(snapshot(scene).length, 600, 'maximum particle count updates and renders');
  scene.resize(280, 400, 1);
  assert.equal(snapshot(scene).length, 600, 'selected count remains after resize');
  assert.ok(snapshot(scene).every(dot => dot.r === 6), 'custom size remains selected after resize');
  input.pointers.set(1, { x: 100, y: 100 });
  snapshot(scene);
  assert.equal(arcs.filter(arc => arc.r === 10).length, 1, 'central field has no marker while cursor field remains visible');
  centerButton.dispatchEvent(new Event('click'));
  snapshot(scene);
  assert.equal(arcs.filter(arc => arc.r === 10).length, 1, 'cursor field remains visible after center toggle');
  assert.equal(centerButton.attributes['aria-pressed'], 'false');
  assert.equal(centerButton.textContent, '중력 OFF');
  centerButton.dispatchEvent(new Event('click'));
  assert.equal(centerButton.textContent, '중력 ON');
  for (let i=0;i<30;i++) scene.update(1/60);
  const stressed = snapshot(scene);
  assert.equal(stressed.length, 600);
  assert.ok(stressed.every(dot => Number.isFinite(dot.x) && Number.isFinite(dot.y)
    && dot.x >= dot.r && dot.x <= 280-dot.r && dot.y >= dot.r && dot.y <= 400-dot.r),
  '600 particles remain finite and within bounds under maximum force');
  const beforeShrink = snapshot(scene);
  countSlider.value = '300'; countSlider.dispatchEvent(new Event('input'));
  assert.deepEqual(snapshot(scene), beforeShrink.slice(0, 300), 'decreasing count removes only the added dots');
  button.dispatchEvent(new Event('click'));
  assert.equal(button.textContent, '−극', 'polarity button label contains only the pole');
  button.dispatchEvent(new Event('click'));
  assert.equal(button.textContent, '+극', 'positive pole label contains only the pole');
  scene.destroy(); input.pointers.clear();
}
for (let i = 0; i < 100; i++) {
  const scene = createScene(); scene.init({ canvas, context, input, signal: new AbortController().signal });
  scene.resize(390, 400, 1); scene.update(1/60); scene.destroy();
}
console.log(`PASS: ${steps} steps, polarity/zero-distance/zero-force, particle & field caps, bounds/speed, hover/touch/keyboard, pause/resize and 100 lifecycle cycles (${Math.round(performance.now()-start)}ms Node run).`);
