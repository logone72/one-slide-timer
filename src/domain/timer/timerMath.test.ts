import { describe, expect, it } from "vitest";

import {
  clampRangeMinutes,
  durationMsToPercent,
  formatClock,
  formatDuration,
  formatTimeLabel,
  remainingMs,
  snapDurationMs,
  stepRangeMinutes,
  yToDurationMs,
} from "./timerMath";

describe("timer math", () => {
  it("normalizes minute ranges and steps through the hour boundary", () => {
    expect(clampRangeMinutes(0)).toBe(5);
    expect(clampRangeMinutes(12.8)).toBe(15);
    expect(clampRangeMinutes(90)).toBe(120);
    expect(clampRangeMinutes(9999)).toBe(720);
    expect(clampRangeMinutes(NaN)).toBe(60);
    expect(clampRangeMinutes(Infinity)).toBe(60);
    expect(stepRangeMinutes(5, -1)).toBe(5);
    expect(stepRangeMinutes(5, 1)).toBe(10);
    expect(stepRangeMinutes(55, 1)).toBe(60);
    expect(stepRangeMinutes(60, -1)).toBe(55);
    expect(stepRangeMinutes(60, 1)).toBe(120);
    expect(stepRangeMinutes(120, -1)).toBe(60);
    expect(stepRangeMinutes(720, 1)).toBe(720);
  });

  it("snaps duration to 10 second units", () => {
    expect(snapDurationMs(4_999)).toBe(0);
    expect(snapDurationMs(5_001)).toBe(10_000);
    expect(snapDurationMs(14_999)).toBe(10_000);
  });

  it("maps vertical rail positions to snapped duration", () => {
    expect(yToDurationMs(50, 0, 100, 5)).toBe(150_000);
    expect(yToDurationMs(50, 0, 100, 60)).toBe(1_800_000);
    expect(yToDurationMs(110, 0, 100, 60)).toBe(0);
    expect(yToDurationMs(-10, 0, 100, 60)).toBe(3_600_000);
  });

  it("maps durations to rail percentages", () => {
    expect(durationMsToPercent(1_800_000, 60)).toBe(50);
    expect(durationMsToPercent(9_000_000, 60)).toBe(100);
  });

  it("derives remaining time from endAt and now", () => {
    expect(remainingMs(2_000, 500)).toBe(1_500);
    expect(remainingMs(2_000, 2_500)).toBe(0);
  });

  it("formats short durations for labels", () => {
    expect(formatTimeLabel(250_000)).toBe("4분 10초");
    expect(formatTimeLabel(0)).toBe("0");
    expect(formatTimeLabel(5_400_000)).toBe("1시간 30분");
    expect(formatClock(10_000)).toBe("00:10");
    expect(formatClock(3_661_000)).toBe("1:01:01");
    expect(formatClock(86_400_000)).toBe("24:00:00");
    expect(formatDuration(10_000)).toBe("10s");
    expect(formatDuration(70_000)).toBe("1m 10s");
    expect(formatDuration(3_700_000)).toBe("1h 1m");
  });
});
