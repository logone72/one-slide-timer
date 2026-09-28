import { selectAudioEnabled } from "@/app/state/notificationState";
import { useAppActions, useAppStore } from "@/app/useAppState";

import { ToggleSwitch } from "./ToggleSwitch";

export function AudioSettings() {
  const active = useAppStore(selectAudioEnabled);
  const actions = useAppActions();
  return (
    <div className="notification-audio">
      <AudioToggle describedBy="audio-description" />
      <p id="audio-description">
        앱이 실행 중일 때 완료한 타이머를 확인할 때까지 소리를 반복해요. 기기
        알림의 소리는 기기 설정을 따라요.
      </p>
      {active && (
        <div className="notification-buttons">
          <button
            className="secondary-button"
            type="button"
            onClick={actions.testAudio}
          >
            소리 테스트
          </button>
        </div>
      )}
    </div>
  );
}

export function AudioToggle({ describedBy }: { describedBy?: string }) {
  const active = useAppStore(selectAudioEnabled);
  const actions = useAppActions();
  return (
    <ToggleSwitch
      label="알림음"
      checked={active}
      describedBy={describedBy}
      onChange={(next) => {
        if (next) {
          actions.enableAudio();
        } else {
          actions.disableAudio();
        }
      }}
    />
  );
}
