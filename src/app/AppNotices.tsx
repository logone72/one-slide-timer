import { StatusNotice } from "@/features/settings/StatusNotice";

import { selectPermissionNotice } from "./state/notificationState";
import { storageFailed } from "./state/storageState";
import { useAppActions, useAppStore } from "./useAppState";
export function AppNotices() {
  const settingsFailed = useAppStore((state) =>
    storageFailed(state.settingsStorage)
  );
  const timersFailed = useAppStore((state) =>
    storageFailed(state.timerStorage)
  );
  const permissionNotice = useAppStore(selectPermissionNotice);
  const notificationFailed = useAppStore((state) => state.notifications.failed);
  const needsAudio = useAppStore(
    (state) => !state.notifications.audioReady && state.timers.length > 0
  );
  const actions = useAppActions();
  return (
    <>
      {settingsFailed && (
        <StatusNotice
          message="설정을 저장하지 못했어요. 재시도 전까지 이 화면에서만 유지돼요."
          action="저장 재시도"
          onAction={actions.retrySettingsStorage}
        />
      )}
      {timersFailed && (
        <StatusNotice
          message="타이머 저장소에 접근하지 못했어요. 현재 타이머는 계속 동작해요."
          action="타이머 저장 재시도"
          onAction={actions.retryTimerStorage}
        />
      )}
      {permissionNotice !== "" && (
        <StatusNotice
          message={permissionNotice}
          action="알림 설정 보기"
          onAction={actions.openSettings}
        />
      )}
      {notificationFailed && (
        <StatusNotice
          message="기기 알림을 처리하지 못했어요. 앱을 열어두고 알림음을 켜주세요."
          action="알림 다시 시도"
          onAction={actions.retryNotifications}
        />
      )}
      {needsAudio && (
        <StatusNotice
          message="소리 알림을 사용하려면 알림음을 켜주세요."
          action="알림음 켜기"
          onAction={actions.enableAudio}
        />
      )}
    </>
  );
}
