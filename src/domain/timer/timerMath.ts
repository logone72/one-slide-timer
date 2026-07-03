import { MAX_RANGE_HOURS, TIMER_STEP_MS } from "./timerTypes";

const HOUR_MS = 60 * 60 * 1_000;

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function clampRangeHours(hours: number): number {
  return clamp(Math.trunc(hours), 1, MAX_RANGE_HOURS);
}

export function rangeHoursToMs(hours: number): number {
  return clampRangeHours(hours) * HOUR_MS;
}

export function snapDurationMs(durationMs: number): number {
  return Math.round(durationMs / TIMER_STEP_MS) * TIMER_STEP_MS;
}

export function remainingMs(endAt: number, now: number): number {
  return Math.max(0, endAt - now);
}

export function yToDurationMs(
  clientY: number,
  railTop: number,
  railHeight: number,
  rangeHours: number
): number {
  const ratio = clamp((railTop + railHeight - clientY) / railHeight, 0, 1);
  return snapDurationMs(ratio * rangeHoursToMs(rangeHours));
}

export function durationMsToPercent(
  durationMs: number,
  rangeHours: number
): number {
  return clamp((durationMs / rangeHoursToMs(rangeHours)) * 100, 0, 100);
}

export function formatDuration(durationMs: number): string {
  const totalSeconds = Math.ceil(durationMs / 1_000);
  const hours = Math.floor(totalSeconds / 3_600);
  const minutes = Math.floor((totalSeconds % 3_600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${String(hours)}h ${String(minutes)}m`;
  }

  if (minutes > 0) {
    return `${String(minutes)}m ${seconds.toString().padStart(2, "0")}s`;
  }

  return `${String(seconds)}s`;
}
