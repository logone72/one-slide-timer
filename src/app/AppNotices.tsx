import { StatusNotice } from "@/features/settings/StatusNotice";

import type { useSettings } from "./useSettings";
import type { useTimers } from "./useTimers";
export function AppNotices({
  settingsStore,
  timers,
}: {
  settingsStore: ReturnType<typeof useSettings>;
  timers: ReturnType<typeof useTimers>;
}) {
  return (
    <>
      {settingsStore.failed && (
        <StatusNotice
          message="설정을 저장하지 못했어요. 재시도 전까지 이 화면에서만 유지돼요."
          action="저장 재시도"
          onAction={settingsStore.retry}
        />
      )}
      {timers.storageFailed && (
        <StatusNotice
          message="타이머 저장소에 접근하지 못했어요. 현재 타이머는 계속 동작해요."
          action="타이머 저장 재시도"
          onAction={timers.retryStorage}
        />
      )}
      {timers.failed && (
        <StatusNotice
          message="기기 알림을 처리하지 못했어요. 앱을 열어두고 알림음을 켜주세요."
          action="알림 다시 시도"
          onAction={timers.retryNotifications}
        />
      )}
      {!timers.audioReady &&
        timers.runningTimers.length + timers.completedTimers.length > 0 && (
          <StatusNotice
            message="소리 알림을 사용하려면 알림음을 켜주세요."
            action="알림음 켜기"
            onAction={timers.enableAudio}
          />
        )}
    </>
  );
}
