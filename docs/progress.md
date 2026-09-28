# 개발 진행 기록

이 문서는 원 슬라이드 타이머의 진행상황을 계속 이어 쓰기 위한 기록장이다. 새 결정이나 구현이 생기면 최신 항목을 위에 추가한다.

## 2026-09-28 알림 모듈 구조 문서 추가

- `src/platform/notifications/README.md`에 파일별 역할, 의존 방향, 상태 소유권과 전달·복구 규칙을 간략히 정리했다.

## 2026-09-28 알림 전달 책임을 플랫폼 경계 안으로 이동

- `codebase-design` 기준으로 앱에서 알아야 하는 실행 순서를 줄였다. 공통 runtime은 권한·store 연결만 수행하며 웹/iOS 분기, 예약 조회·복원·체크포인트를 알지 않는다. 전달 세션은 연결·최신 입력·재확인·테스트 동작만 공개한다.
- iOS adapter는 기존 ID별 예약 알고리즘과 이전 예약의 초 정밀도 호환을 유지하며 조회·복원·수명을 소유한다. 웹 adapter는 완료 목록 계산·병합·중복 방지·표시 정리를 소유한다. adapter는 store를 구독하거나 권한 상태를 복제하지 않는다.
- 권한 보류와 명시적 X, 저장소 읽기 실패와 빈 목록, 해제 후 재연결의 의미를 interface와 구현 주석으로 명시했다. 환경 안내와 미지원 사유도 adapter에서 공급한다. 앱·화면에서 플랫폼 내부 driver를 참조하지 못하도록 기존 화면 import 제한을 보존하며 lint 규칙을 추가했다.
- 자체 리뷰에서 표시 진행 중 X를 선택하면 이전 정리 성공 기록 때문에 정리가 누락될 수 있는 경합을 수정했다. 재연결 시 이전 권한 대기가 새 예약을 막는 문제와 X→O 또는 재연결 후 오래된 테스트 성공 응답도 회귀 테스트로 보호했다.

### 검증

- Node 24 `npm run verify`: lint·포맷·타입 검사와 단위·통합 테스트 **22개 파일 / 80개 통과**. production 빌드 통과.
- 전체 Playwright 검사: **76개 통과 / 1개 실패 / 1개 제외**. 모바일 권한 검사 실패는 개발 서버 파일 갱신 도중 DOM 교체·초기 안내 재표시와 겹쳤다. 코드 변경 없이 해당 모바일 권한 파일을 재실행하여 **6개 모두 통과**했다. 실제 Chromium 서비스 워커 알림 검사는 전체 실행에서 통과했다.
- iOS 실기기 알림·잠금·백그라운드 동작은 이번 자동화 검증 범위에 포함되지 않는다. 제외된 1개는 모바일 WebKit 실제 시스템 알림 검사다.

### 이번 작업의 변경 파일

- 공통 연결·화면: `src/app/notificationRuntime.ts`, `src/app/state/notificationState.ts`, `src/features/settings/NotificationSettings.tsx`.
- 플랫폼: `src/platform/notifications/notificationPort.ts`, `notificationDriver.ts`, `scheduledNotifications.ts`, `completionNotifications.ts`, `syncNotifications.ts`, `browserNotifications.ts`, `capacitorNotifications.ts`, `index.ts`. 앱의 기존 `src/app/completionNotifications.ts`는 플랫폼 구현으로 이동했다.
- 검사·경계: `eslint.config.js`, `src/app/testDependencies.ts`, `src/app/notificationRuntime.test.ts`, `src/app/notificationRecovery.test.ts`, `src/app/nativeReservationRecovery.test.ts`, `src/app/completionNotifications.test.ts`, `src/platform/notifications/browserNotifications.test.ts`, `src/platform/notifications/notificationDelivery.test.ts`, `tests/fixtures/permissions.tsx`.
- 문서: `docs/project-structure.md`, `docs/notification-permissions-plan.md`, `docs/zustand-state-management-plan.md`, `docs/progress.md`.

## 2026-09-28 웹 시스템 알림 지원과 범위 정정

- 웹 알림을 임의로 제외했던 계획을 정정했다. 웹·iOS 모두 초기 권한 조회, 앱 안내의 확인 또는 설정 O 선택에 따른 요청, 상태 표시·재확인·테스트 알림을 제공한다. 미지원은 HTTPS·브라우저 API 조건으로 판단하며 웹 전체를 미지원으로 반환하지 않는다.
- 웹은 기존 store의 타이머와 현재 시각, 기존 완료 selector를 사용한다. 완료 목록은 같은 tag로 병합하고 매초 재전송하지 않는다. 확인·X 선택 때 표시 알림을 닫으며, 비동기 준비 도중 확인·비활성화·실행 해제 시 오래된 전송과 정리를 중단한다. 권한 재확인 중 확인하는 경합과 지연된 테스트 성공 안내도 보완했다.
- `NotificationPort`를 공통 권한 API와 실제 전달 방식(`scheduled` / `completion`)으로 나눴다. iOS 예약·취소·복원 로직은 유지했다. 웹에 별도 타이머 원본·시계·가짜 미래 예약을 만들지 않았다. 브라우저 API와 환경 안내는 어댑터에, 권한·사용 선택은 기존 Zustand 영역에 유지했다.
- 알림 전용 서비스 워커를 추가했다. 첫 표시 때 등록·활성화를 기다려 `showNotification`을 호출하고, 클릭하면 기존 앱을 활성화하거나 연다. 서비스 워커 미지원 환경은 Notification 생성자로 전달한다. offline cache·fetch 가로채기·서버 Web Push는 추가하지 않았다.

### 검증과 한계

- Node 24에서 lint·포맷·타입 검사 및 단위·통합 검사 **21개 파일 / 74개 통과**. production 빌드와 `git diff --check` 통과.
- 전체 Playwright 검사 **77개 통과 / 1개 제외**. 마지막 지연 테스트 알림 안내 수정 후 최종 빌드로 알림 관련 검사 **15개 통과 / 1개 제외**를 다시 확인했다. 권한 요청은 확인 버튼에서만 실행됨을 검사했으며 실제 Chromium 서비스 워커 등록·테스트 알림·완료 알림·확인 후 닫기를 검증했다. 기존 타이머·저장 복구·테마·모션·터치 회귀 검사도 통과했다.
- headless shell은 권한을 부여해도 Notification 권한을 denied로 반환했다. 데스크톱 검사에 실제 Chromium headless 채널을 사용했다. 저장 복구 검사는 알림 경고까지 모두 사라진다고 가정하지 않고 해당 저장 오류의 해소를 검사하도록 수정했다.
- 제외 1개는 모바일 WebKit에서 자동화로 실제 시스템 알림을 검증하는 검사다. 모바일 WebKit의 권한 UI 검사는 별도로 통과했다. iPhone 홈 화면 웹앱·실제 OS 권한 팝업·소리·잠금·집중 모드는 실기기 미검증이다. 웹앱 종료 또는 실행 중단 중의 정시 예약 알림은 보장하지 않는다.

### 변경 파일

- 실행·상태: `src/app/notificationRuntime.ts`, `src/app/completionNotifications.ts`, `src/app/notificationAudio.ts`, `src/app/state/notificationState.ts`.
- 어댑터·화면: `src/platform/notifications/notificationPort.ts`, `src/platform/notifications/browserNotifications.ts`, `src/platform/notifications/capacitorNotifications.ts`, `src/platform/notifications/syncNotifications.ts`, `src/platform/notifications/index.ts`, `src/features/settings/NotificationSettings.tsx`, `public/notification-sw.js`.
- 검사: `src/app/completionNotifications.test.ts`, `src/app/testDependencies.ts`, `src/platform/notifications/browserNotifications.test.ts`, `tests/browser/web-notifications.spec.ts`, `tests/browser/notification-permissions.spec.ts`, `tests/browser/storage-recovery.spec.ts`, `tests/fixtures/permissions.tsx`, `playwright.config.ts`.
- 기준 문서: `AGENTS.md`, `CONTEXT.md`, `docs/product-spec.md`, `docs/project-structure.md`, `docs/notification-permissions-plan.md`, `docs/zustand-state-management-plan.md`, `docs/progress.md`.

## 2026-09-28 알림 안내에서 설정 종료 후 초점 복귀 수정

- 알림 안내의 ‘알림 설정 보기’ 버튼이 설정 진입 시 제거되면서 닫은 뒤 초점이 `body`에 남던 문제를 수정했다. 원래 초점 대상이 문서에 남아 있으면 기존대로 복귀하고, 대상이 제거되었거나 `body`이면 설정 버튼으로 복귀한다. DOM 초점 처리는 설정 화면에 유지했다.
- 기존 권한 브라우저 검사에 거부 후 Escape로 닫기와 오류·취소 후 권한 허용 및 돌아가기 버튼으로 닫기의 초점 검증을 추가했다. 수정 전 거부 경로의 새 검증이 실패하는 것을 확인했다.
- 수정 후 Chromium·모바일 WebKit의 권한·설정 검사 **24개 통과**. production 빌드와 `npm run verify`의 lint·포맷·타입·단위 및 통합 검사 **64개 통과**.
- 변경 파일: `src/features/settings/SettingsPanel.tsx`, `tests/browser/notification-permissions.spec.ts`, `docs/progress.md`.

## 2026-09-28 아키텍처 리뷰 지적 3건 수정

- **기존 iOS 예약 보존:** 네이티브 예약 조회에서 밀리초가 생략되어 같은 예약을 취소·재등록하던 문제를 수정했다. 새 예약은 `extra.endAt`에 정확한 종료 시각을 보존하고, 이전 예약은 조회 정밀도인 초 단위로 비교한다. 타이머 원본 `endAt`은 변경하지 않는다. 권한 조회 실패만으로 유효 예약을 취소하지 않으며 시간 변경·명시적 X 선택은 기존대로 반영한다.
- **초기 권한 요청 결과 안내:** 요청 거부·취소·오류를 메인 화면의 안내와 ‘알림 설정 보기’ 버튼으로 표시한다. 기존 권한 상태에서 문구를 계산하며 별도 상태를 복제하지 않는다. 설정에서 재확인·재요청하여 허용하면 안내가 사라진다.
- **저장 상태 변경 경로:** `persistence`의 직접 `setState` 호출을 제거했다. 읽기 결과 복원·병합과 쓰기 결과 반영은 상태 영역의 내부 액션이 담당하고, 저장 실행 계층은 I/O와 연결 수명만 관리한다. 내부 액션은 UI 공개 API에서 제외한다. 읽기 실패 시 원본 보호·메모리 변경 우선 병합·쓰기 실패 재시도 계약을 유지한다.

### 검증

- 수정 전 새 네이티브 회귀 검사 4건과 권한 오류·취소 브라우저 검사 2건이 실패하는 것을 확인했다. 네이티브 검사는 기존·새 예약 형식과 권한 조회 성공·실패 조합에서 초기 실행·앱 복귀·시간 변경·명시적 비활성화를 검사한다.
- Node 24에서 `npm run verify`: lint 경고 0개, 포맷·타입 검사와 **19개 파일 / 64개 테스트 통과**.
- `npm run verify:browser`: production 빌드와 데스크톱 Chromium·모바일 WebKit·Chromium 터치 경로의 **74개 테스트 통과**.
- 수정 후 재검토에서 상태 쓰기가 `src/app/state` 안으로 모였음을 확인했다. `git diff --check` 통과. 실제 iOS 시스템 팝업·알림 전달·잠금·백그라운드·VoiceOver 검증은 미완료다.

### 이번 수정 파일

- 예약과 검사: `src/platform/notifications/notificationPort.ts`, `src/platform/notifications/capacitorNotifications.ts`, `src/platform/notifications/syncNotifications.ts`, `src/platform/notifications/capacitorLifecycle.test.ts`, `src/platform/notifications/capacitorNotifications.test.ts`, `src/app/nativeReservationRecovery.test.ts`.
- 저장 상태와 공개 계약: `src/app/state/timerState.ts`, `src/app/state/settingsState.ts`, `src/app/persistence.ts`, `src/app/publicContract.test.ts`.
- 권한 안내와 검사: `src/app/state/notificationState.ts`, `src/app/AppNotices.tsx`, `tests/fixtures/permissions.tsx`, `tests/browser/notification-permissions.spec.ts`.
- 개발 기록: `docs/progress.md`.

## 2026-09-18 Zustand 마이그레이션·권한 설정 구현과 최종 리뷰

### 상태 소유권과 변경 경로

- 앱 인스턴스별 Zustand store 하나로 타이머 원본·현재 시각·설정·설정 화면 열림·저장 상태·권한 상태를 이전했다. 기존 `useTimers`, `useSettings`, `useStoredState`, `useTimerNotifications`는 삭제했다.
- 화면은 `useAppStore(selector)`로 필요한 값만 읽고 `useAppActions()`의 공개 동작으로 변경한다. 내부 복원·권한 반영 액션과 원본 store는 화면 API에서 제외했으며 타입 검사와 ESLint import 제한으로 경계를 보호한다.
- 타이머 동작은 `timerCommands`, 저장 읽기·쓰기·복구는 `persistence`, 자원 연결·해제는 `appRuntime`, 권한·예약·오디오 연결은 `notificationRuntime`이 담당한다. 권한 결과의 반영은 `notificationPermission` 한 경로로 모았다.
- XState는 공유 레일 actor 하나로 제스처·액션·시간 조정 전환을 맡는다. 시간 조정 입력은 로컬 상태, DOM 측정과 transform 모션은 기존 레일 코드에 유지했다. 진행·완료 여부는 `endAt`과 현재 시각으로 계산한다.
- 기존 저장 키, 종료 시각, 5분~12시간 범위, 네 테마, 한 번의 제스처로 시작·수정, 1초 표시·부드러운 모션, 완료 병합·반복음·확인 동작을 유지했다. 저장 읽기 실패의 원본 보호와 재시도 병합, 저장 실패 후 메모리 동작도 보존했다.

### 계획에 따른 새 기능

- 앱 시작에는 권한만 조회하고, 미요청 상태의 안내에서 확인하거나 설정에서 O를 선택할 때만 OS 요청을 시작한다. 중복 요청과 오래된 응답이 최신 사용자 선택을 덮지 않도록 처리했다.
- 설정에 기기 알림 O/X, 권한 상태·재확인·테스트 알림, 별도의 앱 내부 알림음 활성화·소리 테스트를 추가했다. 웹은 기기 알림 미제공을 표시하고 기존 앱 내부 알림음을 유지한다.
- 드래그·타이머 액션·시간 조정·설정 중에는 초기 안내를 보류하고 완료 알림을 우선한다. 앱 복귀와 알림 탭에서 권한·시각·실제 예약을 다시 확인한다.
- `zustand`와 `@capacitor/app`을 추가하고 iOS 플러그인을 동기화했다. 권한 브라우저 검사 진입점은 `tests/fixtures`에 두며 배포 빌드에는 포함하지 않는다.

### 코드 리뷰 결과와 수정

- **Standards:** 상태 소유권·공개 동작·저장 경로·selector·플랫폼 경계를 점검했다. 저장된 X의 예약 취소가 권한 응답을 기다리는 문제 1건을 발견해 수정했다.
- **Spec:** 위 문제를 포함해 총 4개 경합 문제를 수정했다. (1) 예약 조회와 권한 조회를 병행하여 X의 취소가 권한 응답을 기다리지 않게 했다. (2) 초기 예약 조회 전 새 예약을 보류해 기존 유효 예약의 중복을 막았다. (3) 설정 읽기 실패 중 명시적으로 선택한 O는 메모리에서 적용하도록 했다. (4) 예약 조회 중 X·삭제·수정이 발생해도 실제 예약 응답을 최신 의도와 대조하고, 응답 유효성은 실제 OS 작업 이력으로 판별하도록 했다.
- 각 문제에 회귀 검사를 추가했다. 수정 후 재검토에서 추가로 확정된 결함은 없었다.

### 검증 결과와 남은 범위

- Node 24에서 `npm run verify`: lint 경고 0개, 포맷·타입 검사, 단위·통합 검사 **18개 파일 / 60개 테스트 통과**.
- `npm run verify:browser`: production 빌드와 **70개 테스트 통과**. 데스크톱 Chromium·모바일 WebKit·Chromium 터치 경로에서 기존 회귀 검사와 새 권한·안내 우선순위·selector 렌더 검사를 실행했다.
- 저장 읽기 실패 보호 제거, 늦은 허용 응답의 X 덮어쓰기, 삭제한 타이머의 지연 예약, 거부된 권한을 사용 가능으로 표시하는 오류 **4개를 임시 주입해 모두 테스트 실패를 확인**했다. 이후 원본 코드를 정확히 복원했다.
- `npx cap sync ios`와 `git diff --check`를 확인했다. iOS 빌드·실제 시스템 팝업·알림 전달·VoiceOver·잠금·백그라운드·무음·집중 모드는 **실기기 검증 미완료**다. 브라우저 검사와 플러그인 mock 통과가 이를 보장하지 않는다.
- 변경 범위: `src/app`의 상태·실행 계층과 검사, `src/features`의 store 연결·권한 UI, `src/platform/notifications`의 어댑터·예약·오디오와 검사, 타이머 설정 저장 형식, 알림 스타일, 브라우저 검사·fixture·설정, 의존성·iOS 플러그인 설정, `AGENTS.md`·`CONTEXT.md`·제품 스펙·프로젝트 구조·두 개발 계획·이 진행 기록.

## 2026-09-18 Zustand 계획 재검토 반영

- 초기 권한 안내는 레일 actor가 `idle`일 때만 표시하도록 보완했다. 생성·편집 드래그, 타이머 액션, 시간 조정 중에는 보류하고 조작 종료 후 최신 조건으로 안내한다.
- 예약 보존·명시적 취소·종료 시각 변경에 따른 교체의 처리 순서를 구분했다. 단순 권한 조회 실패는 유효 예약을 유지하고, 조기 종료·완료 확인·X 선택의 취소는 권한 확인 성공을 요구하지 않는다.
- 시간 조정으로 무효가 된 이전 예약은 정리하고, 취소·조회·새 예약 실패 시 최신 목표를 재시도하도록 정했다. 기존의 일괄 취소 선행 순서는 변경하도록 명시했다.
- 단계별 작업과 검증 기준에 드래그 중 조회 완료, 조회 실패 시 예약 보존과 명시적 취소, 교체 실패·재시도 시나리오를 추가했다. 제품 스펙·용어와의 일관성도 확인했다.
- 문서만 수정했으며 실행 코드와 의존성은 변경하지 않았다.
- 변경 파일: `docs/zustand-state-management-plan.md`, `docs/notification-permissions-plan.md`, `docs/project-structure.md`, `docs/progress.md`.

## 2026-09-18 Zustand 계획 아키텍처 리뷰 반영

- 최초 저장 복원과 실행 자원 재연결을 분리했다. 같은 인스턴스의 재연결은 미저장 변경·실패 상태를 보존하고, 실패한 읽기는 명시적인 재시도에서만 복원하도록 정했다.
- UI·XState의 공개 `AppActions`와 내부 상태 변경 액션을 타입·export에서 구분하고 단순 동작은 기존 함수 참조를 제공하도록 했다.
- 레일 actor는 `App`에서 하나만 생성해 레일·권한 안내에 전달하고 각 소비자가 필요한 상태만 구독하도록 구체화했다.
- 권한 조회·요청·store 반영을 `notificationRuntime`으로 모으고 예약 전 재확인도 같은 경로로 연결했다. `appRuntime`은 조립·수명 관리로 책임을 제한했다.
- 단계별 작업과 저장 실패 후 재연결, 공개 호출 계약, 조정 중 안내, 권한 표시 일치·응답 경합 검증 기준을 보강했다. 알림 계획·프로젝트 구조를 맞추고 제품 스펙·용어와의 일관성을 확인했다.
- 문서만 수정했으며 실행 코드와 의존성은 변경하지 않았다.
- 변경 파일: `docs/zustand-state-management-plan.md`, `docs/notification-permissions-plan.md`, `docs/project-structure.md`, `docs/progress.md`.

## 2026-09-18 Zustand 기반 전체 상태 관리 계획

- [적용 계획](zustand-state-management-plan.md)에 타이머·시각·설정·화면·저장 복구·알림 상태 전체의 소유권을 정리했다. 앱 인스턴스별 Zustand store 하나와 명시적인 변경 액션을 기준으로 한다.
- 상태와 외부 실행을 분리하고, XState 상호작용·로컬 입력·DOM 측정·transform 모션의 기존 책임을 유지하도록 했다. 기존 훅 제거와 파일별 이전 방향을 포함했다.
- 저장 키·형식·오류 복구를 보존하고 `persist` 도입을 분리했다. 단계별로 기존 상태 소유자를 대체하며 마지막에는 전체 회귀 검사·결함 주입·코드 리뷰·실기기 검증을 진행하도록 계획했다.
- 기존 알림 계획을 Zustand 상태와 앱 실행 계층 기준으로 맞췄다. 초기 권한 안내와 O/X 동작은 유지하고 기존 기능 이전을 선행하도록 했다.
- 제품 스펙·프로젝트 구조·에이전트 지침을 계획에 맞췄다. 실행 코드와 의존성은 수정하지 않았다.
- 변경 파일: `docs/zustand-state-management-plan.md`, `docs/notification-permissions-plan.md`, `docs/product-spec.md`, `docs/project-structure.md`, `docs/progress.md`, `AGENTS.md`.

## 2026-09-18 앱 시작 시 권한 안내 계획 보완

- 앱 실행 직후 권한을 한 번 확인하고, 미요청 상태에서 앱 안내 팝업의 확인을 누르면 OS 권한 요청을 실행하는 흐름을 개발 계획에 추가했다.
- 기존 첫 타이머 시작 시 요청 계획을 대체했다. 설정의 O 선택은 같은 요청 동작을 사용하며 생성·복원·앱 복귀에서 OS 요청을 자동 실행하지 않는다.
- 나중에 선택, 이미 허용·차단·사용 중지·미제공 상태, 설정 읽기 실패, 중복 조회·팝업 방지, 완료 알림 우선 표시와 접근성 검증을 포함했다.
- 제품 스펙과 에이전트 지침을 새 요청 시점에 맞췄다. 문서만 수정했으며 실행 코드는 아직 변경하지 않았다.
- 변경 파일: `docs/notification-permissions-plan.md`, `docs/product-spec.md`, `docs/progress.md`, `AGENTS.md`.

## 2026-09-18 알림 권한과 설정 UI 계획

- [개발 계획](notification-permissions-plan.md)에 O/X 라디오의 요청·실패·사용 중지 흐름, 실제 기기 권한과 사용자 선택의 구분, 저장값 이전과 환경별 지원 범위를 정리했다.
- 기존 알림 어댑터의 조회·요청 분리, 공통 훅의 단일 소유, 앱 복귀 시 재확인, 이전 기기 예약 조회와 취소 실패 복구를 구현 순서에 포함했다.
- 웹은 기존 브라우저 알림음 범위를 유지하며 시스템 알림 미제공을 명시한다. iOS 권한·예약 연동과 자동 검사·실기기 검증을 구분했다.
- 제품 스펙에 후속 계획 링크를 추가했다. 실행 코드와 의존성은 수정하지 않았다.
- 변경 파일: `docs/notification-permissions-plan.md`, `docs/product-spec.md`, `docs/progress.md`.

## 2026-09-17 기능 회귀 테스트 보강

- Worker 진입점을 실제 스케줄러와 연결한 단위 테스트와 실제 브라우저 Worker의 초 경계·완료 검사를 추가했다. 기존 폴백 경계 검사도 유지했다.
- 완료부터 반복 알림음 재생, 추가 완료 시 주기 유지, 확인 후 정지와 진행 중 타이머 보존까지 브라우저에서 검사한다.
- 저장 실패 중 생성·수정·삭제·설정 변경 후 재시도하고 새로고침하여 최신 데이터를 검증한다. 정상·손상 레코드가 섞인 저장값의 원본 보존 검사도 보강했다.
- Chromium의 실제 터치 입력 경로로 드래그 생성·취소·수정·탭·0에서 조기 종료와 빈 레일 스크롤을 검사한다. 실제 iPhone Safari 검증 범위와 구분했다.
- iOS 알림 어댑터의 예약 시각, 수정 시 ID 유지, 타이머별 취소 ID, 예약·취소 오류 전달을 검사한다.
- GitHub Actions에서 PR·main 변경 시 정적 검사, 단위 테스트와 브라우저 검사를 실행하는 설정을 추가했다. 원격 CI 실행과 필수 검사·배포 차단 정책 적용은 별도다.
- 제품 실행 코드와 의존성은 변경하지 않았다.

### 검증

- Node 24에서 `npm run verify` 통과: lint 경고 0개, 포맷·타입 검사, 단위 테스트 40개.
- `CI=1 npm run verify:browser` 통과: 프로덕션 빌드와 브라우저 검사 56개. Chromium·모바일 WebKit에서 27개 시나리오씩, 모바일 Chromium에서 터치 시나리오 2개를 실행했다.
- 임시 복사본에 오류 5종을 넣어 새 검사의 실패를 확인했다. Worker 종료 시각 단위 오류는 단위·브라우저 검사에서, 알림음 호출 누락·이전 값으로 저장 재시도·핀의 터치 스크롤 허용은 브라우저 검사에서, 잘못된 네이티브 취소 ID는 단위 검사에서 감지했다. 원본 실행 코드는 건드리지 않았고 임시 복사본은 삭제했다.
- 원격 GitHub Actions 실행과 실제 iPhone Safari·기기 알림 출력은 이번 로컬 검증에 포함하지 않았다.

### 변경 파일

- `.github/workflows/verify.yml`, `playwright.config.ts`
- `src/workers/timerWorker.test.ts`
- `src/platform/notifications/capacitorNotifications.test.ts`
- `src/domain/timer/timerStorage.test.ts`
- `tests/browser/clock.ts`, `tests/browser/timer-tick.spec.ts`
- `tests/browser/timer-worker.spec.ts`, `tests/browser/timer-alert.spec.ts`
- `tests/browser/rail-touch.spec.ts`, `tests/browser/storage-recovery.spec.ts`
- `docs/project-structure.md`, `docs/progress.md`

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
