import { selectNotificationsEnabled } from "@/app/state/notificationState";
import { useAppActions, useAppStore } from "@/app/useAppState";

import { AudioSettings } from "./AudioSettings";
import { ToggleSwitch } from "./ToggleSwitch";

export function NotificationSettings() {
  const notification = useAppStore((state) => state.notifications);
  const enabled = useAppStore(selectNotificationsEnabled);
  const actions = useAppActions();
  return (
    <section
      className="notification-settings"
      aria-labelledby="notification-title"
    >
      <h2 id="notification-title">알림</h2>
      <NotificationChoices />
      {notification.guidance !== "" && <p>{notification.guidance}</p>}
      {enabled && (
        <div className="notification-buttons">
          <button
            className="secondary-button"
            type="button"
            onClick={actions.sendTestNotification}
          >
            테스트 알림 보내기
          </button>
        </div>
      )}
      {notification.failed && (
        <p role="status">
          기기 알림을 처리하지 못했어요. 토글을 켜서 다시 시도해 주세요.
        </p>
      )}
      <p role="status">{notification.message}</p>
      <AudioSettings />
    </section>
  );
}

export function NotificationChoices() {
  const notification = useAppStore((state) => state.notifications);
  const enabled = useAppStore(selectNotificationsEnabled);
  const actions = useAppActions();
  const busy = ["checking", "requesting"].includes(notification.phase);
  const unsupported = notification.permission === "unsupported";
  return (
    <ToggleSwitch
      label="기기 알림"
      checked={enabled}
      disabled={busy || unsupported}
      onChange={(next) => {
        if (next) {
          void actions.requestNotifications();
        } else {
          actions.disableNotifications();
        }
      }}
    />
  );
}
