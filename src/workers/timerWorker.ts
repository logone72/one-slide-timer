import { startTimerTicks } from "./timerTicker";

const tick = (): void => {
  self.postMessage({ type: "tick" });
};

let stop: (() => void) | undefined;
self.onmessage = (event: MessageEvent<number[]>): void => {
  stop?.();
  tick();
  stop = startTimerTicks(tick, event.data);
};
