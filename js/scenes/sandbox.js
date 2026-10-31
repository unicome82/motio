import { palette } from '../core/palette.js';
import { loadMatter } from '../core/libraries.js';
import { SandboxWorld } from '../physics/sandbox-world.js';
export function createScene() {
  let M, model, canvas, context, input, controls, controller, selected, grab;
  let width = 0, height = 0, dpr = 1, paused = false;
  const labels = { circle: '원', box: '상자', ramp: '고정 경사면', static: '고정 발판' };
  function status(message) { const node = controls?.querySelector('#editor-status'); if (node)
    node.textContent = message; }
  function sync() {
    if (!controls || !model)
      return;
    for (const name of ['mass', 'friction', 'restitution']) {
      const slider = controls.querySelector(`#${name}`);
      slider.disabled = !selected || (name === 'mass' && selected.isStatic);
      const value = selected ? (name === 'mass' && selected.isStatic ? 2 : selected[name]) : Number(slider.defaultValue);
      slider.value = String(value);
      controls.querySelector(`output[for="${name}"]`).value = name === 'mass' && selected?.isStatic ? '고정' : String(Number(value.toFixed(2)));
    }
    controls.querySelector('#remove-body').disabled = !selected;
    controls.querySelectorAll('[data-add]').forEach(button => button.disabled = model.bodies.length >= model.limit);
    status(`${selected ? labels[selected.plugin.sandboxType] + ' 선택됨' : '물체를 선택하세요'} · ${model.bodies.length}/${model.limit}`);
    scene.render();
  }
  function release() {
    if (grab?.constraint && model)
      M.Composite.remove(model.engine.world, grab.constraint);
    grab = null;
  }
  function removeSelected() {
    if (!selected || !model)
      return;
    release();
    model.remove(selected);
    selected = model.bodies.at(-1);
    sync();
  }
  const scene = {
    async init(ctx) {
      M = await loadMatter();
      if (ctx.signal.aborted)
        return;
      ({ canvas, context, input } = ctx);
      controls = (ctx.sceneRoot || canvas.closest('.scene')).querySelector('.scene-controls');
      controller = new AbortController();
      ctx.signal.addEventListener('abort', () => controller.abort(), { once: true, signal: controller.signal });
      const options = { signal: controller.signal };
      controls?.querySelectorAll('[data-add]').forEach(button => button.addEventListener('click', () => {
        if (!model)
          return;
        const body = model.add(button.dataset.add);
        if (!body) {
          status('추가할 공간이 없거나 물체 수 제한에 도달했습니다. 물체를 이동·삭제해 주세요.');
          return;
        }
        selected = body;
        sync();
      }, options));
      controls?.querySelectorAll('input[type="range"]').forEach(slider => slider.addEventListener('input', () => {
        if (!model)
          return;
        const value = Number(slider.value);
        if (slider.name === 'gravity')
          model.gravity = value;
        else if (selected) {
          if (slider.name === 'mass' && !selected.isStatic)
            M.Body.setMass(selected, value);
          else if (slider.name !== 'mass')
            selected[slider.name] = value;
        }
        controls.querySelector(`output[for="${slider.id}"]`).value = slider.value;
      }, options));
      controls?.querySelector('#remove-body').addEventListener('click', removeSelected, options);
      canvas.parentElement?.querySelector('#bounce')?.addEventListener('click', () => {
        release();
        for (const body of model.bodies) {
          if (body.isStatic)
            continue;
          M.Sleeping.set(body, false);
          M.Body.setVelocity(body, { x: 0, y: -8 });
        }
      }, options);
      canvas.addEventListener('pointerdown', event => {
        if (!model || grab || event.button !== 0)
          return;
        const pointer = input.pointers.get(event.pointerId);
        if (!pointer)
          return;
        // Exact hit first; nearby small bodies receive a larger touch target.
        const exact = M.Query.point(model.bodies, pointer).at(-1);
        const nearby = model.bodies.reduce((nearest, body) => Math.hypot(body.position.x - pointer.x, body.position.y - pointer.y) < Math.hypot((nearest?.position.x ?? Infinity) - pointer.x, (nearest?.position.y ?? Infinity) - pointer.y) ? body : nearest, null);
        selected = exact || (nearby && Math.hypot(nearby.position.x - pointer.x, nearby.position.y - pointer.y) <= 28 ? nearby : null);
        sync();
        if (!selected)
          return;
        const offset = M.Vector.sub(selected.position, pointer);
        grab = { id: event.pointerId, body: selected, offset };
        if (!paused && !selected.isStatic) {
          grab.constraint = M.Constraint.create({ pointA: { x: pointer.x, y: pointer.y }, bodyB: selected, pointB: M.Vector.neg(offset), stiffness: .15, damping: .2, length: 0 });
          M.Composite.add(model.engine.world, grab.constraint);
        }
        canvas.focus({ preventScroll: true });
      }, options);
      canvas.addEventListener('pointermove', event => {
        if (!grab || event.pointerId !== grab.id)
          return;
        const pointer = input.pointers.get(event.pointerId);
        if (pointer && (paused || grab.body.isStatic)) {
          model.move(grab.body, pointer.x + grab.offset.x, pointer.y + grab.offset.y);
          scene.render();
        }
      }, options);
      for (const name of ['pointerup', 'pointercancel', 'lostpointercapture'])
        canvas.addEventListener(name, event => { if (event.pointerId === grab?.id)
          release(); }, options);
      canvas.addEventListener('blur', release, options);
      canvas.addEventListener('keydown', event => {
        if (!model)
          return;
        if (event.code === 'KeyN' && !event.repeat) {
          selected = model.bodies[(model.bodies.indexOf(selected) + 1) % model.bodies.length];
          sync();
          event.preventDefault();
        }
        if (event.code === 'Delete' || event.code === 'Backspace') {
          removeSelected();
          event.preventDefault();
        }
        if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.code)) {
          event.preventDefault();
          if (!selected)
            return;
          const x = Number(event.code === 'ArrowRight') - Number(event.code === 'ArrowLeft');
          const y = Number(event.code === 'ArrowDown') - Number(event.code === 'ArrowUp');
          model.move(selected, selected.position.x + x * 8, selected.position.y + y * 8);
          scene.render();
        }
      }, options);
    },
    update(dt) {
      if (!model || paused)
        return;
      if (grab?.constraint) {
        const pointer = input.pointers.get(grab.id);
        if (!pointer)
          release();
        else {
          const target = { x: Math.max(32, Math.min(width - 32, pointer.x)), y: Math.max(32, Math.min(height - 32, pointer.y)) };
          const delta = M.Vector.sub(target, grab.constraint.pointA), distance = M.Vector.magnitude(delta);
          grab.constraint.pointA = M.Vector.add(grab.constraint.pointA, M.Vector.mult(delta, Math.min(1, 10 / Math.max(.001, distance))));
        }
      }
      model.update(dt);
    },
    render() {
      if (!model || !context)
        return;
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
      context.clearRect(0, 0, width, height);
      for (const body of model.bodies) {
        context.fillStyle = body.render.fillStyle;
        context.beginPath();
        if (body.circleRadius)
          context.arc(body.position.x, body.position.y, body.circleRadius, 0, Math.PI * 2);
        else {
          body.vertices.forEach((point, i) => i ? context.lineTo(point.x, point.y) : context.moveTo(point.x, point.y));
          context.closePath();
        }
        context.fill();
        if (body === selected) {
          context.strokeStyle = palette.ink;
          context.lineWidth = 2;
          context.stroke();
        }
      }
      context.strokeStyle = palette.ink;
      context.lineWidth = 1;
      context.beginPath();
      context.moveTo(0, height - 1);
      context.lineTo(width, height - 1);
      context.stroke();
    },
    resize(w, h, nextDpr) {
      dpr = nextDpr;
      if (w === width && h === height)
        return;
      const gravity = model?.gravity ?? 9.8;
      width = w;
      height = h;
      release();
      model?.destroy();
      model = new SandboxWorld(M, w, h);
      model.gravity = gravity;
      const ramp = model.add('ramp');
      if (ramp)
        model.move(ramp, w * .25, h * .8);
      for (const type of ['box', 'circle'])
        model.add(type);
      selected = model.bodies.at(-1);
      sync();
      status('크기에 맞춰 기본 구성을 배치했습니다. 기존 편집 내용은 초기화됩니다.');
    },
    pause() { paused = true; release(); },
    resume() { paused = false; },
    destroy() { controller?.abort(); release(); model?.destroy(); model = canvas = context = input = controls = selected = null; },
  };
  return scene;
}
