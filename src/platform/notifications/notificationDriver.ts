import type { TimerRecord } from "@/domain/timer/timerTypes";

import type { NotificationAccess } from "./notificationPort";

// 외부 SDK를 대체하는 내부 seam. 앱 실행 계층에는 이 실행 순서와 형식을 노출하지 않는다.
export type PendingTimerNotification = {
  id: string;
  endAt: number;
  // 이전 iOS 예약은 조회 결과에서 밀리초가 생략된다.
  precisionMs?: 1000;
};
type NotificationDriver = NotificationAccess & {
  sendTest: (isCurrent?: () => boolean) => Promise<void>;
  onResume: (listener: () => void, onFailure: () => void) => () => void;
};
export type ScheduledNotificationDriver = NotificationDriver & {
  onNotificationAction: (
    listener: () => void,
    onFailure: () => void
  ) => () => void;

  scheduleTimer: (timer: TimerRecord) => Promise<void>;
  cancelTimer: (timerId: string) => Promise<void>;
  getPendingTimers: () => Promise<PendingTimerNotification[]>;
};
export type CompletionNotificationDriver = NotificationDriver & {
  showCompleted: (
    timers: TimerRecord[],
    isCurrent: () => boolean
  ) => Promise<void>;
  clearCompleted: (isCurrent: () => boolean) => Promise<void>;
};
