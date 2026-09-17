import { afterEach, expect, it, vi } from "vitest";

afterEach(() => {
  vi.clearAllTimers();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

it("the worker consumes deadlines and replaces its schedule after edits and deletion", async () => {
  vi.resetModules();
  vi.useFakeTimers();
  vi.setSystemTime(100);
  const ticks: number[] = [];
  const scope = {
    postMessage: vi.fn(() => ticks.push(Date.now())),
    onmessage: vi.fn<(event: MessageEvent<number[]>) => void>(),
  };
  vi.stubGlobal("self", scope);
  // 스케줄러를 mock하지 않고 실제 Worker 진입점부터 검사한다.
  await import("./timerWorker");
  const update = (data: number[]): void =>
    scope.onmessage(new MessageEvent("message", { data }));
  update([10_100]);
  expect(scope.postMessage).toHaveBeenLastCalledWith({ type: "tick" });
  vi.advanceTimersByTime(999);
  expect(ticks).toEqual([100]);
  vi.advanceTimersByTime(1);
  expect(ticks).toEqual([100, 1100]);

  vi.advanceTimersByTime(350);
  update([10_100, 11_450]);
  vi.advanceTimersByTime(1000);
  expect(ticks).toEqual([100, 1100, 1450, 2100, 2450]);
  vi.advanceTimersByTime(150);
  update([22_600, 11_450]);
  vi.advanceTimersByTime(1000);
  expect(ticks.slice(-3)).toEqual([2600, 3450, 3600]);

  update([]);
  ticks.length = 0;
  vi.advanceTimersByTime(1000);
  expect(ticks).toEqual([4600]);
  expect(vi.getTimerCount()).toBe(1);
});
