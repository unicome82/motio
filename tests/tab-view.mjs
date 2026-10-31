import assert from 'node:assert/strict';
import { readSource as readFile } from './helpers.mjs';
const moduleURL = source => 'data:text/javascript;base64,'+Buffer.from(source).toString('base64');
const { experiments, number } = await import(moduleURL(await readFile(new URL('../js/data.js',import.meta.url),'utf8')));
const { Router } = await import(moduleURL(await readFile(new URL('../js/core/router.js',import.meta.url),'utf8')));
const { ExperimentTabs } = await import(moduleURL(await readFile(new URL('../js/core/experiment-tabs.js',import.meta.url),'utf8')));
// Small DOM adapter for app routing; no browser layout or paint is simulated.
class Element extends EventTarget {
  constructor(tag) {
    super();this.tag=tag;this.attributes={};this.children=[];this.parentElement=null;
    this.style={removeProperty(){}};this.hidden=false;this.value='';this.defaultValue='';
    this.classList={
      contains:name=>(this.attributes.class||'').split(' ').includes(name),
      add:name=>{const names=new Set((this.attributes.class||'').split(' ').filter(Boolean));names.add(name);this.attributes.class=[...names].join(' ');},
      remove:name=>{const names=new Set((this.attributes.class||'').split(' ').filter(Boolean));names.delete(name);this.attributes.class=[...names].join(' ');},
      toggle:(name,on)=>{
        const names=new Set((this.attributes.class||'').split(' ').filter(Boolean));
        if(on)names.add(name);else names.delete(name);this.attributes.class=[...names].join(' ');
      },
    };
  }
  setAttribute(name,value){this.attributes[name]=String(value);if(name==='value')this.value=this.defaultValue=String(value);}
  removeAttribute(name){delete this.attributes[name];}
  get id(){return this.attributes.id;}
  get hash(){return this.attributes.href;}
  get isConnected(){return this===document.body||!!this.parentElement?.isConnected;}
  append(child){child.parentElement=this;this.children.push(child);}
  remove(){if(this.parentElement)this.parentElement.children=this.parentElement.children.filter(child=>child!==this);this.parentElement=null;}
  focus(){document.activeElement=this;}
  scrollIntoView(){}
  click(){this.dispatchEvent(new Event('click',{cancelable:true}));}
  matches(selector){
    const tag=selector.match(/^[a-z]+/i)?.[0];if(tag&&tag!==this.tag)return false;
    const id=selector.match(/#([\w-]+)/)?.[1];if(id&&id!==this.id)return false;
    for(const match of selector.matchAll(/\.([\w-]+)/g))if(!(this.attributes.class||'').split(' ').includes(match[1]))return false;
    for(const match of selector.matchAll(/\[([\w-]+)(?:="([^"]*)")?\]/g)){
      if(!(match[1]in this.attributes)||(match[2]!==undefined&&this.attributes[match[1]]!==match[2]))return false;
    }
    return true;
  }
  closest(selector){return this.matches(selector)?this:this.parentElement?.closest(selector);}
  querySelectorAll(selector){
    const tokens=selector.trim().split(/\s+/),last=tokens.pop();const found=[];
    const visit=node=>{for(const child of node.children){if(child.matches(last)){
      let ancestor=child.parentElement,valid=true;
      for(const token of [...tokens].reverse()){while(ancestor&&!ancestor.matches(token))ancestor=ancestor.parentElement;if(!ancestor){valid=false;break;}ancestor=ancestor.parentElement;}
      if(valid)found.push(child);
    }visit(child);}};visit(this);return found;
  }
  querySelector(selector){return this.querySelectorAll(selector)[0]||null;}
  set innerHTML(html){
    for(const child of this.children)child.parentElement=null;this.children=[];this.markup=html;
    const stack=[this];
    for(const match of html.matchAll(/<\/?[a-z][^>]*>/gi)){
      const text=match[0];if(text.startsWith('</')){if(stack.length>1)stack.pop();continue;}
      const tag=text.match(/^<([\w-]+)/)[1];const element=new Element(tag);
      for(const attr of text.matchAll(/([\w-]+)="([^"]*)"/g))element.setAttribute(attr[1],attr[2]);
      stack.at(-1).append(element);
      if(!text.endsWith('/>')&&!['input','br','meta','link'].includes(tag))stack.push(element);
    }
  }
  get innerHTML(){return this.markup||'';}
}
globalThis.document=new EventTarget();document.body=new Element('body');
document.createElement=tag=>new Element(tag);document.querySelector=selector=>document.body.querySelector(selector);
const html=await readFile(new URL('../index.html',import.meta.url),'utf8');document.body.innerHTML=html.match(/<body>([\s\S]*)<\/body>/)[1];
globalThis.location={hash:''};globalThis.window=new EventTarget();let scrollCalls=0;window.scrollTo=()=>{scrollCalls++;};window.history={pushState(_state,_title,hash){location.hash=hash;}};
class SceneManager {
  constructor(){this.mounts=[];this.unmounts=0;}
  unmount(){this.unmounts++;}
  async mount(canvas,item){
    assert.ok(canvas?.isConnected,'mounted canvas is in the active document');
    if(item.id!=='home')assert.ok(canvas.closest('#experiment-panel'),'experiment must not use the hidden hero canvas');
    this.mounts.push(item.id);return true;
  }
  setPaused(){}destroy(){}
}
class ViewTransition {cancel(){}enter(){}destroy(){}}
const source=(await readFile(new URL('../js/app.js',import.meta.url),'utf8')).replace(/^import .*;\n/gm,'');
const styles=await readFile(new URL('../scss/style.css',import.meta.url),'utf8');
assert.match(styles,/\.canvas-region\.is-canvas-hovered \.scene-info,[\s\S]*?\.canvas-region\.is-canvas-touched \.scene-info\s*\{\s*opacity:\s*0;/,'canvas interaction hides overlay information');
const app=new Function('experiments','number','Router','SceneManager','ViewTransition','ExperimentTabs',source+'\nreturn { manager, router, tabs };')(experiments,number,Router,SceneManager,ViewTransition,ExperimentTabs);
assert.equal(app.manager.mounts.at(-1),'home');
const main=document.querySelector('main');
const panel=document.querySelector('#experiment-panel');
const descriptions={
  gravity:'물체를 드래그하고 손을 놓아 던져 보세요. 캔버스에서 N으로 물체 선택, 방향키로 움직일 수 있습니다.',
  elastic:'원을 잡아 늘린 뒤 놓아 보세요. 강성과 감쇠를 조절해 탄성의 차이를 비교할 수 있습니다.',
  magnetism:'점의 개수와 크기를 조절하고, 중력과 커서 극성을 전환해 보세요.',
  wave:'캔버스를 누르면 파동이 퍼지고 겹쳐지며 잦아듭니다. 유체 전체를 재현하지 않는 2차원 파동 모델입니다.',
  cloth:'천의 점을 잡아 움직여 보세요. 무작위로 정한 두 고정점과 점 사이 거리 제약으로 천의 움직임을 계산합니다.',
  chain:'공이 경사면을 내려와 도미노를 밀면 연쇄 반응이 시작됩니다. 모든 움직임은 실제 충돌로 계산합니다.',
};
for(const experiment of experiments){
  if(panel.querySelector('.scene-info')){
    const stickyArea=new Element('div');stickyArea.setAttribute('class','sticky-area');
    stickyArea.append(panel.querySelector('.scene-info'));
    const panelPosition=main.children.indexOf(panel);
    stickyArea.parentElement=main;main.children.splice(panelPosition,0,stickyArea);
  }
  document.querySelector('#tab-'+experiment.id).click();await Promise.resolve();
  assert.equal(location.hash,'#'+experiment.id);
  assert.equal(document.querySelector('.hero').hidden,true);
  assert.equal(panel.hidden,false);
  assert.equal(panel.attributes['aria-labelledby'],'tab-'+experiment.id);
  assert.equal(app.manager.mounts.at(-1),experiment.id);
  const count=app.manager.mounts.length;
  document.querySelector('#tab-'+experiment.id).click();await Promise.resolve();
  assert.equal(app.manager.mounts.length,count,'reselecting a tab does not reset the scene');
  assert.equal(document.querySelector('[aria-selected="true"]').id,'tab-'+experiment.id);
  assert.equal(panel.querySelector('.scene-info p').textContent,descriptions[experiment.id],'active scene owns its description even when old sticky info remains in main');
  const canvas = panel.querySelector('canvas');
  const pointerEvent = (type, pointerType) => {
    const event = new Event(type);
    Object.defineProperty(event,'pointerType',{value:pointerType});
    return event;
  };
  canvas.dispatchEvent(pointerEvent('pointerenter','mouse'));
  assert.ok(canvas.parentElement.classList.contains('is-canvas-hovered'),'hovering the canvas hides its overlay information');
  canvas.dispatchEvent(pointerEvent('pointerleave','mouse'));
  assert.equal(canvas.parentElement.classList.contains('is-canvas-hovered'),false,'leaving the canvas restores its overlay information');
  canvas.dispatchEvent(pointerEvent('pointerdown','touch'));
  assert.ok(canvas.parentElement.classList.contains('is-canvas-touched'),'touching the canvas hides its overlay information');
  assert.equal(panel.querySelector('#pause'),null,'pause button removed');
  const reset=panel.querySelector('#reset');
  assert.ok(reset.closest('.canvas-region'),'reset is inside the canvas area');
  const bounce=panel.querySelector('#bounce');
  assert.ok(bounce?.closest('.canvas-region'),'bounce button is available in every experiment canvas');
  assert.ok(bounce.attributes['aria-label'],'bounce button has an accessible scene-specific name');
  reset.click();await Promise.resolve();
  assert.equal(app.manager.mounts.length,count+1,'refresh remounts the current scene');
}
document.querySelector('main').classList.toggle('is-compact',true);
const scrollBefore=scrollCalls;
app.router.navigate('gravity');
assert.equal(scrollCalls,scrollBefore,'sticky tab switch preserves page scroll');
assert.ok(document.querySelector('main').classList.contains('is-compact'));
for(const removed of ['home','about','experiments','settings']){
  location.hash='#'+removed;window.dispatchEvent(new Event('hashchange'));await Promise.resolve();
  assert.equal(document.querySelector('.hero').hidden,false);assert.equal(document.querySelector('#experiment-panel').hidden,true);
  assert.equal(app.manager.mounts.at(-1),'home');
}
window.dispatchEvent(new Event('pagehide'));
console.log('PASS: app home→seven tabs→home, hero visibility, active canvas, panel labels, legacy routes and teardown.');
