import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { readSource as readFile, palette } from './helpers.mjs';
const M=createRequire(import.meta.url)(fileURLToPath(new URL('./vendor/matter-0.20.0.cjs',import.meta.url)));
globalThis.window=new EventTarget();window.Matter=M;
let seed=117;const random=Math.random;Math.random=()=>((seed=(seed*1664525+1013904223)>>>0)/4294967296);
let engine;const create=M.Engine.create;M.Engine.create=options=>(engine=create(options));
const source=(await readFile(new URL('../js/scenes/home.js',import.meta.url),'utf8')).replace("import { loadMatter } from '../core/libraries.js';",'const loadMatter=async()=>window.Matter;');
const {createScene}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
const region=new EventTarget();const fallback={style:{removeProperty(){}}};
const canvas={closest:()=>region,parentElement:{querySelector:()=>fallback},getBoundingClientRect:()=>({left:100,top:40,width:450,height:250})};
let clears=0;
const context=new Proxy({},{get:(_,key)=>()=>{if(key==='clearRect')clears++;},set:()=>true});
const scene=createScene();await scene.init({canvas,context,signal:new AbortController().signal});scene.resize(900,500,2);scene.resume();
const bodies=()=>M.Composite.allBodies(engine.world).filter(body=>!body.isStatic);
assert.equal(bodies().length,5);
function checkColors() {
 const counts = new Map();
 for (const body of bodies()) counts.set(body.render.fillStyle, (counts.get(body.render.fillStyle) || 0) + 1);
 assert.deepEqual(new Set(counts.keys()), new Set([palette.terracotta, palette.blue, palette.mustard, palette.green, palette.sand]));
 assert.ok([...counts.values()].every(count => count === 1), 'each color appears exactly once');
}
checkColors();
assert.ok(bodies().every(body=>body.circleRadius > 0), 'all five shapes are circles');
assert.ok(M.Composite.allBodies(engine.world).some(body=>body.isStatic&&Math.abs(body.bounds.min.y-500)<.001),'floor restored at visual bottom');
assert.ok(bodies().every(body=>body.plugin.radius>=95.04),'shapes enlarged by 10 percent from the reduced size');
const ball=bodies()[0];M.Body.setPosition(ball,{x:450,y:250});M.Body.setVelocity(ball,{x:0,y:0});
const move=new Event('mousemove');Object.assign(move,{clientX:327.5,clientY:167.5});window.dispatchEvent(move);
scene.update(1/60);assert.ok(M.Body.getVelocity(ball).y<0,'pointer gives an upward physical impulse');
const dockMove=new Event('mousemove');
Object.assign(dockMove,{clientX:327.5,clientY:167.5});
Object.defineProperty(dockMove,'target',{value:{closest:selector=>selector==='.index-section'?{}:null}});
window.dispatchEvent(dockMove);
M.Body.setPosition(ball,{x:450,y:250});M.Body.setVelocity(ball,{x:0,y:0});ball.plugin.cooldown=0;
scene.update(1/60);
assert.equal(ball.plugin.cooldown,0,'thumbnail dock clears pointer interaction');
window.dispatchEvent(new Event('blur'));
let fallingAgain=false;
for(let i=0;i<150;i++){scene.update(1/60);if(M.Body.getVelocity(ball).y>0)fallingAgain=true;}
assert.ok(fallingAgain,'gravity brings the shape down again');

for(let i=0;i<1800;i++){
 scene.update(1/60);
 bodies().forEach(body=>{assert.ok(Number.isFinite(body.position.x)&&Number.isFinite(body.position.y));assert.ok(body.position.y<500+body.plugin.radius);});
}
assert.ok(bodies().some(body=>body.bounds.max.y>=490),'shapes land on the invisible floor');assert.equal(bodies().length,5);scene.render();
scene.pause();const time=engine.timing.timestamp;scene.update(1/60);assert.equal(engine.timing.timestamp,time);
scene.resize(390,400,1);assert.equal(bodies().length,5);
checkColors();
for (const body of bodies()) M.Sleeping.set(body,true);
scene.resume();
scene.render();
const idleTime=engine.timing.timestamp, idleClears=clears;
for(let i=0;i<120;i++){scene.update(1/60);scene.render();}
assert.equal(engine.timing.timestamp,idleTime,'sleeping world skips physics');
assert.equal(clears,idleClears,'unchanged canvas skips drawing');
const sleepingBody=bodies()[0];
M.Body.setPosition(sleepingBody,{x:195,y:200});sleepingBody.plugin.cooldown=0;
const wakeMove=new Event('mousemove');Object.assign(wakeMove,{clientX:325,clientY:165});window.dispatchEvent(wakeMove);
scene.resume();scene.update(1/60);scene.render();
assert.ok(!sleepingBody.isSleeping,'cursor wakes sleeping shapes');
assert.ok(clears>idleClears,'waking resumes drawing');
scene.destroy();assert.equal(M.Composite.allBodies(engine.world).length,0);window.dispatchEvent(move);
Math.random=random;
console.log('PASS: full-area falling shapes, cursor bounce and gravity return, invisible floor, enlarged shapes, particle cap, pause/resize and teardown.');
