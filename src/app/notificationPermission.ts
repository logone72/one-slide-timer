import type {
  NotificationPermission,
  NotificationPort,
} from "@/platform/notifications/notificationPort";

import type { AppStore } from "./state/appStore";

// 조회·요청 결과의 유일한 반영 경로. 예약 실행자는 이 경로의 결과만 받는다.
export function createPermissionController(
  app: AppStore,
  port: NotificationPort
) {
  let reading: Promise<NotificationPermission | null> | undefined;
  let requesting: Promise<NotificationPermission | null> | undefined;
  let revision = 0;
  let choice = 0;
  let active = false;
  const update = app.actions.updateNotifications;
  const run = (request: boolean): Promise<NotificationPermission | null> => {
    const version = ++revision;
    update({ phase: request ? "requesting" : "checking", message: "" });
    const operation = request
      ? port.requestPermission()
      : port.checkPermission();
    return operation
      .then((permission) => {
        if (active && version === revision) {
          update({ permission, phase: "idle" });
        }
        return version === revision
          ? permission
          : app.getState().notifications.permission;
      })
      .catch(() => {
        if (active && version === revision) {
          update({
            phase: "error",
            message: "권한을 확인하지 못했어요. 다시 확인해 주세요.",
          });
        }
        return null;
      });
  };
  const refresh = (): Promise<NotificationPermission | null> => {
    if (requesting !== undefined) {
      return requesting;
    }
    if (reading === undefined) {
      const operation = run(false).finally(() => {
        if (reading === operation) {
          reading = undefined;
        }
      });
      reading = operation;
    }
    return reading;
  };
  const request = (): Promise<NotificationPermission | null> => {
    if (requesting !== undefined) {
      return requesting;
    }
    update({ promptHandled: true });
    const current = app.getState().notifications;
    const selection = ++choice;
    if (current.permission === "granted" && current.phase === "idle") {
      app.actions.setNotificationPreference(true);
      return refresh();
    }
    app.actions.setNotificationPreference(false);
    // 미허용 상태의 실제 OS 요청은 이 사용자 동작에서 직접 시작한다.
    if (current.permission === "prompt") {
      reading = undefined;
    }
    const operation = current.permission === "prompt" ? run(true) : refresh();
    requesting = operation
      .then((permission) => {
        if (active && selection === choice && permission === "granted") {
          app.actions.setNotificationPreference(true);
        }
        return permission;
      })
      .finally(() => {
        requesting = undefined;
      });
    return requesting;
  };
  return {
    refresh,
    request,
    disable: (): void => {
      choice++;
      app.actions.setNotificationPreference(false);
      update({ promptHandled: true });
    },
    defer: (): void => update({ promptHandled: true }),
    activate: (): void => {
      active = true;
    },
    deactivate: (): void => {
      active = false;
    },
  };
}
