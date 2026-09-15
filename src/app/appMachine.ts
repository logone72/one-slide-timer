import { assign, setup } from "xstate";

import type { RailGesture } from "@/features/timer-rail/timerRailGeometry";

export const appMachine = setup({
  types: {
    context: {} as { gesture: RailGesture | null; selectedId: string | null },
    events: {} as
      | {
          type: "START_CREATING" | "START_EDITING" | "MOVE";
          gesture: RailGesture;
        }
      | { type: "SHOW_ACTIONS"; id: string }
      | { type: "FINISH" | "CANCEL" },
  },
  actions: {
    clear: assign({ gesture: null, selectedId: null }),
    setGesture: assign({
      gesture: ({ context, event }) =>
        "gesture" in event ? event.gesture : context.gesture,
      selectedId: null,
    }),
  },
}).createMachine({
  id: "oneSlideTimerApp",
  initial: "idle",
  context: { gesture: null, selectedId: null },
  on: {
    CANCEL: { target: ".idle", actions: "clear" },
    FINISH: { target: ".idle", actions: "clear" },
    SHOW_ACTIONS: {
      target: ".showingTimerActions",
      actions: assign({ gesture: null, selectedId: ({ event }) => event.id }),
    },
  },
  states: {
    idle: {
      on: {
        START_CREATING: { target: "creatingTimer", actions: "setGesture" },
        START_EDITING: { target: "editingTimer", actions: "setGesture" },
      },
    },
    creatingTimer: { on: { MOVE: { actions: "setGesture" } } },
    editingTimer: { on: { MOVE: { actions: "setGesture" } } },
    showingTimerActions: {
      on: {
        START_CREATING: { target: "creatingTimer", actions: "setGesture" },
        START_EDITING: { target: "editingTimer", actions: "setGesture" },
      },
    },
  },
});
