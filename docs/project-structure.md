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
    notification-sw.js
    manifest.webmanifest
    favicon.svg
  docs/
  tests/
    browser/
    fixtures/
  ios/
  .husky/
  .github/workflows/verify.yml

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

아래 트리는 현재 구현이다. Zustand 도입의 소유권 기준은 [앱 전체 상태 관리 계획](zustand-state-management-plan.md)을 따른다.

```txt
src/
  app/
    App.tsx
    AppStateProvider.tsx
    useAppState.ts
    appContext.ts
    appDependencies.ts
    appRuntime.ts
    timerCommands.ts
    persistence.ts
    notificationRuntime.ts
    notificationAudio.ts
    notificationPermission.ts
    state/
      appStore.ts
      timerState.ts
      settingsState.ts
      notificationState.ts
      storageState.ts
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
      RailHeading.tsx
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
      NotificationSettings.tsx
      AudioSettings.tsx
      ToggleSwitch.tsx
      StatusNotice.tsx

    notification-permission/
      NotificationPermissionPrompt.tsx

    completion-alert/
      CompletionAlert.tsx

  platform/
    environment.ts
    notifications/
      notificationPort.ts
      notificationDriver.ts
      scheduledNotifications.ts
      completionNotifications.ts
      browserNotifications.ts
      capacitorNotifications.ts
      nativeSubscription.ts
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
    notifications.css
    completion-alert.css
```

## 역할

- `app/`: 앱 전체 상태와 화면 조립, 저장 복구와 알림 동기화를 연결한다.
- `domain/timer/`: 종료 시각, 남은 시간, 10초 스냅, 허용 시간 범위, 저장값 검증·이전을 맡는다. React를 모르게 둔다.
- `features/timer-rail/`: 시간 레일, 핀 드래그, 라벨 충돌 회피를 맡는다. `railInteractionMachine.ts`는 제스처·타이머 액션·시간 조정 화면의 배타적인 상태 전환을 관리하고, `useRailInteraction.ts`는 DOM 입력과 최신 타이머 생성·수정 콜백을 연결한다. `useTimerMotion.ts`는 핀·라벨·연결선의 `transform` 보간과 동작 줄이기 설정을 처리한다.
- `features/settings/`: 설정 버튼, 설정 화면, 시간 범위 스테퍼·슬라이더와 색상 테마 선택을 맡는다.
- `features/completion-alert/`: 완료 알림 병합, 확인 흐름을 맡는다.
- `platform/notifications/`: 공통 반복 알림음, 웹 완료 표시·Capacitor 예약 어댑터, ID별 예약·취소 순서와 오류 복구를 맡는다.
- `styles/`: 디자인 토큰, 공통 스타일, 레일·설정·완료 화면별 스타일을 맡는다. 토큰 원시 값은 `tokens.css`에만 선언한다.
- `workers/`: 종료 시각 목록을 받아 초 경계에 맞춘 UI 갱신 신호를 보낸다. `timerTicker.ts`의 예약 함수를 Worker와 메인 스레드 폴백이 공유하며 Worker는 타이머 변경 때 다시 생성하지 않는다. 타이머의 진실은 항상 `endAt`이다.

`src/` 내부를 가로지르는 import는 `@/` 경로 별칭을 쓴다. 같은 폴더 안의 작은 import는 `./`를 유지한다.

`notificationPort.ts`는 권한·복귀 API와 전달 세션의 연결·갱신·재확인·테스트 API만 공개한다. 앱은 타이머·현재 시각·목록 완전성·전달 정책을 전달한다. `scheduledNotifications.ts`는 네이티브 예약 복원·취소·동기화를, `completionNotifications.ts`는 웹 완료 목록 병합·중복 방지·정리를 소유한다. SDK 호출과 테스트 대체 지점인 `notificationDriver.ts`는 플랫폼 내부에서만 사용한다. 웹에서는 앱 실행 중 완료 시스템 알림과 반복 알림음, 복귀 시 완료 처리를 구현하고, `capacitorNotifications.ts`에서 네이티브 예약 알림을 연결한다. 반복 알림음은 `alertAudio.ts`가 웹과 iOS에서 함께 제공한다.

## UI 구현

### 상태 관리 구조

- 앱 인스턴스별 Zustand store 하나가 타이머·설정·알림·앱 화면의 공유 상태와 동기 변경 액션을 소유한다. 상태 영역별 코드는 `app/state/`에 모으며 domain은 Zustand를 모르게 둔다.
- `AppStateProvider`는 고정된 store·공개 `AppActions` 참조를 전달한다. 화면에는 상태 전용 selector와 공개 동작만 노출하고 내부 액션·원본 store는 타입과 export로 감춘다.
- `appRuntime.ts`는 모듈 연결·해제와 공개 동작 참조 조립만 담당한다. 타이머 동작은 `timerCommands.ts`, 저장 복원·재시도는 `persistence.ts`, 알림 연결은 `notificationRuntime.ts`, 권한 조회·요청·최신 결과의 store 반영은 그 내부 모듈 `notificationPermission.ts`에 둔다. 예약 전 권한 재확인도 같은 알림 경로를 사용한다.
- 최초 저장 복원은 store 인스턴스별로 한 번 시도한다. 같은 인스턴스의 재연결은 Worker·구독만 복구하고 메모리 변경·수정 필드·실패 상태를 보존한다. 실패한 읽기의 복원은 명시적인 재시도로 수행한다.
- 레일 actor는 `App`에서 하나만 생성해 레일과 권한 안내에 참조를 전달한다. 권한 안내는 `idle` 여부만 구독해 드래그·타이머 액션·시간 조정 중 노출을 보류하고 미리보기는 레일에서 구독한다. actor와 `idle` 여부를 Zustand에 복제하지 않는다.
- `useTimers`, `useSettings`, `useStoredState`, `useTimerNotifications`의 상태와 외부 작업을 각 책임으로 이전하고 기존 훅을 제거했다. 같은 값을 훅과 store에 함께 보관하지 않는다.
- 저장 키·형식·읽기 실패 보호·재시도 병합을 유지하며 처음에는 Zustand `persist`를 사용하지 않는다. XState 제스처·시간 조정 입력·DOM 측정·transform 모션은 기존 소유자에 남긴다.
- 구현 순서는 설정·화면 → 타이머·시각 → 기존 알림·실행 수명 → 구독 정리 → 새 권한 기능이다. 세부 파일과 검증 기준은 위 적용 계획을 따른다.

### 유지할 UI 기준

- 레일, 핀, 라벨, 액션 UI는 DOM/CSS로 만든다.
- 제스처는 Pointer Events로 처리한다.
- `canvas`는 첫 버전에 쓰지 않는다. 타이머가 많이 늘어 실제 DOM 성능 문제가 보일 때만 다시 검토한다.
- XState는 레일의 제스처·타이머 액션·시간 조정 화면 전환을 맡는다. 조정 화면의 입력값은 React 로컬 상태에 둔다. 진행·완료 여부는 `endAt`에서 계산하며 별도 상태 머신이나 저장 상태를 두지 않는다. 시간 계산, 좌표 변환, 10초 스냅, 라벨 배치는 순수 함수로 둔다.

## PWA 범위

- 웹 배포에는 manifest, iOS 홈 화면 메타태그와 알림 표시·클릭 전용 서비스 워커를 둔다.
- offline cache·fetch 가로채기·서버 Web Push는 만들지 않는다.
- 캐싱 때문에 배포 확인이 헷갈리는 문제를 피한다.

## 테스트 기준

- 시간 계산, 레일 상호작용 상태 전환, 제스처 좌표 변환, 저장값 검증·이전, 라벨 충돌 회피, 알림 경쟁 조건·구독 정리, 오디오 활성화, Worker 폴백, 모든 CSS의 토큰 참조는 작은 단위 테스트를 둔다.
- Playwright browser smoke 테스트는 Chromium과 모바일 WebKit에서 생성, 편집, 취소, 키보드 조정, 조기 종료, 설정, 완료 알림, PC 최대 너비와 라벨 겹침을 확인한다. 5분·55분·1시간·12시간 경계와 테마 저장·키보드 선택·타이머 글자 대비도 검증한다.
- 저장 실패·복구, 비드래그 시간 조정과 초점 복귀, 완료 목록 추가, 200% 글자 확대와 빈 레일 스크롤도 브라우저 회귀 검사에 포함한다. 시각의 경계값은 제어된 시계로 검증한다.
- Worker 진입점은 실제 스케줄러를 연결한 제어 시계로 시작·추가·수정·삭제 시의 갱신을 검사한다. 별도 브라우저 검사에서는 Worker를 끄지 않고 서로 다른 초 경계의 숫자 갱신과 완료 처리를 확인한다. 실제 시계를 쓰는 검사는 렌더링 지연에 400ms의 여유를 둔다.
- 완료 알림은 실제 오디오 생성 호출을 관찰하여 완료 전 무음, 반복 주기, 추가 완료 시 주기 유지, 확인 후 정지와 진행 중 타이머 보존을 검사한다. 시각 제어가 필요한 오디오·카운트다운 검사는 `tests/browser/clock.ts`의 Worker 폴백 설정을 공유한다.
- 저장 실패 중 생성·수정·삭제와 설정 변경을 한 뒤 재시도·새로고침해 최종 데이터가 유지되는지 검사한다. 네이티브 어댑터는 예약 종료 시각, 수정 전후 ID, 취소 ID와 오류 전달을 검사한다.
- 터치 드래그는 `mobile-chromium-touch` 프로젝트에서 브라우저의 터치 입력 경로로 생성·취소·수정·탭·조기 종료와 빈 레일 스크롤을 검사한다. Chromium 전용 CDP를 사용하므로 이 검사를 모바일 WebKit의 터치 검증으로 해석하지 않는다.
- 실제 iPhone Safari의 주소 표시줄·홈 인디케이터 안전 영역, 터치 드래그와 확대·스크롤 충돌, VoiceOver, 잠금·백그라운드·무음 모드의 알림은 기기에서 별도로 확인한다. 브라우저 에뮬레이션과 오디오 호출 검사는 실제 기기의 소리 출력을 보장하지 않는다.
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
- `.github/workflows/verify.yml`은 PR, `main` 푸시, 수동 실행에서 Node 24로 `npm ci`, Chromium·WebKit 설치, `verify`, `verify:browser`를 실행한다. CI의 브라우저 동시 실행 수는 2개로 제한한다.
- CI 설정만으로 Vercel 배포가 차단되지는 않는다. GitHub 필수 검사와 Vercel 배포 대기 정책은 외부 설정이며, 적용 여부를 별도로 확인해야 한다.

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
- 알림 전용 service worker에 오프라인 캐시나 미래 타이머 시계를 넣지 않는다.
