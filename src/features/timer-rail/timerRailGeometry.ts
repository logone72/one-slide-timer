import type { RefObject } from "react";
import type { ActorRefFrom } from "xstate";

import type { appMachine } from "@/app/appMachine";
import {
  clamp,
  rangeMinutesToMs,
  remainingMs,
  snapDurationMs,
  yToDurationMs,
} from "@/domain/timer/timerMath";
import type { TimerDraft, TimerRecord } from "@/domain/timer/timerTypes";

export type RailGesture = TimerDraft & {
  timerId: string | null;
  pointerId: number;
  startY: number;
  startDuration: number;
  moved: boolean;
};
export type RailActor = ActorRefFrom<typeof appMachine>;
export type RailOptions = {
  railRef: RefObject<HTMLDivElement | null>;
  timers: TimerRecord[];
  rangeMinutes: number;
  color: string;
  onCreateTimer: (durationMs: number, color: string) => void;
  onUpdateTimer: (timerId: string, durationMs: number) => void;
};

export function getGestureDuration(
  gesture: RailGesture,
  clientY: number,
  rail: DOMRect,
  rangeMinutes: number
): number {
  if (gesture.timerId === null) {
    return yToDurationMs(clientY, rail.top, rail.height, rangeMinutes);
  }
  if (clientY >= rail.bottom) {
    return 0;
  }
  const change =
    ((gesture.startY - clientY) / rail.height) * rangeMinutesToMs(rangeMinutes);
  return snapDurationMs(
    clamp(gesture.startDuration + change, 0, rangeMinutesToMs(rangeMinutes))
  );
}

export function createGesture(
  timer: TimerRecord | undefined,
  color: string
): RailGesture {
  const durationMs =
    timer === undefined ? 0 : remainingMs(timer.endAt, Date.now());
  return {
    timerId: timer?.id ?? null,
    pointerId: -1,
    startY: 0,
    startDuration: durationMs,
    durationMs,
    color: timer?.color ?? color,
    moved: false,
  };
}

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

export function initialDuration(
  clientY: number,
  rail: DOMRect,
  rangeMinutes: number,
  startPin: boolean
): number {
  return startPin
    ? 0
    : yToDurationMs(clientY, rail.top, rail.height, rangeMinutes);
}
