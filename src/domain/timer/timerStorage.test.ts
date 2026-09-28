import { afterEach, beforeEach, expect, it, vi } from "vitest";

import {
  loadSettings,
  loadTimers,
  saveSettings,
  saveTimers,
} from "./timerStorage";
import { DEFAULT_SETTINGS, TIMER_COLORS } from "./timerTypes";

const values = new Map<string, string>();
beforeEach(() => {
  values.clear();
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
  });
});
afterEach(() => vi.unstubAllGlobals());

it("migrates legacy status, colors and hours without changing identity or deadlines", () => {
  localStorage.setItem(
    "one-slide-timer:settings",
    JSON.stringify({ rangeHours: 2 })
  );
  expect(loadSettings()).toEqual({
    ok: true,
    value: {
      audioEnabled: true,
      hideNotificationPrompt: false,
      notificationPreference: null,
      rangeMinutes: 120,
      theme: "white",
    },
  });
  const timer = {
    id: "existing",
    color: "#2563eb",
    createdAt: 1000,
    endAt: 9000,
  };
  for (const status of ["running", "alerting", undefined]) {
    localStorage.setItem(
      "one-slide-timer:timers",
      JSON.stringify([{ ...timer, status }])
    );
    expect(loadTimers()).toEqual({
      ok: true,
      value: [{ ...timer, color: TIMER_COLORS[0] }],
    });
  }
  localStorage.setItem(
    "one-slide-timer:timers",
    JSON.stringify([{ ...timer, status: "dismissed" }])
  );
  expect(loadTimers()).toEqual({ ok: true, value: [] });
  expect(
    saveSettings({
      audioEnabled: true,
      hideNotificationPrompt: false,
      notificationPreference: null,
      rangeMinutes: 25,
      theme: "midnight",
    })
  ).toBe(true);
  expect(loadSettings()).toEqual({
    ok: true,
    value: {
      audioEnabled: true,
      hideNotificationPrompt: false,
      notificationPreference: null,
      rangeMinutes: 25,
      theme: "midnight",
    },
  });
});

it("distinguishes missing, malformed and inaccessible storage and reports write failures", () => {
  expect(loadSettings()).toEqual({ ok: true, value: DEFAULT_SETTINGS });
  expect(loadTimers()).toEqual({ ok: true, value: [] });
  for (const key of ["one-slide-timer:timers", "one-slide-timer:settings"]) {
    localStorage.setItem(key, "{broken");
  }
  expect(loadTimers()).toEqual({ ok: false });
  expect(loadSettings()).toEqual({ ok: false });
  localStorage.setItem("one-slide-timer:settings", "[]");
  expect(loadSettings()).toEqual({ ok: false });
  vi.stubGlobal("localStorage", {
    getItem: () => {
      throw new Error("read failed");
    },
    setItem: () => {
      throw new Error("write failed");
    },
  });
  expect(loadTimers()).toEqual({ ok: false });
  expect(loadSettings()).toEqual({ ok: false });
  expect(saveSettings(DEFAULT_SETTINGS)).toBe(false);
  expect(saveTimers([])).toBe(false);
});

it("preserves valid timers when invalid records are present by refusing to overwrite", () => {
  const records = [
    { id: "valid", color: TIMER_COLORS[0], createdAt: 1000, endAt: 9000 },
    { id: "broken" },
  ];
  localStorage.setItem("one-slide-timer:timers", JSON.stringify(records));
  expect(loadTimers()).toEqual({ ok: false });
  expect(localStorage.getItem("one-slide-timer:timers")).toBe(
    JSON.stringify(records)
  );
});

it("normalizes old ranges and retired themes", () => {
  for (const [saved, expected] of [
    [
      { rangeMinutes: -3, theme: "missing" },
      { rangeMinutes: 5, theme: "white" },
    ],
    [{ rangeHours: 100 }, { rangeMinutes: 720, theme: "white" }],
    [
      { rangeMinutes: 1440, theme: "ocean" },
      { rangeMinutes: 720, theme: "ocean" },
    ],
    [
      { rangeMinutes: 25, theme: "lavender" },
      { rangeMinutes: 25, theme: "white" },
    ],
  ]) {
    localStorage.setItem("one-slide-timer:settings", JSON.stringify(saved));
    expect(loadSettings()).toEqual({
      ok: true,
      value: {
        ...expected,
        audioEnabled: true,
        hideNotificationPrompt: false,
        notificationPreference: null,
      },
    });
  }
});

it("migrates missing notification choice and validates it without changing other settings", () => {
  for (const [saved, expected] of [
    [undefined, null],
    [null, null],
    [true, true],
    [false, false],
    ["true", false],
    [1, false],
  ]) {
    localStorage.setItem(
      "one-slide-timer:settings",
      JSON.stringify({
        rangeMinutes: 25,
        theme: "ocean",
        notificationPreference: saved,
      })
    );
    expect(loadSettings()).toEqual({
      ok: true,
      value: {
        rangeMinutes: 25,
        theme: "ocean",
        audioEnabled: true,
        hideNotificationPrompt: false,
        notificationPreference: expected,
      },
    });
  }
});

it("restores saved audio choices and migrates missing or invalid values", () => {
  for (const [saved, expected] of [
    [undefined, true],
    [false, false],
    [true, true],
    ["false", true],
  ]) {
    localStorage.setItem(
      "one-slide-timer:settings",
      JSON.stringify({ audioEnabled: saved })
    );
    expect(loadSettings()).toEqual({
      ok: true,
      value: { ...DEFAULT_SETTINGS, audioEnabled: expected },
    });
  }
});

it("validates persisted prompt dismissal and migrates legacy settings", () => {
  for (const saved of [undefined, false, true, "true", null]) {
    localStorage.setItem(
      "one-slide-timer:settings",
      JSON.stringify({ hideNotificationPrompt: saved })
    );
    expect(loadSettings()).toEqual({
      ok: true,
      value: { ...DEFAULT_SETTINGS, hideNotificationPrompt: saved === true },
    });
  }
});
