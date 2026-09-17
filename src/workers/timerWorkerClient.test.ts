import { afterEach, expect, it, vi } from "vitest";

import { startTimerWorker } from "./timerWorkerClient";

const listeners = new Map<string, EventListener>();
const terminate = vi.fn();
const postMessage = vi.fn();
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  listeners.clear();
  terminate.mockClear();
  postMessage.mockClear();
});

it("falls back after constructor failure and releases the scheduled tick", () => {
  vi.useFakeTimers();
  vi.stubGlobal("window", globalThis);
  vi.stubGlobal(
    "Worker",
    vi.fn(function Worker() {
      throw new Error("blocked");
    })
  );
  const tick = vi.fn();
  const { stop } = startTimerWorker(tick);
  vi.advanceTimersByTime(2000);
  expect(tick).toHaveBeenCalledTimes(2);
  stop();
  vi.advanceTimersByTime(2000);
  expect(tick).toHaveBeenCalledTimes(2);
});

it("falls back once after a worker runtime error and stops on cleanup", () => {
  vi.useFakeTimers();
  vi.setSystemTime(0);
  vi.stubGlobal("window", globalThis);
  vi.stubGlobal(
    "Worker",
    class {
      terminate = terminate;
      postMessage = postMessage;
      addEventListener(name: string, listener: EventListener) {
        listeners.set(name, listener);
      }
      removeEventListener(name: string) {
        listeners.delete(name);
      }
    }
  );
  const tick = vi.fn();
  const { stop, update } = startTimerWorker(tick);
  update([10_250]);
  update([20_250]);
  expect(postMessage.mock.calls).toEqual([[[10_250]], [[20_250]]]);
  vi.advanceTimersByTime(100);
  const lateError = listeners.get("error");
  lateError?.(new Event("error"));
  listeners.get("messageerror")?.(new Event("messageerror"));
  vi.advanceTimersByTime(149);
  expect(tick).not.toHaveBeenCalled();
  vi.advanceTimersByTime(1);
  expect(tick).toHaveBeenCalledOnce();
  stop();
  lateError?.(new Event("error"));
  vi.advanceTimersByTime(1000);
  expect(tick).toHaveBeenCalledOnce();
});

it("aligns separate deadlines and reschedules edits without duplicate ticks", () => {
  vi.useFakeTimers();
  vi.setSystemTime(0);
  vi.stubGlobal(
    "Worker",
    vi.fn(() => {
      throw new Error("unavailable");
    })
  );
  const ticks: number[] = [];
  const client = startTimerWorker(() => ticks.push(Date.now()));
  vi.advanceTimersByTime(100);
  client.update([10_100]);
  vi.advanceTimersByTime(999);
  expect(ticks).toEqual([]);
  vi.advanceTimersByTime(1);
  expect(ticks).toEqual([1100]);
  vi.advanceTimersByTime(350);
  client.update([10_100, 11_450]);
  vi.advanceTimersByTime(1000);
  expect(ticks).toEqual([1100, 2100, 2450]);
  vi.advanceTimersByTime(150);
  client.update([22_600, 11_450]);
  vi.advanceTimersByTime(1000);
  expect(ticks).toEqual([1100, 2100, 2450, 3450, 3600]);
  client.stop();
  client.update([4600]);
  vi.advanceTimersByTime(1000);
  expect(ticks).toHaveLength(5);
});

it("uses absolute deadlines after a delayed callback instead of shifting the cadence", () => {
  vi.useFakeTimers();
  vi.setSystemTime(100);
  vi.stubGlobal(
    "Worker",
    vi.fn(() => {
      throw new Error("unavailable");
    })
  );
  const tick = vi.fn();
  const client = startTimerWorker(tick);
  client.update([10_100]);
  vi.setSystemTime(350);
  vi.advanceTimersByTime(1000);
  expect(tick).toHaveBeenCalledOnce();
  vi.advanceTimersByTime(749);
  expect(tick).toHaveBeenCalledOnce();
  vi.advanceTimersByTime(1);
  expect(tick).toHaveBeenCalledTimes(2);
  client.stop();
});
