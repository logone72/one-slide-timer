import type { TimerRecord } from "@/domain/timer/timerTypes";

export type NotificationPort = {
  ensurePermission: () => Promise<boolean>;
  scheduleTimer: (timer: TimerRecord) => Promise<void>;
  cancelTimer: (timerId: string) => Promise<void>;
  onNotificationAction: (
    listener: () => void,
    onFailure: () => void
  ) => () => void;
};
