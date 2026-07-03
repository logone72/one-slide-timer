import type { TimerRecord } from "@/domain/timer/timerTypes";

export type NotificationAction = {
  type: "acknowledge";
  timerId: string;
};

export type NotificationPort = {
  ensurePermission: () => Promise<boolean>;
  scheduleTimer: (timer: TimerRecord) => Promise<void>;
  cancelTimer: (timerId: string) => Promise<void>;
  startRepeatingAlert: () => void;
  stopRepeatingAlert: () => void;
  onNotificationAction: (
    listener: (action: NotificationAction) => void
  ) => () => void;
};
