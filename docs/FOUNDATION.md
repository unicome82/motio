# 02 Foundation — 구현 기록

## 지침과 의존관계

전체 텍스트 파일과 `reference/approved-design.png`를 확인했다. 기존 프로젝트는 명세·토큰·레퍼런스만 포함하며 실행 코드는 없었다.

- 사용자 작업 지침과 이번 요청이 작업 범위를 결정한다. 실제 구현은 02까지만 진행한다.
- `design/DESIGN_SPEC.md`, `design/tokens.json`이 반복 가능한 UI의 기준이다. 승인 이미지는 여러 화면의 콜라주이며 질감이나 이미지 자체를 재현하지 않는다. `design/tokens.css`의 기존 변수 이름도 유지한다.
- `TECH_SPEC.md`가 스택, 시간 적분, 입력, 자원 정리 계약을 결정한다. npm·번들러·React는 도입하지 않는다. 네이티브 DOM으로 충분하여 선택 사항인 jQuery는 사용하지 않는다.
- `00_COMMON`을 전역 적용하고 `01_DESIGN`의 공통 화면·반응형 지침을 따른다. `02_FOUNDATION`이 구체적인 구현 한계다. 따라서 01의 live composition은 현재 정적 SVG로 제공한다.
- 이후 의존관계: 03/04/08/09는 Matter.js, 05는 사용자 정의 힘, 06은 파동 격자, 07은 Verlet/PBD를 공통 장면 계약에 연결한다. 10은 UI 전환 통합, 11은 종합 QA다. 해당 기능은 구현하지 않았다.

## 파일 구조

- `index.html`: 시맨틱 셸, 모바일 메뉴, GSAP 3.13.0 고정 CDN, ES 모듈 진입점.
- `assets/favicon.svg`: 플랫 기하학 파비콘.
- `scss/_reset.scss`, `_variable.scss`, `_mixin.scss`, `style.scss`: 초기화, 토큰, 이후 반복 패턴용 mixin, 화면 스타일. `@use` 사용. 현재 스타일은 CSS와 호환되는 평탄한 SCSS이며 mixin은 출력 규칙이 없는 정의만 포함한다.
- `scss/style.css`: 제공된 SCSS의 출력 규칙을 결합한 실행용 CSS. 이번 환경에는 Sass가 없고 다운로드 권한이 거절되어 **Dart Sass 컴파일은 실행하지 못했다**. SCSS 출력과 대응되도록 작성했지만 컴파일러 검증은 남아 있다.
- `js/data.js`, `js/app.js`: 일곱 실험 메타데이터, 정적 SVG 카드, 홈·목록·실험·About·Settings 화면, 메뉴와 공통 제어.
- `js/core/router.js`: 최초 진입 및 hashchange 처리, 뒤로/앞으로 탐색 기반.
- `js/core/scene-manager.js`: 단일 RAF, 1/60 고정 업데이트·최대 4회 보정, DPR 최대 2, ResizeObserver, 가시성 정지, 비동기 로드 세대 검사와 AbortSignal, 정리.
- `js/core/input-manager.js`: Pointer Events, 캡처, 다중 포인터 좌표·속도, 캔버스 키 입력, 자원 정리. 실제 드래그·던지기는 미구현.
- `js/core/libraries.js`: Matter.js 0.20.0 지연 로더. 현재 호출하지 않으므로 Matter 네트워크 요청이나 엔진 생성 없음.
- `js/scenes/empty-scene.js`: `init/update/render/resize/pause/resume/destroy` 계약. 독립 RAF와 물리 효과 없음. 시작은 관리자가 소유.
- `tests/foundation.mjs`: DOM/RAF 대역으로 공통 생명주기·라우터 계약 검증.

기존 명세, 프롬프트, 디자인 토큰 및 승인 이미지는 수정하지 않았다. Settings는 상태 설명용이며 아직 존재하지 않는 사운드·센서·품질 기능을 활성 제어로 표시하지 않는다. 장식 모션은 없다.

## 실행

프로젝트 루트에서:

```sh
python3 -m http.server 8000
```

`http://localhost:8000` 접속. 파일을 직접 여는 `file://` 방식은 ES 모듈 개발에 사용하지 않는다. GSAP CDN에는 네트워크가 필요하지만 현재 UI 동작은 GSAP에 의존하지 않는다.

Sass가 설치된 환경의 재생성 명령:

```sh
sass --no-source-map scss/style.scss scss/style.css
```

의존성 설치 없이 자동 검증:

```sh
node tests/foundation.mjs
```

## 실제 검증 결과

Node v22.23.4에서 자동 검증 통과:

- 100회 장면 교체 후 매번 RAF 1개, ResizeObserver 1개 유지, 이전 장면 destroy 호출.
- 큰 시간 간격에서도 고정 업데이트 최대 4회.
- pause/resume, document.hidden 전환 및 destroy 시 RAF 해제.
- 400×300 크기 전달 및 DPR 3을 2로 제한.
- 역순으로 끝나는 로딩에서 최신 장면만 유지.
- 최초 직접 hash 처리, hashchange 처리, 라우터 destroy 후 이벤트 해제.
- 앱과 라이브러리 로더 JavaScript 구문 검사 통과.

테스트는 실제 브라우저 성능·메모리 누수·포인터 입력을 증명하지 않는 계약 검사다. 실제 화면 비교나 기기 테스트를 실행했다고 간주하지 않는다.

## 남은 수동 확인

- 1440/1024/390/320px에서 가로 넘침, 제목 위계, 빈 캔버스 크기, 메뉴·컨트롤 배치와 승인 이미지 비교.
- 홈 CTA → Gravity → 이전/다음 → 목록 → About/Settings; 주소 직접 입력·새로고침·뒤로/앞으로.
- Tab 포커스·건너뛰기 링크·메뉴 Escape 닫기·일시 정지 및 초기화.
- 탭 숨김·복귀, 창 크기 변경, 실제 기기 회전과 터치 캡처.
- CDN 로드와 네트워크 실패 상태. 현재 캔버스 로드 오류는 상태 영역에 표시한다.
- Sass 컴파일러 출력 검증.

센서 권한·보정, 물리 충돌, 실제 시뮬레이션 성능은 이후 단계 범위로 남긴다. 03 이후 구현 및 배포는 진행하지 않았다.
