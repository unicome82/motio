# SCSS 작성 기준

- `_variable.scss`: 색상·폰트·간격·반응형 경계·레이어는 Sass 변수로 관리한다. `fluid(min, max)`는 최대 콘텐츠 폭 90rem을 기준으로 cqw 선호값과 rem 상하한을 생성한다.
- `_mixin.scss`: flex/grid/position/font, 제목·설명문, 구분선, 터치 영역, 원형 액션과 반응형 콘텐츠 블록을 관리한다. 단일 속성을 무조건 추상화하지 않는다.
- `_reset.scss`: 사용하는 변수를 직접 `@use`한다.
- `style.scss`: 컴포넌트마다 한 블록에서 하위 요소·상태·모바일/태블릿 규칙을 관리한다. `&-copy`, `&-layout`은 기존 클래스명을 생성하며 부모 선택자 명시도를 추가하지 않는다. 실제 하위 요소는 얕은 중첩으로 관리한다.
- 목록 페이지의 카드 차이는 해당 카드 블록 안의 `:where(.index-page) &`로 관리한다. 상위 상태의 명시도는 0이며 뒤에 배치한 모바일 규칙이 우선한다.
- CSS 변수 중계 없이 Sass 변수를 직접 사용한다. SVG도 fill/stroke 클래스로 변경했으며 `_variable.scss`의 `$palette-colors`를 순회해 색상 규칙을 생성한다. 기존 `design/tokens.css`는 원본 참고 자료이며 앱에서 로드하지 않는다.
- `@use ... as *`로 변수와 mixin을 가져와 접두사 없이 작성한다.
- body와 `.page-width`를 inline-size 컨테이너로 지정했다. 간격·제목·여백은 cqw/clamp로 조절하고, 본문 가독성·44 CSS px에 해당하는 최소 터치 영역·포커스 선은 rem 하한을 유지한다. 캔버스 높이는 화면 높이와 연결되는 svh를 사용한다. rem 하한은 사용자 폰트 확대를 존중한다.

## CSS 생성

`.vscode/settings.json`에서 Live Sass Compiler 출력 경로를 `null`로 설정해 원본과 같은 폴더인 `scss/style.css`로 생성하고, 진입점은 `/scss/style.scss`로 지정했다. 부분 파일을 독립 CSS로 생성하지 않는다. CSS map과 autoprefix는 끄고 expanded 형식과 새 컴파일 API를 사용한다.

이번 CSS는 **설치된 Live Sass Compiler 6.1.5 번들에 포함된 Dart Sass 1.97.3 엔진**을 직접 호출해 실제 컴파일했다. 확장 파일은 변경하지 않았으며 별도 npm 설치나 수동 CSS 병합은 하지 않았다. VS Code의 Watch Sass 명령을 UI에서 실행한 것은 아니다. 이후 VS Code에서 Watch Sass를 누르면 같은 설정으로 출력한다.

실제 Sass 컴파일, 기존 Foundation·Gravity 자동 검증을 통과했다. SCSS/CSS의 px·!important·deprecated @import 사용은 없다. 브라우저의 1440/1024/390/320 화면 비교, 폰트 확대 및 실제 모바일 레이아웃 검증은 아직 수행하지 못했다. 컴파일된 CSS의 반응형 선택자가 반복되는 것은 Sass의 정상 출력이며 SCSS의 작성 위치는 컴포넌트별로 모았다.

참고: [Sass 모듈](https://sass-lang.com/documentation/at-rules/use/), [CSS 길이 단위](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Values/length).

Canvas colors now read the computed fill of Sass-generated SVG palette classes via js/core/palette.js. No CSS variable bridge or per-scene color literals.
