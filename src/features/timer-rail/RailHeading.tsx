import { selectRunningTimers } from "@/app/state/timerState";
import { useAppStore } from "@/app/useAppState";
import { formatTimeLabel, rangeMinutesToMs } from "@/domain/timer/timerMath";

export function RailHeading() {
  const count = useAppStore((state) => selectRunningTimers(state).length);
  const range = useAppStore((state) => state.settings.rangeMinutes);
  return (
    <div className="rail-heading">
      <span
        className={`activity-status${count > 0 ? " activity-status--running" : ""}`}
      >
        <i />
        {count > 0 ? `${String(count)}개 진행 중` : "진행 중인 타이머 없음"}
      </span>
      <span>0 — {formatTimeLabel(rangeMinutesToMs(range))}</span>
    </div>
  );
}
