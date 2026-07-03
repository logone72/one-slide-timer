import { LocalNotifications } from "@capacitor/local-notifications";

import type { TimerRecord } from "@/domain/timer/timerTypes";

import { browserNotifications } from "./browserNotifications";
import type { NotificationAction, NotificationPort } from "./notificationPort";

const listeners = new Set<(action: NotificationAction) => void>();

export const capacitorNotifications: NotificationPort = {
  async ensurePermission() {
    const current = await LocalNotifications.checkPermissions();

    if (current.display === "granted") {
      return true;
    }

    const requested = await LocalNotifications.requestPermissions();
    return requested.display === "granted";
  },
  async scheduleTimer(timer: TimerRecord) {
    await LocalNotifications.schedule({
      notifications: [
        {
          id: toNotificationId(timer.id),
          title: "Timer complete",
          body: "A timer has finished.",
          schedule: { at: new Date(timer.endAt) },
          extra: { timerId: timer.id },
        },
      ],
    });
  },
  async cancelTimer(timerId: string) {
    await LocalNotifications.cancel({
      notifications: [{ id: toNotificationId(timerId) }],
    });
  },
  startRepeatingAlert: browserNotifications.startRepeatingAlert,
  stopRepeatingAlert: browserNotifications.stopRepeatingAlert,
  onNotificationAction(listener) {
    listeners.add(listener);

    const subscriptionPromise = LocalNotifications.addListener(
      "localNotificationActionPerformed",
      (event) => {
        const extra: unknown = event.notification.extra;

        if (!isTimerNotificationExtra(extra)) {
          return;
        }

        for (const currentListener of listeners) {
          currentListener({ type: "acknowledge", timerId: extra.timerId });
        }
      }
    );

    return () => {
      listeners.delete(listener);
      void subscriptionPromise.then((subscription) => subscription.remove());
    };
  },
};

function toNotificationId(timerId: string): number {
  let hash = 0;

  for (const char of timerId) {
    hash = (hash * 31 + char.charCodeAt(0)) | 0;
  }

  return Math.abs(hash);
}

function isTimerNotificationExtra(
  value: unknown
): value is { timerId: string } {
  return (
    Boolean(value) &&
    typeof value === "object" &&
    typeof (value as { timerId?: unknown }).timerId === "string"
  );
}
