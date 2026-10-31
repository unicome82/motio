import assert from 'node:assert/strict';
import { readSource as readFile } from './helpers.mjs';
const url = source => 'data:text/javascript;base64,'+Buffer.from(source).toString('base64');
const { ExperimentTabs } = await import(url(await readFile(new URL('../js/core/experiment-tabs.js', import.meta.url),'utf8')));
const tabs = Array.from({length:7},(_,i)=>{
  const tab = new EventTarget();tab.id=`tab-${i}`;tab.attributes={};tab.clicks=0;
  tab.setAttribute=(name,value)=>tab.attributes[name]=value;
  tab.focus=()=>tab.focused=true;tab.scrollIntoView=()=>{};tab.click=()=>tab.clicks++;
  return tab;
});
const controller = new ExperimentTabs({querySelectorAll:()=>tabs});
controller.activate('3');
assert.equal(tabs[3].attributes['aria-selected'],'true');
assert.equal(tabs.filter(tab=>tab.tabIndex===0).length,1);
function key(tab,name){const event=new Event('keydown',{cancelable:true});Object.assign(event,{key:name});tab.dispatchEvent(event);return event;}
assert.ok(key(tabs[6],'ArrowRight').defaultPrevented);assert.equal(tabs[0].focused,true);
key(tabs[0],'ArrowLeft');assert.equal(tabs[6].tabIndex,0);
key(tabs[6],'Home');assert.equal(tabs[0].tabIndex,0);
key(tabs[0],'End');assert.equal(tabs[6].tabIndex,0);
key(tabs[6],' ');assert.equal(tabs[6].clicks,1);
assert.equal(tabs[3].attributes['aria-selected'],'true','arrow navigation does not activate expensive scenes');
controller.activate(null);assert.ok(tabs.every(tab=>tab.attributes['aria-selected']==='false'));assert.equal(tabs[0].tabIndex,0);
controller.destroy();key(tabs[6],' ');assert.equal(tabs[6].clicks,1);
const html=await readFile(new URL('../index.html',import.meta.url),'utf8');
assert.equal((html.match(/role="tab"/g)||[]).length,6);
assert.match(html,/role="tabpanel"/);
assert.ok(!/#(?:about|settings|experiments)"/.test(html));
console.log('PASS: seven thumbnail tabs, ARIA/roving focus, manual keyboard activation, removed menus and cleanup.');
