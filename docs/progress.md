# 개발 진행 기록

이 문서는 원 슬라이드 타이머의 진행상황을 계속 이어 쓰기 위한 기록장이다. 새 결정이나 구현이 생기면 최신 항목을 위에 추가한다.

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

### 다음 작업

- Vite + React + TypeScript 기반 단일 앱 구조를 실제 프로젝트 파일로 스캐폴딩한다.
- `.nvmrc`, `package.json#engines.node`, Vercel Node 설정을 `24`로 맞춘다.
- ESLint, Prettier, TypeScript strict, Vitest, Playwright, Husky, lint-staged, commitlint를 설정한다.
- PWA manifest와 iOS 홈 화면 메타태그를 추가한다.
- 종료 시각 기반 카운트다운 모델을 구현한다.
- Web Worker의 갱신 신호와 UI의 남은 시간 재계산 흐름을 검증한다.
- 카운트다운 레일, 시작 핀, 미리보기 타이머를 구현한다.
- 설정 버튼과 시간 범위 스테퍼를 구현한다.
- 웹 배포 환경을 먼저 만든다.
- Capacitor iOS 프로젝트를 연결한다.
- iOS Local Notifications 연동과 모바일 브라우저 알림 제약을 실제 기기에서 확인한다.

### 남은 결정

- 알람 레일을 언제 추가할지.
- 후속 타이머를 첫 버전 이후에 어떤 방식으로 설계할지.
