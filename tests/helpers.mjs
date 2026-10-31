import { readFile } from 'node:fs/promises';
// Node has no computed SVG styles. Use the same Sass source for the test palette.
const variables = await readFile(new URL('../scss/_variable.scss', import.meta.url), 'utf8');
export const palette = Object.fromEntries([...variables.matchAll(/^\$([\w-]+):\s*(#[\da-f]+);/gmi)].map(match => [match[1], match[2]]));
for (const [, name, base, alpha] of variables.matchAll(/^\$([\w-]+):\s*rgba\(\$([\w-]+),\s*([\d.]+)\);/gm)) {
  const channels = palette[base].slice(1).match(/../g).map(value => parseInt(value, 16));
  palette[name] = `rgba(${channels.join(', ')}, ${Number(alpha)})`;
}
export async function readSource(file, encoding) {
  const source = await readFile(file, encoding);
  if (typeof source !== 'string') return source;
  return source.replace(/import \{ palette(?:, randomShapeColor)? \} from ['"][^'"]*palette\.js(?:\?[^'"]*)?['"];?/g, `const palette = ${JSON.stringify(palette)}; const randomShapeColor = () => [palette.terracotta,palette.blue,palette.mustard,palette.green,palette.sand][Math.floor(Math.random()*5)];`);
}
