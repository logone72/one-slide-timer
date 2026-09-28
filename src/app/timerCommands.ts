import type { AppStore } from "./state/appStore";

export type TimerEnvironment = {
  now: () => number;
  newId: () => string;
  prepareAudio: () => Promise<boolean>;
};

export function createTimerCommands(
  app: AppStore,
  environment: TimerEnvironment
) {
  const dismissTimer = (id: string): void => {
    const state = app.getState();
    const timers = state.timers.filter((timer) => timer.id !== id);
    if (timers.length !== state.timers.length) {
      app.actions.replaceTimers(timers, environment.now());
    }
  };
  return {
    dismissTimer,
    startTimer: (durationMs: number, color: string): void => {
      if (!Number.isFinite(durationMs) || durationMs <= 0) {
        return;
      }
      const createdAt = environment.now();
      void environment.prepareAudio();
      const timer = {
        id: environment.newId(),
        color,
        createdAt,
        endAt: createdAt + durationMs,
      };
      app.actions.replaceTimers([...app.getState().timers, timer], createdAt);
    },
    adjustTimer: (id: string, durationMs: number): void => {
      if (!Number.isFinite(durationMs)) {
        return;
      }
      if (durationMs <= 0) {
        dismissTimer(id);
        return;
      }
      const now = environment.now();
      const state = app.getState();
      if (!state.timers.some((timer) => timer.id === id && timer.endAt > now)) {
        return;
      }
      app.actions.replaceTimers(
        state.timers.map((timer) =>
          timer.id === id ? { ...timer, endAt: now + durationMs } : timer
        ),
        now
      );
    },
    acknowledgeTimers: (ids: string[]): void => {
      const now = environment.now();
      const selected = new Set(ids);
      const state = app.getState();
      const timers = state.timers.filter(
        (timer) => !selected.has(timer.id) || timer.endAt > now
      );
      if (timers.length !== state.timers.length) {
        app.actions.replaceTimers(timers, now);
      }
    },
  };
}
