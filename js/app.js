import { experiments, number } from './data.js';
import { Router } from './core/router.js';
import { SceneManager } from './core/scene-manager.js';
import { ViewTransition } from './core/view-transition.js';
import { ExperimentTabs } from './core/experiment-tabs.js';

const main = document.querySelector('main');
const hero = main.querySelector('.hero');
const homeArt = document.querySelector('.hero-art');
const panel = main.querySelector('#experiment-panel');
const transition = new ViewTransition(panel);
const tabs = new ExperimentTabs(main.querySelector('[role="tablist"]'), id => router.navigate(id));
const manager = new SceneManager({ onError: () => {
  const status = main.querySelector('.canvas-status');
  if (status) {
    status.textContent = '체험을 불러올 수 없습니다. 연결을 확인한 뒤 초기화를 눌러 주세요.';
    status.setAttribute('role', 'alert');
  }
} });
let viewController;
let firstRoute = true;

document.querySelector('.skip-link').addEventListener('click', event => {
  event.preventDefault(); main.focus({ preventScroll: false });
});

function renderScene(index, options) {
  const item = experiments[index];
  panel.innerHTML = `<section class="scene" aria-labelledby="scene-title"><div class="scene-layout"><aside class="scene-info"><span class="eyebrow">${number(index)} / PLAY</span><div class="scene-heading"><h1 id="scene-title">${item.title}</h1><h2>${item.subtitle}</h2></div><p>체험을 위한 공간을 준비했습니다.<br>물리 동작은 이후 단계에서 연결됩니다.</p><dl class="instructions"><dt>포인터 · 터치</dt><dd>입력 기반 준비 완료</dd><dt>체험 상태</dt><dd>Foundation / 빈 캔버스</dd></dl></aside><div class="canvas-region"><div class="canvas-actions"><button id="reset" class="canvas-reset" type="button" aria-label="초기화" title="초기화"><span class="circle-arrow" aria-hidden="true">refresh</span></button></div><canvas tabindex="0" aria-label="${item.title} 빈 체험 캔버스" aria-describedby="canvas-status"></canvas><p id="canvas-status" class="canvas-status" role="status">PLAY ${number(index)}<span>체험 준비 중</span></p></div><aside class="scene-controls" aria-label="체험 제어"><p>물리 매개변수는 체험 구현 단계에서 추가됩니다.</p><p class="control-note">현재 캔버스에는 물리 효과가 없습니다.</p></aside></div></section>`;
  const canvas = panel.querySelector('canvas');
  const sceneRoot = panel.querySelector('.scene');
  const canvasRegion = canvas.parentElement;
  canvas.addEventListener('pointerenter', event => {
    if (event.pointerType !== 'touch') canvasRegion.classList.add('is-canvas-hovered');
  }, options);
  canvas.addEventListener('pointerleave', event => {
    if (event.pointerType !== 'touch') canvasRegion.classList.remove('is-canvas-hovered');
  }, options);
  canvas.addEventListener('pointerdown', event => {
    if (event.pointerType === 'touch') canvasRegion.classList.add('is-canvas-touched');
  }, options);
  const bounce = document.createElement('button');
  bounce.setAttribute('id', 'bounce'); bounce.setAttribute('class', 'canvas-reset'); bounce.type = 'button';
  const bounceLabels = {
    gravity: '도형 바운스', elastic: '도형과 스프링 추가', magnetism: '입자 튕기기',
    wave: '중앙에 파동 만들기', cloth: '천 흔들기', chain: '공 더 높이 튀기기',
    sandbox: '물체 튕기기',
  };
  bounce.setAttribute('aria-label', bounceLabels[item.id] || '실험 효과 실행');
  bounce.setAttribute('title', bounceLabels[item.id] || '실험 효과 실행');
  const bounceIcon = item.id === 'elastic' ? 'add'
    : item.id === 'magnetism' ? 'blur_on'
      : item.id === 'wave' ? 'waves' : 'stat_2';
  bounce.innerHTML = `<span class="circle-arrow" aria-hidden="true">${bounceIcon}</span>`;
  canvas.parentElement.querySelector('.canvas-actions').append(bounce);
  if (item.id === 'gravity') {
    const remove = document.createElement('button');
    remove.id = 'remove-shape'; remove.className = 'canvas-remove'; remove.type = 'button';
    remove.hidden = true; remove.setAttribute('aria-label', '선택한 도형 삭제');
    remove.innerHTML = '<span class="circle-arrow" aria-hidden="true">close</span>';
    canvas.parentElement.append(remove);
  }
  if (item.id === 'gravity') {
    sceneRoot.querySelector('.scene-info p').textContent = '물체를 드래그하고 손을 놓아 던져 보세요. 캔버스에서 N으로 물체 선택, 방향키로 움직일 수 있습니다.';
    sceneRoot.querySelector('.instructions').innerHTML = '<dt>드래그 · 던지기</dt><dd>마우스와 터치로 물체 잡기</dd><dt>기울이기</dt><dd>버튼을 눌러 센서 사용 허용</dd><dt>화면 크기 변경</dt><dd>크기에 맞춰 물체 재배치</dd>';
    canvas.setAttribute('aria-label', 'Gravity 물리 체험. 드래그하여 던지기. N으로 물체 선택, 방향키로 이동.');
    sceneRoot.querySelector('.scene-controls').innerHTML = `
      <div class="control-actions"><button type="button" class="control-button" data-gravity-add="circle" aria-label="원 추가" title="원 추가"><span class="circle-arrow" aria-hidden="true">add</span></button><button type="button" class="control-button" data-gravity-add="box" aria-label="네모 추가" title="네모 추가"><span class="circle-arrow" aria-hidden="true">add</span></button><div class="shape-size" hidden>
      <label for="size">크기 <output for="size">100</output>%</label><input class="control-button" id="size" name="size" type="range" min="50" max="150" step="5" value="100" aria-label="선택한 도형 크기"></div></div>
      <label for="gravity">중력 세기 <output for="gravity">9.8</output></label><input class="control-button" id="gravity" name="gravity" type="range" min="0" max="19.6" step="0.1" value="9.8">
      <label for="restitution">반발 계수 <output for="restitution">0.7</output></label><input class="control-button" id="restitution" name="restitution" type="range" min="0" max="1" step="0.05" value="0.7">
      <label for="friction">마찰 계수 <output for="friction">0.3</output></label><input class="control-button" id="friction" name="friction" type="range" min="0" max="1" step="0.05" value="0.3">
      <div class="control-actions"><button id="tilt" class="control-button" aria-pressed="false">기울이기 켜기</button><button id="calibrate" class="control-button">기준점 보정</button></div><p id="tilt-status" class="control-note" role="status">기울이기 꺼짐 · 드래그와 터치로 사용할 수 있습니다.</p>
      <p class="control-note"><span class="keyboard-note">N: 물체 선택 · 방향키: 힘 가하기<br></span>크기 변경 시 물체가 재배치됩니다.</p>`;
  }
  if (item.id === 'elastic') {
    sceneRoot.querySelector('.scene-info p').textContent = '원을 잡아 늘린 뒤 놓아 보세요. 강성과 감쇠를 조절해 탄성의 차이를 비교할 수 있습니다.';
    sceneRoot.querySelector('.instructions').innerHTML = '<dt>잡았다 놓기</dt><dd>마우스·터치로 스프링 늘리기</dd><dt>키보드</dt><dd>N으로 원 선택 · 방향키로 힘 가하기</dd><dt>체험 환경</dt><dd>중력 없이 탄성만 관찰 · 크기 변경 시 재배치</dd>';
    canvas.setAttribute('aria-label', 'Elastic 탄성 체험. 원을 잡았다 놓으세요. N으로 원 선택, 방향키로 힘 가하기.');
    sceneRoot.querySelector('.scene-controls').innerHTML = `
      <label for="stiffness">스프링 강성 <output for="stiffness">0.04</output></label><input class="control-button" id="stiffness" name="stiffness" type="range" min="0.005" max="0.2" step="0.005" value="0.04">
      <label for="damping">감쇠 <output for="damping">0.06</output></label><input class="control-button" id="damping" name="damping" type="range" min="0" max="0.3" step="0.01" value="0.06">
      <p class="control-note">강성이 높으면 단단하게, 감쇠가 높으면 더 빠르게 진정됩니다. 감쇠 0에서도 공기 저항은 유지됩니다.</p>
      <p class="control-note">N: 원 선택 · 방향키: 힘 가하기<br>크기 변경 시 원이 재배치됩니다.</p>`;
  }
  if (item.id === 'magnetism') {
    sceneRoot.querySelector('.scene-info p').textContent = '점의 개수와 크기를 조절하고, 중력과 커서 극성을 전환해 보세요.';
    sceneRoot.querySelector('.instructions').innerHTML = '<dt>커서 · 터치</dt><dd>극성을 바꿔 점을 당기거나 밀기</dd><dt>중력</dt><dd>중앙 + 자기장 켜기 · 끄기</dd><dt>키보드</dt><dd>방향키로 입력 위치 이동 · P로 극성 전환</dd>';
    canvas.setAttribute('aria-label', 'Magnetism 근사 자기력 체험. 커서와 터치로 점을 움직이고, P로 커서 극성을 전환.');
    sceneRoot.querySelector('.scene-controls').innerHTML = `
      <label for="particle-count">점 개수 <output for="particle-count">300</output></label><input class="control-button" id="particle-count" name="particle-count" type="range" min="120" max="600" step="10" value="300">
      <label for="particle-size">점 크기 <output for="particle-size">3</output></label><input class="control-button" id="particle-size" name="particle-size" type="range" min="1.5" max="8" step="0.5" value="3">
      <label for="force">힘의 세기 <output for="force">1</output></label><input class="control-button" id="force" name="force" type="range" min="0" max="3" step="0.1" value="1">
      <div class="control-actions"><button id="center-field" class="control-button" aria-pressed="true">중력 ON</button><button id="polarity" class="control-button" aria-pressed="false">+극</button></div>
      <p id="polarity-status" class="control-note" role="status">커서 + · 중앙 자기장은 + 극성을 유지합니다.</p>
      <p class="control-note">단순화된 자기력 근사 모델입니다. 중앙 자기장을 끄면 커서·터치 위치에만 반응합니다. 입자 간 충돌은 화면상 겹침 방지를 위한 근사 처리입니다.</p>`;
  }
  if (item.id === 'wave') {
    sceneRoot.querySelector('.scene-info p').textContent = '캔버스를 누르면 파동이 퍼지고 겹쳐지며 잦아듭니다. 유체 전체를 재현하지 않는 2차원 파동 모델입니다.';
    sceneRoot.querySelector('.instructions').innerHTML = '<dt>클릭 · 다중 터치</dt><dd>누른 위치에 파동 생성 · 동시 입력 최대 4개</dd><dt>키보드</dt><dd>방향키로 위치 선택 · Enter 또는 Space로 파동 생성</dd><dt>화면 크기 변경</dt><dd>격자 재구성 · 기존 파동 초기화</dd>';
    canvas.setAttribute('aria-label', 'Wave 2차원 파동 체험. 클릭·터치로 파동 생성. 방향키로 위치 선택, Enter 또는 Space로 파동 생성.');
    sceneRoot.querySelector('.scene-controls').innerHTML = `
      <label for="speed">전파 속도 <output for="speed">180</output></label><input class="control-button" id="speed" name="speed" type="range" min="100" max="300" step="10" value="180">
      <label for="damping">감쇠 <output for="damping">1.8</output></label><input class="control-button" id="damping" name="damping" type="range" min="0.4" max="4" step="0.1" value="1.8">
      <p class="control-note">단순화된 2차원 파동 모델입니다. 얇은 선은 격자의 높이 변화를 표시합니다. 좁은 화면에서는 격자 수를 줄여 계산량을 조절합니다.</p>`;
  }
  if (item.id === 'cloth') {
    sceneRoot.querySelector('.scene-info p').textContent = '천의 점을 잡아 움직여 보세요. 무작위로 정한 두 고정점과 점 사이 거리 제약으로 천의 움직임을 계산합니다.';
    sceneRoot.querySelector('.instructions').innerHTML = '<dt>드래그 · 다중 터치</dt><dd>점을 잡아 천 당기기 · 최대 4개</dd><dt>핀 추가·해제</dt><dd>핀 모드에서 점 누르기 · 초기 고정점 유지</dd><dt>키보드</dt><dd>N으로 점 선택 · 방향키로 당기기 · P로 고정 전환</dd>';
    canvas.setAttribute('aria-label', 'Cloth 천 체험. 점을 드래그하세요. N으로 점 선택, 방향키로 당기기, P로 고정 전환.');
    sceneRoot.querySelector('.scene-controls').innerHTML = `
      <button id="pin-mode" class="control-button" aria-pressed="false">핀 추가·해제</button><p id="pin-status" class="control-note" role="status">점을 드래그해 천을 움직일 수 있습니다.</p>
      <p class="control-note">Verlet/PBD 기반 천 모델입니다. 천 자체의 충돌·찢기는 구현하지 않습니다. 최대 221개 점과 16회 제약 반복으로 계산량을 제한합니다. 크기 변경 시 추가 핀과 천의 위치는 초기화됩니다.</p>`;
  }
  if (item.id === 'sandbox') {
    sceneRoot.querySelector('.scene-info p').textContent = '물체를 추가하고 배치해 나만의 체험을 만들어 보세요. 선택한 물체의 질량·마찰·반발을 조절할 수 있습니다.';
    sceneRoot.querySelector('.instructions').innerHTML = '<dt>추가 · 선택 · 드래그</dt><dd>버튼으로 추가한 뒤 캔버스에서 배치</dd><dt>키보드</dt><dd>N으로 선택 · 방향키로 이동 · Delete로 삭제</dd><dt>편집 환경</dt><dd>일시 정지 중 배치 가능 · 크기 변경 시 기본 배치로 초기화</dd>';
    canvas.setAttribute('aria-label','Sandbox 물리 편집기. 물체를 선택하고 드래그하세요. N으로 선택, 방향키 이동, Delete로 삭제.');
    sceneRoot.querySelector('.scene-controls').innerHTML = `<h2>물체 추가</h2>
      <div class="control-actions"><button class="control-button" data-add="circle">+ 원</button><button class="control-button" data-add="box">+ 상자</button><button class="control-button" data-add="ramp">+ 고정 경사면</button><button class="control-button" data-add="static">+ 고정 발판</button></div><p id="editor-status" class="control-note" role="status">물체를 선택하세요.</p>
      <label for="mass">질량 <output for="mass">2</output></label><input class="control-button" type="range" id="mass" name="mass" min="0.5" max="10" step="0.5" value="2">
      <label for="friction">마찰 <output for="friction">0.3</output></label><input class="control-button" type="range" id="friction" name="friction" min="0" max="1" step="0.05" value="0.3">
      <label for="restitution">반발 <output for="restitution">0.5</output></label><input class="control-button" type="range" id="restitution" name="restitution" min="0" max="1" step="0.05" value="0.5">
      <label for="gravity">전체 중력 <output for="gravity">9.8</output></label><input class="control-button" type="range" id="gravity" name="gravity" min="0" max="19.6" step="0.1" value="9.8">
      <button id="remove-body" class="control-button">선택 물체 삭제</button>
      <p class="control-note">최대 24개. 고정 물체의 질량은 조절하지 않습니다. 크기 변경·초기화·화면 이탈 시 편집 내용이 초기화되며 저장되지 않습니다.</p>`;
  }
  if (item.id === 'chain') {
    sceneRoot.querySelector('.scene-info p').textContent = '공이 경사면을 내려와 도미노를 밀면 연쇄 반응이 시작됩니다. 모든 움직임은 실제 충돌로 계산합니다.';
    sceneRoot.querySelector('.instructions').innerHTML = '<dt>두 가지 프리셋</dt><dd>기본·촘촘한 도미노 배치 비교</dd><dt>다시 재생</dt><dd>현재 프리셋을 처음부터 재생</dd><dt>화면 크기 변경</dt><dd>물리 배치와 진행 상태 유지</dd>';
    canvas.setAttribute('aria-label','Chain Reaction 도미노 연쇄 반응. 설정의 프리셋과 다시 재생 버튼으로 조작하세요.');
    sceneRoot.querySelector('.scene-controls').innerHTML = `
      <label for="chain-preset">도미노 배치</label><select id="chain-preset" class="control-button"><option value="classic">기본 도미노 · 11개</option><option value="dense">촘촘한 도미노 · 13개</option></select>
      <button id="replay" class="control-button">↻ 다시 재생</button><p id="chain-status" class="control-note" role="status">공이 도미노를 향해 이동합니다.</p>
      <p class="control-note">공·경사면·도미노 충돌로 구동합니다. 초기화는 현재 프리셋을 유지합니다. 화면 크기가 바뀌어도 같은 물리 배치를 비례해서 표시합니다.</p>`;
    sceneRoot.querySelector('#replay').addEventListener('click', () => {
      manager.setPaused(false);
    }, options);
  }
  const implemented = ['gravity', 'elastic', 'magnetism', 'wave', 'cloth', 'chain', 'sandbox'].includes(item.id);
  const mount = async () => {
    if (!sceneRoot.querySelector('.canvas-status')) {
      const message = document.createElement('p');
      message.id = 'canvas-status'; message.className = 'canvas-status'; message.setAttribute('role', 'status');
      canvas.parentElement.append(message); canvas.setAttribute('aria-describedby', 'canvas-status');
    }
    const status = sceneRoot.querySelector('.canvas-status');
    if (implemented && status) status.textContent = `${item.title} 체험을 불러오는 중…`;
    const loaded = await manager.mount(canvas, item, sceneRoot);
    if (loaded && canvas.isConnected && implemented) { status?.remove(); canvas.removeAttribute('aria-describedby'); }
  };
  mount();
  const resetButton = canvas.parentElement.querySelector('#reset');
  resetButton.addEventListener('click', async () => {
    if (resetButton.disabled) return;
    resetButton.disabled = true;
    try {
      if (implemented) {
        for (const slider of sceneRoot.querySelectorAll('input[type="range"]')) {
          slider.value = slider.defaultValue;
          const output = sceneRoot.querySelector(`output[for="${slider.id}"]`);
          if (output) output.value = slider.value;
        }
      }
      if (item.id === 'cloth') {
        const pinButton = sceneRoot.querySelector('#pin-mode');
        pinButton.setAttribute('aria-pressed', 'false'); pinButton.textContent = '핀 추가·해제';
      }
      if (item.id === 'magnetism') {
        const polarityButton = sceneRoot.querySelector('#polarity');
        polarityButton.setAttribute('aria-pressed', 'false');
        polarityButton.textContent = '+극';
        sceneRoot.querySelector('#polarity-status').textContent = '커서 + · 중앙 자기장은 + 극성을 유지합니다.';
        const centerFieldButton = sceneRoot.querySelector('#center-field');
        centerFieldButton.setAttribute('aria-pressed', 'true');
        centerFieldButton.textContent = '중력 ON';
      }
      if (item.id === 'gravity') {
        const tiltButton = sceneRoot.querySelector('#tilt');
        tiltButton.disabled = false;
        tiltButton.setAttribute('aria-pressed', 'false');
        tiltButton.textContent = '기울이기 켜기';
        sceneRoot.querySelector('#tilt-status').textContent = '기울이기 꺼짐 · 드래그와 터치로 사용할 수 있습니다.';
      }
      await mount();
    } finally {
      resetButton.disabled = false;
    }
  }, options);
}

const router = new Router(route => {
  const keepSticky = document.body.classList.contains('is-experiment')
    && main.classList.contains('is-compact')
    && experiments.some(item => item.id === route);
  transition.cancel();
  manager.unmount();
  homeArt.querySelector('canvas')?.remove();
  viewController?.abort();
  viewController = new AbortController();
  const index = experiments.findIndex(item => item.id === route);
  const active = index >= 0;
  document.body.classList.toggle('is-experiment', active);
  hero.hidden = active;
  panel.hidden = !active;
  tabs.activate(active ? route : null);
  panel.innerHTML = '';
  if (active) {
    panel.setAttribute('aria-labelledby', `tab-${route}`);
    document.title = `${experiments[index].title} — PHYSICS LAB.`;
    renderScene(index, { signal: viewController.signal });
  } else {
    panel.removeAttribute('aria-labelledby');
    document.title = 'PHYSICS LAB. — Play with Physics.';
    const art = homeArt;
    art.querySelector('canvas')?.remove();
    const canvas = document.createElement('canvas');
    canvas.setAttribute('aria-hidden', 'true');
    art.append(canvas);
    manager.mount(canvas, { id: 'home' });
  }
  if (!firstRoute) {
    if (active) tabs.focusSelected({ preserveScroll: keepSticky }); else main.focus({ preventScroll: true });
    if (!keepSticky) window.scrollTo(0, 0);
    if (active) transition.enter();
  }
  firstRoute = false;
});
window.addEventListener('pagehide', () => {
  transition.destroy(); tabs.destroy(); manager.destroy(); router.destroy(); viewController?.abort();
}, { once: true });
window.addEventListener('pageshow', event => { if (event.persisted) location.reload(); });
