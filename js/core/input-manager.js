export class InputManager {
  constructor(element) {
    this.element = element;
    this.pointers = new Map();
    this.keys = new Set();
    this.controller = new AbortController();
    const options = { signal: this.controller.signal };
    element.addEventListener('pointerdown', event => {
      if (event.button !== 0) return;
      element.setPointerCapture(event.pointerId);
      this.record(event, true);
    }, options);
    element.addEventListener('pointermove', event => {
      if (this.pointers.has(event.pointerId)) this.record(event);
    }, options);
    for (const name of ['pointerup', 'pointercancel', 'lostpointercapture']) {
      element.addEventListener(name, event => this.pointers.delete(event.pointerId), options);
    }
    element.addEventListener('keydown', event => this.keys.add(event.code), options);
    element.addEventListener('keyup', event => this.keys.delete(event.code), options);
    element.addEventListener('blur', () => this.clear(), options);
  }
  record(event, initial = false) {
    const bounds = this.element.getBoundingClientRect();
    const previous = this.pointers.get(event.pointerId);
    const x = event.clientX - bounds.left;
    const y = event.clientY - bounds.top;
    const elapsed = previous ? Math.max(1, event.timeStamp - previous.time) / 1000 : 1;
    this.pointers.set(event.pointerId, {
      x, y, vx: initial ? 0 : (x - previous.x) / elapsed,
      vy: initial ? 0 : (y - previous.y) / elapsed,
      time: event.timeStamp, type: event.pointerType,
    });
  }
  clear() {
    for (const id of this.pointers.keys()) {
      if (this.element.hasPointerCapture(id)) this.element.releasePointerCapture(id);
    }
    this.pointers.clear();
    this.keys.clear();
  }
  destroy() { this.controller.abort(); this.clear(); }
}
