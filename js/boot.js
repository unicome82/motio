(() => {
  function showMessage(text, localLink = false) {
    const main = document.querySelector('main');
    const message = document.createElement('p');
    message.className = 'control-note';
    message.setAttribute('role', 'alert');
    message.textContent = text;
    if (localLink) {
      const link = document.createElement('a');
      link.className = 'text-link';
      link.href = 'http://127.0.0.1:8000/';
      link.textContent = '로컬 서버에서 열기 →';
      message.append(document.createElement('br'), link);
    }
    (main.querySelector('.hero-copy') || main).append(message);
  }
  if (location.protocol === 'file:') {
    showMessage('홈 미리보기입니다. 체험은 HTTP 서버에서 실행해 주세요. 프로젝트 폴더에서 python3 -m http.server 8000을 실행하면 됩니다.', true);
    return;
  }
  import('./app.js?v=scene-copy-scope').catch(error => {
    console.error('PHYSICS LAB 초기화 실패:', error);
    showMessage('플레이그라운드을 시작하지 못했습니다. 연결을 확인한 뒤 페이지를 새로고침해 주세요.');
  });
})();
