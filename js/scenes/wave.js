import { palette, randomShapeColor } from '../core/palette.js';
import { RippleGrid } from '../physics/ripple-grid.js';

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

export function createScene() {
  let canvas, context, input, controller, grid;
  let width = 0, height = 0, dpr = 1, paused = false;
  let speed = 180, damping = 1.8;
  const pending = [];
  const color = randomShapeColor();
  const cursor = { x: .5, y: .5 };
  function pulse(x, y) {
    if (!paused && pending.length < 16) pending.push({ x: clamp(x, 0, 1), y: clamp(y, 0, 1) });
  }
  const scene = {
    init(ctx) {
      if (ctx.signal.aborted) return;
      ({ canvas, context, input } = ctx);
      controller = new AbortController();
      ctx.signal.addEventListener('abort', () => controller.abort(), { once: true, signal: controller.signal });
      const options = { signal: controller.signal };
      canvas.parentElement?.querySelector('#bounce')?.addEventListener('click', () => pulse(.5, .5), options);
      const controls = (ctx.sceneRoot || canvas.closest('.scene')).querySelector('.scene-controls');
      controls?.querySelectorAll('input[type="range"]').forEach(slider => {
        slider.addEventListener('input', () => {
          if (slider.name === 'speed') speed = clamp(Number(slider.value), 100, 300);
          else damping = clamp(Number(slider.value), .4, 4);
          controls.querySelector(`output[for="${slider.id}"]`).value = slider.value;
        }, options);
      });
      canvas.addEventListener('pointerdown', event => {
        if (event.button !== 0 || input.pointers.size > 4 || !width || !height) return;
        const point = input.pointers.get(event.pointerId);
        if (point && point.y >= height*.4) pulse(point.x/width, (point.y-height*.4)/(height*.6));
      }, options);
      canvas.addEventListener('keydown', event => {
        const directions = { ArrowLeft: [-.04, 0], ArrowRight: [.04, 0], ArrowUp: [0, -.04], ArrowDown: [0, .04] };
        if (directions[event.code]) {
          event.preventDefault();
          cursor.x = clamp(cursor.x+directions[event.code][0], .04, .96);
          cursor.y = clamp(cursor.y+directions[event.code][1], .04, .96);
          if (paused) scene.render();
        }
        if (event.code === 'Space' || event.code === 'Enter') {
          event.preventDefault();
          if (!event.repeat) pulse(cursor.x, cursor.y);
        }
      }, options);
    },
    update(fixedDt) {
      if (paused || !grid) return;
      for (const point of pending) grid.disturb(point.x, point.y);
      pending.length = 0;
      grid.update(fixedDt, speed, damping);
    },
    render() {
      if (!context || !grid) return;
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
      context.clearRect(0, 0, width, height);
      context.strokeStyle = color; context.lineWidth = 1;
      const rowStride = Math.max(1, Math.round(12/grid.dy));
      for (let y = 1; y < grid.rows-1; y += rowStride) {
        context.beginPath();
        for (let x = 0; x < grid.columns; x++) {
          const offset = clamp(grid.height[y*grid.columns+x]*5, -20, 20);
          const px = x*grid.dx, py = height*.4 + clamp(y*grid.dy+offset, 0, height*.6);
          if (x) context.lineTo(px, py); else context.moveTo(px, py);
        }
        context.stroke();
      }
      if (canvas.matches(':focus-visible')) {
        context.beginPath(); context.arc(cursor.x*width, height*.4+cursor.y*height*.6, 6, 0, Math.PI*2); context.stroke();
      }
    },
    resize(nextWidth, nextHeight, nextDpr) {
      dpr = nextDpr;
      if (nextWidth === width && nextHeight === height) return;
      width = nextWidth; height = nextHeight;
      grid?.destroy();
      grid = new RippleGrid(width, height*.6, width < 480);
      pending.length = 0; cursor.x = cursor.y = .5;
    },
    pause() { paused = true; pending.length = 0; },
    resume() { paused = false; },
    destroy() {
      controller?.abort(); grid?.destroy(); pending.length = 0;
      grid = canvas = context = input = null;
    },
  };
  return scene;
}
