import type { NotificationPort } from "./notificationPort";

export const browserNotifications: NotificationPort = {
  ensurePermission: () => Promise.resolve(true),
  scheduleTimer: () => Promise.resolve(),
  cancelTimer: () => Promise.resolve(),
  onNotificationAction: () => () => undefined,
};
