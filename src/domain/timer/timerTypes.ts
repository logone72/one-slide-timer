export const TIMER_STEP_MS = 10_000;
export const DEFAULT_RANGE_HOURS = 1;
export const MAX_RANGE_HOURS = 24;

export type TimerStatus = "running" | "alerting" | "dismissed";

export type TimerRecord = {
  id: string;
  color: string;
  createdAt: number;
  endAt: number;
  status: TimerStatus;
};

export type TimerDraft = {
  durationMs: number;
  color: string;
};

export type AppSettings = {
  rangeHours: number;
};

export const DEFAULT_SETTINGS: AppSettings = {
  rangeHours: DEFAULT_RANGE_HOURS,
};
