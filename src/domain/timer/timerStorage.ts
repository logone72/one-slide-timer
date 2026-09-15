import { clampRangeMinutes } from "./timerMath";
import {
  type AppSettings,
  DEFAULT_SETTINGS,
  THEMES,
  TIMER_COLORS,
  type TimerRecord,
} from "./timerTypes";

const TIMER_STORAGE_KEY = "one-slide-timer:timers";
const SETTINGS_STORAGE_KEY = "one-slide-timer:settings";
const TIMER_STATUSES = new Set(["running", "alerting", "dismissed"]);
// 이전 버전의 저장 색상을 테마 토큰으로 연결한다. 종료 시각과 ID는 그대로 둔다.
const LEGACY_COLORS = [
  ["#2563eb", "#387e70"],
  ["#16a34a", "#8266be"],
  ["#dc2626", "#bc7047"],
  ["#7c3aed", "#497faa"],
  ["#ea580c", "#ad5b7b"],
];

export function loadTimers(): TimerRecord[] {
  const parsed = readStored(TIMER_STORAGE_KEY);
  if (!Array.isArray(parsed)) {
    return [];
  }
  return parsed.filter(isTimerRecord).map((timer) => ({
    ...timer,
    color:
      TIMER_COLORS[
        LEGACY_COLORS.findIndex((colors) =>
          colors.includes(timer.color.toLowerCase())
        )
      ] ?? timer.color,
  }));
}

export function saveTimers(timers: TimerRecord[]): void {
  localStorage.setItem(TIMER_STORAGE_KEY, JSON.stringify(timers));
}

export function loadSettings(): AppSettings {
  const parsed = readStored(SETTINGS_STORAGE_KEY);
  if (parsed === null || typeof parsed !== "object") {
    return DEFAULT_SETTINGS;
  }
  const saved = parsed as Record<string, unknown>;
  const range = saved.rangeMinutes ?? legacyRangeMinutes(saved.rangeHours);
  return {
    rangeMinutes:
      typeof range === "number"
        ? clampRangeMinutes(range)
        : DEFAULT_SETTINGS.rangeMinutes,
    theme:
      THEMES.find((theme) => theme.id === saved.theme)?.id ??
      DEFAULT_SETTINGS.theme,
  };
}

export function saveSettings(settings: AppSettings): void {
  localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
}

function legacyRangeMinutes(hours: unknown): number {
  return typeof hours === "number"
    ? Math.max(1, Math.trunc(hours)) * 60
    : DEFAULT_SETTINGS.rangeMinutes;
}

function readStored(key: string): unknown {
  try {
    return JSON.parse(localStorage.getItem(key) ?? "null") as unknown;
  } catch {
    return null;
  }
}

function isTimerRecord(value: unknown): value is TimerRecord {
  if (value === null || typeof value !== "object") {
    return false;
  }
  const timer = value as Partial<TimerRecord>;
  return (
    typeof timer.id === "string" &&
    typeof timer.color === "string" &&
    Number.isFinite(timer.createdAt) &&
    Number.isFinite(timer.endAt) &&
    isTimerStatus(timer.status)
  );
}

function isTimerStatus(value: unknown): value is TimerRecord["status"] {
  return typeof value === "string" && TIMER_STATUSES.has(value);
}
