export function remapTilt(beta, gamma, angle = 0) {
  const radians = angle * Math.PI / 180;
  return { x: gamma * Math.cos(radians) + beta * Math.sin(radians), y: beta * Math.cos(radians) - gamma * Math.sin(radians) };
}

export class TiltInput {
  constructor(onStatus) {
    this.onStatus = onStatus;
    this.direction = { x: 0, y: 1 };
    this.active = false;
    this.destroyed = false;
    this.baseline = null;
    this.sample = null;
    this.pending = false;
  }
  async enable() {
    if (this.pending || this.destroyed) return;
    const api = window.DeviceOrientationEvent;
    if (!window.isSecureContext || !api) {
      this.onStatus('기울이기를 지원하지 않는 환경입니다. HTTPS와 센서를 확인해 주세요. 터치는 계속 사용할 수 있습니다.');
      return;
    }
    this.pending = true;
    try {
      if (typeof api.requestPermission === 'function' && await api.requestPermission() !== 'granted') {
        if (!this.destroyed) this.onStatus('센서 권한이 거부되었습니다. 터치로 실험해 주세요.');
        return;
      }
      if (this.destroyed) return;
      this.controller?.abort();
      this.controller = new AbortController();
      this.active = true;
      this.baseline = null;
      this.sample = null;
      this.direction = { x: 0, y: 1 };
      this.onStatus('센서 대기 중입니다. 값이 오지 않으면 기울이기를 끄고 터치로 사용해 주세요.');
      window.addEventListener('deviceorientation', event => {
        if (!Number.isFinite(event.beta) || !Number.isFinite(event.gamma)) return;
        const angle = window.screen?.orientation?.angle ?? window.orientation ?? 0;
        const sample = remapTilt(event.beta, event.gamma, angle);
        this.sample = sample;
        if (!this.baseline || this.angle !== angle) {
          this.baseline = sample;
          this.angle = angle;
          this.direction = { x: 0, y: 1 };
          this.onStatus('기울이기 사용 중 · 현재 자세를 기준으로 보정했습니다.');
        }
        const x = Math.max(-1, Math.min(1, (sample.x - this.baseline.x) / 35));
        const y = Math.max(-1, Math.min(1, 1 + (sample.y - this.baseline.y) / 35));
        this.direction.x += (x - this.direction.x) * .15;
        this.direction.y += (y - this.direction.y) * .15;
      }, { signal: this.controller.signal });
    } catch {
      if (!this.destroyed) this.onStatus('센서에 접근할 수 없습니다. 터치로 실험해 주세요.');
    } finally { this.pending = false; }
  }
  calibrate() {
    if (this.sample) {
      this.baseline = { ...this.sample };
      this.direction = { x: 0, y: 1 };
      this.onStatus('현재 자세로 기준점을 보정했습니다.');
    } else this.onStatus('센서 값이 없습니다. 터치로 실험할 수 있습니다.');
  }
  disable() {
    this.controller?.abort();
    this.active = false;
    this.direction = { x: 0, y: 1 };
    if (!this.destroyed) this.onStatus('기울이기 꺼짐 · 드래그와 터치로 사용할 수 있습니다.');
  }
  destroy() { this.destroyed = true; this.disable(); }
}
