import { palette, randomShapeColor } from '../core/palette.js';
import { ClothMesh } from '../physics/cloth-mesh.js';

export function createScene() {
  let canvas, context, input, controller, mesh, controls;
  let width = 0, height = 0, dpr = 1, paused = false, pinMode = false, selected = 0;
  const grabs = new Map();
  const color = randomShapeColor();
  function toggleSelected() {
    mesh?.togglePin(selected);
    const node = mesh?.nodes[selected];
    const status = controls?.querySelector('#pin-status');
    if (status && node) status.textContent = node.anchor ? '초기 고정점은 유지됩니다.' : node.pinned ? '선택한 점을 고정했습니다.' : '선택한 점의 고정을 해제했습니다.';
  }
  return {
    init(ctx) {
      if (ctx.signal.aborted) return;
      ({ canvas, context, input } = ctx);
      controls = (ctx.sceneRoot || canvas.closest('.scene')).querySelector('.scene-controls');
      controller = new AbortController();
      ctx.signal.addEventListener('abort', () => controller.abort(), { once: true, signal: controller.signal });
      const options = { signal: controller.signal };
      canvas.parentElement?.querySelector('#bounce')?.addEventListener('click', () => mesh?.bounce(), options);
      const button = controls?.querySelector('#pin-mode');
      button?.addEventListener('click', () => {
        pinMode = !pinMode; grabs.clear();
        button.setAttribute('aria-pressed', String(pinMode));
        button.textContent = pinMode ? '핀 모드 켜짐' : '핀 추가·해제';
        controls.querySelector('#pin-status').textContent = pinMode ? '점을 눌러 고정하거나 해제하세요. 초기 고정점은 유지됩니다.' : '점을 드래그해 천을 움직일 수 있습니다.';
      }, options);
      canvas.addEventListener('pointerdown', event => {
        if (paused || !mesh || event.button !== 0 || grabs.size >= 4) return;
        const pointer = input.pointers.get(event.pointerId);
        if (!pointer) return;
        const index = mesh.nearest(pointer.x, pointer.y);
        if (index < 0) return;
        selected = index;
        if (pinMode) toggleSelected();
        else if (!mesh.nodes[index].pinned && ![...grabs.values()].includes(index)) grabs.set(event.pointerId, index);
        canvas.focus({ preventScroll: true });
      }, options);
      for (const name of ['pointerup', 'pointercancel', 'lostpointercapture']) canvas.addEventListener(name, event => grabs.delete(event.pointerId), options);
      canvas.addEventListener('blur', () => grabs.clear(), options);
      canvas.addEventListener('keydown', event => {
        if (!mesh || paused) return;
        if (event.code === 'KeyN' && !event.repeat) { selected = (selected+1)%mesh.nodes.length; event.preventDefault(); }
        if (event.code === 'KeyP' && !event.repeat) { toggleSelected(); event.preventDefault(); }
        if (['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.code)) event.preventDefault();
      }, options);
    },
    update(fixedDt) {
      if (paused || !mesh) return;
      const targets = new Map();
      for (const [id, index] of grabs) {
        const pointer = input.pointers.get(id);
        if (pointer) targets.set(index, pointer); else grabs.delete(id);
      }
      const x = Number(input.keys.has('ArrowRight'))-Number(input.keys.has('ArrowLeft'));
      const y = Number(input.keys.has('ArrowDown'))-Number(input.keys.has('ArrowUp'));
      const node = mesh.nodes[selected];
      if ((x || y) && !targets.has(selected)) targets.set(selected, { x: node.x+x*3, y: node.y+y*3 });
      mesh.update(fixedDt, targets);
    },
    render() {
      if (!context || !mesh) return;
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
      context.clearRect(0, 0, width, height);
      context.strokeStyle = color; context.lineWidth = 1;
      context.beginPath();
      for (const link of mesh.links) {
        if (!link.visible) continue;
        const a = mesh.nodes[link.a], b = mesh.nodes[link.b];
        context.moveTo(a.x, a.y); context.lineTo(b.x, b.y);
      }
      context.stroke();
      for (const node of mesh.nodes) {
        context.fillStyle = node.pinned ? palette.ink : color;
        context.beginPath(); context.arc(node.x, node.y, node.pinned ? 4 : 1.5, 0, Math.PI*2); context.fill();
      }
      if (canvas.matches(':focus-visible')) {
        const node = mesh.nodes[selected]; context.strokeStyle = palette.blue;
        context.beginPath(); context.arc(node.x, node.y, 7, 0, Math.PI*2); context.stroke();
      }
    },
    resize(nextWidth, nextHeight, nextDpr) {
      dpr = nextDpr;
      if (width === nextWidth && height === nextHeight) return;
      width = nextWidth; height = nextHeight;
      grabs.clear(); mesh?.destroy(); mesh = new ClothMesh(width, height);
      selected = Math.floor(mesh.nodes.length/2);
      if (controls) controls.querySelector('#pin-status').textContent = '크기에 맞춰 천을 재배치했습니다. 추가한 핀은 초기화됩니다.';
    },
    pause() { paused = true; grabs.clear(); },
    resume() { paused = false; },
    destroy() {
      controller?.abort(); mesh?.destroy(); grabs.clear();
      mesh = canvas = context = input = controls = null;
    },
  };
}
