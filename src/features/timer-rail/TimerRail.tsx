import {
  type CSSProperties,
  type JSX,
  type PointerEvent,
  useRef,
  useState,
} from "react";

import {
  durationMsToPercent,
  formatDuration,
  remainingMs,
} from "@/domain/timer/timerMath";
import type {
  AppSettings,
  TimerDraft,
  TimerRecord,
} from "@/domain/timer/timerTypes";

import { getDurationFromPointer } from "./timerRailGeometry";

type TimerRailProps = {
  timers: TimerRecord[];
  now: number;
  settings: AppSettings;
  onCreateTimer: (durationMs: number) => void;
  onDismissTimer: (timerId: string) => void;
};

const PREVIEW_COLOR = "#2563eb";

type TimerPinStyle = CSSProperties & {
  "--timer-bottom": string;
  "--timer-color": string;
};

export function TimerRail({
  timers,
  now,
  settings,
  onCreateTimer,
  onDismissTimer,
}: TimerRailProps) {
  const railRef = useRef<HTMLDivElement>(null);
  const [draft, setDraft] = useState<TimerDraft | null>(null);

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>): void => {
    const rail = railRef.current?.getBoundingClientRect();

    if (rail === undefined) {
      return;
    }

    event.currentTarget.setPointerCapture(event.pointerId);
    setDraft({
      color: PREVIEW_COLOR,
      durationMs: getDurationFromPointer(
        event.clientY,
        rail,
        settings.rangeHours
      ),
    });
  };

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>): void => {
    if (draft === null) {
      return;
    }

    const rail = railRef.current?.getBoundingClientRect();

    if (rail === undefined) {
      return;
    }

    setDraft({
      ...draft,
      durationMs: getDurationFromPointer(
        event.clientY,
        rail,
        settings.rangeHours
      ),
    });
  };

  const handlePointerUp = (): void => {
    if (draft === null) {
      return;
    }

    if (draft.durationMs > 0) {
      onCreateTimer(draft.durationMs);
    }

    setDraft(null);
  };

  return (
    <section className="timer-stage" aria-label="Countdown timer rail">
      <div
        ref={railRef}
        className="timer-rail"
        data-testid="timer-rail"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={() => {
          setDraft(null);
        }}
      >
        <button className="start-pin" type="button" aria-label="Start timer" />
        {timers.map((timer) => (
          <TimerPin
            key={timer.id}
            now={now}
            rangeHours={settings.rangeHours}
            timer={timer}
            onDismissTimer={onDismissTimer}
          />
        ))}
        <DraftPin draft={draft} rangeHours={settings.rangeHours} />
      </div>
    </section>
  );
}

function TimerPin({
  now,
  onDismissTimer,
  rangeHours,
  timer,
}: {
  now: number;
  onDismissTimer: (timerId: string) => void;
  rangeHours: number;
  timer: TimerRecord;
}): JSX.Element {
  const duration = remainingMs(timer.endAt, now);
  const bottom = durationMsToPercent(duration, rangeHours);

  return (
    <button
      className="timer-pin"
      data-testid="timer-pin"
      style={getTimerPinStyle(bottom, timer.color)}
      type="button"
      onClick={(event) => {
        event.stopPropagation();
        onDismissTimer(timer.id);
      }}
    >
      <span>{formatDuration(duration)}</span>
    </button>
  );
}

function DraftPin({
  draft,
  rangeHours,
}: {
  draft: TimerDraft | null;
  rangeHours: number;
}): JSX.Element | null {
  if (draft === null) {
    return null;
  }

  return (
    <div
      className="timer-pin timer-pin--draft"
      style={getTimerPinStyle(
        durationMsToPercent(draft.durationMs, rangeHours),
        draft.color
      )}
    >
      <span>{formatDuration(draft.durationMs)}</span>
    </div>
  );
}

function getTimerPinStyle(bottom: number, color: string): TimerPinStyle {
  return {
    "--timer-bottom": `${String(bottom)}%`,
    "--timer-color": color,
  };
}
