import { TIMER_TICK_MS } from "@/domain/timer/timerTypes";

export function startTimerWorker(onTick: () => void): () => void {
  let worker: Worker | undefined;
  let interval: number | undefined;
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
    interval ??= window.setInterval(onTick, TIMER_TICK_MS);
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
  return () => {
    disposed = true;
    stopWorker();
    window.clearInterval(interval);
  };
}
