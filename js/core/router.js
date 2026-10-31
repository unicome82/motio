export class Router {
  constructor(onRoute) {
    this.onRoute = onRoute;
    this.controller = new AbortController();
    window.addEventListener('hashchange', () => this.resolve(), { signal: this.controller.signal });
    this.resolve();
  }
  resolve() {
    const route = location.hash.slice(1) || 'home';
    // Removed standalone pages and the legacy skip link return to the main view.
    const removed = ['main', 'experiments', 'about', 'settings'];
    this.onRoute(removed.includes(route) ? 'home' : route);
  }
  navigate(route) {
    if (location.hash === `#${route}`) return;
    window.history.pushState(null, '', `#${route}`);
    this.resolve();
  }
  destroy() { this.controller.abort(); }
}
