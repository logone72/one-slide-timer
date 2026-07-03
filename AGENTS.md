# 에이전트 지침

이 파일은 AI 코딩 에이전트가 이 저장소에서 놓치기 쉬운 규칙만 기록한다. 일반적인 코딩 스타일이나 파일 목록은 넣지 않는다.

## 문서 규칙

- 저장소 문서는 한국어로 작성한다. 제품명, 라이브러리명, 코드 식별자는 필요할 때만 원문을 유지한다.
- 제품 용어는 [CONTEXT.md](CONTEXT.md)를 기준으로 맞춘다. 새 용어를 만들기 전에 기존 용어를 먼저 확인한다.
- 제품 스펙이나 개발 계획을 바꿀 때는 [docs/product-spec.md](docs/product-spec.md)와 [CONTEXT.md](CONTEXT.md)의 용어가 서로 어긋나지 않게 같이 확인한다.
- 프로젝트 구조나 배포 경로를 바꿀 때는 [docs/project-structure.md](docs/project-structure.md)를 먼저 확인한다.
- 개발 진행상황은 [docs/progress.md](docs/progress.md)에 날짜순으로 기록한다.

## 제품 결정

- 모바일 전용 웹앱이 기본이다. 데스크톱 최적화는 초기 범위가 아니다.
- 카운트다운 레일은 상하 방향이다. 아래가 0이고 위로 갈수록 시간이 길어진다.
- 하단 탭은 사용하지 않는다. 설정은 화면 구석의 설정 버튼으로 연다.
- 타이머 시작은 한 번의 제스처로 끝나야 한다. 모달 입력과 별도 시작 버튼을 기본 흐름으로 만들지 않는다.
- 시간 범위 기본값은 1시간이다. 설정 화면의 스테퍼로 1시간부터 24시간까지 정수 시간만 허용한다.
- 실행 중인 타이머는 종료 시각을 유지한다. 시간 범위 설정이 바뀌면 위치만 다시 계산한다.
- 완료 알림은 사용자가 확인할 때까지 반복된다. 여러 타이머가 완료되면 하나의 알림에 목록으로 합친다.
- 웹 배포를 먼저 만들고, 앱스토어 출시는 같은 웹앱을 Capacitor로 감싸는 iOS 앱으로 진행한다.
- Android는 추가 가능하게 열어두되, 첫 네이티브 폴더는 `ios/`만 만든다.
- 패키지 매니저는 `npm`, 웹 배포는 Vercel, Node 버전은 `24`로 고정한다.
- 앱 표시 이름은 `One Slide Timer`, iOS bundle id는 `com.roegankim.oneslidetimer`로 둔다.

## 구현 기준

- 카운트다운 타이머는 감소 카운터가 아니라 종료 시각(`endAt`)을 저장한다.
- `Web Worker`는 UI 갱신 신호만 보낸다. 남은 시간은 매번 현재 시각과 `endAt`으로 다시 계산한다.
- XState는 제스처와 타이머 생명주기 전환만 맡긴다. 시간 계산, 좌표 변환, 10초 스냅, 라벨 배치는 순수 함수로 둔다.
- UI는 DOM/CSS와 Pointer Events로 만든다. 첫 버전에서 `canvas`는 쓰지 않는다.
- 이름 없는 타이머는 정상 상태다. 타이머 이름 기능은 첫 버전 이후로 미룬다.
- 웹 MVP는 앱이 열린 동안의 반복 알림과 앱 복귀 시 완료 처리를 보장한다. 잠금 화면, 백그라운드, 무음 모드의 알림 보장은 실제 기기 검증 전까지 확정하지 않는다.
- 네이티브 알림은 `platform/notifications` 경계 뒤에 둔다. iOS 연결 후 첫 타이머 시작 시 권한을 요청한다.
- PWA는 첫 버전에서 manifest와 iOS 홈 화면 메타태그만 둔다. service worker와 offline cache는 만들지 않는다.
- 모든 기능은 로컬에서 쉽게 확인할 수 있게 만든다. 순수 시간 계산은 작은 테스트로 남기고, UI 흐름은 로컬 실행에서 바로 만져볼 수 있어야 한다.
- 코드 가독성을 우선한다. 단일 구현만 있는 추상화, 미래용 패키지 분리, 불필요한 모노레포 구조는 만들지 않는다.
- `src/` 내부를 가로지르는 import는 `@/` 경로 별칭을 사용한다. 같은 폴더의 작은 import는 `./`를 유지한다.
- lint는 경고 0개를 기준으로 실패시킨다. TypeScript strict, ESLint, Prettier, Vitest, Husky, lint-staged, commitlint를 품질 게이트로 둔다.
- 커밋 메시지는 Conventional Commits 형식을 따른다. 기본 허용 타입은 `feat`, `fix`, `docs`, `refactor`, `test`, `chore`, `build`, `ci`다.
- Husky `pre-commit`에서는 staged 파일 정리, 전체 lint, typecheck, 테스트를 통과시킨다. Husky `commit-msg`에서는 commitlint를 통과시킨다.
- lint-staged에서 Prettier는 staged 파일 전체에 적용하고, ESLint fix는 JS/TS 파일에만 적용한다.
- Playwright browser smoke는 배포 전 검증으로만 둔다. 커밋마다 강제하지 않는다.

## Git 안전 규칙

- 사용자가 명시적으로 요청하지 않으면 `git add`, `git commit`, `git push`를 실행하지 않는다.
- 파일을 수정한 뒤에는 변경한 파일만 보고한다. 스테이징, 커밋, 푸시는 별도 지시가 있을 때만 한다.
