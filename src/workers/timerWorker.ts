import { TIMER_TICK_MS } from "@/domain/timer/timerTypes";

const tick = (): void => {
  self.postMessage({ type: "tick", now: Date.now() });
};

tick();
setInterval(tick, TIMER_TICK_MS);
