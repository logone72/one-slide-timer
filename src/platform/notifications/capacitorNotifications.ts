import { LocalNotifications } from "@capacitor/local-notifications";

import type { TimerRecord } from "@/domain/timer/timerTypes";

import type { NotificationPort } from "./notificationPort";

export const capacitorNotifications: NotificationPort = {
  async ensurePermission() {
    const current = await LocalNotifications.checkPermissions();

    if (current.display === "granted") {
      return true;
    }

    if (current.display === "denied") {
      return false;
    }
    const requested = await LocalNotifications.requestPermissions();
    return requested.display === "granted";
  },
  async scheduleTimer(timer: TimerRecord) {
    await LocalNotifications.schedule({
      notifications: [
        {
          id: toNotificationId(timer.id),
          title: "시간이 되었어요",
          body: "앱에서 완료한 타이머를 확인하세요.",
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
  onNotificationAction(listener, onFailure) {
    let disposed = false;
    let remove: (() => Promise<void>) | undefined;
    void LocalNotifications.addListener(
      "localNotificationActionPerformed",
      (event) => {
        if (!disposed && isTimerNotificationExtra(event.notification.extra)) {
          listener();
        }
      }
    )
      .then((handle) => {
        if (disposed) {
          void handle.remove().catch(onFailure);
        } else {
          remove = () => handle.remove();
        }
      })
      .catch(() => {
        if (!disposed) {
          onFailure();
        }
      });
    return () => {
      disposed = true;
      void remove?.().catch(onFailure);
      remove = undefined;
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
