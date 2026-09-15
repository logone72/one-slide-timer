import { TIMER_TICK_MS } from "@/domain/timer/timerTypes";

export type TimerTick = {
  type: "tick";
  now: number;
};

export function startTimerWorker(onTick: (now: number) => void): () => void {
  if (typeof Worker === "undefined") {
    const interval = window.setInterval(() => {
      onTick(Date.now());
    }, TIMER_TICK_MS);
    return () => {
      window.clearInterval(interval);
    };
  }

  const worker = new Worker(new URL("./timerWorker.ts", import.meta.url), {
    type: "module",
  });

  worker.addEventListener("message", (event: MessageEvent<TimerTick>) => {
    onTick(event.data.now);
  });

  return () => {
    worker.terminate();
  };
}
