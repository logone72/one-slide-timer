import { StatusNotice } from "@/features/settings/StatusNotice";

import { storageFailed } from "./state/storageState";
import { useAppActions, useAppStore } from "./useAppState";
export function AppNotices() {
  const settingsFailed = useAppStore((state) =>
    storageFailed(state.settingsStorage)
  );
  const timersFailed = useAppStore((state) =>
    storageFailed(state.timerStorage)
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
    </>
  );
}
