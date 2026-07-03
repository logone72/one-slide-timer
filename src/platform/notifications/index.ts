import { isCapacitorNative } from "@/platform/environment";

import { browserNotifications } from "./browserNotifications";
import { capacitorNotifications } from "./capacitorNotifications";
import type { NotificationPort } from "./notificationPort";

export function getNotificationPort(): NotificationPort {
  if (isCapacitorNative()) {
    return capacitorNotifications;
  }

  return browserNotifications;
}
