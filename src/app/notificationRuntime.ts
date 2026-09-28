import { NotificationSync } from "@/platform/notifications/syncNotifications";

import type { AppDependencies } from "./appDependencies";
import { createPermissionController } from "./notificationPermission";
import type { AppStore } from "./state/appStore";
import { selectNotificationsEnabled } from "./state/notificationState";
import { selectHasCompleted } from "./state/timerState";

export class NotificationRuntime {
  private active = false;
  private inventoryReady = false;
  private inventory: Promise<void> | undefined;
  private stopListeners = (): void => undefined;
  private readonly permission;
  private readonly sync;
  constructor(
    private readonly app: AppStore,
    private readonly deps: AppDependencies
  ) {
    this.permission = createPermissionController(app, deps.notifications);
    this.sync = new NotificationSync(
      deps.notifications,
      async () => {
        await this.inventory;
        if (!this.inventoryReady) {
          return false;
        }
        await this.permission.refresh();
        return this.active && selectNotificationsEnabled(app.getState());
      },
      this.fail,
      deps.now
    );
  }
  private readonly fail = (): void => {
    if (this.active) {
      this.app.actions.updateNotifications({ failed: true });
    }
  };
  private isActive(): boolean {
    return this.active;
  }
  private synchronize(): void {
    const state = this.app.getState();
    const disabled = state.settings.notificationPreference === false;
    this.sync.sync(
      disabled ? [] : state.timers,
      disabled || state.timerStorage.read === "ready"
    );
  }
  private restore(): Promise<void> {
    const checkpoint = this.sync.checkpoint();
    this.inventory ??= this.deps.notifications
      .getPendingTimers()
      .then((records) => {
        if (this.active) {
          this.inventoryReady = true;
          this.sync.restore(records, checkpoint);
        }
      })
      .catch(this.fail)
      .finally(() => {
        this.inventory = undefined;
      });
    return this.inventory;
  }
  private listen(): void {
    this.stopListeners();
    const refresh = (): void => {
      void this.refreshNotificationPermission();
    };
    const action = this.deps.notifications.onNotificationAction(
      refresh,
      this.fail
    );
    const resume = this.deps.notifications.onResume(refresh, this.fail);
    this.stopListeners = () => {
      action();
      resume();
    };
  }
  start(): () => void {
    this.active = true;
    this.inventoryReady = false;
    this.permission.activate();
    this.sync.setActive(true);
    const stopAudio = connectAudio(this.app, this.deps);
    this.listen();
    this.synchronize();
    void this.refreshNotificationPermission();
    const unsubscribe = this.app.subscribe((state, previous) => {
      if (
        state.timers !== previous.timers ||
        state.settings.notificationPreference !==
          previous.settings.notificationPreference ||
        state.timerStorage.read !== previous.timerStorage.read ||
        state.settingsStorage.read !== previous.settingsStorage.read
      ) {
        this.synchronize();
      }
    });
    return () => {
      this.active = false;
      this.permission.deactivate();
      this.sync.setActive(false);
      unsubscribe();
      stopAudio();
      this.stopListeners();
    };
  }
  readonly refreshNotificationPermission = async (): Promise<void> => {
    this.app.actions.setNow(this.deps.now());
    await Promise.all([this.permission.refresh(), this.restore()]);
    if (this.active) {
      this.synchronize();
    }
  };
  readonly requestNotifications = async (): Promise<void> => {
    await this.permission.request();
    if (this.active) {
      this.synchronize();
    }
  };
  readonly disableNotifications = (): void => this.permission.disable();
  readonly deferNotificationPrompt = (): void => this.permission.defer();
  readonly enableAudio = (): void => {
    void this.deps.audio.prepareAlertAudio();
  };
  readonly testAudio = (): void => {
    void this.deps.audio.testAlertAudio();
  };
  readonly sendTestNotification = async (): Promise<void> => {
    await this.permission.refresh();
    if (!this.active || !selectNotificationsEnabled(this.app.getState())) {
      return;
    }
    try {
      await this.deps.notifications.sendTest();
      if (this.isActive()) {
        this.app.actions.updateNotifications({
          message: "테스트 알림을 요청했어요.",
        });
      }
    } catch {
      this.fail();
    }
  };
  readonly retryNotifications = (): void => {
    this.app.actions.updateNotifications({ failed: false });
    this.listen();
    void this.refreshNotificationPermission();
  };
}

function connectAudio(app: AppStore, deps: AppDependencies): () => void {
  const update = (): void =>
    app.actions.updateNotifications({
      audioReady: deps.audio.isAlertAudioReady(),
    });
  const stop = deps.audio.subscribeAlertAudio(update);
  update();
  if (selectHasCompleted(app.getState())) {
    deps.audio.startAlertAudio();
  }
  const unsubscribe = app.subscribe((state, previous) => {
    if (selectHasCompleted(state) === selectHasCompleted(previous)) {
      return;
    }
    if (selectHasCompleted(state)) {
      deps.audio.startAlertAudio();
    } else {
      deps.audio.stopAlertAudio();
    }
  });
  return () => {
    stop();
    unsubscribe();
    deps.audio.stopAlertAudio();
  };
}
