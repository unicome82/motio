import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import { readSource as readFile } from './helpers.mjs';
import {createRequire} from 'node:module';
const M=createRequire(import.meta.url)(process.argv[2]||fileURLToPath(new URL('./vendor/matter-0.20.0.cjs', import.meta.url)));
const url=source=>`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`;
const modelURL=url(await readFile(new URL('../js/physics/chain-world.js',import.meta.url),'utf8'));
const {ChainWorld,chainPresets}=await import(modelURL);
let steps=0;
for(const preset of Object.keys(chainPresets)){
  const world=new ChainWorld(M,preset);let expected;
  for(let run=0;run<3;run++){
    world.reset(preset);let collisions=0;
    const listener=event=>collisions+=event.pairs.length;
    M.Events.on(world.engine,'collisionStart',listener);
    for(let i=0;i<1200;i++){
      world.update(1/60);steps++;
      for(const body of [world.ball,...world.dominoes]){
        assert.ok(Number.isFinite(body.position.x)&&Number.isFinite(body.position.y));
        assert.ok(body.position.x>0&&body.position.x<800&&body.position.y<422,'normal preset containment');
      }
    }
    M.Events.off(world.engine,'collisionStart',listener);
    assert.equal(world.fallen,chainPresets[preset].count,'complete collision-driven chain');
    assert.ok(collisions>world.dominoes.length);
    const snapshot=world.dominoes.map(body=>[body.position.x,body.position.y,body.angle]);
    if(expected)for(let i=0;i<snapshot.length;i++)for(let j=0;j<3;j++)assert.ok(Math.abs(snapshot[i][j]-expected[i][j])<.001,'repeatable preset');
    expected=snapshot;
  }
  const engine=world.engine;world.destroy();assert.equal(M.Composite.allBodies(engine.world).length,0);
}
globalThis.window={Matter:M};
const preset=new EventTarget();preset.value='classic';
const replay=new EventTarget(),status={};
const controls={querySelector:selector=>({'#chain-preset':preset,'#replay':replay,'#chain-status':status})[selector]};
const canvas={closest:()=>({querySelector:()=>controls})};
const bounceButton=new EventTarget();
canvas.parentElement={querySelector:selector=>selector==='#bounce'?bounceButton:null};
let draws=0;
const context=new Proxy({},{get:(_,key)=>key==='clearRect'?()=>draws++:()=>{},set:()=>true});
const sceneSource=(await readFile(new URL('../js/scenes/chain.js',import.meta.url),'utf8'))
 .replace("import { loadMatter } from '../core/libraries.js';",'const loadMatter=async()=>window.Matter;')
 .replace("'../physics/chain-world.js'",JSON.stringify(modelURL));
const {createScene}=await import(url(sceneSource));
let engine;const create=M.Engine.create;M.Engine.create=options=>(engine=create(options));
const scene=createScene();await scene.init({canvas,context,signal:new AbortController().signal});
scene.resize(390,400,2);scene.resume();scene.update(1/60);scene.render();assert.ok(draws>0);
scene.pause();const time=engine.timing.timestamp;scene.update(1/60);assert.equal(engine.timing.timestamp,time);
preset.value='dense';preset.dispatchEvent(new Event('change'));assert.equal(M.Composite.allBodies(engine.world).length,19);
scene.resume();
const dominoes=()=>M.Composite.allBodies(engine.world).filter(body=>!body.isStatic&&!body.circleRadius);
const dominoesBeforeBounce=dominoes().map(body=>({...body.position}));
bounceButton.dispatchEvent(new Event('click'));
assert.deepEqual(M.Body.getVelocity(M.Composite.allBodies(engine.world).find(body=>body.circleRadius)),{x:0,y:-8},'bounce launches the chain ball upward');
assert.deepEqual(dominoes().map(body=>body.position),dominoesBeforeBounce,'bounce does not reset domino positions');
bounceButton.dispatchEvent(new Event('click'));
assert.deepEqual(M.Body.getVelocity(M.Composite.allBodies(engine.world).find(body=>body.circleRadius)),{x:0,y:-10},'consecutive bounces launch the ball higher');
assert.deepEqual(dominoes().map(body=>body.position),dominoesBeforeBounce,'consecutive bounces preserve the current chain state');
for(let i=0;i<8;i++)bounceButton.dispatchEvent(new Event('click'));
assert.deepEqual(M.Body.getVelocity(M.Composite.allBodies(engine.world).find(body=>body.circleRadius)),{x:0,y:-20},'bounce height has a stable speed cap');
scene.resume();scene.update(1/60);const advanced=engine.timing.timestamp;
scene.resize(720,300,1);assert.equal(engine.timing.timestamp,advanced);
replay.dispatchEvent(new Event('click'));assert.equal(engine.timing.timestamp,0);
bounceButton.dispatchEvent(new Event('click'));
assert.deepEqual(M.Body.getVelocity(M.Composite.allBodies(engine.world).find(body=>body.circleRadius)),{x:0,y:-8},'replay resets bounce progression');
scene.destroy();assert.equal(M.Composite.allBodies(engine.world).length,0);
replay.dispatchEvent(new Event('click'));assert.equal(M.Composite.allBodies(engine.world).length,0);
for(let i=0;i<100;i++){const next=createScene();await next.init({canvas,context,signal:new AbortController().signal});next.resize(390,400,1);next.destroy();}
console.log(`PASS: ${steps} steps, both full chains and 3 repeat runs per preset, collision events/containment, pause/replay/preset/resize and 100 lifecycle cycles.`);
