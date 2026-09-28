import { createStore } from "zustand/vanilla";

import * as notification from "./notificationState";
import { createSettingsActions, initialSettingsState } from "./settingsState";
import { createTimerActions, initialTimerState } from "./timerState";

export type AppState = ReturnType<typeof initialTimerState> &
  ReturnType<typeof initialSettingsState> & {
    settingsOpen: boolean;
    notifications: notification.NotificationState;
  };

export function createAppStore(initial: Partial<AppState> = {}) {
  const store = createStore<AppState>()(() => ({
    ...initialTimerState(),
    ...initialSettingsState(),
    notifications: notification.initialNotificationState(),
    settingsOpen: false,
    ...initial,
  }));
  return {
    ...store,
    actions: {
      ...createTimerActions(store),
      ...createSettingsActions(store),
      ...notification.createNotificationActions(store),
      openSettings: (): void => store.setState({ settingsOpen: true }),
      closeSettings: (): void => store.setState({ settingsOpen: false }),
    },
  };
}

export type AppStore = ReturnType<typeof createAppStore>;
