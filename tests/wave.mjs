import assert from 'node:assert/strict';
import { readSource as readFile } from './helpers.mjs';
const url = source => `data:text/javascript;base64,${Buffer.from(source).toString('base64')}`;
const gridSource = await readFile(new URL('../js/physics/ripple-grid.js', import.meta.url), 'utf8');
const gridURL = url(gridSource);
const { RippleGrid } = await import(gridURL);
function norm(grid) {
  let value = 0;
  for (let i = 0; i < grid.height.length; i++) {
    assert.ok(Number.isFinite(grid.height[i]) && Number.isFinite(grid.velocity[i]));
    assert.ok(Math.abs(grid.height[i]) < 100, 'bounded displacement');
    value += grid.height[i]**2+grid.velocity[i]**2;
  }
  return value;
}
let steps = 0;
for (const [width, height] of [[280, 300], [720, 500], [2, 2]]) {
  for (const speed of [100, 300]) for (const damping of [.4, 4]) {
    const grid = new RippleGrid(width, height, width < 480);
    grid.disturb(.5, .5);
    let initial = 0;
    for (let i = 0; i < 1800; i++) {
      grid.update(1/60, speed, damping); steps++;
      if (i === 10) initial = norm(grid);
      if (i%100 === 0) norm(grid);
    }
    assert.ok(norm(grid) < initial*.01, 'wave decays at control extremes');
    for (let x = 0; x < grid.columns; x++) {
      assert.equal(grid.height[x], 0); assert.equal(grid.height[(grid.rows-1)*grid.columns+x], 0);
    }
    grid.destroy(); assert.equal(grid.height.length, 0); assert.equal(grid.velocity.length, 0);
  }
}
const grid = new RippleGrid(720, 500);
for (let i = 0; i < 1200; i++) {
  grid.disturb((i%100)/100, ((i*7)%100)/100, 1000);
  grid.update(1/60, i%2 ? 300 : 100, i%2 ? .4 : 4);
}
norm(grid);
assert.ok(new RippleGrid(390, 500, true).height.length < new RippleGrid(390, 500).height.length);
const sceneSource = (await readFile(new URL('../js/scenes/wave.js', import.meta.url), 'utf8')).replace("'../physics/ripple-grid.js'", JSON.stringify(gridURL));
const { createScene } = await import(url(sceneSource));
const sliders = ['speed', 'damping'].map(name => Object.assign(new EventTarget(), { id: name, name, value: name === 'speed' ? '300' : '.4' }));
const outputs = {};
const controls = { querySelectorAll: () => sliders, querySelector: selector => outputs[selector] ||= {} };
const bounceButton = new EventTarget();
const canvas = new EventTarget(); canvas.closest = () => ({ querySelector: () => controls }); canvas.matches = () => false;
canvas.parentElement = { querySelector: selector => selector === '#bounce' ? bounceButton : null };
let points = [];
const context = new Proxy({}, { get: (_, key) => ['lineTo','moveTo'].includes(key) ? (x, y) => points.push([x, y]) : () => {}, set: () => true });
const input = { pointers: new Map(), keys: new Set() };
function render(scene) { points = []; scene.render(); return points; }
function pointer(id, x, y) {
  input.pointers.set(id, { x, y });
  const event = new Event('pointerdown'); Object.assign(event, { button: 0, pointerId: id }); canvas.dispatchEvent(event);
}
const scene = createScene(); scene.init({ canvas, context, input, signal: new AbortController().signal });
scene.resize(390, 400, 2); scene.resume(); const flat = render(scene);
assert.ok(Math.min(...flat.map(point => point[1])) > 160, 'wave lines leave the top 40% clear');
bounceButton.dispatchEvent(new Event('click')); scene.update(1/60);
assert.notDeepEqual(render(scene), flat, 'bounce button creates a centered wave');
pointer(1, 100, 100); pointer(2, 280, 300); input.pointers.clear();
scene.update(1/60); assert.notDeepEqual(render(scene), flat, 'short taps survive until fixed step');
scene.pause(); const stopped = render(scene); scene.update(1/60); assert.deepEqual(render(scene), stopped);
points = [];
const arrow = new Event('keydown'); Object.assign(arrow, { code: 'ArrowRight', repeat: false }); canvas.dispatchEvent(arrow);
assert.ok(points.length > 0, 'paused cursor movement redraws immediately');
scene.resume(); sliders.forEach(slider => slider.dispatchEvent(new Event('input')));
assert.equal(outputs['output[for="speed"]'].value, '300');
scene.resize(280, 300, 1); const reset = render(scene);
const key = new Event('keydown'); Object.assign(key, { code: 'Enter', repeat: false }); canvas.dispatchEvent(key);
scene.update(1/60); assert.notDeepEqual(render(scene), reset);
scene.destroy(); assert.deepEqual(render(scene), []);
for (let i = 0; i < 100; i++) {
  const next = createScene(); next.init({ canvas, context, input, signal: new AbortController().signal });
  next.resize(390, 400, 1); next.destroy();
}
sliders.forEach(slider => slider.dispatchEvent(new Event('input')));
canvas.dispatchEvent(key);
console.log(`PASS: ${steps} extreme-parameter steps, 1200 repeated impulses/speed changes, decay, fixed edges, mobile quality, multi-tap, pause, keyboard, resize and 100 lifecycle cycles.`);
