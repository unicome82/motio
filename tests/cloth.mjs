import assert from 'node:assert/strict';
import { readSource as readFile } from './helpers.mjs';
const url = source => `data:text/javascript;base64,${Buffer.from(source).toString('base64')}`;
const meshURL = url(await readFile(new URL('../js/physics/cloth-mesh.js', import.meta.url), 'utf8'));
const { ClothMesh } = await import(meshURL);
let steps = 0;
for (const width of [280, 720]) {
  const originalRandom = Math.random;
  let anchorDraw = 0;
  Math.random = () => anchorDraw++ === 0 ? 0 : (width < 480 ? 12.25 : 16.25) / (width < 480 ? 142 : 220);
  const mesh = new ClothMesh(width, 450);
  Math.random = originalRandom;
  assert.ok(mesh.nodes.length <= 221 && mesh.iterations <= 16);
  const anchors = mesh.nodes.filter(node => node.anchor).map(node => ({ node, x: node.x, y: node.y }));
  assert.equal(anchors.length, 2);
  const center = Math.floor(mesh.nodes.length / 2);
  const freeNode = mesh.nodes.find(node => !node.pinned);
  const previousY = freeNode.previousY;
  mesh.bounce();
  assert.notEqual(freeNode.previousY, previousY, 'bounce adds upward velocity to the cloth');
  for (const node of mesh.nodes) { node.previousX = node.x; node.previousY = node.y; }
  for (let i = 0; i < 1800; i++) {
    const targets = i < 600 ? new Map([[center, { x: i%2 ? -1000 : 2000, y: i%2 ? -1000 : 2000 }]]) : new Map();
    mesh.update(1/60, targets); steps++;
    for (const node of mesh.nodes) {
      assert.ok(Number.isFinite(node.x) && Number.isFinite(node.y));
      assert.ok(node.x >= 4 && node.x <= width-4 && node.y >= 4 && node.y <= 446);
    }
    for (const { node, x, y } of anchors) { assert.equal(node.x, x); assert.equal(node.y, y); }
  }
  const error = Math.max(...mesh.links.map(link => {
    const a = mesh.nodes[link.a], b = mesh.nodes[link.b];
    return Math.abs(Math.hypot(b.x-a.x, b.y-a.y)-link.length)/link.length;
  }));
  assert.ok(error < .15, `settled constraint error ${error}`);
  mesh.togglePin(center); const node = mesh.nodes[center]; const x = node.x, y = node.y;
  for (let i = 0; i < 120; i++) mesh.update(1/60);
  assert.equal(node.x, x); assert.equal(node.y, y);
  mesh.togglePin(center); assert.equal(node.pinned, false);
  mesh.togglePin(0); assert.equal(mesh.nodes[0].pinned, true);
  assert.equal(mesh.nearest(node.x, node.y), center);
  mesh.destroy(); assert.equal(mesh.nodes.length, 0); assert.equal(mesh.links.length, 0);
}
const sceneSource = (await readFile(new URL('../js/scenes/cloth.js', import.meta.url), 'utf8')).replace("'../physics/cloth-mesh.js'", JSON.stringify(meshURL));
const { createScene } = await import(url(sceneSource));
const button = new EventTarget(); button.setAttribute = () => {};
const status = {};
const controls = { querySelector: selector => selector === '#pin-mode' ? button : status };
const canvas = new EventTarget(); canvas.closest = () => ({ querySelector: () => controls }); canvas.matches = () => true; canvas.focus = () => {};
let dots = [];
const context = new Proxy({}, { get: (_, key) => key === 'arc' ? (x,y,r) => dots.push({x,y,r}) : () => {}, set: () => true });
const input = { pointers: new Map(), keys: new Set() };
const render = scene => { dots = []; scene.render(); return dots.filter(dot => dot.r < 7); };
const key = code => { const event = new Event('keydown'); Object.assign(event, { code, repeat: false }); canvas.dispatchEvent(event); };
const scene = createScene(); scene.init({ canvas, context, input, signal: new AbortController().signal });
scene.resize(390,400,2); scene.resume(); const initial = render(scene);
assert.equal(Math.min(...initial.map(dot => dot.y)), 160);
assert.equal(Math.max(...initial.map(dot => dot.y)), 360);
scene.update(1/60); assert.notDeepEqual(render(scene), initial);
key('KeyP'); assert.match(status.textContent, /고정했습니다/);
key('KeyP'); assert.match(status.textContent, /해제했습니다/);
const node = render(scene)[71];
input.pointers.set(1, node);
const down = new Event('pointerdown'); Object.assign(down, { button: 0, pointerId: 1 }); canvas.dispatchEvent(down);
input.pointers.set(1, { x: 300, y: 80 }); scene.update(1/60);
const cancel = new Event('pointercancel'); Object.assign(cancel, { pointerId: 1 }); canvas.dispatchEvent(cancel); input.pointers.clear();
scene.pause(); const stopped = render(scene); scene.update(1/60); assert.deepEqual(render(scene), stopped);
scene.resume(); button.dispatchEvent(new Event('click')); assert.match(button.textContent, /켜짐/);
scene.resize(720,450,1); assert.equal(render(scene).length, 221);
scene.destroy(); assert.deepEqual(render(scene), []);
for (let i = 0; i < 100; i++) {
  const next = createScene(); next.init({ canvas, context, input, signal: new AbortController().signal });
  next.resize(390,400,1); next.destroy();
}
const before = button.textContent; button.dispatchEvent(new Event('click')); assert.equal(button.textContent, before);
console.log(`PASS: ${steps} cloth stress steps, constraints, anchors/pins, bounds, drag/cancel, pause/resize, render and 100 lifecycle cycles.`);
