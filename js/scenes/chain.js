import { loadMatter } from '../core/libraries.js';
import { ChainWorld } from '../physics/chain-world.js';
export function createScene() {
  let model, canvas, context, controls, controller, M;
  let width = 0, height = 0, dpr = 1, paused = false, lastFallen = -1;
  let bounceCount = 0;
  function reset(preserveBounce = false) {
    if (!preserveBounce)
      bounceCount = 0;
    model.reset(controls?.querySelector('#chain-preset').value || 'classic');
    lastFallen = -1;
    const status = controls?.querySelector('#chain-status');
    if (status)
      status.textContent = '공이 도미노를 향해 이동합니다.';
    scene.render();
  }
  const scene = {
    async init(ctx) {
      M = await loadMatter();
      if (ctx.signal.aborted)
        return;
      ({ canvas, context } = ctx);
      controls = (ctx.sceneRoot || canvas.closest('.scene')).querySelector('.scene-controls');
      model = new ChainWorld(M, controls?.querySelector('#chain-preset').value);
      controller = new AbortController();
      ctx.signal.addEventListener('abort', () => controller.abort(), { once: true, signal: controller.signal });
      const options = { signal: controller.signal };
      controls?.querySelector('#chain-preset').addEventListener('change', () => reset(), options);
      controls?.querySelector('#replay').addEventListener('click', () => reset(), options);
      canvas.parentElement?.querySelector('#bounce')?.addEventListener('click', () => {
        bounceCount = Math.min(bounceCount + 1, 7);
        const speed = 8 + (bounceCount - 1) * 2;
        M.Sleeping.set(model.ball, false);
        M.Body.setVelocity(model.ball, { x: 0, y: -speed });
      }, options);
    },
    update(dt) {
      if (!model || paused)
        return;
      model.update(dt);
      const fallen = model.fallen;
      if (fallen !== lastFallen) {
        lastFallen = fallen;
        const status = controls?.querySelector('#chain-status');
        if (status)
          status.textContent = `넘어진 도미노 ${fallen} / ${model.dominoes.length}`;
      }
    },
    render() {
      if (!model || !context || !width || !height)
        return;
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
      context.clearRect(0, 0, width, height);
      const scale = Math.min(width / 800, height / 500);
      context.save();
      context.translate((width - 800 * scale) / 2, (height - 500 * scale) / 2);
      context.scale(scale, scale);
      for (const body of [model.staticBodies[1], model.staticBodies[0], model.ball, ...model.dominoes]) {
        context.fillStyle = body.render.fillStyle;
        context.beginPath();
        if (body.circleRadius)
          context.arc(body.position.x, body.position.y, body.circleRadius, 0, Math.PI * 2);
        else {
          body.vertices.forEach((point, i) => i ? context.lineTo(point.x, point.y) : context.moveTo(point.x, point.y));
          context.closePath();
        }
        context.fill();
      }
      context.restore();
    },
    resize(w, h, nextDpr) { width = w; height = h; dpr = nextDpr; },
    pause() { paused = true; },
    resume() { paused = false; },
    destroy() { controller?.abort(); model?.destroy(); model = canvas = context = controls = null; },
  };
  return scene;
}
