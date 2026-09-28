import { App, type AppState } from "@capacitor/app";
import {
  type ActionPerformed,
  LocalNotifications,
} from "@capacitor/local-notifications";

import type { TimerRecord } from "@/domain/timer/timerTypes";

import { nativeSubscription } from "./nativeSubscription";
import type { ScheduledNotificationDriver } from "./notificationDriver";
import type { NotificationPermission } from "./notificationPort";

export const capacitorNotifications: ScheduledNotificationDriver = {
  unsupportedReason: "이 기기에서는 알림을 사용할 수 없어요.",
  guidance: "기기 설정 → 알림 → One Slide Timer에서 권한을 변경할 수 있어요.",
  async checkPermission() {
    return normalizePermission(
      (await LocalNotifications.checkPermissions()).display
    );
  },
  async requestPermission() {
    return normalizePermission(
      (await LocalNotifications.requestPermissions()).display
    );
  },
  async getPendingTimers() {
    const { notifications } = await LocalNotifications.getPending();
    return notifications.flatMap((item) => {
      if (!isTimerNotificationExtra(item.extra)) {
        return [];
      }
      const original = (item.extra as { endAt?: unknown }).endAt;
      if (
        typeof original === "number" &&
        Number.isFinite(original) &&
        original > 0
      ) {
        return [{ id: item.extra.timerId, endAt: original }];
      }
      const endAt =
        item.schedule?.at === undefined
          ? 0
          : new Date(item.schedule.at).getTime();
      return [{ id: item.extra.timerId, endAt, precisionMs: 1000 as const }];
    });
  },
  async sendTest(isCurrent = () => true) {
    if (!isCurrent()) {
      return;
    }
    await LocalNotifications.schedule({
      notifications: [
        {
          id: -1,
          title: "테스트 알림",
          body: "One Slide Timer의 기기 알림이에요.",
          schedule: { at: new Date(Date.now() + 1000) },
          extra: { notificationTest: true },
        },
      ],
    });
  },
  onResume(listener, onFailure) {
    return nativeSubscription<AppState>(
      (callback) => App.addListener("appStateChange", callback),
      (state) => {
        if (state.isActive) {
          listener();
        }
      },
      onFailure
    );
  },
  async scheduleTimer(timer: TimerRecord) {
    await LocalNotifications.schedule({
      notifications: [
        {
          id: toNotificationId(timer.id),
          title: "시간이 되었어요",
          body: "앱에서 완료한 타이머를 확인하세요.",
          schedule: { at: new Date(timer.endAt) },
          extra: { timerId: timer.id, endAt: timer.endAt },
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
    return nativeSubscription<ActionPerformed>(
      (callback) =>
        LocalNotifications.addListener(
          "localNotificationActionPerformed",
          callback
        ),
      (event) => {
        if (isTimerNotificationExtra(event.notification.extra)) {
          listener();
        }
      },
      onFailure
    );
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

function normalizePermission(value: string): NotificationPermission {
  return value === "granted" || value === "denied" ? value : "prompt";
}
