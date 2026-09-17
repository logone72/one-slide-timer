import { startTimerTicks } from "./timerTicker";

export function startTimerWorker(onTick: () => void) {
  let worker: Worker | undefined;
  let endTimes: number[] = [];
  let stopTicks: (() => void) | undefined;
  let disposed = false;
  const stopWorker = (): void => {
    worker?.removeEventListener("message", onTick);
    worker?.removeEventListener("error", fallback);
    worker?.removeEventListener("messageerror", fallback);
    worker?.terminate();
    worker = undefined;
  };
  const fallback = (): void => {
    if (disposed) {
      return;
    }
    stopWorker();
    stopTicks ??= startTimerTicks(onTick, endTimes);
  };
  try {
    worker = new Worker(new URL("./timerWorker.ts", import.meta.url), {
      type: "module",
    });
    worker.addEventListener("message", onTick);
    worker.addEventListener("error", fallback);
    worker.addEventListener("messageerror", fallback);
  } catch {
    fallback();
  }
  return {
    update: (nextEndTimes: number[]): void => {
      if (disposed) {
        return;
      }
      endTimes = nextEndTimes;
      if (worker === undefined) {
        stopTicks?.();
        stopTicks = startTimerTicks(onTick, endTimes);
      } else {
        try {
          worker.postMessage(endTimes);
        } catch {
          fallback();
        }
      }
    },
    stop: (): void => {
      disposed = true;
      stopWorker();
      stopTicks?.();
    },
  };
}
