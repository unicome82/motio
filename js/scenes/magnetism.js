import { palette, randomShapeColor } from '../core/palette.js';
const MIN_PARTICLES = 120;
const MAX_PARTICLES = 600;
const MAX_FIELDS = 4;
const MAX_ACCELERATION = 800;
const MAX_SPEED = 180;
const SOFTENING = 28;
const COLLISION_RESTITUTION = .85;
const COLLISION_PADDING = 1.5;
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

function availableTravel(particle, dx, dy, width, height) {
  const margin = particle.radius+2;
  let distance = Infinity;
  if (dx > 0) distance = Math.min(distance, (width-margin-particle.x)/dx);
  else if (dx < 0) distance = Math.min(distance, (margin-particle.x)/dx);
  if (dy > 0) distance = Math.min(distance, (height-margin-particle.y)/dy);
  else if (dy < 0) distance = Math.min(distance, (margin-particle.y)/dy);
  return Math.max(0, distance);
}

function separateAlongAxis(a, b, axis, offset, distance, width, height) {
  const direction = offset >= 0 ? 1 : -1;
  const ax = axis === 'x' ? -direction : 0, ay = axis === 'y' ? -direction : 0;
  const bx = -ax, by = -ay;
  const maxA = availableTravel(a, ax, ay, width, height);
  const maxB = availableTravel(b, bx, by, width, height);
  if (maxA+maxB < distance) return false;
  let moveA = Math.min(distance/2, maxA);
  const moveB = Math.min(distance-moveA, maxB);
  moveA += Math.min(distance-moveA-moveB, maxA-moveA);
  a.x += ax*moveA; a.y += ay*moveA;
  b.x += bx*moveB; b.y += by*moveB;
  return true;
}

// Educational inverse-distance approximation, not an electromagnetic solver.
export function fieldAcceleration(particle, field, strength, result = {}) {
  const dx = field.x-particle.x, dy = field.y-particle.y;
  const distanceSquared = dx*dx+dy*dy;
  const direction = -particle.polarity*field.polarity;
  const force = direction*strength*24000/(distanceSquared+SOFTENING*SOFTENING);
  result.x = dx*force;
  result.y = dy*force;
  return result;
}

export function createScene() {
  let canvas, context, input, controller, controls;
  let width = 0, height = 0, dpr = 1, paused = false;
  let particles = [], hover = null;
  let polarity = 1, strength = 1, particleCount = 300, particleRadius = 3;
  let centerFieldEnabled = true;
  const accelerationResult = { x: 0, y: 0 };
  const collisionHeads = new Map();
  let collisionNext = new Int32Array(MAX_PARTICLES);
  let collisionCellX = new Int32Array(MAX_PARTICLES);
  let collisionCellY = new Int32Array(MAX_PARTICLES);

  function ensureCollisionCapacity(required) {
    if (required <= collisionNext.length) return;
    let capacity = collisionNext.length;
    while (capacity < required) capacity *= 2;
    collisionNext = new Int32Array(capacity);
    collisionCellX = new Int32Array(capacity);
    collisionCellY = new Int32Array(capacity);
  }

  const keyboard = { x: .5, y: .5, active: false };

  function setPolarity() {
    polarity *= -1;
    const button = controls?.querySelector('#polarity');
    if (button) {
      button.setAttribute('aria-pressed', String(polarity < 0));
      button.textContent = polarity > 0 ? '+극' : '−극';
      controls.querySelector('#polarity-status').textContent = polarity > 0
        ? '커서 + · 중앙 자기장은 + 극성을 유지합니다.'
        : '커서 − · 중앙 자기장은 + 극성을 유지합니다.';
    }
    if (paused) scene.render();
  }

  function fields() {
    const points = [...input.pointers.values()].slice(0, MAX_FIELDS);
    if (!points.length && hover) points.push(hover);
    if (!points.length && keyboard.active) points.push({ x: keyboard.x*width, y: keyboard.y*height });
    const sources = centerFieldEnabled ? [{ x: width/2, y: height/2, polarity: 1, center: true }] : [];
    for (const point of points) sources.push({
      x: clamp(point.x, 8, width-8), y: clamp(point.y, 8, height-8), polarity,
    });
    return sources;
  }

  function createParticle(index, count) {
    const radius = Math.min(width, height)*.42;
    const angle = index*Math.PI*(3-Math.sqrt(5));
    const distance = radius*Math.sqrt((index+.5)/count);
    const x = width/2+Math.cos(angle)*distance, y = height/2+Math.sin(angle)*distance;
    return { x, y, vx: 0, vy: 0, polarity: -1, radius: particleRadius, color: randomShapeColor() };
  }

  function populate() {
    particles = Array.from({ length: particleCount }, (_, i) => createParticle(i, particleCount));
  }

  function setParticleCount(count) {
    particleCount = clamp(Math.floor(count), MIN_PARTICLES, MAX_PARTICLES);
    ensureCollisionCapacity(particleCount);
    if (particles.length > particleCount) particles.length = particleCount;
    else {
      for (let i = particles.length; i < particleCount; i++) particles.push(createParticle(i, particleCount));
    }
  }

  const scene = {
    init(ctx) {
      if (ctx.signal.aborted) return;
      ({ canvas, context, input } = ctx);
      controls = (ctx.sceneRoot || canvas.closest('.scene')).querySelector('.scene-controls');
      controller = new AbortController();
      ctx.signal.addEventListener('abort', () => controller.abort(), { once: true, signal: controller.signal });
      const options = { signal: controller.signal };

      controls?.querySelector('#polarity').addEventListener('click', setPolarity, options);
      controls?.querySelector('#center-field').addEventListener('click', () => {
        centerFieldEnabled = !centerFieldEnabled;
        const button = controls.querySelector('#center-field');
        button.setAttribute('aria-pressed', String(centerFieldEnabled));
        button.textContent = `중력 ${centerFieldEnabled ? 'ON' : 'OFF'}`;
        if (paused) scene.render();
      }, options);

      canvas.parentElement?.querySelector('#bounce')?.addEventListener('click', () => {
        for (const particle of particles) {
          const dx = particle.x-width/2, dy = particle.y-height/2;
          const distance = Math.hypot(dx, dy) || 1;
          particle.vx = dx/distance*MAX_SPEED*.7;
          particle.vy = dy/distance*MAX_SPEED*.7;
        }
      }, options);

      const slider = controls?.querySelector('#force');
      slider?.addEventListener('input', () => {
        strength = clamp(Number(slider.value), 0, 3);
        controls.querySelector('output[for="force"]').value = slider.value;
      }, options);

      const countSlider = controls?.querySelector('#particle-count');
      countSlider?.addEventListener('input', () => {
        setParticleCount(clamp(Number(countSlider.value), MIN_PARTICLES, MAX_PARTICLES));
        controls.querySelector('output[for="particle-count"]').value = countSlider.value;
        if (paused) scene.render();
      }, options);

      const sizeSlider = controls?.querySelector('#particle-size');
      sizeSlider?.addEventListener('input', () => {
        particleRadius = clamp(Number(sizeSlider.value), 1.5, 8);
        controls.querySelector('output[for="particle-size"]').value = sizeSlider.value;
        for (const particle of particles) particle.radius = particleRadius;
        if (paused) scene.render();
      }, options);

      canvas.addEventListener('pointermove', event => {
        if (paused || event.pointerType === 'touch' || event.buttons) return;
        const bounds = canvas.getBoundingClientRect();
        hover = { x: event.clientX-bounds.left, y: event.clientY-bounds.top };
        keyboard.active = false;
      }, options);

      canvas.addEventListener('pointerleave', () => { hover = null; }, options);
      canvas.addEventListener('blur', () => { hover = null; keyboard.active = false; }, options);

      canvas.addEventListener('keydown', event => {
        if (event.code === 'KeyP' && !event.repeat) { setPolarity(); event.preventDefault(); }
        if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.code)) {
          event.preventDefault(); keyboard.active = true; hover = null;
        }
      }, options);
    },

    update(fixedDt) {
      if (!context || paused || !particles.length) return;
      const x = Number(input.keys.has('ArrowRight'))-Number(input.keys.has('ArrowLeft'));
      const y = Number(input.keys.has('ArrowDown'))-Number(input.keys.has('ArrowUp'));
      if (x || y) {
        keyboard.active = true;
        keyboard.x = clamp(keyboard.x+x*fixedDt*.45, .04, .96);
        keyboard.y = clamp(keyboard.y+y*fixedDt*.45, .04, .96);
      }
      const sources = fields();
      for (const particle of particles) {
        let ax = 0, ay = 0;
        for (const field of sources) {
          const acceleration = fieldAcceleration(particle, field, strength, accelerationResult);
          ax += acceleration.x; ay += acceleration.y;
        }
        const acceleration = Math.hypot(ax, ay);
        if (acceleration > MAX_ACCELERATION) { ax *= MAX_ACCELERATION/acceleration; ay *= MAX_ACCELERATION/acceleration; }
        const drag = Math.exp(-1.8*fixedDt);
        particle.vx = (particle.vx+ax*fixedDt)*drag;
        particle.vy = (particle.vy+ay*fixedDt)*drag;
        const speed = Math.hypot(particle.vx, particle.vy);
        if (speed > MAX_SPEED) { particle.vx *= MAX_SPEED/speed; particle.vy *= MAX_SPEED/speed; }
        particle.x += particle.vx*fixedDt; particle.y += particle.vy*fixedDt;
        const margin = particle.radius+2;
        if (particle.x < margin || particle.x > width-margin) particle.vx *= -.65;
        if (particle.y < margin || particle.y > height-margin) particle.vy *= -.65;
        particle.x = clamp(particle.x, margin, width-margin);
        particle.y = clamp(particle.y, margin, height-margin);
      }

      ensureCollisionCapacity(particles.length);
      const cellSize = Math.max(particleRadius*2+COLLISION_PADDING, 8);
      const columns = Math.ceil(width/cellSize);
      const rows = Math.ceil(height/cellSize);

      // 💡 성능 최적화를 위해 이터레이션 횟수를 8회로 복구하여 렉(Jank) 현상 해결
      for (let iteration = 0; iteration < 8; iteration++) {
        collisionHeads.clear();
        for (let i = 0; i < particles.length; i++) {
          const particle = particles[i];
          const cellX = Math.floor(particle.x/cellSize);
          const cellY = Math.floor(particle.y/cellSize);
          const cell = cellY*columns+cellX;
          collisionCellX[i] = cellX;
          collisionCellY[i] = cellY;
          collisionNext[i] = collisionHeads.get(cell) ?? -1;
          collisionHeads.set(cell, i);
        }
        let overlapping = false;
        for (let i = 0; i < particles.length; i++) {
          const a = particles[i];
          for (let cy = collisionCellY[i]-1; cy <= collisionCellY[i]+1; cy++) {
            for (let cx = collisionCellX[i]-1; cx <= collisionCellX[i]+1; cx++) {
              if (cx < 0 || cx >= columns || cy < 0 || cy >= rows) continue;
              let j = collisionHeads.get(cy*columns+cx) ?? -1;
              while (j !== -1) {
                const next = collisionNext[j];
                if (j > i) {
                  const b = particles[j];
                  const dx = b.x-a.x, dy = b.y-a.y;
                  const minDistance = a.radius+b.radius+COLLISION_PADDING;
                  const distanceSquared = dx*dx+dy*dy;
                  if (distanceSquared < minDistance*minDistance) {
                    overlapping = true;
                    const distance = Math.sqrt(distanceSquared);
                    const nx = distance ? dx/distance : 1;
                    const ny = distance ? dy/distance : 0;
                    const overlap = minDistance-distance;
                    const maxA = availableTravel(a, -nx, -ny, width, height);
                    const maxB = availableTravel(b, nx, ny, width, height);
                    let moveA = Math.min(overlap/2, maxA);
                    const moveB = Math.min(overlap-moveA, maxB);
                    moveA += Math.min(overlap-moveA-moveB, maxA-moveA);
                    a.x -= nx*moveA; a.y -= ny*moveA;
                    b.x += nx*moveB; b.y += ny*moveB;
                    const remaining = overlap-moveA-moveB;
                    if (remaining > .001) {
                      const adjustedDx = b.x-a.x, adjustedDy = b.y-a.y;
                      const xNeeded = Math.sqrt(Math.max(0, minDistance*minDistance-adjustedDy*adjustedDy))-Math.abs(adjustedDx);
                      const yNeeded = Math.sqrt(Math.max(0, minDistance*minDistance-adjustedDx*adjustedDx))-Math.abs(adjustedDy);
                      if (xNeeded > 0 && (yNeeded <= 0 || xNeeded <= yNeeded)) {
                        if (!separateAlongAxis(a, b, 'x', adjustedDx, xNeeded, width, height)) {
                          separateAlongAxis(a, b, 'y', adjustedDy, yNeeded, width, height);
                        }
                      } else if (yNeeded > 0) {
                        if (!separateAlongAxis(a, b, 'y', adjustedDy, yNeeded, width, height)) {
                          separateAlongAxis(a, b, 'x', adjustedDx, xNeeded, width, height);
                        }
                      }
                    }
                    const relativeSpeed = (b.vx-a.vx)*nx+(b.vy-a.vy)*ny;
                    if (relativeSpeed < 0) {
                      const impulse = -(1+COLLISION_RESTITUTION)*relativeSpeed/2;
                      a.vx -= impulse*nx; a.vy -= impulse*ny;
                      b.vx += impulse*nx; b.vy += impulse*ny;
                    }
                    const marginA = a.radius+2, marginB = b.radius+2;
                    a.x = clamp(a.x, marginA, width-marginA);
                    a.y = clamp(a.y, marginA, height-marginA);
                    b.x = clamp(b.x, marginB, width-marginB);
                    b.y = clamp(b.y, marginB, height-marginB);
                  }
                }
                j = next;
              }
            }
          }
        }
        if (!overlapping) break;
      }
    },

    render() {
      if (!context || !particles.length) return;
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
      context.clearRect(0, 0, width, height);
      for (const particle of particles) {
        context.fillStyle = particle.color;
        context.beginPath(); context.arc(particle.x, particle.y, particle.radius, 0, Math.PI*2); context.fill();
      }
      for (const field of fields()) {
        if (field.center) continue;
        context.fillStyle = palette.ink; context.beginPath(); context.arc(field.x, field.y, 10, 0, Math.PI*2); context.fill();
        context.strokeStyle = palette.surface; context.lineWidth = 1.5;
        context.beginPath(); context.moveTo(field.x-4, field.y); context.lineTo(field.x+4, field.y);
        if (polarity > 0) { context.moveTo(field.x, field.y-4); context.lineTo(field.x, field.y+4); }
        context.stroke();
      }
    },

    resize(nextWidth, nextHeight, nextDpr) {
      dpr = nextDpr;
      if (nextWidth === width && nextHeight === height) return;
      width = nextWidth; height = nextHeight;
      hover = null; keyboard.x = keyboard.y = .5; keyboard.active = false;
      populate();
    },

    pause() { paused = true; hover = null; keyboard.active = false; },
    resume() { paused = false; },

    destroy() {
      controller?.abort(); particles = []; collisionHeads.clear(); hover = null; keyboard.active = false;
      canvas = context = input = controls = null;
    },
  };

  return scene;
}