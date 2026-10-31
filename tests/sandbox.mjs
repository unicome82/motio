import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import { readSource as readFile } from './helpers.mjs';
import { createRequire } from 'node:module';
const M = createRequire(import.meta.url)(process.argv[2] || fileURLToPath(new URL('./vendor/matter-0.20.0.cjs', import.meta.url)));
const url = source => `data:text/javascript;base64,${Buffer.from(source).toString('base64')}`;
const modelURL = url(await readFile(new URL('../js/physics/sandbox-world.js',import.meta.url),'utf8'));
const { SandboxWorld } = await import(modelURL);
let steps=0;
for(const width of [280,720])for(const gravity of [0,19.6]){
  const model=new SandboxWorld(M,width,500);model.gravity=gravity;
  for(const type of ['circle','box','ramp','static'])assert.ok(model.add(type));
  for(let i=0;i<40;i++)model.add('circle');
  assert.ok(model.bodies.length<=24);
  if(width===720)assert.equal(model.bodies.length,24);
  for(let i=0;i<1200;i++){
    model.update(1/60);steps++;
    for(const body of model.bodies){
      assert.ok(Number.isFinite(body.position.x)&&Number.isFinite(body.position.y));
      assert.ok(body.position.x>-2&&body.position.x<width+2&&body.position.y<502,JSON.stringify({width,gravity,i,type:body.plugin.sandboxType,p:body.position}));
    }
  }
  const body=model.bodies[0];model.move(body,-1000,2000);
  assert.ok(body.bounds.min.x>=0&&body.bounds.max.y<=500);
  const count=model.bodies.length;model.remove(body);assert.equal(model.bodies.length,count-1);
  const engine=model.engine;model.destroy();assert.equal(M.Composite.allBodies(engine.world).length,0);
}
globalThis.window={Matter:M};
const original=M.Engine.create;let engine;
M.Engine.create=options=>(engine=original(options));
const sceneSource=(await readFile(new URL('../js/scenes/sandbox.js',import.meta.url),'utf8'))
  .replace("import { loadMatter } from '../core/libraries.js';",'const loadMatter=async()=>window.Matter;')
  .replace("'../physics/sandbox-world.js'",JSON.stringify(modelURL));
const {createScene}=await import(url(sceneSource));
const nodes=new Map();
function node(selector){
  if(!nodes.has(selector)){
    const element=new EventTarget();
    Object.assign(element,{value:'2',defaultValue:'2',name:selector.slice(1),id:selector.slice(1),disabled:false});
    nodes.set(selector,element);
  }
  return nodes.get(selector);
}
const sliders=['mass','friction','restitution','gravity'].map(name=>node('#'+name));
const buttons=['circle','box','ramp','static'].map(type=>{const button=new EventTarget();button.dataset={add:type};return button;});
const controls={querySelector:node,querySelectorAll:selector=>selector==='[data-add]'?buttons:sliders};
const canvas=new EventTarget();canvas.closest=()=>({querySelector:()=>controls});canvas.focus=()=>{};
let renders=0;
const context=new Proxy({},{get:(_,key)=>key==='clearRect'?()=>renders++:()=>{},set:()=>true});
const input={pointers:new Map(),keys:new Set()};
const scene=createScene();await scene.init({canvas,context,input,signal:new AbortController().signal});
scene.resize(390,400,2);scene.resume();
const bodies=()=>M.Composite.allBodies(engine.world).filter(body=>body.plugin.sandboxType);
assert.equal(bodies().length,3);
buttons[3].dispatchEvent(new Event('click'));assert.equal(bodies().length,4);assert.equal(node('#mass').disabled,true);
const fixed=bodies().at(-1);scene.pause();
function pointer(type,x,y){input.pointers.set(1,{x,y});const event=new Event(type);Object.assign(event,{button:0,pointerId:1});canvas.dispatchEvent(event);}
pointer('pointerdown',fixed.position.x,fixed.position.y);
const prior=renders;pointer('pointermove',fixed.position.x+20,fixed.position.y+20);assert.ok(renders>prior,'paused editing redraws');
pointer('pointerup',fixed.position.x,fixed.position.y);input.pointers.clear();
scene.resume();const ball=bodies().find(body=>body.plugin.sandboxType==='circle');
pointer('pointerdown',ball.position.x,ball.position.y);assert.equal(M.Composite.allConstraints(engine.world).length,1);
node('#mass').value='5';node('#mass').dispatchEvent(new Event('input'));assert.equal(ball.mass,5);
node('#friction').value='.8';node('#friction').dispatchEvent(new Event('input'));assert.equal(ball.friction,.8);
node('#remove-body').dispatchEvent(new Event('click'));assert.equal(M.Composite.allConstraints(engine.world).length,0);assert.ok(!bodies().includes(ball));
scene.resize(280,300,1);assert.equal(bodies().length,3);
scene.destroy();assert.equal(M.Composite.allBodies(engine.world).length,0);
buttons[0].dispatchEvent(new Event('click'));assert.equal(M.Composite.allBodies(engine.world).length,0);
for(let i=0;i<100;i++){const next=createScene();await next.init({canvas,context,input,signal:new AbortController().signal});next.resize(390,400,1);next.destroy();}
console.log(`PASS: ${steps} Sandbox steps, four shapes, body cap/placement, bounds, controls/selection, paused editing, drag/delete cleanup, resize and 100 lifecycle cycles.`);
