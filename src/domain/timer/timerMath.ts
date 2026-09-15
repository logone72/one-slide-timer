import {
  DEFAULT_RANGE_MINUTES,
  MAX_RANGE_MINUTES,
  MIN_RANGE_MINUTES,
  TIMER_STEP_MS,
} from "./timerTypes";

const MINUTE_MS = 60 * 1_000;

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function clampRangeMinutes(minutes: number): number {
  if (!Number.isFinite(minutes)) {
    return DEFAULT_RANGE_MINUTES;
  }
  const step = minutes < 60 ? MIN_RANGE_MINUTES : 60;
  return clamp(
    Math.round(minutes / step) * step,
    MIN_RANGE_MINUTES,
    MAX_RANGE_MINUTES
  );
}

export function stepRangeMinutes(minutes: number, direction: -1 | 1): number {
  const current = clampRangeMinutes(minutes);
  const hourly = direction === 1 ? current >= 60 : current > 60;
  return clampRangeMinutes(
    current + direction * (hourly ? 60 : MIN_RANGE_MINUTES)
  );
}

export function rangeMinutesToMs(minutes: number): number {
  return clampRangeMinutes(minutes) * MINUTE_MS;
}

export function formatTimeLabel(durationMs: number): string {
  const total = Math.round(durationMs / 1_000);
  const units = [
    [Math.floor(total / 3_600), "시간"],
    [Math.floor(total / 60) % 60, "분"],
    [total % 60, "초"],
  ] as const;
  const label = units
    .filter(([value]) => value > 0)
    .map(([value, unit]) => `${String(value)}${unit}`)
    .join(" ");
  return label.length > 0 ? label : "0";
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
  rangeMinutes: number
): number {
  const ratio = clamp((railTop + railHeight - clientY) / railHeight, 0, 1);
  return snapDurationMs(ratio * rangeMinutesToMs(rangeMinutes));
}

export function durationMsToPercent(
  durationMs: number,
  rangeMinutes: number
): number {
  return clamp((durationMs / rangeMinutesToMs(rangeMinutes)) * 100, 0, 100);
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

export function formatClock(durationMs: number): string {
  const total = Math.ceil(durationMs / 1_000);
  const seconds = String(total % 60).padStart(2, "0");
  const minutes = String(Math.floor(total / 60) % 60).padStart(2, "0");
  const hours = Math.floor(total / 3_600);
  return hours > 0
    ? `${String(hours)}:${minutes}:${seconds}`
    : `${minutes}:${seconds}`;
}
