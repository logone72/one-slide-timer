import { type CSSProperties, useEffect, useRef, useState } from "react";

import {
  clamp,
  formatTimeLabel,
  rangeMinutesToMs,
  remainingMs,
  snapDurationMs,
} from "@/domain/timer/timerMath";
import { TIMER_STEP_MS, type TimerRecord } from "@/domain/timer/timerTypes";

function AdjustmentForm({
  timer,
  rangeMinutes,
  onApply,
  onClose,
}: {
  timer: TimerRecord | undefined;
  rangeMinutes: number;
  onApply: (duration: number) => void;
  onClose: () => void;
}) {
  const max = rangeMinutesToMs(rangeMinutes);
  const [duration, setDuration] = useState(() =>
    clamp(
      snapDurationMs(
        timer === undefined ? 60_000 : remainingMs(timer.endAt, Date.now())
      ),
      TIMER_STEP_MS,
      max
    )
  );
  const change = (delta: number): void =>
    setDuration((value) => clamp(value + delta, TIMER_STEP_MS, max));
  const ref = useRef<HTMLDialogElement>(null);
  const timerId = timer?.id;
  useEffect(() => {
    const dialog = ref.current;
    const selector =
      timerId === undefined
        ? ".start-pin"
        : `.timer-pin[data-timer-id="${CSS.escape(timerId)}"]`;
    dialog?.showModal();
    return () => {
      dialog?.close();
      (
        document.querySelector<HTMLElement>(selector) ??
        document.querySelector<HTMLElement>(".start-pin")
      )?.focus();
    };
  }, [timerId]);
  return (
    <dialog
      className="timer-adjustment"
      ref={ref}
      aria-labelledby="adjust-title"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
    >
      <h2 id="adjust-title">
        {timer === undefined ? "새 타이머" : "타이머 시간 조정"}
      </h2>
      <output aria-live="polite">{formatTimeLabel(duration)}</output>
      <input
        className="range-slider"
        style={
          {
            "--range-progress": `${String(((duration - TIMER_STEP_MS) / (max - TIMER_STEP_MS)) * 100)}%`,
          } as CSSProperties
        }
        type="range"
        min={TIMER_STEP_MS}
        max={max}
        step={TIMER_STEP_MS}
        value={duration}
        aria-label="타이머 시간"
        aria-valuetext={formatTimeLabel(duration)}
        onChange={(event) => setDuration(Number(event.currentTarget.value))}
      />
      <div className="adjustment-steps">
        <button
          type="button"
          disabled={duration <= TIMER_STEP_MS}
          onClick={() => change(-TIMER_STEP_MS)}
        >
          10초 줄이기
        </button>
        <button
          type="button"
          disabled={duration >= max}
          onClick={() => change(TIMER_STEP_MS)}
        >
          10초 늘리기
        </button>
      </div>
      <button
        className="primary-button"
        type="button"
        onClick={() => onApply(duration)}
      >
        {timer === undefined ? "시작" : "적용"}
      </button>
      <button className="adjustment-cancel" type="button" onClick={onClose}>
        취소
      </button>
    </dialog>
  );
}

export function TimerAdjustment({
  timerId,
  timers,
  ...props
}: {
  timerId: string | null;
  timers: TimerRecord[];
  rangeMinutes: number;
  onApply: (duration: number) => void;
  onClose: () => void;
}) {
  const timer = timers.find((item) => item.id === timerId);
  if (timerId === null || (timerId !== "new" && timer === undefined)) {
    return null;
  }
  return <AdjustmentForm key={timerId} timer={timer} {...props} />;
}
