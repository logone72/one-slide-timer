export const TIMER_TICK_MS = 1_000;
export const TIMER_STEP_MS = 10_000;
export const DEFAULT_RANGE_MINUTES = 60;
export const MIN_RANGE_MINUTES = 5;
export const MAX_RANGE_MINUTES = 12 * 60;
export const RANGE_MINUTE_OPTIONS = [
  ...Array.from(
    { length: 60 / MIN_RANGE_MINUTES - 1 },
    (_, index) => (index + 1) * MIN_RANGE_MINUTES
  ),
  ...Array.from(
    { length: MAX_RANGE_MINUTES / 60 },
    (_, index) => (index + 1) * 60
  ),
];
export const TIMER_COLORS = [
  "var(--color-timer-1)",
  "var(--color-timer-2)",
  "var(--color-timer-3)",
  "var(--color-timer-4)",
  "var(--color-timer-5)",
] as const;

export const THEMES = [
  { id: "white", name: "화이트", description: "기본 · 깨끗하고 선명하게" },
  { id: "forest", name: "포레스트", description: "싱그럽고 편안하게" },
  { id: "ocean", name: "오션", description: "맑고 시원하게" },
  {
    id: "midnight",
    name: "미드나이트",
    description: "어두운 곳에서도 편안하게",
  },
] as const;

export type ThemeId = (typeof THEMES)[number]["id"];

export type TimerRecord = {
  id: string;
  color: string;
  createdAt: number;
  endAt: number;
};

export type TimerDraft = {
  durationMs: number;
  color: string;
};

export type AppSettings = {
  rangeMinutes: number;
  theme: ThemeId;
};

export const DEFAULT_SETTINGS: AppSettings = {
  rangeMinutes: DEFAULT_RANGE_MINUTES,
  theme: "white",
};
