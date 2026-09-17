import { TIMER_TICK_MS } from "@/domain/timer/timerTypes";

const tick = (): void => {
  self.postMessage({ type: "tick" });
};

tick();
setInterval(tick, TIMER_TICK_MS);
