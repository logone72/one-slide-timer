import { Check, Minus, Plus } from "lucide-react";

import {
  formatTimeLabel,
  rangeMinutesToMs,
  stepRangeMinutes,
} from "@/domain/timer/timerMath";
import {
  MAX_RANGE_MINUTES,
  MIN_RANGE_MINUTES,
} from "@/domain/timer/timerTypes";

export function RangeSettings({
  rangeMinutes,
  onChange,
}: {
  rangeMinutes: number;
  onChange: (minutes: number) => void;
}) {
  const hourly = rangeMinutes >= 60;
  return (
    <section className="range-card" aria-labelledby="range-title">
      <div className="range-card__heading">
        <h2 id="range-title">시간 범위</h2>
        <span>5분 — 24시간</span>
      </div>
      <p>카운트다운 레일의 가장 위쪽 시간이에요.</p>
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
      <p className="range-step-hint">1시간 미만은 5분씩, 이후에는 1시간씩</p>
      <div className="range-preview" aria-hidden="true">
        <span>0</span>
        <i />
        <span>{formatTimeLabel(rangeMinutesToMs(rangeMinutes))}</span>
      </div>
      <p className="range-note">
        <Check className="icon icon-sm" /> 진행 중인 타이머의 종료 시각은
        유지돼요.
      </p>
    </section>
  );
}
