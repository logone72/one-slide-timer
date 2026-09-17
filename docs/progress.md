# 개발 진행 기록

이 문서는 원 슬라이드 타이머의 진행상황을 계속 이어 쓰기 위한 기록장이다. 새 결정이나 구현이 생기면 최신 항목을 위에 추가한다.

## 2026-09-17 첫 카운트다운 표시 지연 수정

- 공통 1초 갱신과 초 올림 표시가 어긋나 첫 숫자 감소가 약 1.9초 뒤에 보이는 문제를 수정했다. 종료 시각이나 올림 표시는 바꾸지 않고 각 타이머의 다음 초 경계에 갱신을 예약한다.
- `timerTicker.ts`의 단일 예약 함수를 Worker와 메인 스레드 폴백이 공유한다. 새 타이머·시간 수정·저장 복구 때 종료 시각 목록만 전달하며 Worker는 재생성하지 않는다. 서로 다른 초 경계가 있으면 해당 시점마다 갱신하고, 콜백 지연 후에는 실제 시각에서 다음 경계를 다시 계산한다.
- 기존 transform 보간과 동작 줄이기 설정을 유지했다. 매 프레임 React 상태를 갱신하거나 일정한 고빈도로 폴링하지 않는다.
- 수정 전 브라우저 회귀 검사에서 시작 후 정확히 1초 시점의 `00:09` 기대값에 `00:10`이 남는 실패를 확인했다. 수정 후 Chromium·모바일 WebKit에서 시작, 병렬 타이머, 시간 수정의 초 경계 검사가 통과했다.
- 실제 Worker 재측정에서 첫 숫자 감소는 Chromium 1,011ms, WebKit 1,018ms였다. 두 번째 감소는 각각 2,009ms, 2,018ms였다. 로컬 브라우저 측정이며 모든 기기의 프레임 지연을 보장하는 수치는 아니다.
- `npm run verify`: lint 경고 0개, 포맷, 타입 검사, 단위 테스트 37개 통과. 프로덕션 빌드와 전체 브라우저 검사 50개 통과. Worker 실패 후 초 경계 유지, 서로 다른 종료 시각, 수정 시 재예약, 콜백 지연 후 복구와 정리 후 중단도 검사했다.
- 변경 파일: `src/app/useTimers.ts`, `src/workers/timerTicker.ts`, `src/workers/timerWorker.ts`, `src/workers/timerWorkerClient.ts`, `src/workers/timerWorkerClient.test.ts`, `tests/browser/timer-tick.spec.ts`, `docs/product-spec.md`, `docs/project-structure.md`, `docs/progress.md`.

## 2026-09-17 XState 레일 상호작용 리팩터링

### 구현

- `appMachine`을 레일 기능 내부의 `railInteractionMachine`으로 옮기고, 연결 훅을 `useRailInteraction`으로 바꿨다.
- 시간 조정 화면의 열림 상태를 머신에 통합했다. 화면 진입 시 미리보기와 메뉴 선택을 함께 정리하며, 슬라이더 입력값은 기존처럼 조정 화면의 로컬 상태에 둔다.
- 포인터와 키보드가 공통 `START` 이벤트를 사용하고, 머신이 생성·편집을 선택한다. 이동 이벤트는 시간만 바꾸므로 조작 대상과 색상은 유지된다. 탭·드래그 구분에 따른 메뉴 표시·시간 조정·확정도 머신에서 결정한다.
- 포인터·키보드·시간 조정의 확정은 공통 `commitTimer` 액션에서 최신 생성·수정 콜백으로 위임한다. 조작이 끝나면 대기로 전환하여 중복 확정을 무시한다. 신규 0초는 생성하지 않고 기존 타이머의 0초는 조기 종료한다.
- 포인터 취소·캡처 상실·Escape·화면 전환은 미리보기를 저장 없이 정리한다. 시간 조정 창의 포커스 변화는 창을 닫지 않으며 Escape는 네이티브 대화상자의 취소로 처리한다. 조정 중인 타이머가 완료되면 조정 상태도 정리하여 다음 조작이 막히지 않게 한다.
- 화면 구성, 타이머 저장 형식, 시간 계산, 1초 갱신과 transform 보간은 유지했다. 새 의존성은 추가하지 않았다.

### 검증

- `npm run verify`: lint 경고 0개, Prettier, TypeScript 및 단위 테스트 35개 통과. 새 상태 전환 테스트 10개는 중복 시작·확정, 마지막 이동값 적용, 대상·색상 보존, 0초 처리, 취소, 탭과 시간 조정 진입을 확인한다.
- `npm run verify:browser`: 프로덕션 빌드 및 Chromium·모바일 WebKit 브라우저 검사 48개 통과. 기존 드래그·키보드·초점 복귀·애니메이션 검사에 포인터 중단, 조정 화면에서 Escape 취소, 조정 중 완료 후 새 타이머 생성 검사를 추가했다. 모바일 WebKit의 시작 핀 탭도 확인했다.
- 실제 iPhone 기기의 OS 인터럽트 검증은 포함하지 않는다. 포인터 취소·캡처 상실·화면 전환 검사는 브라우저에서 해당 이벤트를 전달하여 검증했다.

### 변경 파일

- `src/app/appMachine.ts` → `src/features/timer-rail/railInteractionMachine.ts`
- `src/features/timer-rail/useRailGesture.ts` → `src/features/timer-rail/useRailInteraction.ts`
- `src/features/timer-rail/TimerRail.tsx`
- `src/features/timer-rail/timerRailActions.ts`
- `src/features/timer-rail/timerRailKeyboard.ts`
- `src/features/timer-rail/railInteractionMachine.test.ts`
- `tests/browser/rail-interaction.spec.ts`
- `AGENTS.md`
- `docs/product-spec.md`
- `docs/project-structure.md`
- `docs/progress.md`

## 2026-09-17 KISS·DRY·SSOT 리팩터링 8단계

### 구현

1. 저장소 접근 실패와 빈 저장소를 구분했다. 읽지 못한 원본을 덮어쓰지 않고 메모리에서 계속 동작하며 재시도 시 타이머와 변경한 설정 필드를 합친다.
2. 사용하지 않던 `timerMachine`과 저장 상태를 제거했다. 진행·완료는 종료 시각에서 계산하며, 이전 상태 필드와 색상·시간 범위는 호환 읽기로 이전한다.
3. 알림 권한 결과와 예약·취소 오류를 처리하고 ID별 작업 순서를 보장했다. 복원된 타이머의 오디오 활성화 버튼, 웹·iOS 공통 반복 알림음, 비동기 구독 해제 처리를 추가했다.
4. 완료 목록 추가 시 창과 반복 알림음이 다시 시작되지 않도록 했다. Worker 생성·실행 오류는 같은 주기의 폴백으로 전환하고 정리 후 재시작을 막는다.
5. 시간 범위 보정·스테퍼·슬라이더가 `RANGE_MINUTE_OPTIONS`를 공유한다. 설정 머리말도 공통 최솟값·최댓값에서 표시한다.
6. 순수 제스처 계산과 DOM 처리를 분리했다. 빈 레일에서 스크롤·확대를 허용하고 탭·키보드로 여는 시간 조정을 추가했다. 실제 카드 높이를 측정해 200% 글자 확대에서도 라벨과 하단 안내가 겹치지 않게 했다.
7. 공통·레일·설정·완료 CSS를 분리했다. 중립 버튼 배경의 의미 토큰, `rem` 글꼴, 사용하지 않는 토큰 제거, 전체 CSS 토큰 검사를 적용했다.
8. 오류 복구·이전·알림 경쟁 조건·구독·오디오·Worker·제스처의 단위 회귀 검사와 브라우저 회귀 검사를 추가했다. 제품 용어·스펙·구조·토큰·에이전트 지침을 맞췄다.

### 검증 및 후속 리뷰

- `npm run verify`: lint 경고 0개, Prettier, TypeScript 및 단위 테스트 25개 통과. `npm run verify:browser`: 프로덕션 빌드와 Chromium·모바일 WebKit 브라우저 검사 42개 통과.
- 브라우저 검사는 저장소 읽기·쓰기 실패, 복구 병합, 비드래그 생성·편집·초점 복귀, 완료 목록 추가, 320px·200% 글자 확대, 키보드 미리보기와 조정 창 사이 전환, 오디오 일시 중단·종료 후 재활성화를 포함한다.
- Chromium의 실제 터치 이벤트로 빈 레일을 쓸어 538px 스크롤했을 때 타이머 8개가 유지되고 미리보기가 생성되지 않았다. 모바일 WebKit에서도 시작 핀의 탭으로 시간 조정 창이 열렸다.
- 후속 Standards 리뷰 1건: 알림 이벤트 등록 실패의 재시도가 빠져 있었다. 재시도 시 이전 구독을 정리하고 다시 등록하며, 해제 후 늦게 도착하는 실패와 중복 해제도 처리한다. 수정 후 재검토에서 해결을 확인했다.
- 후속 Spec 리뷰 1건: 키보드 미리보기 중 Space로 시간 조정 창을 열면 이전 미리보기가 남았다. 창을 열 때 제스처를 취소하고 중복 생성 방지 회귀 검사를 추가했다. 수정 후 재검토에서 해결을 확인했다.
- 직접 재현한 오디오 복구 문제 1건: 오디오가 일시 중단돼도 활성화 상태가 남아 재시도 버튼이 보이지 않았다. `AudioContext` 상태를 구독해 안내를 갱신하고 종료된 컨텍스트도 재생성한다. 시간 조정·완료 창은 상하·좌우 안전 영역 안에 배치한다.
- 이번 리뷰에서 확인한 미해결 항목은 없다. 실제 iPhone 기기와 잠금 화면·백그라운드 알림 검증은 포함하지 않는다.

### 변경 파일

- `AGENTS.md`
- `CONTEXT.md`
- `docs/design-tokens.md`
- `docs/product-spec.md`
- `docs/progress.md`
- `docs/project-structure.md`
- `src/app/App.tsx`
- `src/app/AppNotices.tsx`
- `src/app/useSettings.ts`
- `src/app/useStoredState.ts`
- `src/app/useTimerNotifications.ts`
- `src/app/useTimers.ts`
- `src/domain/timer/timerMachine.ts` (삭제)
- `src/domain/timer/timerMath.test.ts`
- `src/domain/timer/timerMath.ts`
- `src/domain/timer/timerStorage.test.ts`
- `src/domain/timer/timerStorage.ts`
- `src/domain/timer/timerTypes.ts`
- `src/features/completion-alert/CompletionAlert.tsx`
- `src/features/settings/RangeSettings.tsx`
- `src/features/settings/SettingsPanel.tsx`
- `src/features/settings/StatusNotice.tsx`
- `src/features/timer-rail/RailDecorations.tsx`
- `src/features/timer-rail/TimerAdjustment.tsx`
- `src/features/timer-rail/TimerPin.tsx`
- `src/features/timer-rail/TimerRail.tsx`
- `src/features/timer-rail/timerRailActions.ts`
- `src/features/timer-rail/timerRailGeometry.test.ts`
- `src/features/timer-rail/timerRailGeometry.ts`
- `src/features/timer-rail/timerRailKeyboard.ts`
- `src/features/timer-rail/useRailGesture.ts`
- `src/features/timer-rail/useRailLayout.ts`
- `src/platform/notifications/alertAudio.test.ts`
- `src/platform/notifications/alertAudio.ts`
- `src/platform/notifications/browserNotifications.ts`
- `src/platform/notifications/capacitorNotifications.test.ts`
- `src/platform/notifications/capacitorNotifications.ts`
- `src/platform/notifications/notificationPort.ts`
- `src/platform/notifications/syncNotifications.test.ts`
- `src/platform/notifications/syncNotifications.ts`
- `src/styles/base.css`
- `src/styles/completion-alert.css`
- `src/styles/settings.css`
- `src/styles/timer-rail.css`
- `src/styles/tokens.css`
- `src/styles/tokens.test.ts`
- `src/workers/timerWorker.ts`
- `src/workers/timerWorkerClient.test.ts`
- `src/workers/timerWorkerClient.ts`
- `tests/browser/rail-layout.spec.ts`
- `tests/browser/settings.spec.ts`
- `tests/browser/storage-recovery.spec.ts`
- `tests/browser/timer-accessibility.spec.ts`

## 2026-09-17 슬라이더 시각 디자인 정리

- 손잡이의 강조색 원과 두꺼운 테두리를 흰색 26px 손잡이와 얕은 그림자로 바꿨다. 트랙은 연한 중립색으로 두고 선택한 구간만 테마 강조색으로 채운다.
- ± 버튼을 중립색 원형으로 맞추고 슬라이더와의 간격을 줄였다. 48px 조작 영역과 키보드 조작은 유지한다.
- 모바일 WebKit에서 화이트·미드나이트 화면과 터치로 12시간 선택을 확인했다. Chromium·모바일 WebKit 브라우저 테스트 26개 통과.
- 변경 파일: `src/features/settings/RangeSettings.tsx`, `src/styles/base.css`, `src/styles/tokens.css`, `src/styles/tokens.test.ts`, `docs/design-tokens.md`, `docs/progress.md`.

## 2026-09-17 시간 범위 12시간 제한과 슬라이더 손잡이 강조

- 시간 범위 최댓값을 12시간으로 줄였다. 기존 저장 범위가 12시간을 넘으면 설정만 보정하며, 실행 중인 타이머의 종료 시각은 유지한다.
- 슬라이더 손잡이를 28px 원형의 테마 강조색으로 표시하고 표면색 테두리와 그림자로 트랙과 구분했다. 트랙 6px·손잡이 28px를 토큰으로 관리하며 48px 조작 영역을 유지한다.
- `npm run verify`의 lint·포맷·타입 검사와 단위 테스트 12개 통과. 기존 브라우저 검사의 최대 범위 클릭 횟수를 수정한 후 Chromium·모바일 WebKit 26개 통과. 모바일 WebKit에서 화이트·미드나이트 표시와 터치로 12시간 선택을 확인했다. 실제 기기 검증은 포함하지 않았다.
- 변경 파일: `src/domain/timer/timerTypes.ts`, `src/domain/timer/timerMath.test.ts`, `src/domain/timer/timerStorage.test.ts`, `src/features/settings/RangeSettings.tsx`, `src/styles/base.css`, `src/styles/tokens.css`, `tests/browser/app-smoke.spec.ts`, `tests/browser/range-slider.spec.ts`, `AGENTS.md`, `CONTEXT.md`, `docs/product-spec.md`, `docs/design-tokens.md`, `docs/progress.md`.

## 2026-09-17 분 단위 눈금과 시간 범위 슬라이더

- 1시간 미만의 주요 눈금 간격을 5등분해 초 표시를 없앴다. 0은 유지하고, 1시간 이상에서는 기존 6등분을 사용한다.
- 시간 범위의 ± 버튼 아래에 기본 HTML 슬라이더를 추가했다. 5~~55분은 5분씩, 1~~24시간은 1시간씩 조절하며 버튼과 값·저장을 공유한다. 접근성 이름과 실제 시간 읽기, 48px 조작 영역에 기존 토큰을 적용했다.
- `npm run verify` 통과: lint·포맷·타입 검사 및 단위 테스트 11개. `npm run verify:browser` 통과: Chromium·모바일 WebKit 26개. 슬라이더와 버튼 동기화, 키보드 경계 이동, 저장, 55분과 1시간 눈금을 검사했다.
- 모바일 WebKit에서 슬라이더 터치로 시간이 변경됨을 확인했고, 320px 너비에서 가로 넘침이 없었다. 실제 iPhone 기기 검증은 포함하지 않았다.
- 변경 파일: `src/domain/timer/timerTypes.ts`, `src/features/settings/RangeSettings.tsx`, `src/features/timer-rail/RailDecorations.tsx`, `src/styles/base.css`, `tests/browser/settings.spec.ts`, `tests/browser/range-slider.spec.ts`, `AGENTS.md`, `CONTEXT.md`, `docs/product-spec.md`, `docs/progress.md`.

## 2026-09-17 레일 상단 점 중앙 정렬

- `.rail-track::before`의 고정 왼쪽 오프셋을 `left: 50%`와 `translateX(-50%)`로 바꿨다. 점의 테두리를 포함한 실제 너비를 기준으로 레일 중앙에 정렬한다.
- Chromium의 320·390·1440px 화면에서 점과 레일의 가로 중심 차이가 모두 0px임을 확인했다.
- 변경 파일: `src/styles/base.css`, `docs/progress.md`.

## 2026-09-17 PC 화면 전환 위치 통일

- PC의 타이머 화면 바깥 세로 여백을 화면 높이와 기존 최대 높이 토큰으로 계산해 설정 화면과 같은 위치에 배치했다. 높은 화면에서는 세로 중앙에 놓고, 낮은 화면에서는 최소 24px 여백을 유지한다. 모바일 배치 규칙은 그대로 사용한다.
- Chromium에서 1440×1200·1440×1080·1440×900·768×1024·390×844·320×568의 기본 타이머 화면과 설정 화면을 비교해 상단 위치·너비·높이가 일치함을 확인했다. 예를 들어 1440×1200에서는 두 화면 모두 상단 150px, 너비 430px, 높이 900px다.
- 변경 파일: `src/styles/base.css`, `docs/progress.md`.

## 2026-09-17 화이트 기본 테마와 제스처 피드백

### 완료

- Apple의 [색상](https://developer.apple.com/design/human-interface-guidelines/color)·[모션](https://developer.apple.com/design/human-interface-guidelines/motion) 지침을 참고해 흰색 표면, 중립 회색, 파란 조작 강조색의 화이트 테마를 기본값으로 추가했다. 라벤더는 제거하고, 이전 라벤더 저장값은 시간 범위를 유지한 채 화이트로 전환한다. 기존 포레스트·오션·미드나이트 선택은 유지한다.
- `intro` 영역을 제거하고 브랜드를 페이지 제목으로 사용한다. 헤더와 진행 상태 사이 여백을 정리하고 확보한 세로 공간을 레일에 배분했다.
- 빈 레일의 안내 화살표에 위로 끄는 동작을 알려주는 2.4초 반복 모션을 추가했다. 버튼 누르기, 선택된 핀·카드 확대, 드래그 미리보기 들기, 놓을 때 360ms 착지, 액션 펼치기를 CSS 모션으로 표현한다.
- 착지 모션은 기존 버튼의 드래그 상태 전환으로 재생한다. 별도 타이머·JS 프레임 루프·DOM 재생성 없이 기존 카운트다운 `transform` 보간과 키보드 포커스를 유지한다. 동작 줄이기에서는 새 모션도 중지한다.
- 타이머 카드 왼쪽 색상 띠를 2px에서 6px로 넓히고 드래그 아이콘을 세로 중앙에 정렬했다. 색상·모션 시간·배율·띠 너비를 토큰으로 정의했다.
- 실행 전 HTML·manifest·favicon 색상, 테마 목록과 관련 제품 문서도 새 기본 테마에 맞췄다.

### 검증

- `npm run verify`: lint 경고 0개, Prettier, TypeScript, 단위 테스트 11개 통과. `npm run verify:browser`: 프로덕션 빌드와 Chromium·모바일 WebKit 테스트 24개 통과.
- Chromium에서 화이트의 빈 화면·실행 중·설정을 시각적으로 확인했다. 320×568px의 23:59:59 타이머도 글자와 드래그 아이콘이 겹치지 않으며, 아이콘과 카드 중심 차이는 0px였다. 설정의 가로 넘침이 없고 끝까지 스크롤해도 뒤로 가기가 보였다.
- 실제 드래그 생성 및 기존 타이머 수정에서 착지 모션이 각각 한 번 재생되고 이후 1.2초 관찰 중 다시 시작하지 않았다. 누를 때 배율 0.97, 선택 시 카드 1.025·핀 1.2를 확인했다. 안내 화살표는 1.3초 동안 서로 다른 transform 59개가 관측됐다.
- 기존 타이머 수정 후 ID와 개수는 유지되고 종료 시각만 변경됐다. 키보드 조정 후 포커스도 유지됐다. 동작 줄이기 전환 후 실행 중 애니메이션은 0개였다.
- 저장된 라벤더·25분 설정을 실제 브라우저에서 화이트·25분으로 전환하고 기존 타이머의 ID·종료 시각이 유지되는 것을 확인했다. 새로운 기본값과 저장값 전환은 단위 회귀 검사로 남겼다.
- 실제 iPhone 기기 검증은 포함하지 않았다.

### 이번 수정 파일

- `src/app/App.tsx`
- `src/domain/timer/timerTypes.ts`
- `src/domain/timer/timerStorage.test.ts`
- `src/styles/base.css`
- `src/styles/tokens.css`
- `tests/browser/settings.spec.ts`
- `index.html`
- `public/manifest.webmanifest`
- `public/favicon.svg`
- `AGENTS.md`
- `CONTEXT.md`
- `docs/design-tokens.md`
- `docs/product-spec.md`
- `docs/progress.md`

## 2026-09-17 UI 디자인 원칙 적용

### 완료

- Adham Dannaway의 [16가지 UI 디자인 팁](https://www.adhamdannaway.com/blog/ui-design/ui-design-tips)과 [14가지 UI 디자인 팁](https://www.adhamdannaway.com/blog/ui-design/ui-design-tips-14)을 참고해 핵심 행동의 위계, 여백을 통한 묶음, 일관된 정렬, 대비와 터치 영역을 개선했다.
- 영문 장식 문구와 반복되는 점멸·화살표 모션을 줄였다. 첫 화면의 소개 영역을 줄이고, 시작 핀은 진한 채움색으로, 실행 중인 타이머는 큰 시간 숫자와 중립 배경으로 구분한다. 기존 `transform` 기반 카운트다운 이동은 유지한다.
- 본문 14px·보조 문구 최소 12px, 글꼴 두께 400·600을 공통 토큰에 적용했다. 글자·조작 윤곽·호버 색상을 4개 테마 모두에서 보강했다.
- 설정 버튼에 이름을 표시하고, 버튼·핀 조작 영역을 최소 48×48px로 맞췄다. 조기 종료 액션 사이 간격과 어두운 액션 영역의 키보드 포커스도 확보했다.
- 설정의 중첩 컨테이너와 중복 복귀 버튼을 제거하고, 시간 범위·색상 테마·사용 방법을 여백으로 구분했다. 스크롤 중에도 뒤로 가기가 보이며 자동 저장 안내를 표시한다.
- 테마 선택의 윤곽과 체크는 현재 화면 팔레트를 사용하고, 미리보기만 각 테마의 팔레트를 사용한다. 완료 알림도 왼쪽 정렬과 단일 확인 버튼을 중심으로 정리했다.
- 사용하지 않는 장식 스타일과 토큰을 정리하고 디자인 토큰 문서·제품 스펙을 갱신했다.

### 검증

- `npm run verify`: lint 경고 0개, Prettier, TypeScript, 단위 테스트 10개 통과. `npm run verify:browser`: 프로덕션 빌드와 Chromium·모바일 WebKit 테스트 24개 통과.
- Chromium에서 4개 테마의 실행 중·설정 화면과 완료 알림을 캡처해 확인했다. 320×568px에서 23시간 타이머, 조기 종료 액션, 설정 스크롤을 확인했으며 가로 넘침과 글자·조작 아이콘 겹침이 없었다.
- 기본 화면의 본문·보조 문구·타이머 숫자·설정 문구는 4.5:1 이상, 버튼 윤곽·레일·시작 핀은 3:1 이상을 확인했다. 5개 타이머 팔레트의 호버 보조 문구는 최저 4.98:1, 완료 버튼의 호버 글자는 최저 4.74:1이었다. 측정은 브라우저에서 계산된 색상 기준이며 전체 접근성 적합성 인증은 아니다.
- 조기 종료 버튼과 닫기 버튼의 높이는 48px, 닫기 버튼 너비는 48px였다. 320px 설정 화면을 끝까지 스크롤한 뒤에도 뒤로 가기 버튼은 화면 안에 유지됐다.
- 기존 브라우저 회귀 검증의 색상 검사에 타이머 보조 문구를 추가했다. 실제 iPhone 기기 검증은 포함하지 않았다.

### 변경 파일

- `src/app/App.tsx`
- `src/features/completion-alert/CompletionAlert.tsx`
- `src/features/settings/SettingsButton.tsx`
- `src/features/settings/SettingsPanel.tsx`
- `src/features/settings/RangeSettings.tsx`
- `src/features/settings/ThemeSettings.tsx`
- `src/features/timer-rail/RailDecorations.tsx`
- `src/features/timer-rail/TimerPin.tsx`
- `src/styles/base.css`
- `src/styles/tokens.css`
- `tests/browser/settings.spec.ts`
- `docs/design-tokens.md`
- `docs/product-spec.md`
- `docs/progress.md`

## 2026-09-15 카운트다운 이동 최적화

### 완료

- 실행 중인 타이머 핀·시간 라벨·연결선의 위치 갱신을 `top`과 SVG 좌표에서 `transform`으로 바꿨다. 연결선은 고정 크기 요소의 이동과 기울기로 표현한다.
- 워커의 1초 갱신 간격을 유지하면서 현재 위치부터 다음 1초의 위치까지 Web Animations API로 선형 보간한다. 매 프레임 JavaScript나 React 상태를 갱신하지 않는다.
- 드래그 미리보기와 레일 채우기도 `translate3d`·`scaleY`를 사용한다. 드래그는 보간 지연 없이 즉시 반영하고, 라벨의 조기 종료 액션은 라벨과 함께 이동한다.
- 위치를 다시 계산할 때 기존 애니메이션을 취소하고 현재 시각에 맞춰 시작한다. 첫 화면의 레일 측정은 페인트 전에 수행해 초기 위치에서 잘못된 타이머를 누르는 문제를 막았다.
- 동작 줄이기 설정 변경을 구독해 실행 중인 보간도 취소한다. 장식 모션 토큰과 실제 시간의 흐름을 나타내는 갱신 간격의 역할을 문서에 구분했다.

### 검증

- `npm run verify`: lint 경고 0개, Prettier, TypeScript, 단위 테스트 10개 통과.
- `npm run verify:browser`: 프로덕션 빌드와 Chromium·모바일 WebKit 테스트 24개 통과. 기존 드래그·취소·키보드·설정 검증에 프레임별 위치 변화와 동작 줄이기 전환 검증을 추가했다.
- Chromium 390×844px, 5분 범위, 실행 중인 타이머 1개에서 1.2초 동안 관측한 73프레임의 위치가 모두 달라 연속 이동을 확인했다. 이동 요소의 `top`은 0px로 유지됐다.
- 같은 조건의 약 5.5초 측정에서 기존 구현은 Layout 5회·Paint 20회, 변경 후 실제 화면은 Layout 5회·Paint 15회였다. 숫자 갱신의 렌더링 비용은 남아 있다.
- 위치 이동만 분리하기 위해 별도 검증 페이지에서 시간 숫자를 숨긴 대조 측정은 5.54초 동안 Layout 0회·Paint 0회였다. 실제 제품에서는 숫자를 그대로 표시한다. 이 결과는 해당 Chromium 측정 조건에 한정하며 모든 기기의 성능을 보장하는 수치는 아니다.
- 실제 iPhone 기기와 백그라운드·잠금 화면 알림은 이번 검증에 포함하지 않았다.

### 변경 파일

- `docs/design-tokens.md`
- `docs/product-spec.md`
- `docs/progress.md`
- `docs/project-structure.md`
- `src/domain/timer/timerTypes.ts`
- `src/features/timer-rail/TimerRail.tsx`
- `src/features/timer-rail/TimerPin.tsx`
- `src/features/timer-rail/RailDecorations.tsx`
- `src/features/timer-rail/useTimerMotion.ts`
- `src/styles/base.css`
- `src/styles/tokens.test.ts`
- `src/workers/timerWorker.ts`
- `src/workers/timerWorkerClient.ts`
- `tests/browser/app-smoke.spec.ts`
- `tests/browser/timer-motion.spec.ts`

## 2026-09-15 분 단위 시간 범위와 색상 테마

### 완료

- 시간 범위를 5~~55분에서는 5분씩, 1~~24시간에서는 1시간씩 조절하도록 변경했다. 55분 ↔ 1시간 ↔ 2시간 경계를 양방향으로 연결한다.
- 레일 눈금은 짧은 범위에서도 정확한 분·초를 표시한다. 타이머 자체의 10초 정밀도는 유지한다.
- 포레스트·오션·라벤더·미드나이트 4개 색상 테마를 추가했다. 미리보기 카드를 누르면 전체 화면에 즉시 적용되며, 키보드 화살표로도 선택할 수 있다.
- 배경, 타이머, 설정, 조기 종료, 완료 알림, 포커스, 호버, 그림자, 브라우저 색상까지 테마에 연결했다. 설정이 열리면 배경 스크롤을 잠근다.
- 색상·간격·타이포그래피·모서리·크기·아이콘·그림자·모션을 `tokens.css`로 모았다. 레일 배치 계산도 토큰의 라벨 간격과 하단 여유를 읽는다.
- 기존 시간 단위 저장값은 분 단위로 변환하고, 기존 타이머의 ID와 종료 시각을 유지한다. 초기 버전과 이전 디자인의 타이머 색상을 같은 순번의 테마 토큰으로 연결한다.
- 설정과 테마는 다시 열어도 유지한다. 손상된 JSON이나 지원하지 않는 설정값은 안전한 기본값으로 읽는다.
- 확장 규칙과 정적 자산·미디어 쿼리의 예외를 [디자인 토큰 문서](design-tokens.md)에 정리했다.

### 검증

- `npm run verify`: lint 경고 0개, Prettier, TypeScript, 단위 테스트 10개 통과.
- `npm run verify:browser`: 프로덕션 빌드와 Chromium·모바일 WebKit 브라우저 테스트 22개 통과.
- 5분 하한, 55분·1시간·2시간 전환, 24시간 상한, 저장값 이전, 기존 타이머 종료 시각 유지, 5분 레일에서 타이머 추가를 확인했다.
- 4개 테마의 즉시 적용·재접속·라디오 키보드 조작·완료 알림을 확인했다. 각 테마의 5개 타이머 시간 표시는 실제 계산된 색상을 기준으로 4.5:1 이상의 대비를 검증했다.
- 토큰 미정의 참조, 화면 스타일에 색상·고정 픽셀 값 재삽입을 검출하는 단위 검사를 추가했다.
- 390×844px에서 4개 테마의 타이머·설정 화면을 캡처해 확인하고, 320×568px 설정 화면도 확인했다. 기존 PC 최대 너비·라벨 충돌·드래그 편집 검증도 통과했다.
- 실제 iPhone 기기와 백그라운드·잠금 화면 알림은 이번 검증에 포함하지 않았다.

### 변경 파일

- `AGENTS.md`
- `CONTEXT.md`
- `docs/design-tokens.md`
- `docs/product-spec.md`
- `docs/progress.md`
- `docs/project-structure.md`
- `src/app/App.tsx`
- `src/app/useSettings.ts`
- `src/domain/timer/timerMath.ts`
- `src/domain/timer/timerMath.test.ts`
- `src/domain/timer/timerStorage.ts`
- `src/domain/timer/timerStorage.test.ts`
- `src/domain/timer/timerTypes.ts`
- `src/features/completion-alert/CompletionAlert.tsx`
- `src/features/settings/SettingsButton.tsx`
- `src/features/settings/SettingsPanel.tsx`
- `src/features/settings/RangeSettings.tsx`
- `src/features/settings/ThemeSettings.tsx`
- `src/features/timer-rail/RailDecorations.tsx`
- `src/features/timer-rail/TimerPin.tsx`
- `src/features/timer-rail/TimerRail.tsx`
- `src/features/timer-rail/timerRailGeometry.ts`
- `src/features/timer-rail/timerRailKeyboard.ts`
- `src/features/timer-rail/useRailGesture.ts`
- `src/styles/base.css`
- `src/styles/tokens.css`
- `src/styles/tokens.test.ts`
- `tests/browser/app-smoke.spec.ts`
- `tests/browser/settings.spec.ts`
- `vitest.config.ts`

## 2026-09-15 디자인과 타이머 제스처 개선

### 완료

- PC에서도 최대 430px인 모바일 앱을 가운데 표시하도록 수정했다.
- 밝은 바탕, 민트색 시작 핀, 타이머별 색상 카드로 화면을 다시 구성했다. 레일에 0부터 설정한 시간까지 숫자 눈금과 보조 눈금을 추가했다.
- 시작 핀, 미리보기 타이머, 실행 중인 타이머의 모양과 안내를 구분했다. 드래그 중에는 선택 시간과 시작·변경·조기 종료 안내를 보여준다.
- 실행 중인 타이머의 핀 또는 라벨을 드래그하면 기존 ID와 색상을 유지하고 종료 시각만 변경한다. 탭하면 조기 종료 액션을 열고, 0으로 끌어 놓으면 조기 종료한다.
- 카드가 가까우면 세로 간격을 확보하고 실제 레일 위치까지 연결선을 표시한다. 작은 화면에서도 카드와 시작 안내가 겹치지 않도록 공간을 확보했다.
- 포인터 취소, Escape, 화면 이탈 시 편집을 취소한다. 키보드로 10초 또는 1분씩 조정하고 Enter로 확정할 수 있다.
- 설정을 앱 전체를 차지하는 화면으로 변경했다. 1~24시간 스테퍼, 사용 안내, 설정 버튼으로의 초점 복귀를 구현했다.
- 완료 알림을 확인할 때까지 유지되는 화면으로 다듬고, 완료된 타이머 목록을 합쳐 표시한다.
- 화면 복귀 시 남은 시간을 재계산하며, 워커 신호를 받으면 UI에서 현재 시각을 읽는다.
- 화면 전환, 시작 핀, 드래그 피드백과 완료 모션을 추가하고, 동작 줄이기 설정을 지원한다.

### 검증

- Node 24에서 `npm run verify`: lint 경고 0개, Prettier, TypeScript, 단위 테스트 7개 통과.
- `npm run verify:browser`: 프로덕션 빌드와 Chromium·모바일 WebKit의 브라우저 테스트 10개 통과.
- 생성, 기존 타이머 편집, 클릭 시 개수 유지, 조기 종료, 편집 취소, 키보드 조정, 설정 경계값, 종료 시각 유지, 재접속, 완료 목록과 확인 흐름을 검증했다.
- 320·390·768·1440px 너비에서 최대 너비, 가로 넘침, 카드 간격을 확인했다. 높이 568px에서도 시작 안내와 카드가 겹치지 않는지 검증했다.
- 별도 Chromium 세션의 CDP 터치 이벤트로 타이머 3개 생성, 기존 타이머 편집, 터치 취소, 시작 핀 단순 탭 시 생성되지 않는 동작을 확인했다.
- 모바일·PC·설정·미리보기·완료 화면을 캡처해 배치를 확인했다. 추가 터치 검증 중 페이지 실행 오류는 없었다.
- 실제 iPhone 기기와 백그라운드·잠금 화면 알림은 이번 검증에 포함하지 않았다.

### 변경 파일

- `CONTEXT.md`
- `docs/product-spec.md`
- `docs/progress.md`
- `docs/project-structure.md`
- `index.html`
- `playwright.config.ts`
- `public/favicon.svg`
- `public/manifest.webmanifest`
- `src/app/App.tsx`
- `src/app/appMachine.ts`
- `src/app/useTimers.ts`
- `src/domain/timer/labelLayout.test.ts`
- `src/domain/timer/labelLayout.ts`
- `src/domain/timer/timerMath.test.ts`
- `src/domain/timer/timerMath.ts`
- `src/domain/timer/timerTypes.ts`
- `src/features/completion-alert/CompletionAlert.tsx`
- `src/features/settings/SettingsButton.tsx`
- `src/features/settings/SettingsPanel.tsx`
- `src/features/timer-rail/RailDecorations.tsx`
- `src/features/timer-rail/TimerPin.tsx`
- `src/features/timer-rail/TimerRail.tsx`
- `src/features/timer-rail/timerRailGeometry.ts`
- `src/features/timer-rail/timerRailKeyboard.ts`
- `src/features/timer-rail/useRailGesture.ts`
- `src/styles/base.css`
- `tests/browser/app-smoke.spec.ts`

## 2026-07-03 품질 정리

### 완료

- ESLint 규칙을 강화했다. import 정렬, 파일/함수 길이, 복잡도, 명시 boolean 조건, Promise 오용, 불필요한 타입 표현을 검사한다.
- `src/` 내부 import에 `@/` 경로 별칭을 적용했다.
- lint-staged에서 ESLint는 JS/TS 파일에만 적용하고, Prettier는 staged 파일 전체에 적용하도록 정리했다.
- `main` 브랜치에 `feat: scaffold one slide timer app` 커밋을 만들고 `origin/main`으로 push했다.

### 검증

- `npm run verify`: 통과.
- `npm run verify:browser`: 통과.
- 커밋 훅의 lint, typecheck, unit test 통과.

### 현재 구현 범위

- 세로 카운트다운 레일에서 위로 드래그해 타이머를 만들 수 있다.
- 여러 타이머를 동시에 실행할 수 있다.
- 설정 버튼에서 시간 범위를 1시간부터 24시간까지 바꿀 수 있다.
- 앱이 열린 동안 완료 알림음을 반복하고, 확인하면 완료된 타이머를 제거한다.

### 아직 스펙만 있는 항목

- 실행 중인 타이머 핀을 드래그해 시간을 다시 조정하는 흐름.
- 타이머 핀 탭 후 작은 액션 UI를 띄우는 흐름.
- 타이머 핀을 0 지점으로 드래그해 조기 종료하는 흐름.
- iOS 네이티브 알림 예약과 실제 기기 알림 제약 검증.

## 2026-07-03 구현

### 완료

- Vite React TypeScript 앱 구조를 실제 파일로 생성했다.
- `npm`, `.nvmrc` Node 24, `package-lock.json`, `package.json#engines.node`를 설정했다.
- ESLint flat config, TypeScript strict, Prettier, Vitest, Playwright, Husky, lint-staged, commitlint를 설정했다.
- `pre-commit` hook은 lint-staged, lint, typecheck, unit test를 실행하도록 만들었다.
- `commit-msg` hook은 commitlint로 Conventional Commits를 검사하도록 만들었다.
- `verify`, `verify:browser`, `cap:sync:ios`, `cap:open:ios` 스크립트를 추가했다.
- `public/manifest.webmanifest`와 iOS 홈 화면 메타태그를 추가했다.
- `platform/notifications` 경계를 만들고 브라우저 알림음, Capacitor Local Notifications 어댑터 자리를 마련했다.
- DOM/CSS + Pointer Events 기반의 첫 시간 레일과 타이머 생성 흐름을 구현했다.
- 타이머 레일 제스처 방향을 상하 기준으로 정했다. 아래가 0이고 위로 드래그할수록 시간이 길어진다.
- 시간 계산, 10초 스냅, 시간 범위 clamp, 라벨 배치 단위 테스트를 추가했다.
- Playwright 모바일 WebKit smoke 테스트를 추가했다.
- Capacitor iOS 프로젝트를 연결해 `ios/`만 생성했다.

### 검증

- `npm run verify`: 통과.
- `npm run verify:browser`: 통과.
- `npm run cap:sync:ios`: 통과.
- commitlint smoke: `feat: smoke test` 통과.
- lint-staged smoke: staged 파일 없음 상태에서 정상 종료.

### 참고

- Node 24로 검증했다. 기본 shell의 Node 22에서는 `package.json#engines.node` 때문에 경고가 난다.
- npm이 사용자 npm 설정의 `always-auth`, `email`, `NPM_TOKEN`, `msvs_version` 경고를 출력하지만 검증 실패 원인은 아니다.

## 2026-07-03

### 완료

- 제품 목표를 "모바일에서 한 번의 제스처로 병렬 타이머를 시작하는 웹앱"으로 정리했다.
- 첫 버전 범위를 카운트다운 레일 중심으로 정했다.
- 시간 범위 기본값은 1시간으로 정했다.
- 시간 범위는 설정 화면의 스테퍼로 1시간부터 24시간까지 정수 시간으로 바꿀 수 있게 정했다.
- 설정 진입은 하단 탭이 아니라 화면 구석의 설정 버튼으로 정했다.
- 첫 출시 시간 정밀도는 10초 단위로 정했다.
- 완료 알림은 사용자가 확인할 때까지 반복되도록 정했다.
- 여러 타이머가 완료되면 하나의 완료 알림에 목록으로 합치도록 정했다.
- 이름 없는 타이머를 정상 상태로 두고, 타이머 이름 기능은 첫 버전 이후로 미뤘다.
- 제품 용어를 `CONTEXT.md`에 정리했다.
- 제품 스펙과 개발 계획을 `docs/product-spec.md`에 정리했다.
- 에이전트 작업 규칙을 `AGENTS.md`에 추가했다.
- 웹 배포를 먼저 만들고, 앱스토어 출시는 같은 웹앱을 Capacitor로 감싼 iOS 앱으로 진행하기로 정했다.
- Android는 추가 가능하게 열어두되, 첫 네이티브 폴더는 `ios/`만 만들기로 정했다.
- 모든 기능은 로컬에서 쉽게 테스트 가능해야 하고, 코드 가독성을 최우선 기준으로 두기로 정했다.
- 프로젝트 구조 계획을 `docs/project-structure.md`에 정리했다.
- lint 경고 0개, TypeScript strict, Husky, lint-staged, commitlint, Conventional Commits를 기본 품질 게이트로 정했다.
- 패키지 매니저는 `npm`, 웹 배포는 Vercel, Node 버전은 `24`로 고정했다.
- 테스트 범위는 unit test와 배포 전 browser smoke로 정했다.
- Playwright browser smoke는 커밋마다 강제하지 않고 배포 전 검증으로 두기로 했다.
- XState는 제스처와 타이머 생명주기 전환만 맡기고 값 계산은 순수 함수로 두기로 했다.
- UI는 DOM/CSS와 Pointer Events로 구현하기로 했다.
- 웹 MVP는 앱이 열린 동안 반복 알림을 보장하고, 앱 복귀 시 이미 끝난 타이머를 완료 처리하기로 했다.
- 네이티브 알림은 `platform/notifications` 경계를 미리 두고, iOS 연결 후 첫 타이머 시작 시 권한을 요청하기로 했다.
- PWA는 manifest와 iOS 홈 화면 메타태그만 먼저 두고, service worker는 첫 버전에서 제외하기로 했다.
- Vite React TypeScript 템플릿으로 스캐폴딩하기로 했다.
- 앱 표시 이름은 `One Slide Timer`, bundle id는 `com.roegankim.oneslidetimer`로 정했다.

### 남은 결정

- 웹 배포 환경을 언제 연결할지.
- 활성 타이머 핀 드래그 편집과 조기 종료 액션을 어떤 순서로 구현할지.
- iOS Local Notifications 연동과 실제 기기 알림 제약을 언제 확인할지.
- 알람 레일을 언제 추가할지.
- 후속 타이머를 첫 버전 이후에 어떤 방식으로 설계할지.
