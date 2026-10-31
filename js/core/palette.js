// Read the palette classes emitted by Sass; no duplicated JS color values.
function readPalette() {
  const namespace = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(namespace, 'svg');
  svg.setAttribute('class', 'experiment-preview');
  svg.setAttribute('width', '0'); svg.setAttribute('height', '0');
  svg.setAttribute('aria-hidden', 'true');
  const names = ['background','surface','ink','muted','line','terracotta','blue','mustard','sand','black','green'];
  const paths = names.map(name => {
    const path = document.createElementNS(namespace, 'path');
    path.setAttribute('class', `fill-${name}`); svg.append(path); return path;
  });
  document.body.append(svg);
  try { return Object.freeze(Object.fromEntries(names.map((name, index) => [name, getComputedStyle(paths[index]).fill]))); }
  finally { svg.remove(); }
}
export const palette = readPalette();

export function randomShapeColor() {
  const colors = [palette.terracotta, palette.blue, palette.mustard, palette.green, palette.sand];
  return colors[Math.floor(Math.random() * colors.length)];
}
