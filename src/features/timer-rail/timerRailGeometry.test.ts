import { expect, it } from "vitest";

import { createGesture, getGestureDuration } from "./timerRailGeometry";

it("creates from absolute rail position but edits relative to the grabbed label", () => {
  const rail = { top: 100, bottom: 400, height: 300 };
  const timer = { id: "one", color: "blue", createdAt: 0, endAt: 70_000 };
  const gesture = { ...createGesture(timer, "red", 10_000), startY: 200 };
  expect(getGestureDuration(gesture, 200, rail, 5)).toBe(60_000);
  expect(getGestureDuration(gesture, 170, rail, 5)).toBe(90_000);
  expect(getGestureDuration(gesture, 400, rail, 5)).toBe(0);
  expect(getGestureDuration(gesture, -500, rail, 5)).toBe(300_000);
  expect(
    getGestureDuration(createGesture(undefined, "red", 10_000), 250, rail, 5)
  ).toBe(150_000);
  expect(gesture.timerId).toBe(timer.id);
  expect(gesture.color).toBe(timer.color);
});
