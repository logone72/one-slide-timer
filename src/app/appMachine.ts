import { createMachine } from "xstate";

export const appMachine = createMachine({
  id: "oneSlideTimerApp",
  initial: "idle",
  states: {
    idle: {
      on: {
        START_CREATING: "creatingTimer",
        START_EDITING: "editingTimer",
        SHOW_ACTIONS: "showingTimerActions",
      },
    },
    creatingTimer: {
      on: {
        FINISH: "idle",
        CANCEL: "idle",
      },
    },
    editingTimer: {
      on: {
        FINISH: "idle",
        CANCEL: "idle",
      },
    },
    showingTimerActions: {
      on: {
        FINISH: "idle",
        CANCEL: "idle",
      },
    },
  },
});
