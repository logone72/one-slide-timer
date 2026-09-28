import type { TimerRecord } from "@/domain/timer/timerTypes";

export type NotificationPermission =
  "unsupported" | "prompt" | "granted" | "denied";
export type PendingTimerNotification = {
  id: string;
  endAt: number;
  // 이전 iOS 예약은 조회 결과에서 밀리초가 생략된다.
  precisionMs?: 1000;
};
export type NotificationPort = {
  checkPermission: () => Promise<NotificationPermission>;
  requestPermission: () => Promise<NotificationPermission>;
  scheduleTimer: (timer: TimerRecord) => Promise<void>;
  cancelTimer: (timerId: string) => Promise<void>;
  getPendingTimers: () => Promise<PendingTimerNotification[]>;
  sendTest: () => Promise<void>;
  onResume: (listener: () => void, onFailure: () => void) => () => void;
  onNotificationAction: (
    listener: () => void,
    onFailure: () => void
  ) => () => void;
};
