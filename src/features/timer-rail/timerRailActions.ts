import type { RefObject } from "react";
import type { ActorRefFrom } from "xstate";

import type { appMachine } from "@/app/appMachine";
import type { TimerRecord } from "@/domain/timer/timerTypes";
export type RailActor = ActorRefFrom<typeof appMachine>;
export type RailOptions = {
  railRef: RefObject<HTMLDivElement | null>;
  timers: TimerRecord[];
  rangeMinutes: number;
  color: string;
  onStartAdjust: () => void;
  onCreateTimer: (durationMs: number, color: string) => void;
  onUpdateTimer: (timerId: string, durationMs: number) => void;
};

export function findTargetTimer(
  target: Element,
  timers: TimerRecord[]
): TimerRecord | undefined {
  const id = target.closest<HTMLElement>("[data-timer-id]")?.dataset.timerId;
  return timers.find((timer) => timer.id === id);
}

export function commitGesture(actor: RailActor, options: RailOptions): void {
  const gesture = actor.getSnapshot().context.gesture;
  if (gesture === null) {
    return;
  }
  if (gesture.timerId !== null) {
    options.onUpdateTimer(gesture.timerId, gesture.durationMs);
  } else if (gesture.durationMs > 0) {
    options.onCreateTimer(gesture.durationMs, gesture.color);
  }
  actor.send({ type: "FINISH" });
}
