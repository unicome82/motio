const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

export class ClothMesh {
  constructor(width, height) {
    this.width = width; this.height = height;
    this.columns = width < 480 ? 13 : 17;
    this.rows = width < 480 ? 11 : 13;
    this.iterations = width < 480 ? 12 : 16;
    this.nodes = []; this.links = [];
    const spacingX = width*.88/(this.columns-1);
    const spacingY = height*.5/(this.rows-1);
    const nodeCount = this.columns * this.rows;
    const firstAnchor = Math.floor(Math.random() * nodeCount);
    let secondAnchor = Math.floor(Math.random() * (nodeCount - 1));
    if (secondAnchor >= firstAnchor) secondAnchor++;
    const left = (width-spacingX*(this.columns-1))/2;
    const top = height*.4;
    for (let row = 0; row < this.rows; row++) {
      for (let column = 0; column < this.columns; column++) {
        const x = left+column*spacingX, y = top+row*spacingY;
        const index = row * this.columns + column;
        const anchor = index === firstAnchor || index === secondAnchor;
        this.nodes.push({ x, y, previousX: x, previousY: y, pinX: x, pinY: y, pinned: anchor, anchor });
      }
    }
    const link = (a, b, visible = true) => this.links.push({ a, b, length: Math.hypot(this.nodes[b].x-this.nodes[a].x, this.nodes[b].y-this.nodes[a].y), visible });
    for (let row = 0; row < this.rows; row++) for (let column = 0; column < this.columns; column++) {
      const i = row*this.columns+column;
      if (column < this.columns-1) link(i, i+1);
      if (row < this.rows-1) link(i, i+this.columns);
      if (row < this.rows-1 && column < this.columns-1) {
        link(i, i+this.columns+1, false);
        link(i+1, i+this.columns, false);
      }
    }
  }
  nearest(x, y, radius = 28) {
    let selected = -1, distance = radius;
    this.nodes.forEach((node, i) => {
      const next = Math.hypot(node.x-x, node.y-y);
      if (next <= distance) { selected = i; distance = next; }
    });
    return selected;
  }
  togglePin(index) {
    const node = this.nodes[index];
    if (!node || node.anchor) return;
    node.pinned = !node.pinned;
    node.pinX = node.previousX = node.x;
    node.pinY = node.previousY = node.y;
  }
  bounce() {
    this.nodes.forEach((node, index) => {
      if (!node.pinned) node.previousY = node.y + 8 + Math.sin(index * 0.7) * 2;
    });
  }
  update(dt, targets = new Map()) {
    dt = Math.min(Math.max(dt, 0), 1/60);
    if (!dt) return;
    const held = new Map();
    for (const [index, target] of targets) {
      const node = this.nodes[index];
      if (!node || node.pinned) continue;
      const dx = target.x-node.x, dy = target.y-node.y;
      const scale = Math.min(1, 8/Math.max(.001, Math.hypot(dx, dy)));
      held.set(index, { x: clamp(node.x+dx*scale, 4, this.width-4), y: clamp(node.y+dy*scale, 4, this.height-4) });
    }
    const drag = Math.exp(-3*dt);
    this.nodes.forEach((node, i) => {
      if (node.pinned || held.has(i)) return;
      const vx = clamp((node.x-node.previousX)*drag, -6, 6);
      const vy = clamp((node.y-node.previousY)*drag, -6, 6);
      node.previousX = node.x; node.previousY = node.y;
      node.x += vx; node.y += vy+520*dt*dt;
    });
    const enforce = () => this.nodes.forEach((node, i) => {
      const target = node.pinned ? { x: node.pinX, y: node.pinY } : held.get(i);
      if (target) {
        node.x = node.previousX = target.x; node.y = node.previousY = target.y;
      } else {
        const x = clamp(node.x, 4, this.width-4), y = clamp(node.y, 4, this.height-4);
        if (x !== node.x) node.previousX = x;
        if (y !== node.y) node.previousY = y;
        node.x = x; node.y = y;
      }
    });
    enforce();
    for (let iteration = 0; iteration < this.iterations; iteration++) {
      for (const link of this.links) {
        const a = this.nodes[link.a], b = this.nodes[link.b];
        const ax = a.pinned || held.has(link.a) ? 0 : 1;
        const bx = b.pinned || held.has(link.b) ? 0 : 1;
        const weight = ax+bx;
        if (!weight) continue;
        const dx = b.x-a.x, dy = b.y-a.y;
        const distance = Math.hypot(dx, dy);
        if (distance < .0001) continue;
        const correction = (distance-link.length)/distance/weight;
        a.x += dx*correction*ax; a.y += dy*correction*ax;
        b.x -= dx*correction*bx; b.y -= dy*correction*bx;
      }
      enforce();
    }
  }
  destroy() { this.nodes.length = 0; this.links.length = 0; }
}
