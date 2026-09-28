import type { StoreApi } from "zustand/vanilla";

import type { NotificationPermission } from "@/platform/notifications/notificationPort";

import type { AppState } from "./appStore";

export type NotificationState = {
  permission: NotificationPermission | null;
  phase: "idle" | "checking" | "requesting" | "error";
  promptHandled: boolean;
  audioReady: boolean;
  failed: boolean;
  message: string;
};
export const initialNotificationState = (): NotificationState => ({
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
export const selectNotificationsEnabled = (state: AppState): boolean =>
  state.notifications.permission === "granted" &&
  state.notifications.phase === "idle" &&
  state.settings.notificationPreference !== false &&
  (state.settingsStorage.read === "ready" ||
    state.editedSettings.notificationPreference === true);
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
