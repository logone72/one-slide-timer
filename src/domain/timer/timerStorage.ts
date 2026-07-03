import {
  type AppSettings,
  DEFAULT_SETTINGS,
  type TimerRecord,
} from "./timerTypes";

const TIMER_STORAGE_KEY = "one-slide-timer:timers";
const SETTINGS_STORAGE_KEY = "one-slide-timer:settings";
const TIMER_STATUSES = new Set(["running", "alerting", "dismissed"]);

export function loadTimers(): TimerRecord[] {
  const rawTimers = localStorage.getItem(TIMER_STORAGE_KEY);

  if (rawTimers === null || rawTimers.length === 0) {
    return [];
  }

  const parsed: unknown = JSON.parse(rawTimers);

  if (!Array.isArray(parsed)) {
    return [];
  }

  return parsed.filter(isTimerRecord);
}

export function saveTimers(timers: TimerRecord[]): void {
  localStorage.setItem(TIMER_STORAGE_KEY, JSON.stringify(timers));
}

export function loadSettings(): AppSettings {
  const rawSettings = localStorage.getItem(SETTINGS_STORAGE_KEY);

  if (rawSettings === null || rawSettings.length === 0) {
    return DEFAULT_SETTINGS;
  }

  const parsed: unknown = JSON.parse(rawSettings);

  if (!isSettings(parsed)) {
    return DEFAULT_SETTINGS;
  }

  return parsed;
}

export function saveSettings(settings: AppSettings): void {
  localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
}

function isTimerRecord(value: unknown): value is TimerRecord {
  if (value === null || value === undefined || typeof value !== "object") {
    return false;
  }

  const timer = value as Partial<TimerRecord>;
  return (
    typeof timer.id === "string" &&
    typeof timer.color === "string" &&
    typeof timer.createdAt === "number" &&
    typeof timer.endAt === "number" &&
    isTimerStatus(timer.status)
  );
}

function isSettings(value: unknown): value is AppSettings {
  if (value === null || value === undefined || typeof value !== "object") {
    return false;
  }

  const settings = value as Partial<AppSettings>;
  return typeof settings.rangeHours === "number";
}

function isTimerStatus(value: unknown): value is TimerRecord["status"] {
  return typeof value === "string" && TIMER_STATUSES.has(value);
}
