import { GripVertical, Square, X } from "lucide-react";
import type { CSSProperties } from "react";

import {
  formatClock,
  formatDuration,
  remainingMs,
} from "@/domain/timer/timerMath";
import type { TimerRecord } from "@/domain/timer/timerTypes";

import { type TimerMotion, useTimerMotion } from "./useTimerMotion";

export function TimerPin({
  timer,
  now,
  motion,
  selected,
  editing,
  onSelect,
  onDismiss,
  onClose,
}: {
  timer: TimerRecord;
  now: number;
  motion: TimerMotion | undefined;
  selected: boolean;
  editing: boolean;
  onSelect: () => void;
  onDismiss: () => void;
  onClose: () => void;
}) {
  const duration = remainingMs(timer.endAt, now);
  const ref = useTimerMotion({ motion, now, endAt: timer.endAt, editing });
  return (
    <div
      className={`timer-item${selected ? " timer-item--selected" : ""}`}
      ref={ref}
      style={{ "--timer-color": timer.color } as CSSProperties}
      data-editing={editing}
    >
      <div className="timer-connector" aria-hidden="true" />
      <button
        className="timer-dot"
        type="button"
        data-timer-id={timer.id}
        aria-label={`남은 시간 ${formatDuration(duration)}, 타이머 조정`}
        aria-describedby="gesture-help"
        onClick={(event) => {
          if (event.detail === 0) {
            onSelect();
          }
        }}
      >
        <span />
      </button>
      <div className="timer-label">
        <button
          className="timer-pin"
          data-testid="timer-pin"
          data-timer-id={timer.id}
          type="button"
          aria-label={`남은 시간 ${formatDuration(duration)}, 타이머 조정`}
          aria-expanded={selected}
          aria-describedby="gesture-help"
          onClick={(event) => {
            if (event.detail === 0) {
              onSelect();
            }
          }}
        >
          <span className="timer-pin__time">{formatClock(duration)}</span>
          <span className="timer-pin__detail">
            <i /> 진행 중 <span>· {formatEndTime(timer.endAt)} 종료</span>
          </span>
          <GripVertical
            className="icon icon-sm timer-pin__grip"
            aria-hidden="true"
          />
        </button>
        {selected && (
          <div className="timer-actions">
            <button type="button" onClick={onDismiss}>
              <Square fill="currentColor" className="icon icon-xs" /> 조기 종료
            </button>
            <button
              type="button"
              aria-label="타이머 액션 닫기"
              onClick={onClose}
            >
              <X className="icon icon-sm" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function formatEndTime(endAt: number): string {
  return new Date(endAt).toLocaleTimeString("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}
