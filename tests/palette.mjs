import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {palette as expected} from './helpers.mjs';
let removed=false,appended=0;
const node=()=>({children:[],setAttribute(key,value){this[key]=value;},append(child){this.children.push(child);},remove(){removed=true;}});
globalThis.document={createElementNS:node,body:{append(){appended++;}}};
globalThis.getComputedStyle=element=>({fill:expected[element.class.replace('fill-','')]});
const source=await readFile(new URL('../js/core/palette.js',import.meta.url),'utf8');
const {palette}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
assert.equal(Object.keys(palette).length,11);assert.ok(removed&&appended===1);assert.ok(Object.isFrozen(palette));
const css=(await readFile(new URL('../scss/style.css',import.meta.url),'utf8')).toLowerCase();
for(const [name,color]of Object.entries(palette)){assert.equal(color,expected[name]);assert.ok(css.includes(`.fill-${name}`));assert.ok(css.includes(`fill: ${color.toLowerCase()};`));}
console.log('PASS: Sass palette classes, computed SVG palette, immutable colors and probe removal.');
