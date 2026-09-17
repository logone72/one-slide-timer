import { Minus, Plus } from "lucide-react";
import type { CSSProperties } from "react";

import {
  formatTimeLabel,
  rangeMinutesToMs,
  stepRangeMinutes,
} from "@/domain/timer/timerMath";
import {
  MAX_RANGE_MINUTES,
  MIN_RANGE_MINUTES,
  RANGE_MINUTE_OPTIONS,
} from "@/domain/timer/timerTypes";

export function RangeSettings({
  rangeMinutes,
  onChange,
}: {
  rangeMinutes: number;
  onChange: (minutes: number) => void;
}) {
  const hourly = rangeMinutes >= 60;
  const rangeIndex = RANGE_MINUTE_OPTIONS.indexOf(rangeMinutes);
  return (
    <section className="range-card" aria-labelledby="range-title">
      <div className="range-card__heading">
        <h2 id="range-title">시간 범위</h2>
        <span>
          {formatTimeLabel(rangeMinutesToMs(MIN_RANGE_MINUTES))} —{" "}
          {formatTimeLabel(rangeMinutesToMs(MAX_RANGE_MINUTES))}
        </span>
      </div>
      <p>시간 레일의 가장 위쪽에 표시할 시간이에요.</p>
      <div className="range-stepper" aria-label="시간 범위 조정">
        <button
          className="icon-button"
          type="button"
          aria-label="시간 범위 줄이기"
          disabled={rangeMinutes <= MIN_RANGE_MINUTES}
          onClick={() => onChange(stepRangeMinutes(rangeMinutes, -1))}
        >
          <Minus className="icon icon-lg" />
        </button>
        <output aria-live="polite" aria-label="현재 시간 범위">
          <strong key={rangeMinutes}>
            {hourly ? rangeMinutes / 60 : rangeMinutes}
          </strong>
          <span>{hourly ? "시간" : "분"}</span>
        </output>
        <button
          className="icon-button"
          type="button"
          aria-label="시간 범위 늘리기"
          disabled={rangeMinutes >= MAX_RANGE_MINUTES}
          onClick={() => onChange(stepRangeMinutes(rangeMinutes, 1))}
        >
          <Plus className="icon icon-lg" />
        </button>
      </div>
      <input
        className="range-slider"
        type="range"
        min={0}
        max={RANGE_MINUTE_OPTIONS.length - 1}
        step={1}
        value={rangeIndex}
        style={
          {
            "--range-progress": `${String((rangeIndex / (RANGE_MINUTE_OPTIONS.length - 1)) * 100)}%`,
          } as CSSProperties
        }
        aria-label="시간 범위 슬라이더"
        aria-valuetext={formatTimeLabel(rangeMinutesToMs(rangeMinutes))}
        aria-describedby="range-step-hint"
        onChange={(event) =>
          onChange(
            RANGE_MINUTE_OPTIONS[Number(event.currentTarget.value)] ??
              rangeMinutes
          )
        }
      />
      <p className="range-step-hint" id="range-step-hint">
        1시간 미만은 5분씩, 이후에는 1시간씩
      </p>
      <p className="range-note">진행 중인 타이머의 종료 시각은 유지돼요.</p>
    </section>
  );
}
