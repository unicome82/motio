export class ViewTransition {
  constructor(element) {
    this.element = element;
    this.preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    this.controller = new AbortController();
    this.tween = null;
    this.generation = 0;
    const options = { signal: this.controller.signal };
    this.preference.addEventListener('change', () => this.cancel(), options);
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) this.cancel();
    }, options);
  }
  cancel() {
    this.generation++;
    this.tween?.kill();
    this.tween = null;
    this.element.style.removeProperty('opacity');
  }
  enter() {
    this.cancel();
    if (this.preference.matches || document.hidden || !window.gsap?.fromTo) return;
    const generation = this.generation;
    this.tween = window.gsap.fromTo(this.element, { opacity: 0 }, {
      opacity: 1, duration: .2, ease: 'none', clearProps: 'opacity',
      onComplete: () => {
        if (generation === this.generation) {
          this.tween = null;
          this.element.style.removeProperty('opacity');
        }
      },
    });
  }
  destroy() { this.controller.abort(); this.cancel(); }
}
