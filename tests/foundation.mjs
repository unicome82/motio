import assert from 'node:assert/strict';
import { readSource as readFile } from './helpers.mjs';

const source = await readFile(new URL('../js/core/scene-manager.js', import.meta.url), 'utf8');
const inputSource = await readFile(new URL('../js/core/input-manager.js', import.meta.url), 'utf8');
const inputURL = `data:text/javascript;base64,${Buffer.from(inputSource).toString('base64')}`;
const managerURL = `data:text/javascript;base64,${Buffer.from(source.replace("'./input-manager.js'", JSON.stringify(inputURL))).toString('base64')}`;
const { SceneManager } = await import(managerURL);
const frames = new Map();
let nextFrame = 0;
globalThis.requestAnimationFrame = callback => { frames.set(++nextFrame, callback); return nextFrame; };
globalThis.cancelAnimationFrame = id => frames.delete(id);
globalThis.document = new EventTarget();
document.hidden = false;
globalThis.window = new EventTarget();
window.devicePixelRatio = 3;
let observers = 0;
globalThis.ResizeObserver = class {
  observe() { observers++; }
  disconnect() { observers--; }
};
function canvas() {
  const element = new EventTarget();
  element.getContext = () => ({});
  element.getBoundingClientRect = () => ({ width: 400, height: 300 });
  element.hasPointerCapture = () => false;
  return element;
}
let destroyed = 0;
let updates = 0;
let renders = 0;
let resized;
const sceneModule = { createScene: () => ({
  init() {}, update(dt) { assert.equal(dt, 1/60); updates++; }, render() { renders++; },
  resize(...args) { resized = args; }, pause() {}, resume() {}, destroy() { destroyed++; },
}) };
const manager = new SceneManager({ loadScene: async () => sceneModule, onError: error => { throw error; } });
for (let i = 0; i < 100; i++) {
  await manager.mount(canvas(), { id: 'gravity' });
  assert.equal(frames.size, 1);
  assert.equal(observers, 1);
}
assert.equal(destroyed, 99);
assert.deepEqual(resized, [400, 300, 2]);
function frame(time) {
  const [id, callback] = frames.entries().next().value;
  frames.delete(id); callback(time);
}
frame(0);
const initialRenders = renders;
frame(1000/120);
assert.equal(renders, initialRenders, '120Hz callbacks without physics steps skip canvas redraw');
frame(1000/60);
assert.equal(renders, initialRenders + 1);
updates = 0;
frame(10000);
assert.ok(updates > 0 && updates <= 4);
manager.setPaused(true); assert.equal(frames.size, 0);
manager.setPaused(false); assert.equal(frames.size, 1);
document.hidden = true; document.dispatchEvent(new Event('visibilitychange')); assert.equal(frames.size, 0);
document.hidden = false; document.dispatchEvent(new Event('visibilitychange')); assert.equal(frames.size, 1);
manager.destroy(); assert.equal(frames.size, 0); assert.equal(observers, 0); assert.equal(destroyed, 100);

const resolvers = [];
const racing = new SceneManager({ loadScene: () => new Promise(resolve => resolvers.push(resolve)) });
const first = racing.mount(canvas(), { id: 'gravity' });
const second = racing.mount(canvas(), { id: 'elastic' });
resolvers[1](sceneModule); await second;
resolvers[0](sceneModule); await first;
assert.equal(frames.size, 1); assert.equal(observers, 1);
racing.destroy(); assert.equal(frames.size, 0); assert.equal(observers, 0);

const routerSource = await readFile(new URL('../js/core/router.js', import.meta.url), 'utf8');
const { Router } = await import(`data:text/javascript;base64,${Buffer.from(routerSource).toString('base64')}`);
globalThis.location = { hash: '#gravity' };
const routes = [];
const router = new Router(route => routes.push(route));
location.hash = '#elastic'; window.dispatchEvent(new Event('hashchange'));
location.hash = '#main'; window.dispatchEvent(new Event('hashchange'));
assert.deepEqual(routes, ['gravity', 'elastic', 'home']);
router.destroy();
location.hash = '#wave'; window.dispatchEvent(new Event('hashchange'));
assert.equal(routes.length, 3);
console.log('PASS: 100 scene switches, single RAF, capped fixed step, DPR/resize, pause/visibility, async race, teardown and hash router.');
