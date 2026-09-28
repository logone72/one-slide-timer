import type * as timerStorage from "@/domain/timer/timerStorage";

import type { AppStore } from "./state/appStore";

export type AppStorage = Pick<
  typeof timerStorage,
  "loadTimers" | "saveTimers" | "loadSettings" | "saveSettings"
>;

export function createPersistence(app: AppStore, storage: AppStorage) {
  const saveTimers = (): void => {
    const state = app.getState();
    if (state.timerStorage.read !== "ready") {
      return;
    }
    app.actions.recordTimersWrite(storage.saveTimers(state.timers));
  };
  const saveSettings = (): void => {
    const state = app.getState();
    if (state.settingsStorage.read !== "ready") {
      return;
    }
    app.actions.recordSettingsWrite(storage.saveSettings(state.settings));
  };
  const loadTimers = (): void => {
    app.actions.restoreTimers(storage.loadTimers());
    saveTimers();
  };
  const loadSettings = (): void => {
    app.actions.restoreSettings(storage.loadSettings());
    saveSettings();
  };
  return {
    start: (): (() => void) => {
      if (app.getState().settingsStorage.read === "unread") {
        loadSettings();
      }
      if (app.getState().timerStorage.read === "unread") {
        loadTimers();
      }
      return app.subscribe((state, previous) => {
        if (
          state.timers !== previous.timers &&
          state.timerStorage.read === previous.timerStorage.read
        ) {
          saveTimers();
        }
        if (
          state.settings !== previous.settings &&
          state.settingsStorage.read === previous.settingsStorage.read
        ) {
          saveSettings();
        }
      });
    },
    retryTimers: (): void => {
      if (app.getState().timerStorage.read === "ready") {
        saveTimers();
      } else {
        loadTimers();
      }
    },
    retrySettings: (): void => {
      if (app.getState().settingsStorage.read === "ready") {
        saveSettings();
      } else {
        loadSettings();
      }
    },
  };
}
