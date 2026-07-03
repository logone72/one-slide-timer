import { clampRangeHours } from "@/domain/timer/timerMath";
import { MAX_RANGE_HOURS } from "@/domain/timer/timerTypes";

type SettingsPanelProps = {
  rangeHours: number;
  onRangeHoursChange: (rangeHours: number) => void;
  onClose: () => void;
};

export function SettingsPanel({
  rangeHours,
  onRangeHoursChange,
  onClose,
}: SettingsPanelProps) {
  return (
    <div className="settings-panel" role="dialog" aria-label="Timer settings">
      <div className="settings-panel__header">
        <h2>Settings</h2>
        <button type="button" onClick={onClose}>
          Done
        </button>
      </div>
      <div className="stepper-row">
        <span>Range</span>
        <div className="stepper" aria-label="Timer range hours">
          <button
            type="button"
            disabled={rangeHours <= 1}
            onClick={() => {
              onRangeHoursChange(clampRangeHours(rangeHours - 1));
            }}
          >
            -
          </button>
          <strong>{rangeHours}h</strong>
          <button
            type="button"
            disabled={rangeHours >= MAX_RANGE_HOURS}
            onClick={() => {
              onRangeHoursChange(clampRangeHours(rangeHours + 1));
            }}
          >
            +
          </button>
        </div>
      </div>
    </div>
  );
}
