import { selectNotificationsEnabled } from "@/app/state/notificationState";
import { useAppActions, useAppStore } from "@/app/useAppState";

export function NotificationSettings() {
  const notification = useAppStore((state) => state.notifications);
  const enabled = useAppStore(selectNotificationsEnabled);
  const actions = useAppActions();
  const busy = ["checking", "requesting"].includes(notification.phase);
  const unsupported = notification.permission === "unsupported";
  return (
    <section
      className="notification-settings"
      aria-labelledby="notification-title"
    >
      <h2 id="notification-title">알림</h2>
      <NotificationChoices />
      <p id="notification-status" role="status">
        {permissionLabel(notification.permission, notification.phase)}
      </p>
      {notification.permission === "denied" && (
        <p>
          기기 설정 → 알림 → One Slide Timer에서 알림을 허용한 뒤 다시 확인해
          주세요.
        </p>
      )}
      {!unsupported && (
        <div className="notification-buttons">
          <button
            className="secondary-button"
            type="button"
            disabled={busy}
            onClick={actions.refreshNotificationPermission}
          >
            다시 확인
          </button>
          <button
            className="secondary-button"
            type="button"
            disabled={!enabled || busy}
            onClick={actions.sendTestNotification}
          >
            테스트 알림 보내기
          </button>
        </div>
      )}
      {notification.failed && (
        <p role="status">
          {enabled
            ? "기기 알림을 처리하지 못했어요."
            : "일부 예약 알림을 취소하지 못했어요."}{" "}
          알림 다시 시도로 확인해 주세요.
        </p>
      )}
      <p role="status">{notification.message}</p>
      <div className="notification-audio">
        <h3>앱 내부 알림음</h3>
        <p role="status">
          {notification.audioReady
            ? "활성화됨"
            : "사용하려면 알림음을 켜주세요."}
        </p>
        <div className="notification-buttons">
          {!notification.audioReady && (
            <button
              className="secondary-button"
              type="button"
              onClick={actions.enableAudio}
            >
              알림음 켜기
            </button>
          )}
          <button
            className="secondary-button"
            type="button"
            onClick={actions.testAudio}
          >
            소리 테스트
          </button>
        </div>
      </div>
    </section>
  );
}

function NotificationChoices() {
  const notification = useAppStore((state) => state.notifications);
  const enabled = useAppStore(selectNotificationsEnabled);
  const actions = useAppActions();
  const busy = ["checking", "requesting"].includes(notification.phase);
  const unknown =
    notification.permission === null || notification.phase === "error";
  const unsupported = notification.permission === "unsupported";
  return (
    <fieldset aria-describedby="notification-status">
      <legend>기기 알림 사용</legend>
      <div className="notification-options">
        <label>
          <input
            type="radio"
            name="notifications"
            checked={!busy && enabled}
            disabled={busy || unknown || unsupported}
            onChange={actions.requestNotifications}
          />{" "}
          O 사용
        </label>
        <label>
          <input
            type="radio"
            name="notifications"
            checked={!busy && !unknown && !enabled}
            disabled={busy}
            onChange={actions.disableNotifications}
          />{" "}
          X 사용 안 함
        </label>
      </div>
    </fieldset>
  );
}

function permissionLabel(permission: string | null, phase: string): string {
  if (phase === "checking") {
    return "기기 권한: 확인 중";
  }
  if (phase === "requesting") {
    return "기기 권한: 요청 중";
  }
  if (phase === "error") {
    return "권한을 확인하지 못했어요. 다시 확인해 주세요.";
  }
  switch (permission) {
    case "unsupported":
      return "현재 웹 버전에서는 기기 알림을 제공하지 않아요. 앱 내부 알림음은 사용할 수 있어요.";
    case "granted":
      return "기기 권한: 허용됨";
    case "denied":
      return "기기 권한: 차단됨";
    case null:
      return "기기 권한: 확인 전";
    default:
      return "기기 권한: 아직 허용하지 않음";
  }
}
