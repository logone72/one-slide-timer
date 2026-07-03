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
    appMachine.ts

  domain/
    timer/
      timerTypes.ts
      timerMath.ts
      timerMachine.ts
      timerStorage.ts

  features/
    timer-rail/
      TimerRail.tsx
      timerRailGeometry.ts
      labelLayout.ts

    settings/
      SettingsButton.tsx
      SettingsPanel.tsx

    completion-alert/
      CompletionAlert.tsx

  platform/
    environment.ts
    notifications/
      notificationPort.ts
      browserNotifications.ts
      capacitorNotifications.ts

  workers/
    timerWorker.ts
    timerWorkerClient.ts

  styles/
    base.css
```

## 역할

- `app/`: 앱 전체 상태와 화면 조립만 맡는다.
- `domain/timer/`: 종료 시각, 남은 시간, 10초 스냅, 타이머 상태 전이를 맡는다. React를 모르게 둔다.
- `features/timer-rail/`: 시간 레일, 핀 드래그, 라벨 충돌 회피를 맡는다.
- `features/settings/`: 설정 버튼, 설정 화면, 시간 범위 스테퍼를 맡는다.
- `features/completion-alert/`: 완료 알림 병합, 확인 흐름을 맡는다.
- `platform/notifications/`: 브라우저 알림음과 나중의 Capacitor Local Notifications 연동 차이를 숨긴다.
- `workers/`: Web Worker와 UI 사이의 메시지만 맡는다. 타이머의 진실은 항상 `endAt`이다.

`notificationPort.ts`는 `ensurePermission`, `scheduleTimer`, `cancelTimer`, `onNotificationAction`만 노출한다. 웹 MVP에서는 앱이 열린 동안 반복 알림음과 복귀 시 완료 처리만 구현하고, iOS 연결 후 `capacitorNotifications.ts`에 네이티브 예약 알림을 붙인다.

## UI 구현

- 레일, 핀, 라벨, 액션 UI는 DOM/CSS로 만든다.
- 제스처는 Pointer Events로 처리한다.
- `canvas`는 첫 버전에 쓰지 않는다. 타이머가 많이 늘어 실제 DOM 성능 문제가 보일 때만 다시 검토한다.
- XState는 제스처와 생명주기 전환만 맡는다. 시간 계산, 좌표 변환, 10초 스냅, 라벨 배치는 순수 함수로 둔다.

## PWA 범위

- 첫 웹 배포에는 `manifest.webmanifest`와 iOS 홈 화면용 최소 메타태그만 둔다.
- service worker와 offline cache는 첫 버전에서 만들지 않는다.
- 캐싱 때문에 배포 확인이 헷갈리는 문제를 피한다.

## 테스트 기준

- 시간 계산, 10초 스냅, 시간 범위 clamp, 라벨 충돌 회피는 작은 단위 테스트를 둔다.
- Playwright browser smoke 테스트는 모바일 viewport에서 앱 표시와 레일 드래그로 타이머 1개 생성만 확인한다.
- Playwright browser smoke는 커밋마다 강제하지 않고 배포 전 검증으로 둔다.
- lint는 경고 0개를 기준으로 통과시킨다.
- TypeScript는 strict 설정을 기본으로 둔다.
- 커밋 전에는 lint-staged, 전체 lint, typecheck, 테스트가 통과해야 한다.
- 커밋 메시지는 commitlint로 Conventional Commits 형식을 강제한다.
- 웹 배포 전에는 로컬 `build`와 `preview`가 통과해야 한다.
- iOS 빌드 전에는 웹 빌드 결과를 Capacitor에 동기화한 뒤 Xcode에서 실행해 본다.

## 품질 게이트

초기 스캐폴딩 때 다음 설정을 함께 둔다.

- ESLint flat config와 TypeScript strict 설정.
- Prettier는 포맷만 맡기고, 코드 품질 판단은 ESLint와 TypeScript가 맡는다.
- Husky `pre-commit` hook은 `lint-staged`, 전체 lint, typecheck, 테스트를 실행한다.
- Husky `commit-msg` hook은 commitlint로 Conventional Commits를 검사한다.
- lint-staged는 staged 파일에만 Prettier와 ESLint fix를 적용한다.
- 커밋 전 로컬 검증은 `verify` 스크립트를 사용한다.
- 배포 전 브라우저 검증은 `verify:browser` 스크립트를 사용한다.

커밋 타입은 처음에는 `feat`, `fix`, `docs`, `refactor`, `test`, `chore`, `build`, `ci`만 허용한다. 타입을 늘리는 일은 실제 커밋 사례가 생긴 뒤에 한다.

## 예상 스크립트

```json
{
  "dev": "vite",
  "build": "tsc -b && vite build",
  "preview": "vite preview",
  "lint": "eslint . --max-warnings 0",
  "format": "prettier . --check",
  "format:write": "prettier . --write",
  "typecheck": "tsc --noEmit",
  "test": "vitest run",
  "test:browser": "playwright test",
  "verify": "npm run lint && npm run format && npm run typecheck && npm run test",
  "verify:browser": "npm run build && npm run test:browser",
  "cap:sync:ios": "npm run build && cap sync ios",
  "cap:open:ios": "cap open ios"
}
```

스크립트 이름은 실제 스캐폴딩 후 조정한다. 핵심은 웹 실행, 웹 빌드, 로컬 테스트, iOS 동기화가 한눈에 보여야 한다는 점이다.

## 스캐폴딩 순서

1. 충돌 파일을 확인한 뒤 `npm create vite@latest . -- --template react-ts`로 시작한다.
2. `.nvmrc`, `package.json#packageManager`, `package.json#engines.node`를 설정한다.
3. ESLint, Prettier, Vitest, Playwright, Husky, lint-staged, commitlint를 붙인다.
4. `manifest.webmanifest`와 iOS 홈 화면 메타태그를 추가한다.
5. Vercel 프로젝트를 GitHub에 연결하고 Node 24로 설정한다.
6. 웹 배포가 안정된 뒤 Capacitor iOS를 연결해 `ios/`를 만든다.

## 금지할 구조

- 첫 버전에서 `apps/`, `packages/`를 나누는 모노레포 구조는 만들지 않는다.
- Android 출시를 시작하기 전에는 `android/` 폴더를 만들지 않는다.
- 단일 구현만 있는 인터페이스나 미래용 패키지 분리는 만들지 않는다.
- Capacitor 전용 코드를 UI 컴포넌트 안에 흩뿌리지 않는다.
- 첫 버전에서는 service worker를 만들지 않는다.
