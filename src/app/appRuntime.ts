import type { AppDependencies } from "./appDependencies";
import { NotificationRuntime } from "./notificationRuntime";
import { createPersistence } from "./persistence";
import type { AppStore } from "./state/appStore";
import { createTimerCommands } from "./timerCommands";

export function createAppRuntime(app: AppStore, deps: AppDependencies) {
  const persistence = createPersistence(app, deps.storage);
  const notifications = new NotificationRuntime(app, deps);
  let cleanup: (() => void) | undefined;
  const refresh = (): void => app.actions.setNow(deps.now());
  const actions = {
    ...createTimerCommands(app, {
      now: deps.now,
      newId: deps.newId,
      prepareAudio: () =>
        app.getState().settings.audioEnabled
          ? deps.audio.prepareAlertAudio()
          : Promise.resolve(false),
    }),
    setTheme: app.actions.setTheme,
    setRangeMinutes: app.actions.setRangeMinutes,
    openSettings: app.actions.openSettings,
    closeSettings: app.actions.closeSettings,
    retryTimerStorage: persistence.retryTimers,
    retrySettingsStorage: persistence.retrySettings,
    enableAudio: notifications.enableAudio,
    disableAudio: notifications.disableAudio,
    testAudio: notifications.testAudio,
    sendTestNotification: notifications.sendTestNotification,
    requestNotifications: notifications.requestNotifications,
    disableNotifications: notifications.disableNotifications,
    deferNotificationPrompt: notifications.deferNotificationPrompt,
    refreshNotificationPermission: notifications.refreshNotificationPermission,
    retryNotifications: notifications.retryNotifications,
  };
  return {
    actions,
    start: (): void => {
      if (cleanup !== undefined) {
        return;
      }
      const stopPersistence = persistence.start();
      refresh();
      deps.applyTheme(app.getState().settings.theme);
      const worker = deps.startWorker(refresh);
      worker.update(app.getState().timers.map((timer) => timer.endAt));
      const unsubscribe = app.subscribe((state, previous) => {
        if (state.timers !== previous.timers) {
          worker.update(state.timers.map((timer) => timer.endAt));
        }
        if (state.settings.theme !== previous.settings.theme) {
          deps.applyTheme(state.settings.theme);
        }
      });
      const stopNotifications = notifications.start();
      cleanup = () => {
        stopNotifications();
        unsubscribe();
        worker.stop();
        stopPersistence();
      };
    },
    stop: (): void => {
      cleanup?.();
      cleanup = undefined;
    },
  };
}

export type AppActions = ReturnType<typeof createAppRuntime>["actions"];
