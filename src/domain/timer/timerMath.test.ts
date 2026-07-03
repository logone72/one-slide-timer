import { describe, expect, it } from "vitest";

import {
  clampRangeHours,
  durationMsToPercent,
  formatDuration,
  remainingMs,
  snapDurationMs,
  yToDurationMs,
} from "./timerMath";

describe("timer math", () => {
  it("clamps range hours to 1 through 24", () => {
    expect(clampRangeHours(0)).toBe(1);
    expect(clampRangeHours(12.8)).toBe(12);
    expect(clampRangeHours(99)).toBe(24);
  });

  it("snaps duration to 10 second units", () => {
    expect(snapDurationMs(4_999)).toBe(0);
    expect(snapDurationMs(5_001)).toBe(10_000);
    expect(snapDurationMs(14_999)).toBe(10_000);
  });

  it("maps vertical rail positions to snapped duration", () => {
    expect(yToDurationMs(50, 0, 100, 1)).toBe(1_800_000);
    expect(yToDurationMs(110, 0, 100, 1)).toBe(0);
    expect(yToDurationMs(-10, 0, 100, 1)).toBe(3_600_000);
  });

  it("maps durations to rail percentages", () => {
    expect(durationMsToPercent(1_800_000, 1)).toBe(50);
    expect(durationMsToPercent(9_000_000, 1)).toBe(100);
  });

  it("derives remaining time from endAt and now", () => {
    expect(remainingMs(2_000, 500)).toBe(1_500);
    expect(remainingMs(2_000, 2_500)).toBe(0);
  });

  it("formats short durations for labels", () => {
    expect(formatDuration(10_000)).toBe("10s");
    expect(formatDuration(70_000)).toBe("1m 10s");
    expect(formatDuration(3_700_000)).toBe("1h 1m");
  });
});
