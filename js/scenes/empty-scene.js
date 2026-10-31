// Foundation contract: no bodies, forces, animation or independent scheduler.
export function createScene() {
  let context;
  let width = 0;
  let height = 0;
  let dpr = 1;
  return {
    init(ctx) { context = ctx.context; },
    update(fixedDt, input) {},
    render(alpha) {
      if (!context) return;
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
      context.clearRect(0, 0, width, height);
    },
    resize(nextWidth, nextHeight, nextDpr) { width = nextWidth; height = nextHeight; dpr = nextDpr; },
    pause() {},
    resume() {},
    destroy() { context = null; },
  };
}
