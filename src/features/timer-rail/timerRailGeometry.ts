import {
  clamp,
  rangeMinutesToMs,
  remainingMs,
  snapDurationMs,
  yToDurationMs,
} from "@/domain/timer/timerMath";
import type { TimerDraft, TimerRecord } from "@/domain/timer/timerTypes";

export type RailGesture = TimerDraft & {
  timerId: string | null;
  pointerId: number;
  startY: number;
  startDuration: number;
  moved: boolean;
};
export function getGestureDuration(
  gesture: RailGesture,
  clientY: number,
  rail: Pick<DOMRect, "top" | "bottom" | "height">,
  rangeMinutes: number
): number {
  if (gesture.timerId === null) {
    return yToDurationMs(clientY, rail.top, rail.height, rangeMinutes);
  }
  if (clientY >= rail.bottom) {
    return 0;
  }
  const change =
    ((gesture.startY - clientY) / rail.height) * rangeMinutesToMs(rangeMinutes);
  return snapDurationMs(
    clamp(gesture.startDuration + change, 0, rangeMinutesToMs(rangeMinutes))
  );
}

export function createGesture(
  timer: TimerRecord | undefined,
  color: string,
  now: number
): RailGesture {
  const durationMs = timer === undefined ? 0 : remainingMs(timer.endAt, now);
  return {
    timerId: timer?.id ?? null,
    pointerId: -1,
    startY: 0,
    startDuration: durationMs,
    durationMs,
    color: timer?.color ?? color,
    moved: false,
  };
}
