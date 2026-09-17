import { assign, setup } from "xstate";

import type { RailGesture } from "./timerRailGeometry";

export type TimerChange = Pick<RailGesture, "timerId" | "durationMs" | "color">;

const commitTimer: (_: unknown, change: TimerChange) => void = () => {
  // useRailInteraction에서 최신 타이머 생성·수정 콜백으로 제공한다.
};

const railSetup = setup({
  types: {
    context: {} as {
      gesture: RailGesture | null;
      selectedId: string | null;
      adjustingId: string | null;
    },
    events: {} as
      | { type: "START"; gesture: RailGesture }
      | { type: "MOVE"; durationMs: number }
      | { type: "SHOW_ACTIONS" | "OPEN_ADJUSTMENT"; id: string }
      | { type: "APPLY_ADJUSTMENT"; durationMs: number; color: string }
      | { type: "RELEASE" | "COMMIT" | "CANCEL" | "INTERRUPT" },
  },
  guards: {
    isNew: ({ event }) =>
      event.type === "START" && event.gesture.timerId === null,
    closesMenu: ({ event }) =>
      event.type === "START" &&
      event.gesture.timerId === null &&
      event.gesture.pointerId !== -1,
    hasMoved: ({ context }) => context.gesture?.moved === true,
    isNotAdjusting: ({ context }) => context.adjustingId === null,
  },
  actions: {
    clear: assign({ gesture: null, selectedId: null, adjustingId: null }),
    start: assign({
      gesture: ({ context, event }) =>
        event.type === "START" ? event.gesture : context.gesture,
      selectedId: null,
    }),
    move: assign({
      gesture: ({ context, event }) =>
        event.type === "MOVE" && context.gesture !== null
          ? { ...context.gesture, moved: true, durationMs: event.durationMs }
          : context.gesture,
    }),
    select: assign({
      selectedId: ({ context, event }) =>
        event.type === "SHOW_ACTIONS"
          ? event.id
          : (context.gesture?.timerId ?? null),
      gesture: null,
    }),
    openAdjustment: assign({
      adjustingId: ({ event }) =>
        event.type === "OPEN_ADJUSTMENT" ? event.id : "new",
      gesture: null,
      selectedId: null,
    }),
    commitTimer,
  },
});

export const railInteractionMachine = railSetup
  .extend({
    actions: {
      commitGesture: railSetup.enqueueActions(({ context, enqueue }) => {
        const change = context.gesture;
        if (
          change !== null &&
          (change.timerId !== null || change.durationMs > 0)
        ) {
          enqueue({ type: "commitTimer", params: change });
        }
      }),
      commitAdjustment: railSetup.enqueueActions(
        ({ context, event, enqueue }) => {
          if (event.type === "APPLY_ADJUSTMENT") {
            enqueue({
              type: "commitTimer",
              params: {
                timerId:
                  context.adjustingId === "new" ? null : context.adjustingId,
                durationMs: event.durationMs,
                color: event.color,
              },
            });
          }
        }
      ),
    },
  })
  .createMachine({
    id: "railInteraction",
    initial: "idle",
    context: { gesture: null, selectedId: null, adjustingId: null },
    on: {
      CANCEL: { target: ".idle" },
      INTERRUPT: { guard: "isNotAdjusting", target: ".idle" },
      OPEN_ADJUSTMENT: {
        guard: "isNotAdjusting",
        target: ".adjustingTime",
        actions: "openAdjustment",
      },
    },
    states: {
      idle: {
        entry: "clear",
        on: {
          START: [
            { guard: "isNew", target: "creatingTimer", actions: "start" },
            { target: "editingTimer", actions: "start" },
          ],
          SHOW_ACTIONS: { target: "showingTimerActions", actions: "select" },
        },
      },
      creatingTimer: {
        on: {
          MOVE: { actions: "move" },
          COMMIT: { target: "idle", actions: "commitGesture" },
          RELEASE: [
            { guard: "hasMoved", target: "idle", actions: "commitGesture" },
            { target: "adjustingTime", actions: "openAdjustment" },
          ],
          SHOW_ACTIONS: { target: "showingTimerActions", actions: "select" },
        },
      },
      editingTimer: {
        on: {
          MOVE: { actions: "move" },
          COMMIT: { target: "idle", actions: "commitGesture" },
          RELEASE: [
            { guard: "hasMoved", target: "idle", actions: "commitGesture" },
            { target: "showingTimerActions", actions: "select" },
          ],
          SHOW_ACTIONS: { target: "showingTimerActions", actions: "select" },
        },
      },
      showingTimerActions: {
        on: {
          START: [
            { guard: "closesMenu", target: "idle" },
            { guard: "isNew", target: "creatingTimer", actions: "start" },
            { target: "editingTimer", actions: "start" },
          ],
          SHOW_ACTIONS: { actions: "select" },
        },
      },
      adjustingTime: {
        on: {
          APPLY_ADJUSTMENT: { target: "idle", actions: "commitAdjustment" },
        },
      },
    },
  });
