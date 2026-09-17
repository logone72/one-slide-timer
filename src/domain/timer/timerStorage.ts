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
export type StorageRead<T> = { ok: true; value: T } | { ok: false };
// 이전 버전의 저장 색상을 테마 토큰으로 연결한다. 종료 시각과 ID는 그대로 둔다.
const LEGACY_COLORS = [
  ["#2563eb", "#387e70"],
  ["#16a34a", "#8266be"],
  ["#dc2626", "#bc7047"],
  ["#7c3aed", "#497faa"],
  ["#ea580c", "#ad5b7b"],
];

export function loadTimers(): StorageRead<TimerRecord[]> {
  const result = readStored(TIMER_STORAGE_KEY);
  if (!result.ok) {
    return result;
  }
  if (result.value === null) {
    return { ok: true, value: [] };
  }
  if (!Array.isArray(result.value) || !result.value.every(isTimerRecord)) {
    return { ok: false };
  }
  return {
    ok: true,
    value: result.value
      .filter((timer) => timer.status !== "dismissed")
      .map(({ id, createdAt, endAt, color }) => ({
        id,
        createdAt,
        endAt,
        color:
          TIMER_COLORS[
            LEGACY_COLORS.findIndex((colors) =>
              colors.includes(color.toLowerCase())
            )
          ] ?? color,
      })),
  };
}

export function saveTimers(timers: TimerRecord[]): boolean {
  return writeStored(TIMER_STORAGE_KEY, timers);
}

export function loadSettings(): StorageRead<AppSettings> {
  const result = readStored(SETTINGS_STORAGE_KEY);
  if (!result.ok) {
    return result;
  }
  if (result.value === null) {
    return { ok: true, value: DEFAULT_SETTINGS };
  }
  if (!isRecord(result.value)) {
    return { ok: false };
  }
  const saved = result.value;
  const range = saved.rangeMinutes ?? legacyRangeMinutes(saved.rangeHours);
  return {
    ok: true,
    value: {
      rangeMinutes:
        typeof range === "number"
          ? clampRangeMinutes(range)
          : DEFAULT_SETTINGS.rangeMinutes,
      theme:
        THEMES.find((theme) => theme.id === saved.theme)?.id ??
        DEFAULT_SETTINGS.theme,
    },
  };
}

export function saveSettings(settings: AppSettings): boolean {
  return writeStored(SETTINGS_STORAGE_KEY, settings);
}

function writeStored(key: string, value: unknown): boolean {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

function legacyRangeMinutes(hours: unknown): number {
  return typeof hours === "number"
    ? Math.max(1, Math.trunc(hours)) * 60
    : DEFAULT_SETTINGS.rangeMinutes;
}

function readStored(key: string): StorageRead<unknown> {
  try {
    return {
      ok: true,
      value: JSON.parse(localStorage.getItem(key) ?? "null") as unknown,
    };
  } catch {
    return { ok: false };
  }
}

type LegacyTimer = TimerRecord & {
  status?: "running" | "alerting" | "dismissed";
};
function isTimerRecord(value: unknown): value is LegacyTimer {
  if (!isRecord(value)) {
    return false;
  }
  const timer = value as Partial<LegacyTimer>;
  return (
    typeof timer.id === "string" &&
    timer.id.length > 0 &&
    typeof timer.color === "string" &&
    Number.isFinite(timer.createdAt) &&
    Number.isFinite(timer.endAt) &&
    isLegacyStatus(timer.status)
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isLegacyStatus(status: unknown): boolean {
  return (
    status === undefined ||
    status === "running" ||
    status === "alerting" ||
    status === "dismissed"
  );
}
