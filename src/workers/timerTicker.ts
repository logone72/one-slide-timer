import { TIMER_TICK_MS } from "@/domain/timer/timerTypes";

// 다음 숫자 변경 시점만 예약한다. 여러 타이머도 예약은 하나만 유지한다.
export function startTimerTicks(
  onTick: () => void,
  endTimes: number[]
): () => void {
  let timeout: ReturnType<typeof setTimeout>;
  let stopped = false;
  const schedule = (): void => {
    const now = Date.now();
    const delay = endTimes.reduce((nearest, endAt) => {
      const remaining = endAt - now;
      if (remaining <= 0) {
        return nearest;
      }
      const fraction = remaining % TIMER_TICK_MS;
      return Math.min(nearest, fraction === 0 ? TIMER_TICK_MS : fraction);
    }, TIMER_TICK_MS);
    timeout = setTimeout(() => {
      onTick();
      if (!stopped) {
        schedule();
      }
    }, Math.ceil(delay));
  };
  schedule();
  return () => {
    stopped = true;
    clearTimeout(timeout);
  };
}
