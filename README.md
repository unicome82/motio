# PHYSICS LAB — Codex handoff

Approved image: `reference/approved-design.png`.

## Reading order
1. `design/DESIGN_SPEC.md` + `design/tokens.json` + reference image
2. `TECH_SPEC.md`
3. `prompts/00_COMMON.md` (global instruction)
4. `prompts/01_DESIGN.md` (design instruction)
5. Stage prompts `02_FOUNDATION.md` through `11_QA.md`, in order

## Suggested Codex command
`Read prompts/00_COMMON.md, prompts/01_DESIGN.md, TECH_SPEC.md and prompts/02_FOUNDATION.md. Implement only stage 02 and report verification.`

Repeat with stage 03, 04, etc. Design and technical files are authoritative across all stages.

## Notes
Colors and layout tokens are approximations normalized from the approved image, not pixel-extracted values. The reference image is a visual target, not code or a full production spec. Run local HTTP server for ES modules; mobile tilt needs secure HTTPS context and permission flow. CDN network access required unless libraries are downloaded locally.

## Local preview

VS Code에서 **터미널 → 작업 실행 → PHYSICS LAB: 로컬 서버**를 선택한 뒤 http://127.0.0.1:8000/ 에 접속합니다. 서버 종료는 해당 터미널에서 `Ctrl+C`를 누릅니다. 이미 같은 주소에 서버가 실행 중이면 그대로 사용하며 중복 실행하지 않습니다.

직접 실행하려면 프로젝트 폴더에서 아래 명령을 사용합니다.

```sh
npm run local
```

별도의 `npm install` 없이 실행할 수 있습니다. 실행 후 http://127.0.0.1:8000/ 에 접속하고, 종료하려면 터미널에서 `Ctrl+C`를 누릅니다. 기존 Python 로컬 서버를 실행하는 단축 명령입니다.

`index.html`을 직접 열면 정적 홈 미리보기를 제공합니다. 실험의 ES 모듈은 HTTP 서버로 실행해야 합니다. CSS는 `scss/style.css`를 사용합니다.

## Verification

```sh
node scripts/check.mjs
```

Runs all tests using the repository Matter.js fixture. No downloads or npm installation required. Browser/device QA remains separate.

## Experiment tabs

메인의 썸네일은 실험 탭입니다. 선택하면 홈 비주얼이 사라지고 탭 아래에 실험과 조작 패널을 표시합니다. 로고는 홈으로 돌아갑니다. 방향키/Home/End로 탭을 탐색하고 Enter/Space로 선택합니다. 실험 hash 주소와 뒤로/앞으로 탐색을 유지합니다. About·별도 목록·Settings 화면은 제거했습니다.
