# 개발 진행 기록

이 문서는 원 슬라이드 타이머의 진행상황을 계속 이어 쓰기 위한 기록장이다. 새 결정이나 구현이 생기면 최신 항목을 위에 추가한다.

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
