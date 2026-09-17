import type { RefObject } from "react";
import type { ActorRefFrom } from "xstate";

import type { TimerRecord } from "@/domain/timer/timerTypes";

import type * as interaction from "./railInteractionMachine";

export type RailActor = ActorRefFrom<typeof interaction.railInteractionMachine>;
export type RailOptions = {
  railRef: RefObject<HTMLDivElement | null>;
  timers: TimerRecord[];
  rangeMinutes: number;
  color: string;
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

export function commitTimer(
  change: interaction.TimerChange,
  options: RailOptions
): void {
  if (change.timerId !== null) {
    options.onUpdateTimer(change.timerId, change.durationMs);
  } else if (change.durationMs > 0) {
    options.onCreateTimer(change.durationMs, change.color);
  }
}
