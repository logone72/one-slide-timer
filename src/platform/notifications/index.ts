import { isCapacitorNative } from "@/platform/environment";

import { createBrowserNotifications } from "./browserNotifications";
import { capacitorNotifications } from "./capacitorNotifications";
import type { NotificationPort } from "./notificationPort";
import { createScheduledNotifications } from "./scheduledNotifications";

export function getNotificationPort(): NotificationPort {
  if (isCapacitorNative()) {
    return createScheduledNotifications(capacitorNotifications);
  }

  return createBrowserNotifications();
}
