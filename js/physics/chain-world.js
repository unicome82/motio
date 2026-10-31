import { palette, randomShapeColor } from '../core/palette.js';
export const chainPresets = {
  classic: { count: 11, spacing: 34, height: 88 },
  dense: { count: 13, spacing: 32, height: 88 },
};
export class ChainWorld {
  constructor(M, preset = 'classic') {
    this.M = M;
    this.engine = M.Engine.create({ positionIterations: 10, velocityIterations: 10 });
    this.reset(preset);
  }
  reset(preset = this.preset) {
    const { M, engine } = this;
    this.preset = Object.hasOwn(chainPresets, preset) ? preset : 'classic';
    M.Composite.clear(engine.world, false);
    M.Engine.clear(engine);
    engine.timing.timestamp = 0;
    const options = chainPresets[this.preset];
    const rectangle = (x, y, w, h) => M.Bodies.rectangle(x, y, w, h, { isStatic: true, friction: .6, render: { fillStyle: palette.ink } });
    const floor = rectangle(400, 444, 800, 48);
    const walls = [rectangle(-24, 250, 48, 600), rectangle(824, 250, 48, 600), rectangle(400, -24, 896, 48)];
    const vertices = [{ x: 50, y: 260 }, { x: 250, y: 420 }, { x: 50, y: 420 }];
    const center = M.Vertices.centre(vertices);
    const ramp = M.Bodies.fromVertices(center.x, center.y, [vertices], { isStatic: true, friction: .02, render: { fillStyle: palette.sand } });
    this.ball = M.Bodies.circle(90, 250, 20, { density: .008, restitution: .05, friction: .01, frictionAir: .001, render: { fillStyle: palette.black } });
    this.dominoes = Array.from({ length: options.count }, (_, i) => M.Bodies.rectangle(300 + i * options.spacing, 420 - options.height / 2, 12, options.height, {
      density: .0025, restitution: .02, friction: .6, frictionStatic: .8, frictionAir: .002, render: { fillStyle: randomShapeColor() },
    }));
    this.staticBodies = [floor, ramp, ...walls];
    M.Composite.add(engine.world, [...this.staticBodies, this.ball, ...this.dominoes]);
  }
  update(dt) { this.M.Engine.update(this.engine, dt * 1000); }
  get fallen() { return this.dominoes.filter(body => Math.abs(body.angle) > .65).length; }
  destroy() {
    this.M.Composite.clear(this.engine.world, false);
    this.M.Engine.clear(this.engine);
    this.dominoes.length = 0;
    this.staticBodies.length = 0;
    this.ball = null;
  }
}
