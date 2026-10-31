import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import { readSource as readFile } from './helpers.mjs';
import { createRequire } from 'node:module';
const M = createRequire(import.meta.url)(process.argv[2] || fileURLToPath(new URL('./vendor/matter-0.20.0.cjs', import.meta.url)));
const cache = new Map();
async function moduleURL(file) {
  if (cache.has(file.href)) return cache.get(file.href);
  let source = await readFile(file, 'utf8');
  const matches = [...source.matchAll(/(?:from\s*|import\s*\()(['"])(\.[^'"]+)\1/g)];
  for (const match of matches) {
    const dependency = await moduleURL(new URL(match[2], file));
    source = source.replace(match[0], match[0].replace(match[2], dependency));
  }
  const result = `data:text/javascript;base64,${Buffer.from(source).toString('base64')}`;
  cache.set(file.href, result); return result;
}
const { SceneManager } = await import(await moduleURL(new URL('../js/core/scene-manager.js', import.meta.url)));
globalThis.document = new EventTarget(); document.hidden = false;
globalThis.window = new EventTarget(); window.Matter = M; window.devicePixelRatio = 2;
const frames = new Map(); let frameID = 0, observers = 0;
globalThis.requestAnimationFrame = callback => { frames.set(++frameID, callback); return frameID; };
globalThis.cancelAnimationFrame = id => frames.delete(id);
globalThis.ResizeObserver = class { observe() { observers++; } disconnect() { observers--; } };
const context = new Proxy({}, { get: () => () => {}, set: () => true });
function canvas() {
  const element = new EventTarget();
  element.getContext = () => context;
  element.getBoundingClientRect = () => ({ width: 390, height: 400 });
  element.closest = () => ({ querySelector: () => null });
  element.parentElement = { querySelector: selector => selector === 'svg' ? ({ style: { removeProperty() {} } }) : null };
  element.hasPointerCapture = () => false;
  element.matches = () => false;
  return element;
}
const names = ['home', 'gravity', 'elastic', 'magnetism', 'wave', 'cloth', 'chain', 'sandbox'];
const errors = [];
const manager = new SceneManager({ onError: error => errors.push(error.message) });
for (let i = 0; i < 100; i++) {
  const movedCanvas = canvas();
  const sceneRoot = movedCanvas.closest('.scene');
  movedCanvas.closest = () => null;
  assert.equal(await manager.mount(movedCanvas, { id: names[i % names.length] }, sceneRoot), true);
  assert.equal(frames.size, 1); assert.equal(observers, 1);
  const [id, callback] = frames.entries().next().value; frames.delete(id); callback(0);
  const [nextID, next] = frames.entries().next().value; frames.delete(nextID); next(1000/60);
}
manager.destroy(); assert.equal(frames.size, 0); assert.equal(observers, 0); assert.deepEqual(errors, []);
let finishInit, oldDestroyed = 0, oldInput, oldSignal;
const delayed = { createScene: () => ({
  init(ctx) { oldInput = ctx.input; oldSignal = ctx.signal; return new Promise(resolve => finishInit = resolve); },
  destroy() { oldDestroyed++; },
}) };
const replacement = { createScene: () => ({ init() { assert.equal(oldDestroyed, 1); }, resize() {}, render() {}, update() {}, pause() {}, resume() {}, destroy() {} }) };
const racing = new SceneManager({ loadScene: async id => id === 'old' ? delayed : replacement });
const pending = racing.mount(canvas(), { id: 'old' }); await Promise.resolve();
assert.equal(oldDestroyed, 0);
await racing.mount(canvas(), { id: 'new' });
assert.equal(oldDestroyed, 1); assert.equal(oldSignal.aborted, true); assert.equal(oldInput.controller.signal.aborted, true);
finishInit(); await pending; assert.equal(oldDestroyed, 1); assert.equal(frames.size, 1);
racing.destroy(); assert.equal(frames.size, 0); assert.equal(observers, 0);
console.log('PASS: 100 actual home/seven-scene switches, real Matter engines, single scheduler, cleanup before next init, stale async init and exactly-once destroy.');
