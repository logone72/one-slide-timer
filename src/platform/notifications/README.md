# 알림 모듈

웹·iOS의 권한 API와 기기 알림 전달을 캡슐화합니다. 타이머·권한·사용자 선택의 원본은 앱의 Zustand store에 두고, 이 폴더는 전달 기록과 플랫폼 실행을 관리합니다.

## 구조

| 파일                         | 역할                                              |
| ---------------------------- | ------------------------------------------------- |
| `index.ts`                   | 실행 환경에 맞는 adapter 선택                     |
| `notificationPort.ts`        | 앱에 공개하는 권한·복귀·전달 세션 계약            |
| `completionNotifications.ts` | 웹 완료 목록 병합, 중복 방지, 표시·정리 순서 관리 |
| `browserNotifications.ts`    | 브라우저 권한·알림 API와 알림용 서비스 워커 연결  |
| `scheduledNotifications.ts`  | iOS 예약 조회·복원과 전달 세션 관리               |
| `syncNotifications.ts`       | 타이머 ID별 예약·취소 동기화                      |
| `capacitorNotifications.ts`  | Capacitor 알림 API 호출                           |
| `nativeSubscription.ts`      | 네이티브 이벤트 구독·해제 처리                    |
| `notificationDriver.ts`      | 플랫폼 내부 API 계약과 테스트 대체 지점           |
| `alertAudio.ts`              | 기기 알림과 독립적인 앱 내부 반복 알림음          |

## 의존 방향과 유지할 규칙

앱의 `notificationRuntime` → `NotificationPort` → 웹/iOS 전달 구현 → 플랫폼 API 순서로 연결합니다. 앱은 내부 driver나 예약 알고리즘을 직접 호출하지 않고, adapter는 store를 직접 구독하지 않습니다.

- 전달 입력은 타이머·현재 시각·목록 완전성·전달 정책입니다.
- `paused`는 새 전달 보류, `off`는 기존 알림 정리까지 포함합니다.
- 목록을 읽지 못한 상태를 빈 목록으로 취급하지 않습니다.
- 권한 조회 결과는 앱의 공통 권한 경로로 반영합니다. OS 권한 요청은 사용자 확인에서만 시작합니다.
- 재연결 시 성공한 전달 기록은 유지하고 이전 비동기 작업은 무효화합니다.

웹은 앱 실행 중 완료 알림을 전달합니다. 앱 종료·실행 중단 중 정시 알림은 보장하지 않습니다. 알림용 서비스 워커는 `public/notification-sw.js`에 있으며 오프라인 캐시는 제공하지 않습니다.

`*.test.ts`는 플랫폼 호출과 전달·복구 계약을 검증합니다. 전체 정책은 [알림 권한 계획](../../../docs/notification-permissions-plan.md)을 참고하세요.
