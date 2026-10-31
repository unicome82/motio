import { palette } from '../core/palette.js';
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
export class SandboxWorld {
  constructor(M, width, height) {
    this.M = M;
    this.width = width;
    this.height = height;
    this.bodies = [];
    this.limit = 24;
    this.gravity = 9.8;
    this.engine = M.Engine.create({ positionIterations: 8, velocityIterations: 8 });
    const rectangle = (x, y, w, h) => M.Bodies.rectangle(x, y, w, h, { isStatic: true, friction: .5 });
    this.walls = [rectangle(width / 2, height + 24, width + 96, 48), rectangle(width / 2, -24, width + 96, 48), rectangle(-24, height / 2, 48, height + 96), rectangle(width + 24, height / 2, 48, height + 96)];
    M.Composite.add(this.engine.world, this.walls);
  }
  add(type) {
    if (this.bodies.length >= this.limit || !['circle', 'box', 'ramp', 'static'].includes(type))
      return null;
    const { M, width, height } = this;
    const size = clamp(width * .07, 16, 28);
    const options = { restitution: .5, friction: .3, frictionAir: .006, isStatic: type === 'ramp' || type === 'static',
      render: { fillStyle: { circle: palette.mustard, box: palette.blue, ramp: palette.terracotta, static: palette.sand }[type] } };
    let body;
    if (type === 'circle')
      body = M.Bodies.circle(0, 0, size, options);
    else if (type === 'ramp') {
      const vertices = [{ x: 0, y: 0 }, { x: size * 3, y: size * 2 }, { x: 0, y: size * 2 }];
      body = M.Bodies.fromVertices(0, 0, [vertices], options);
    }
    else
      body = M.Bodies.rectangle(0, 0, size * (type === 'static' ? 3 : 1.8), size * (type === 'static' ? .75 : 1.8), options);
    body.plugin.sandboxType = type;
    if (!body.isStatic)
      M.Body.setMass(body, 2);
    const halfX = (body.bounds.max.x - body.bounds.min.x) / 2 + 6;
    const halfY = (body.bounds.max.y - body.bounds.min.y) / 2 + 6;
    let placed = false;
    for (let y = halfY; y <= height - halfY && !placed; y += size * 2 + 12) {
      for (let x = halfX; x <= width - halfX; x += size * 2 + 12) {
        M.Body.setPosition(body, { x, y });
        if (!M.Query.collides(body, this.bodies).length) {
          placed = true;
          break;
        }
      }
    }
    if (!placed)
      return null;
    this.bodies.push(body);
    M.Composite.add(this.engine.world, body);
    return body;
  }
  move(body, x, y) {
    const { M } = this;
    const left = body.position.x - body.bounds.min.x, right = body.bounds.max.x - body.position.x;
    const top = body.position.y - body.bounds.min.y, bottom = body.bounds.max.y - body.position.y;
    M.Body.setPosition(body, { x: clamp(x, left + 2, this.width - right - 2), y: clamp(y, top + 2, this.height - bottom - 2) });
    M.Body.setVelocity(body, { x: 0, y: 0 });
    M.Body.setAngularVelocity(body, 0);
  }
  remove(body) {
    const index = this.bodies.indexOf(body);
    if (index < 0)
      return;
    this.M.Composite.remove(this.engine.world, body);
    this.bodies.splice(index, 1);
  }
  update(dt) {
    this.engine.gravity.y = this.gravity / 9.8;
    for (const body of this.bodies) {
      if (body.isStatic)
        continue;
      const velocity = this.M.Body.getVelocity(body), speed = Math.hypot(velocity.x, velocity.y);
      if (speed > 10)
        this.M.Body.setVelocity(body, { x: velocity.x * 10 / speed, y: velocity.y * 10 / speed });
    }
    this.M.Engine.update(this.engine, dt * 1000);
    // Dense user arrangements can push a body past a wall; contain it deterministically.
    for (const body of this.bodies) {
      if (body.isStatic)
        continue;
      const dx = body.bounds.min.x < 0 ? -body.bounds.min.x : body.bounds.max.x > this.width ? this.width - body.bounds.max.x : 0;
      const dy = body.bounds.min.y < 0 ? -body.bounds.min.y : body.bounds.max.y > this.height ? this.height - body.bounds.max.y : 0;
      if (!dx && !dy)
        continue;
      const velocity = this.M.Body.getVelocity(body);
      this.M.Body.translate(body, { x: dx, y: dy });
      this.M.Body.setVelocity(body, { x: dx ? -velocity.x * body.restitution : velocity.x, y: dy ? -velocity.y * body.restitution : velocity.y });
    }
  }
  destroy() {
    this.M.Composite.clear(this.engine.world, false);
    this.M.Engine.clear(this.engine);
    this.bodies.length = 0;
    this.walls.length = 0;
  }
}
