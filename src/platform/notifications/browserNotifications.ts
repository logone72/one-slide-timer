import type { NotificationPort } from "./notificationPort";

export const browserNotifications: NotificationPort = {
  checkPermission: () => Promise.resolve("unsupported"),
  requestPermission: () => Promise.resolve("unsupported"),
  scheduleTimer: () => Promise.resolve(),
  cancelTimer: () => Promise.resolve(),
  getPendingTimers: () => Promise.resolve([]),
  sendTest: () => Promise.resolve(),
  onNotificationAction: () => () => undefined,
  onResume: (listener) => {
    const visible = (): void => {
      if (document.visibilityState === "visible") {
        listener();
      }
    };
    window.addEventListener("focus", listener);
    document.addEventListener("visibilitychange", visible);
    return () => {
      window.removeEventListener("focus", listener);
      document.removeEventListener("visibilitychange", visible);
    };
  },
};
