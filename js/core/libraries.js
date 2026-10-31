let pending;
const MATTER_URL = 'https://cdn.jsdelivr.net/npm/matter-js@0.20.0/build/matter.min.js';

export function loadMatter() {
  if (window.Matter?.version === '0.20.0') return Promise.resolve(window.Matter);
  if (pending) return pending;
  pending = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    let settled = false;
    const finish = error => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      script.onload = script.onerror = null;
      if (error) { script.remove(); pending = null; reject(error); }
      else resolve(window.Matter);
    };
    const timeout = setTimeout(() => finish(new Error('Matter.js 로딩 시간이 초과되었습니다. 다시 시도해 주세요.')), 12000);
    script.src = MATTER_URL;
    script.async = true;
    script.onload = () => finish(window.Matter?.version === '0.20.0' ? null : new Error('Matter.js를 정상적으로 불러오지 못했습니다.'));
    script.onerror = () => finish(new Error('Matter.js 연결에 실패했습니다. 다시 시도해 주세요.'));
    document.head.append(script);
  });
  return pending;
}
