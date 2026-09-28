import type { TimerRecord } from "@/domain/timer/timerTypes";

export type NotificationPermission =
  "unsupported" | "prompt" | "granted" | "denied";

/** store에서 계산한 최신 입력. adapter는 타이머 원본이나 권한 상태를 변경하지 않는다. */
export type NotificationSnapshot = {
  timers: TimerRecord[];
  now: number;
  // false는 빈 저장소가 아니라 아직 전체 목록을 알 수 없다는 뜻이다.
  timersComplete: boolean;
  // paused는 새 전달 보류, off는 기존 알림까지 정리하라는 명시적 사용자 선택이다.
  mode: "enabled" | "paused" | "off";
};
export type NotificationDelivery = {
  // 같은 인스턴스의 재연결에서도 전달 기록은 유지하고 오래된 비동기 작업은 무효화한다.
  start: (snapshot: NotificationSnapshot) => () => void;
  update: (snapshot: NotificationSnapshot) => void;
  refresh: () => Promise<void>;
  sendTest: () => Promise<"requested" | "skipped">;
};
export type DeliveryContext = {
  now: () => number;
  // OS 요청은 하지 않는다. 최신 권한 조회·store 반영은 공통 권한 경로 하나를 사용한다.
  confirmPermission: () => Promise<boolean>;
  onFailure: () => void;
};
export type NotificationAccess = {
  guidance: string;
  unsupportedReason: string;
  checkPermission: () => Promise<NotificationPermission>;
  requestPermission: () => Promise<NotificationPermission>;
};
export type NotificationPort = NotificationAccess & {
  onRefresh: (listener: () => void, onFailure: () => void) => () => void;
  createDelivery: (context: DeliveryContext) => NotificationDelivery;
};
