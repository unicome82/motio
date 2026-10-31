import { InputManager } from './input-manager.js';

const FIXED_DT = 1 / 60;
const MAX_STEPS = 4;
const sceneLoaders = {
  home: () => import('../scenes/home.js?v=balanced-colors-2'),
  gravity: () => import('../scenes/gravity.js'),
  elastic: () => import('../scenes/elastic.js'),
  magnetism: () => import('../scenes/magnetism.js'),
  wave: () => import('../scenes/wave.js'),
  cloth: () => import('../scenes/cloth.js'),
  chain: () => import('../scenes/chain.js'),
  sandbox: () => import('../scenes/sandbox.js'),
};
const loadScene = id => Object.hasOwn(sceneLoaders, id) ? sceneLoaders[id]() : import('../scenes/empty-scene.js');

export class SceneManager {
  constructor({ loadScene: sceneLoader = loadScene, onError = console.error } = {}) {
    this.loadScene = sceneLoader;
    this.onError = onError;
    this.scene = null;
    this.pending = this.active = null;
    this.raf = null;
    this.generation = 0;
    this.userPaused = false;
    this.controller = new AbortController();
    document.addEventListener('visibilitychange', () => this.syncPause(), { signal: this.controller.signal });
    this.tick = this.tick.bind(this);
  }
  async mount(canvas, experiment, sceneRoot = canvas.closest?.('.scene')) {
    this.unmount();
    const generation = this.generation;
    const loading = new AbortController();
    this.loading = loading;
    let candidate, resource;
    try {
      const module = await this.loadScene(experiment.id, loading.signal);
      if (generation !== this.generation || loading.signal.aborted) return;
      candidate = module.createScene();
      const context = canvas.getContext('2d');
      if (!context) throw new Error('Canvas2D를 사용할 수 없습니다.');
      resource = { scene: candidate, input: new InputManager(canvas), disposed: false };
      this.pending = resource;
      this.input = resource.input;
      await candidate.init({ canvas, context, input: resource.input, experiment, sceneRoot, signal: loading.signal });
      if (generation !== this.generation || loading.signal.aborted) { this.dispose(resource); return; }
      this.pending = null;
      this.active = resource;
      this.scene = candidate;
      this.canvas = canvas;
      this.observer = new ResizeObserver(() => this.resize());
      this.observer.observe(canvas);
      window.addEventListener('resize', () => this.resize(), { signal: loading.signal });
      this.resize();
      this.syncPause();
      return true;
    } catch (error) {
      if (resource) this.dispose(resource); else candidate?.destroy();
      if (generation === this.generation && !loading.signal.aborted) {
        this.unmount();
        this.onError(error);
      }
    }
  }
  resize() {
    if (!this.scene) return;
    const { width, height } = this.canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, this.scene.maxDpr || 2);
    this.canvas.width = Math.max(1, Math.round(width * dpr));
    this.canvas.height = Math.max(1, Math.round(height * dpr));
    this.scene.resize(width, height, dpr);
    this.scene.render(0);
  }
  setPaused(value) { this.userPaused = value; this.syncPause(); }
  syncPause() {
    this.stop();
    this.input?.clear();
    if (!this.scene) return;
    if (this.userPaused || document.hidden) this.scene.pause();
    else {
      this.scene.resume();
      this.lastTime = null;
      this.accumulator = 0;
      this.raf = requestAnimationFrame(this.tick);
    }
  }
  tick(time) {
    this.raf = null;
    if (!this.scene || this.userPaused || document.hidden) return;
    const delta = this.lastTime === null ? 0 : Math.min((time - this.lastTime) / 1000, FIXED_DT * MAX_STEPS);
    this.lastTime = time;
    this.accumulator += delta;
    let steps = 0;
    while (this.accumulator >= FIXED_DT && steps < MAX_STEPS) {
      this.scene.update(FIXED_DT, this.input);
      this.accumulator -= FIXED_DT;
      steps++;
    }
    if (steps > 0) this.scene.render(this.accumulator / FIXED_DT);
    this.raf = requestAnimationFrame(this.tick);
  }
  stop() {
    if (this.raf !== null) cancelAnimationFrame(this.raf);
    this.raf = null;
  }
  dispose(resource) {
    if (!resource || resource.disposed) return;
    resource.disposed = true;
    resource.input.destroy();
    resource.scene.destroy();
  }
  unmount() {
    this.generation++;
    this.loading?.abort();
    this.stop();
    this.observer?.disconnect();
    this.dispose(this.pending);
    this.dispose(this.active);
    this.pending = this.active = null;
    this.scene = this.input = this.canvas = this.observer = null;
    this.userPaused = false;
  }
  destroy() { this.unmount(); this.controller.abort(); }
}
