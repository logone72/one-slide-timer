import { createMachine } from "xstate";

export const timerMachine = createMachine({
  id: "timer",
  initial: "running",
  states: {
    running: {
      on: {
        COMPLETE: "alerting",
        DISMISS: "dismissed",
      },
    },
    alerting: {
      on: {
        ACKNOWLEDGE: "dismissed",
      },
    },
    dismissed: {
      type: "final",
    },
  },
});
