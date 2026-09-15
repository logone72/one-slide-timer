import type { KeyboardEvent } from "react";

import {
  clamp,
  rangeMinutesToMs,
  snapDurationMs,
} from "@/domain/timer/timerMath";
import { TIMER_STEP_MS } from "@/domain/timer/timerTypes";

import * as railGesture from "./timerRailGeometry";

export function handleRailKey(
  event: KeyboardEvent<HTMLDivElement>,
  actor: railGesture.RailActor,
  options: railGesture.RailOptions
): void {
  const target = event.target as HTMLElement;
  if (
    !["ArrowUp", "ArrowDown", "Enter"].includes(event.key) ||
    target.closest(".timer-actions") !== null
  ) {
    return;
  }
  const current = actor.getSnapshot().context.gesture;
  const timer = railGesture.findTargetTimer(target, options.timers);
  if (event.key === "Enter") {
    if (current !== null) {
      event.preventDefault();
      railGesture.commitGesture(actor, options);
    }
    return;
  }
  event.preventDefault();
  const gesture = current ?? railGesture.createGesture(timer, options.color);
  const next = adjustWithKeyboard(gesture, event, options.rangeMinutes);
  if (current === null) {
    actor.send({
      type: timer === undefined ? "START_CREATING" : "START_EDITING",
      gesture: next,
    });
  } else {
    actor.send({ type: "MOVE", gesture: next });
  }
}

function adjustWithKeyboard(
  gesture: ReturnType<typeof railGesture.createGesture>,
  event: KeyboardEvent<HTMLDivElement>,
  rangeMinutes: number
) {
  const step = event.shiftKey ? 60_000 : TIMER_STEP_MS;
  const change = event.key === "ArrowDown" ? -step : step;
  return {
    ...gesture,
    moved: true,
    durationMs: clamp(
      snapDurationMs(gesture.durationMs + change),
      0,
      rangeMinutesToMs(rangeMinutes)
    ),
  };
}
