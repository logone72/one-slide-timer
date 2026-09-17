# 프로젝트 구조 계획

원 슬라이드 타이머는 단일 앱 레포로 시작한다. 모노레포는 만들지 않는다. 웹 배포를 먼저 만들고, 같은 웹앱을 Capacitor로 감싼 iOS 앱을 App Store에 배포한다. Android는 나중에 추가할 수 있게 열어두되 첫 네이티브 폴더는 `ios/`만 만든다.

## 목표

- 로컬에서 기능을 쉽게 실행하고 확인할 수 있어야 한다.
- 웹 배포 환경에서 실제 모바일 브라우저로 먼저 써볼 수 있어야 한다.
- App Store 제출용 iOS 빌드까지 같은 레포에서 만든다.
- 코드 가독성을 구조보다 우선한다. 구조가 코드를 설명해야지, 코드가 구조를 설명하게 만들지 않는다.

## 확정된 기반

- 패키지 매니저는 `npm`을 쓴다.
- Node 버전은 `.nvmrc`, `package.json#engines.node`, Vercel 프로젝트 설정 모두 `24`로 맞춘다.
- 웹 배포는 Vercel을 쓴다. `main` 브랜치는 production 배포, PR은 preview 배포로 둔다.
- 앱 표시 이름과 Capacitor `appName`은 `One Slide Timer`로 둔다.
- Capacitor `appId`와 iOS bundle id는 `com.roegankim.oneslidetimer`로 둔다.
- 앱 이름은 나중에 바꿀 수 있지만, bundle id는 App Store 배포 전까지 확정하는 값으로 다룬다.

## 루트 구조

```txt
one-slide-timer/
  src/
  public/
    manifest.webmanifest
    favicon.svg
  docs/
  tests/
    browser/
  ios/
  .husky/

  .nvmrc
  index.html
  vite.config.ts
  playwright.config.ts
  capacitor.config.ts
  eslint.config.js
  commitlint.config.js
  .lintstagedrc
  .prettierrc
  package.json
  package-lock.json
```

`ios/`와 `.husky/`는 각각 Capacitor iOS 연결, Husky 초기화 시 생성한다. `android/`는 Android 출시를 실제로 시작할 때 만든다. Vercel은 기본 Vite 정적 배포로 충분하므로 `vercel.json`은 필요한 rewrite나 header가 생길 때만 만든다.

## 소스 구조

```txt
src/
  app/
    App.tsx
    useTimers.ts
    useSettings.ts
    useStoredState.ts
    useTimerNotifications.ts
    AppNotices.tsx

  domain/
    timer/
      timerTypes.ts
      timerMath.ts
      timerStorage.ts
      labelLayout.ts

  features/
    timer-rail/
      TimerRail.tsx
      TimerPin.tsx
      TimerAdjustment.tsx
      useRailLayout.ts
      RailDecorations.tsx
      railInteractionMachine.ts
      railInteractionMachine.test.ts
      useRailInteraction.ts
      useTimerMotion.ts
      timerRailKeyboard.ts
      timerRailGeometry.ts
      timerRailActions.ts

    settings/
      SettingsButton.tsx
      SettingsPanel.tsx
      RangeSettings.tsx
      ThemeSettings.tsx
      StatusNotice.tsx

    completion-alert/
      CompletionAlert.tsx

  platform/
    environment.ts
    notifications/
      notificationPort.ts
      browserNotifications.ts
      capacitorNotifications.ts
      syncNotifications.ts
      alertAudio.ts

  workers/
    timerTicker.ts
    timerWorker.ts
    timerWorkerClient.ts

  styles/
    tokens.css
    tokens.test.ts
    base.css
    timer-rail.css
    settings.css
    completion-alert.css
```

## 역할

- `app/`: 앱 전체 상태와 화면 조립, 저장 복구와 알림 동기화를 연결한다.
- `domain/timer/`: 종료 시각, 남은 시간, 10초 스냅, 허용 시간 범위, 저장값 검증·이전을 맡는다. React를 모르게 둔다.
- `features/timer-rail/`: 시간 레일, 핀 드래그, 라벨 충돌 회피를 맡는다. `railInteractionMachine.ts`는 제스처·타이머 액션·시간 조정 화면의 배타적인 상태 전환을 관리하고, `useRailInteraction.ts`는 DOM 입력과 최신 타이머 생성·수정 콜백을 연결한다. `useTimerMotion.ts`는 핀·라벨·연결선의 `transform` 보간과 동작 줄이기 설정을 처리한다.
- `features/settings/`: 설정 버튼, 설정 화면, 시간 범위 스테퍼·슬라이더와 색상 테마 선택을 맡는다.
- `features/completion-alert/`: 완료 알림 병합, 확인 흐름을 맡는다.
- `platform/notifications/`: 공통 반복 알림음, 웹·Capacitor 예약 어댑터, ID별 예약·취소 순서와 오류 복구를 맡는다.
- `styles/`: 디자인 토큰, 공통 스타일, 레일·설정·완료 화면별 스타일을 맡는다. 토큰 원시 값은 `tokens.css`에만 선언한다.
- `workers/`: 종료 시각 목록을 받아 초 경계에 맞춘 UI 갱신 신호를 보낸다. `timerTicker.ts`의 예약 함수를 Worker와 메인 스레드 폴백이 공유하며 Worker는 타이머 변경 때 다시 생성하지 않는다. 타이머의 진실은 항상 `endAt`이다.

`src/` 내부를 가로지르는 import는 `@/` 경로 별칭을 쓴다. 같은 폴더 안의 작은 import는 `./`를 유지한다.

`notificationPort.ts`는 `ensurePermission`, `scheduleTimer`, `cancelTimer`, `onNotificationAction`만 노출한다. 웹 MVP에서는 앱이 열린 동안 반복 알림음과 복귀 시 완료 처리만 구현하고, `capacitorNotifications.ts`에서 네이티브 예약 알림을 연결한다. 반복 알림음은 `alertAudio.ts`가 웹과 iOS에서 함께 제공한다.

## UI 구현

- 레일, 핀, 라벨, 액션 UI는 DOM/CSS로 만든다.
- 제스처는 Pointer Events로 처리한다.
- `canvas`는 첫 버전에 쓰지 않는다. 타이머가 많이 늘어 실제 DOM 성능 문제가 보일 때만 다시 검토한다.
- XState는 레일의 제스처·타이머 액션·시간 조정 화면 전환을 맡는다. 조정 화면의 입력값은 React 로컬 상태에 둔다. 진행·완료 여부는 `endAt`에서 계산하며 별도 상태 머신이나 저장 상태를 두지 않는다. 시간 계산, 좌표 변환, 10초 스냅, 라벨 배치는 순수 함수로 둔다.

## PWA 범위

- 첫 웹 배포에는 `manifest.webmanifest`와 iOS 홈 화면용 최소 메타태그만 둔다.
- service worker와 offline cache는 첫 버전에서 만들지 않는다.
- 캐싱 때문에 배포 확인이 헷갈리는 문제를 피한다.

## 테스트 기준

- 시간 계산, 레일 상호작용 상태 전환, 제스처 좌표 변환, 저장값 검증·이전, 라벨 충돌 회피, 알림 경쟁 조건·구독 정리, 오디오 활성화, Worker 폴백, 모든 CSS의 토큰 참조는 작은 단위 테스트를 둔다.
- Playwright browser smoke 테스트는 Chromium과 모바일 WebKit에서 생성, 편집, 취소, 키보드 조정, 조기 종료, 설정, 완료 알림, PC 최대 너비와 라벨 겹침을 확인한다. 5분·55분·1시간·12시간 경계와 테마 저장·키보드 선택·타이머 글자 대비도 검증한다.
- 저장 실패·복구, 비드래그 시간 조정과 초점 복귀, 완료 목록 추가, 200% 글자 확대와 빈 레일 스크롤도 브라우저 회귀 검사에 포함한다. 시각의 경계값은 제어된 시계로 검증한다.
- Playwright browser smoke는 커밋마다 강제하지 않고 배포 전 검증으로 둔다.
- lint는 경고 0개를 기준으로 통과시킨다.
- TypeScript는 strict 설정을 기본으로 둔다.
- 커밋 전에는 lint-staged, 전체 lint, typecheck, 테스트가 통과해야 한다.
- 커밋 메시지는 commitlint로 Conventional Commits 형식을 강제한다.
- 웹 배포 전에는 로컬 `build`와 `preview`가 통과해야 한다.
- iOS 빌드 전에는 웹 빌드 결과를 Capacitor에 동기화한 뒤 Xcode에서 실행해 본다.

## 품질 게이트

현재 품질 게이트는 다음 설정을 기준으로 둔다.

- ESLint flat config와 TypeScript strict 설정.
- Prettier는 포맷만 맡기고, 코드 품질 판단은 ESLint와 TypeScript가 맡는다.
- Husky `pre-commit` hook은 `lint-staged`, 전체 lint, typecheck, 테스트를 실행한다.
- Husky `commit-msg` hook은 commitlint로 Conventional Commits를 검사한다.
- lint-staged는 staged 파일 전체에 Prettier를 적용하고, JS/TS 파일에만 ESLint fix를 적용한다.
- 커밋 전 로컬 검증은 `verify` 스크립트를 사용한다.
- 배포 전 브라우저 검증은 `verify:browser` 스크립트를 사용한다.

커밋 타입은 처음에는 `feat`, `fix`, `docs`, `refactor`, `test`, `chore`, `build`, `ci`만 허용한다. 타입을 늘리는 일은 실제 커밋 사례가 생긴 뒤에 한다.

## 현재 스크립트

```json
{
  "dev": "vite",
  "build": "tsc -b && vite build",
  "preview": "vite preview",
  "lint": "eslint . --max-warnings 0",
  "format": "prettier . --check",
  "format:write": "prettier . --write",
  "typecheck": "tsc -b",
  "test": "vitest run",
  "test:browser": "playwright test",
  "verify": "npm run lint && npm run format && npm run typecheck && npm run test",
  "verify:browser": "npm run build && npm run test:browser",
  "cap:sync:ios": "npm run build && cap sync ios",
  "cap:open:ios": "cap open ios"
}
```

핵심은 웹 실행, 웹 빌드, 로컬 테스트, iOS 동기화가 한눈에 보여야 한다는 점이다.

## 초기 스캐폴딩 기록

1. Vite React TypeScript 기반 앱 구조를 만들었다.
2. `.nvmrc`, `package.json#packageManager`, `package.json#engines.node`를 설정했다.
3. ESLint, Prettier, Vitest, Playwright, Husky, lint-staged, commitlint를 붙였다.
4. `manifest.webmanifest`와 iOS 홈 화면 메타태그를 추가했다.
5. Capacitor iOS를 연결해 `ios/`를 만들었다.
6. Vercel 프로젝트 연결과 Node 24 설정은 아직 남아 있다.

## 금지할 구조

- 첫 버전에서 `apps/`, `packages/`를 나누는 모노레포 구조는 만들지 않는다.
- Android 출시를 시작하기 전에는 `android/` 폴더를 만들지 않는다.
- 단일 구현만 있는 인터페이스나 미래용 패키지 분리는 만들지 않는다.
- Capacitor 전용 코드를 UI 컴포넌트 안에 흩뿌리지 않는다.
- 첫 버전에서는 service worker를 만들지 않는다.
