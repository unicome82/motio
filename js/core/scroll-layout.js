const scrollMain = document.querySelector('main');
const scrollHeader = document.querySelector('.header');
const scrollTabs = scrollMain.querySelector('.index-section');
const scrollPanel = scrollMain.querySelector('#experiment-panel');
const viewport = document.createElement('div');
viewport.className = 'experiment-viewport';
scrollTabs.before(viewport);
viewport.append(scrollTabs);
const mobileLayout = window.matchMedia('(max-width: 63.9375rem)');
let canvasRegion, canvasMarker;

function syncViewport() {
  const active = document.body.classList.contains('is-experiment');
  if (!canvasRegion?.isConnected) canvasRegion = null;
  const nextRegion = scrollPanel.querySelector('.canvas-region');
  if (nextRegion && nextRegion !== canvasRegion) {
    canvasRegion?.remove();
    canvasMarker?.remove();
    canvasRegion = nextRegion;
    canvasMarker = document.createComment('canvas position');
    canvasRegion.before(canvasMarker);
  }
  if (!active) {
    canvasRegion?.remove(); canvasMarker?.remove();
    canvasRegion = canvasMarker = null;
  } else if (canvasRegion) {
    const info = scrollPanel.querySelector('.scene-info') || canvasRegion.querySelector('.scene-info');
    if (mobileLayout.matches) {
      if (info) canvasRegion.append(info);
      viewport.append(canvasRegion);
    } else if (canvasMarker?.isConnected) {
      canvasMarker.after(canvasRegion);
      if (info) canvasMarker.parentElement.prepend(info);
    }
  }
}
let compact = false;
let headerHidden = false;

function syncHeader() {
  const active = document.body.classList.contains('is-experiment');
  const offset = Math.max(window.scrollY || 0, scrollMain.scrollTop);
  const nextHidden = (!active || mobileLayout.matches) && offset > scrollHeader.offsetHeight;
  if (nextHidden !== headerHidden) {
    headerHidden = nextHidden;
    scrollHeader.classList.toggle('is-scroll-hidden', headerHidden);
    scrollHeader.inert = headerHidden;
  }
  const next = active && mobileLayout.matches && (compact ? offset > 0 : offset > 24);
  if (next === compact) return;
  compact = next;
  scrollTabs.classList.toggle('is-compact', compact);
  scrollMain.classList.toggle('is-compact', compact);
}

new MutationObserver(() => { syncViewport(); syncHeader(); }).observe(document.body, { attributes: true, attributeFilter: ['class'] });
new MutationObserver(syncViewport).observe(scrollPanel, { childList: true });
mobileLayout.addEventListener('change', () => { syncViewport(); syncHeader(); });
scrollMain.addEventListener('scroll', syncHeader, { passive: true });
window.addEventListener('scroll', syncHeader, { passive: true });
syncHeader();
syncViewport();
