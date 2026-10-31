import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import { readSource as readFile } from './helpers.mjs';
import { createRequire } from 'node:module';

// Pass the pinned 0.20.0 CommonJS build as the first argument; no npm dependency.
const require = createRequire(import.meta.url);
const Matter = require(process.argv[2] || fileURLToPath(new URL('./vendor/matter-0.20.0.cjs', import.meta.url)));
assert.equal(Matter.version, '0.20.0');
globalThis.window = new EventTarget();
window.Matter = Matter;
window.screen = { orientation: { angle: 0 } };
window.isSecureContext = true;
window.DeviceOrientationEvent = class {};
const url = text => `data:text/javascript;base64,${Buffer.from(text).toString('base64')}`;
const tiltSource = await readFile(new URL('../js/core/tilt-input.js', import.meta.url), 'utf8');
const tiltURL = url(tiltSource);
const { TiltInput, remapTilt } = await import(tiltURL);
assert.deepEqual(remapTilt(20, 10), { x: 10, y: 20 });
assert.ok(Math.abs(remapTilt(20, 10, 90).x - 20) < .001);
const messages = [];
let tilt = new TiltInput(message => messages.push(message));
window.DeviceOrientationEvent.requestPermission = async () => 'denied';
await tilt.enable(); assert.equal(tilt.active, false); assert.match(messages.at(-1), /거부/);
window.DeviceOrientationEvent.requestPermission = async () => 'granted';
await tilt.enable(); assert.equal(tilt.active, true);
function orientation(beta, gamma) {
  const event = new Event('deviceorientation'); Object.assign(event, { beta, gamma }); window.dispatchEvent(event);
}
orientation(10, 5); orientation(10, 30);
assert.ok(tilt.direction.x > 0 && tilt.direction.x < 1);
tilt.calibrate(); assert.deepEqual(tilt.direction, { x: 0, y: 1 });
tilt.destroy(); orientation(50, 50); assert.deepEqual(tilt.direction, { x: 0, y: 1 });
window.DeviceOrientationEvent.requestPermission = async () => 'granted';
let resolvePermission;
window.DeviceOrientationEvent.requestPermission = () => new Promise(resolve => resolvePermission = resolve);
tilt = new TiltInput(() => {});
const permission = tilt.enable(); tilt.destroy(); resolvePermission('granted'); await permission;
assert.equal(tilt.active, false);

let engine;
const originalCreate = Matter.Engine.create;
Matter.Engine.create = options => (engine = originalCreate(options));
const gravitySource = (await readFile(new URL('../js/scenes/gravity.js', import.meta.url), 'utf8'))
  .replace("import { loadMatter } from '../core/libraries.js';", 'const loadMatter = async () => window.Matter;')
  .replace("'../core/tilt-input.js'", JSON.stringify(tiltURL));
const { createScene } = await import(url(gravitySource));
const canvas = new EventTarget();
canvas.closest = () => ({ querySelector: () => null });
canvas.focus = () => {};
canvas.matches = () => false;
const context = new Proxy({}, { get: () => () => {}, set: () => true });
const input = { pointers: new Map(), keys: new Set() };
const controller = new AbortController();
const scene = createScene();
await scene.init({ canvas, context, input, signal: controller.signal });
scene.resize(600, 500, 2); scene.resume();
const dynamic = () => Matter.Composite.allBodies(engine.world).filter(body => !body.isStatic);
assert.equal(dynamic().length, 4);
input.pointers.set(9,{x:580,y:30,vx:0,vy:0,time:0});
const emptyDown=new Event('pointerdown');Object.assign(emptyDown,{pointerId:9,button:0});canvas.dispatchEvent(emptyDown);
assert.equal(Matter.Composite.allConstraints(engine.world).length,0,'empty drag does not grab a shape');
const pushed=dynamic()[0];
input.pointers.set(9,{x:pushed.position.x+pushed.circleRadius+10,y:pushed.position.y,vx:-300,vy:0,time:16});
scene.update(1/60);
assert.ok(Matter.Body.getVelocity(pushed).x<0,'empty drag repels nearby shape');
input.pointers.delete(9);const emptyUp=new Event('pointerup');Object.assign(emptyUp,{pointerId:9});canvas.dispatchEvent(emptyUp);
for (let i = 0; i < 1800; i++) {
  scene.update(1/60);
  for (const body of dynamic()) {
    assert.ok(Number.isFinite(body.position.x) && Number.isFinite(body.position.y));
    assert.ok(body.position.x > -2 && body.position.x < 602, 'horizontal wall containment');
    assert.ok(body.position.y < 502, 'floor containment');
  }
}
scene.resize(280, 300, 2);
assert.equal(dynamic().length, 4);
const ball = dynamic()[0];
const pointer = { x: ball.position.x, y: ball.position.y, vx: 1200, vy: -1200, time: 10 };
input.pointers.set(1, pointer);
const down = new Event('pointerdown'); Object.assign(down, { pointerId: 1, button: 0 }); canvas.dispatchEvent(down);
assert.equal(Matter.Composite.allConstraints(engine.world).length, 1);
const up = new Event('pointerup'); Object.defineProperty(up, 'timeStamp', { value: 20 }); Object.assign(up, { pointerId: 1 }); canvas.dispatchEvent(up);
assert.equal(Matter.Composite.allConstraints(engine.world).length, 0);
assert.ok(Matter.Body.getSpeed(ball) <= 12.001);
for (let i = 0; i < 600; i++) scene.update(1/60);
scene.render();
scene.pause();
const timestamp = engine.timing.timestamp;
scene.update(1/60); assert.equal(engine.timing.timestamp, timestamp);
scene.resume(); scene.update(1/60); assert.ok(engine.timing.timestamp > timestamp);
scene.destroy();
assert.equal(Matter.Composite.allBodies(engine.world).length, 0);
assert.equal(Matter.Composite.allConstraints(engine.world).length, 0);
canvas.dispatchEvent(down);
console.log('PASS: Matter 0.20.0 collision containment (2400 steps), resize, drag/throw cap, pause, destroy, tilt permission/calibration/remapping/cleanup.');

const sizeInput = Object.assign(new EventTarget(), {name:'size',id:'size',value:'100'});
const sizeControl={hidden:true};sizeInput.closest=()=>sizeControl;
const sizeOutput = {};
const shapeStatus = {};
const tiltButton = Object.assign(new EventTarget(), {setAttribute(){}});
const calibrateButton = new EventTarget();
const addButtons = ['circle','box'].map(shape => Object.assign(new EventTarget(), {getAttribute:()=>shape}));
const controls = {
 querySelectorAll(selector){return selector==='[data-gravity-add]'?addButtons:[sizeInput];},
 querySelector(selector){return {'#size':sizeInput,'output[for="size"]':sizeOutput,'#shape-status':shapeStatus,'#tilt':tiltButton,'#calibrate':calibrateButton,'#tilt-status':{}}[selector];}
};
const editable = createScene();
const removeButton=Object.assign(new EventTarget(),{style:{},hidden:true});
const bounceButton=new EventTarget();
canvas.parentElement={querySelector:selector=>selector==='#bounce'?bounceButton:removeButton};
await editable.init({canvas,context,input,sceneRoot:{querySelector:()=>controls},signal:new AbortController().signal});
editable.resize(600,500,1);
assert.equal(sizeControl.hidden,true,'size control hidden without selection');
bounceButton.dispatchEvent(new Event('click'));
assert.ok(dynamic().every(body=>Matter.Body.getVelocity(body).y===-8),'bounce launches all shapes upward');
addButtons[0].dispatchEvent(new Event('click'));assert.equal(dynamic().length,5);assert.ok(dynamic().at(-1).circleRadius);
assert.equal(sizeControl.hidden,false,'selecting an added shape shows size control');
addButtons[1].dispatchEvent(new Event('click'));assert.equal(dynamic().length,6);assert.equal(dynamic().at(-1).circleRadius,0);
const box=dynamic().at(-1), initialWidth=box.bounds.max.x-box.bounds.min.x;
sizeInput.value='150';sizeInput.dispatchEvent(new Event('input'));
assert.ok(Math.abs((box.bounds.max.x-box.bounds.min.x)/initialWidth-1.5)<.001);
assert.ok(dynamic().slice(0,-1).every(body=>!body.plugin.sizeScale),'other shapes retain their size');
addButtons[0].dispatchEvent(new Event('click'));
assert.equal(dynamic().at(-1).plugin.sizeScale,undefined,'new shape starts at its default size');
assert.equal(Number(sizeInput.value),100);
const beforeHeightChange=dynamic().map(body=>({id:body.id,color:body.render.fillStyle,scale:body.plugin.sizeScale}));
editable.resize(600,700,1);
assert.deepEqual(dynamic().map(body=>({id:body.id,color:body.render.fillStyle,scale:body.plugin.sizeScale})),beforeHeightChange,'height-only resize preserves added shapes, colors and individual sizes');
editable.render();assert.equal(removeButton.hidden,false,'selected shape shows delete button');
const beforeDelete=dynamic().length;
removeButton.dispatchEvent(new Event('click'));
assert.equal(dynamic().length,beforeDelete-1,'delete removes only the selected shape');
assert.equal(removeButton.hidden,true);
assert.equal(sizeControl.hidden,true,'deleting selected shape hides size control');
for(let i=0;i<40;i++)addButtons[0].dispatchEvent(new Event('click'));
assert.equal(dynamic().length,30);
editable.destroy();addButtons[0].dispatchEvent(new Event('click'));assert.equal(dynamic().length,0);
console.log('PASS: Gravity adds circles/boxes, selected size scaling, 30-body cap and listener cleanup.');
