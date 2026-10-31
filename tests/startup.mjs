import assert from 'node:assert/strict';
import { readSource as readFile } from './helpers.mjs';
const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
const main = html.match(/<main\b[^>]*>([\s\S]*?)<\/main>/)[1];
assert.match(main, /id="hero-title"/);
for (const route of ['gravity','elastic','magnetism','wave','cloth','chain']) assert.ok(main.includes(`href="#${route}"`));
assert.match(html, /src="js\/boot.js"/);
assert.match(html, /<script async src="https:\/\/cdn\.jsdelivr\.net\/npm\/gsap/);
assert.match(html, /Material\+Symbols\+Outlined[^"]*icon_names=[^"]*\bblur_on\b/, 'Google Material Symbols includes blur_on');
assert.match(html, /Material\+Symbols\+Outlined[^"]*icon_names=[^"]*\bwaves\b/, 'Google Material Symbols includes waves');
assert.ok(!/<script defer src="https:[^"]*gsap/.test(html));
const boot = (await readFile(new URL('../js/boot.js', import.meta.url), 'utf8')).replace(/import\('\.\/app\.js(?:\?[^']*)?'\)/, 'loadApp()');
const run = new Function('document', 'location', 'loadApp', 'console', boot);
function environment(protocol, fail = false) {
  const messages = []; let calls = 0;
  const target = { querySelector: () => target, append: message => messages.push(message) };
  const document = { querySelector: () => target, createElement: tag => ({ tag, setAttribute() {}, append() {} }) };
  run(document, { protocol }, () => { calls++; return fail ? Promise.reject(new Error('test load failure')) : Promise.resolve(); }, { error() {} });
  return { messages, calls: () => calls };
}
const file = environment('file:'); assert.equal(file.calls(), 0); assert.match(file.messages[0].textContent, /HTTP/);
const http = environment('http:'); await Promise.resolve(); assert.equal(http.calls(), 1); assert.equal(http.messages.length, 0);
const failure = environment('http:', true); await Promise.resolve(); assert.match(failure.messages[0].textContent, /시작하지 못/);
console.log('PASS: static home and six links, file-protocol preview, HTTP module startup and failure feedback.');
