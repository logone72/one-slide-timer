import { useLayoutEffect, useRef } from "react";

import { TIMER_TICK_MS } from "@/domain/timer/timerTypes";

export type TimerPosition = { pin: number; label: number };
export type TimerMotion = {
  current: TimerPosition;
  next: TimerPosition;
  connectorWidth: number;
};

// DOM 위치는 이 훅만 갱신한다. 프레임 보간은 브라우저의 합성 애니메이션에 맡긴다.
export function useTimerMotion({
  motion,
  now,
  endAt,
  editing,
}: {
  motion: TimerMotion | undefined;
  now: number;
  endAt: number;
  editing: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const item = ref.current;
    if (item === null || motion === undefined) {
      return undefined;
    }
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let animations: Animation[] = [];
    const stop = (): void =>
      animations.forEach((animation) => animation.cancel());
    const play = (): void => {
      stop();
      const current = transforms(motion.current, motion.connectorWidth);
      const next = transforms(motion.next, motion.connectorWidth);
      animations = Object.entries(current).flatMap(([className, transform]) => {
        const element = item.querySelector<HTMLElement>(`.${className}`);
        if (element === null) {
          return [];
        }
        element.style.transform = transform;
        if (reducedMotion.matches || editing || transform === next[className]) {
          return [];
        }
        const duration = Math.min(TIMER_TICK_MS, Math.max(0, endAt - now));
        const animation = element.animate(
          [{ transform }, { transform: next[className] }],
          { duration, easing: "linear", fill: "forwards" }
        );
        animation.currentTime = Math.min(
          duration,
          Math.max(0, Date.now() - now)
        );
        return [animation];
      });
    };
    play();
    reducedMotion.addEventListener("change", play);
    return () => {
      stop();
      reducedMotion.removeEventListener("change", play);
    };
  }, [motion, now, endAt, editing]);
  return ref;
}

function transforms(
  position: TimerPosition,
  width: number
): Record<string, string> {
  const pin = `${String(position.pin)}px`;
  const label = `${String(position.label)}px`;
  const angle = Math.atan2(position.label - position.pin, width);
  return {
    "timer-dot": `translate3d(-50%, calc(${pin} - 50%), 0)`,
    "timer-label": `translate3d(0, ${label}, 0)`,
    "timer-connector": `translate3d(0, ${pin}, 0) skewY(${String(angle)}rad)`,
  };
}
