import { useMachine } from "@xstate/react";
import { type KeyboardEvent, type PointerEvent, useEffect } from "react";

import { appMachine } from "@/app/appMachine";

import * as railGesture from "./timerRailActions";
import { createGesture, getGestureDuration } from "./timerRailGeometry";
import { handleRailKey } from "./timerRailKeyboard";

export function useRailGesture(options: railGesture.RailOptions) {
  const [state, send, actor] = useMachine(appMachine);
  useGestureCancellation(actor);
  const cancel = (): void => send({ type: "CANCEL" });
  const select = (id: string): void => send({ type: "SHOW_ACTIONS", id });
  const pointerMove = (event: PointerEvent<HTMLDivElement>): void => {
    const current = actor.getSnapshot().context.gesture;
    if (current?.pointerId !== event.pointerId) {
      return;
    }
    const rail = options.railRef.current?.getBoundingClientRect();
    if (rail === undefined) {
      return;
    }
    const moved =
      current.moved || Math.abs(event.clientY - current.startY) >= 5;
    if (moved) {
      send({
        type: "MOVE",
        gesture: {
          ...current,
          moved,
          durationMs: getGestureDuration(
            current,
            event.clientY,
            rail,
            options.rangeMinutes
          ),
        },
      });
    }
  };
  const pointerUp = (event: PointerEvent<HTMLDivElement>): void => {
    pointerMove(event);
    const current = actor.getSnapshot().context.gesture;
    if (current?.pointerId !== event.pointerId) {
      return;
    }
    if (current.timerId !== null && !current.moved) {
      select(current.timerId);
    } else if (current.timerId === null && !current.moved) {
      cancel();
      options.onStartAdjust();
    } else {
      railGesture.commitGesture(actor, options);
    }
  };
  const current = state.context.gesture;
  const draft =
    current !== null && (current.timerId === null || current.moved)
      ? current
      : null;
  return {
    draft,
    selectedId: state.context.selectedId,
    select,
    cancel,
    editing: state.matches("editingTimer"),
    handlers: {
      onPointerDown: (event: PointerEvent<HTMLDivElement>) =>
        startPointer(event, actor, options),
      onPointerMove: pointerMove,
      onPointerUp: pointerUp,
      onPointerCancel: cancel,
      onLostPointerCapture: () => {
        if (actor.getSnapshot().context.gesture !== null) {
          cancel();
        }
      },
      onKeyDown: (event: KeyboardEvent<HTMLDivElement>) =>
        handleRailKey(event, actor, options),
    },
  };
}

function startPointer(
  event: PointerEvent<HTMLDivElement>,
  actor: railGesture.RailActor,
  options: railGesture.RailOptions
): void {
  if (!isStartPointer(event) || actor.getSnapshot().context.gesture !== null) {
    return;
  }
  const target = event.target as Element;
  const railElement = options.railRef.current;
  if (railElement === null) {
    return;
  }
  const timer = railGesture.findTargetTimer(target, options.timers);
  if (actor.getSnapshot().context.selectedId !== null && timer === undefined) {
    actor.send({ type: "CANCEL" });
    return;
  }
  const next = createGesture(timer, options.color, Date.now());
  next.pointerId = event.pointerId;
  next.startY = event.clientY;
  event.preventDefault();
  event.currentTarget.setPointerCapture(event.pointerId);
  actor.send({
    type: next.timerId === null ? "START_CREATING" : "START_EDITING",
    gesture: next,
  });
}

function useGestureCancellation(actor: railGesture.RailActor): void {
  useEffect(() => {
    const reset = (): void => actor.send({ type: "CANCEL" });
    const onKey = (event: globalThis.KeyboardEvent): void => {
      if (event.key === "Escape") {
        reset();
      }
    };
    const onOutside = (event: globalThis.PointerEvent): void => {
      if (
        event.target instanceof Element &&
        event.target.closest(".start-pin, [data-timer-id], .timer-actions") ===
          null
      ) {
        reset();
      }
    };
    window.addEventListener("blur", reset);
    document.addEventListener("visibilitychange", reset);
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onOutside);
    return () => {
      window.removeEventListener("blur", reset);
      document.removeEventListener("visibilitychange", reset);
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onOutside);
    };
  }, [actor]);
}

function isStartPointer(event: PointerEvent<HTMLDivElement>): boolean {
  return (
    event.isPrimary &&
    event.button === 0 &&
    (event.target as Element).closest(".timer-actions") === null &&
    (event.target as Element).closest(".start-pin, [data-timer-id]") !== null
  );
}
