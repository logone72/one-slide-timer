import { expect, it, vi } from "vitest";

import { TIMER_COLORS } from "@/domain/timer/timerTypes";

import { createAppStore } from "./state/appStore";
import { selectCompletedTimers } from "./state/timerState";
import { createTimerCommands } from "./timerCommands";

it("uses the same instant for creation and display, preserves references on ticks, and only acknowledges observed completions", () => {
  let now = 1234;
  let id = 0;
  const app = createAppStore();
  const prepareAudio = vi.fn(() => Promise.resolve(true));
  const commands = createTimerCommands(app, {
    now: () => now,
    newId: () => String(++id),
    prepareAudio,
  });
  commands.startTimer(10000, TIMER_COLORS[0]);
  const first = app.getState().timers[0];
  expect(first?.endAt).toBe(11234);
  expect(app.getState().now).toBe(1234);
  expect(prepareAudio).toHaveBeenCalledOnce();
  const records = app.getState().timers;
  app.actions.setNow(2234);
  app.actions.setRangeMinutes(5);
  expect(app.getState().timers).toBe(records);
  now = 3000;
  commands.startTimer(20000, TIMER_COLORS[1]);
  const second = app.getState().timers[1];
  commands.adjustTimer("1", 5000);
  expect(app.getState().timers[0]?.endAt).toBe(8000);
  expect(app.getState().timers[1]).toBe(second);
  now = 8000;
  app.actions.setNow(now);
  const observed = selectCompletedTimers(app.getState()).map(
    (timer) => timer.id
  );
  now = 24000;
  commands.adjustTimer("1", 60000);
  commands.acknowledgeTimers(observed);
  expect(app.getState().timers).toEqual([second]);
  expect(selectCompletedTimers(app.getState())).toEqual([second]);
});
