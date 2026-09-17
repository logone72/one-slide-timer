import { afterEach, beforeEach, expect, it, vi } from "vitest";

import { loadSettings, loadTimers, saveSettings } from "./timerStorage";
import { DEFAULT_SETTINGS, TIMER_COLORS } from "./timerTypes";

beforeEach(() => {
  const values = new Map<string, string>();
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
  });
});
afterEach(() => vi.unstubAllGlobals());

it("migrates saved hours and colors without changing timer identity or deadlines", () => {
  localStorage.setItem(
    "one-slide-timer:settings",
    JSON.stringify({ rangeHours: 2 })
  );
  expect(loadSettings()).toEqual({ rangeMinutes: 120, theme: "white" });
  const timer = {
    id: "existing",
    color: "#2563eb",
    createdAt: 1000,
    endAt: 9000,
    status: "running",
  };
  localStorage.setItem("one-slide-timer:timers", JSON.stringify([timer]));
  expect(loadTimers()).toEqual([{ ...timer, color: TIMER_COLORS[0] }]);
  saveSettings({ rangeMinutes: 25, theme: "midnight" });
  expect(loadSettings()).toEqual({ rangeMinutes: 25, theme: "midnight" });
});

it("recovers malformed and unsupported settings at the storage boundary", () => {
  localStorage.setItem("one-slide-timer:settings", "{broken");
  expect(loadSettings()).toEqual(DEFAULT_SETTINGS);
  localStorage.setItem("one-slide-timer:timers", "{broken");
  expect(loadTimers()).toEqual([]);
  localStorage.setItem(
    "one-slide-timer:settings",
    JSON.stringify({ rangeMinutes: -3, theme: "missing" })
  );
  expect(loadSettings()).toEqual({ rangeMinutes: 5, theme: "white" });
  localStorage.setItem(
    "one-slide-timer:settings",
    JSON.stringify({ rangeHours: 100 })
  );
  expect(loadSettings()).toEqual({ rangeMinutes: 720, theme: "white" });
});

it("replaces retired lavender with white while retaining the selected range", () => {
  expect(loadSettings()).toEqual({ rangeMinutes: 60, theme: "white" });
  localStorage.setItem(
    "one-slide-timer:settings",
    JSON.stringify({ rangeMinutes: 25, theme: "lavender" })
  );
  expect(loadSettings()).toEqual({ rangeMinutes: 25, theme: "white" });
  saveSettings({ rangeMinutes: 25, theme: "forest" });
  expect(loadSettings()).toEqual({ rangeMinutes: 25, theme: "forest" });
});

it("clamps a saved 24-hour range to 12 hours", () => {
  localStorage.setItem(
    "one-slide-timer:settings",
    JSON.stringify({ rangeMinutes: 1440, theme: "ocean" })
  );
  expect(loadSettings()).toEqual({ rangeMinutes: 720, theme: "ocean" });
});
