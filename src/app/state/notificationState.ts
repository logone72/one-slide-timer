import type { StoreApi } from "zustand/vanilla";

import type {
  NotificationPermission,
  NotificationSnapshot,
} from "@/platform/notifications/notificationPort";

import type { AppState } from "./appStore";

export type NotificationState = {
  guidance: string;
  unsupportedReason: string;
  permission: NotificationPermission | null;
  phase: "idle" | "checking" | "requesting" | "error";
  promptHandled: boolean;
  audioReady: boolean;
  failed: boolean;
  message: string;
};
export const initialNotificationState = (): NotificationState => ({
  guidance: "",
  unsupportedReason: "",
  permission: null,
  phase: "idle",
  promptHandled: false,
  audioReady: false,
  failed: false,
  message: "",
});
export function createNotificationActions(store: StoreApi<AppState>) {
  return {
    updateNotifications: (patch: Partial<NotificationState>): void =>
      store.setState((state) => ({
        notifications: { ...state.notifications, ...patch },
      })),
  };
}
export const selectNotificationsPermitted = (state: AppState): boolean =>
  state.notifications.permission === "granted" &&
  state.settings.notificationPreference !== false &&
  (state.settingsStorage.read === "ready" ||
    state.editedSettings.notificationPreference === true);
export const selectNotificationsEnabled = (state: AppState): boolean =>
  state.notifications.phase === "idle" && selectNotificationsPermitted(state);
export const selectShouldPrompt = (state: AppState): boolean =>
  state.notifications.permission === "prompt" &&
  state.notifications.phase === "idle" &&
  !state.notifications.promptHandled &&
  state.settings.notificationPreference !== false &&
  state.settingsStorage.read === "ready";

export function selectPermissionNotice(state: AppState): string {
  if (state.settingsOpen) {
    return "";
  }
  const { phase, permission, promptHandled } = state.notifications;
  if (phase === "error") {
    return "기기 알림 권한을 확인하지 못했어요. 알림 설정에서 다시 확인해 주세요.";
  }
  if (phase !== "idle") {
    return "";
  }
  if (permission === "denied") {
    return "기기 알림 권한이 차단되어 있어요. 알림 설정에서 허용 방법을 확인해 주세요.";
  }
  if (
    permission === "prompt" &&
    promptHandled &&
    state.settings.notificationPreference === false
  ) {
    return "기기 알림 권한을 허용하지 않았어요. 알림 설정에서 다시 시도해 주세요.";
  }
  return "";
}

// UI에서 O/X가 잠시 미확정이어도 명시적인 X로 바꾸지 않는다. 조회 중에는 마지막으로
// 확인된 권한을 유지하며, 새 OS 예약 직전의 재확인은 공통 권한 경로를 다시 거친다.
export function selectDeliverySnapshot(state: AppState): NotificationSnapshot {
  let mode: NotificationSnapshot["mode"] = "paused";
  if (state.settings.notificationPreference === false) {
    mode = "off";
  } else if (
    selectNotificationsPermitted(state) &&
    state.notifications.phase !== "error"
  ) {
    mode = "enabled";
  }
  return {
    timers: state.timers,
    now: state.now,
    timersComplete: state.timerStorage.read === "ready",
    mode,
  };
}
