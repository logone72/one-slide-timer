import { afterEach, expect, it, vi } from "vitest";

import { startTimerWorker } from "./timerWorkerClient";

const listeners = new Map<string, EventListener>();
const terminate = vi.fn();
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  listeners.clear();
  terminate.mockClear();
});

it("falls back after constructor failure and releases the interval", () => {
  vi.useFakeTimers();
  vi.stubGlobal("window", globalThis);
  vi.stubGlobal(
    "Worker",
    vi.fn(function Worker() {
      throw new Error("blocked");
    })
  );
  const tick = vi.fn();
  const stop = startTimerWorker(tick);
  vi.advanceTimersByTime(2000);
  expect(tick).toHaveBeenCalledTimes(2);
  stop();
  vi.advanceTimersByTime(2000);
  expect(tick).toHaveBeenCalledTimes(2);
});

it("falls back once after a worker runtime error and stops on cleanup", () => {
  vi.useFakeTimers();
  vi.stubGlobal("window", globalThis);
  vi.stubGlobal(
    "Worker",
    class {
      terminate = terminate;
      addEventListener(name: string, listener: EventListener) {
        listeners.set(name, listener);
      }
      removeEventListener(name: string) {
        listeners.delete(name);
      }
    }
  );
  const tick = vi.fn();
  const stop = startTimerWorker(tick);
  const lateError = listeners.get("error");
  lateError?.(new Event("error"));
  listeners.get("messageerror")?.(new Event("messageerror"));
  vi.advanceTimersByTime(1000);
  expect(tick).toHaveBeenCalledOnce();
  stop();
  lateError?.(new Event("error"));
  vi.advanceTimersByTime(1000);
  expect(tick).toHaveBeenCalledOnce();
});
