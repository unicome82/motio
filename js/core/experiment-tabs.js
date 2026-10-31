export class ExperimentTabs {
  constructor(list, onSelect) {
    this.tabs = [...list.querySelectorAll('[role="tab"]')];
    this.controller = new AbortController();
    const options = { signal: this.controller.signal };
    for (const tab of this.tabs) {
      tab.addEventListener('click', event => {
        if (!onSelect || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button > 0) return;
        event.preventDefault();
        onSelect(tab.id.slice(4));
      }, options);
      tab.addEventListener('keydown', event => {
        const index = this.tabs.indexOf(tab);
        const next = {
          ArrowRight: (index + 1) % this.tabs.length,
          ArrowLeft: (index + this.tabs.length - 1) % this.tabs.length,
          Home: 0, End: this.tabs.length - 1,
        }[event.key];
        if (next !== undefined) {
          event.preventDefault();
          for (const item of this.tabs) item.tabIndex = -1;
          this.tabs[next].tabIndex = 0;
          this.tabs[next].focus({ preventScroll: true });
          this.tabs[next].scrollIntoView({ block: 'nearest', inline: 'nearest' });
        } else if (event.key === ' ') {
          event.preventDefault(); tab.click();
        }
      }, options);
    }
  }
  activate(id) {
    this.selected = this.tabs.find(tab => tab.id === `tab-${id}`);
    for (const tab of this.tabs) {
      tab.setAttribute('aria-selected', String(tab === this.selected));
      tab.tabIndex = tab === (this.selected || this.tabs[0]) ? 0 : -1;
    }
  }
  focusSelected({ preserveScroll = false } = {}) {
    this.selected?.focus({ preventScroll: true });
    if (!preserveScroll) this.selected?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }
  destroy() { this.controller.abort(); }
}
