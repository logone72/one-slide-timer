# 디자인 토큰

## 기준 파일

- `src/styles/tokens.css`: 4개 테마의 색상, 공통 크기·간격·타이포그래피·아이콘·모션, 컴포넌트 토큰을 정의한다.
- `src/styles/base.css`: 토큰을 조합해 실제 화면과 상태를 표현한다. 색상이나 고정 크기의 원시 값을 다시 선언하지 않는다.
- `src/domain/timer/timerTypes.ts`: 저장되는 테마 ID와 표시 이름, 타이머의 색상 토큰 순번을 정의한다. 색상 값은 CSS에만 둔다.
- `src/app/useSettings.ts`: 저장된 설정을 읽고 루트의 `data-theme`와 브라우저 `theme-color`를 갱신한다.

## 사용 규칙

1. 먼저 같은 역할의 토큰을 찾는다. `--space-*`는 공통 간격, `--font-*`는 글꼴, `--radius-*`는 모서리, `--motion-*`는 움직임이다.
2. 배경은 `--color-surface` 또는 `--color-surface-raised`, 본문은 `--color-text`, 보조 문구는 `--color-text-muted`를 사용한다. 버튼은 `--color-primary`와 `--color-on-primary`처럼 배경과 전경을 짝으로 사용한다.
3. 시작 핀, 호버, 포커스, 조기 종료, 완료 알림과 backdrop도 의미 토큰을 사용한다. 특정 테마에만 맞는 색상 값을 컴포넌트에 넣지 않는다.
4. 타이머의 `color`는 `var(--color-timer-1)`부터 `var(--color-timer-5)`까지 순번을 저장한다. 같은 타이머는 테마가 바뀌어도 순번을 유지한다. 타이머 카드의 배경·테두리·호버는 `--timer-*` 토큰으로 해당 색상을 혼합한다.
5. 아이콘은 `.icon`과 `.icon-xs/sm/lg/xl`을 사용한다. 크기와 선 두께를 JSX에 따로 지정하지 않는다.
6. 라벨 높이는 `--rail-label-height`, 충돌 회피 간격은 `--rail-label-pitch`, 하단 여유는 `--rail-bottom-clearance`가 기준이다. `TimerRail`은 계산된 CSS 값을 읽어 순수 배치 함수에 전달한다. 라벨 높이를 늘릴 때 간격도 함께 조정한다.
7. 색상 미리보기는 카드에 `data-theme`를 붙여 실제 테마 토큰으로 그린다. 파생 색상은 `:root, [data-theme]`에서 정의해 미리보기 안에서도 해당 테마의 값을 계산한다.
8. 동작 줄이기 설정에서는 모든 애니메이션과 전환을 끈다. `useTimerMotion`의 Web Animations API도 미디어 쿼리 변경을 구독해 실행 중인 보간을 취소한다.
9. 카운트다운 이동은 장식 모션과 구분한다. `TIMER_TICK_MS`는 워커와 위치 보간이 공유하는 1초 갱신 간격이며, 실제 시간의 흐름을 나타내므로 선형으로 보간한다. 핀·라벨·연결선의 위치는 `transform`에만 전달한다. 레일 크기와 라벨 간격은 기존 레일 토큰을 사용한다.

## 테마 추가·수정

1. `timerTypes.ts`의 `THEMES`에 ID·이름·짧은 설명을 추가한다.
2. `tokens.css`에 같은 `data-theme` 선택자를 추가하고 기존 테마의 모든 `--color-*` 역할과 `color-scheme`을 선언한다. 기본 테마는 포레스트다.
3. 본문과 보조 문구, 5개 타이머 색상의 글자 대비, 시작 핀, 액션·완료 버튼, 포커스를 밝은 배경과 어두운 배경에서 확인한다. 타이머 시간 표시는 최소 4.5:1 대비를 유지한다.
4. `tests/browser/settings.spec.ts`의 테마 검증 목록에도 추가하고, `npm run verify`와 `npm run verify:browser`를 실행한다.

## 원시 값이 남는 경계

- 미디어 쿼리의 600px(PC 외곽), 740px(낮은 화면), 359px(좁은 화면)은 CSS 사용자 정의 속성을 쿼리에 사용할 수 없어 리터럴로 둔다.
- 0, 100%, flex/grid 비율과 정렬은 레이아웃 규칙이다. 드래그 위치·레일 높이·타이머 개수는 동적 사용자 정의 속성으로, 실행 중인 타이머 위치는 `transform` 키프레임으로 전달한다.
- 이전 저장값을 읽는 `timerStorage.ts`의 색상 배열은 마이그레이션용이다. 기존 ID·종료 시각을 유지하면서 알려진 이전 팔레트를 테마 토큰에 연결한다.
- 정적 manifest·favicon·HTML의 초기 색상은 기본 테마의 실행 전 표현이다. 앱 실행 후 브라우저 색상은 선택한 테마로 갱신한다.
