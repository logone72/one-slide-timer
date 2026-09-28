import type { AppDependencies } from "./appDependencies";
import { connectAudio } from "./notificationAudio";
import { createPermissionController } from "./notificationPermission";
import type { AppStore } from "./state/appStore";
import {
  needsNotificationSetup,
  selectDeliverySnapshot,
  selectNotificationsEnabled,
} from "./state/notificationState";

export class NotificationRuntime {
  private active = false;
  private stopListeners = (): void => undefined;
  private readonly permission;
  private readonly delivery;
  constructor(
    private readonly app: AppStore,
    private readonly deps: AppDependencies
  ) {
    this.permission = createPermissionController(app, deps.notifications);
    this.delivery = deps.notifications.createDelivery({
      now: deps.now,
      onFailure: this.fail,
      confirmPermission: async () => {
        await this.permission.refresh();
        return this.canNotify();
      },
    });
  }

  private readonly fail = (): void => {
    if (this.active) {
      this.app.actions.updateNotifications({ failed: true });
    }
  };
  private canNotify(): boolean {
    return this.active && selectNotificationsEnabled(this.app.getState());
  }
  private synchronize(): void {
    const state = this.app.getState();
    // 초기 조회가 끝난 뒤 한 번만 판단한다. 모달은 요청 결과와 무관하게 명시적으로 닫는다.
    if (
      !state.notifications.promptHandled &&
      state.settingsStorage.read === "ready" &&
      (state.notifications.phase === "error" ||
        (state.notifications.phase === "idle" &&
          state.notifications.permission !== null))
    ) {
      this.app.actions.updateNotifications({
        promptHandled: true,
        promptOpen:
          !state.settings.hideNotificationPrompt &&
          needsNotificationSetup(state),
      });
    }
    this.delivery.update(selectDeliverySnapshot(this.app.getState()));
  }
  private listen(): void {
    this.stopListeners();
    const refresh = (): void => {
      void this.refreshNotificationPermission();
    };
    this.stopListeners = this.deps.notifications.onRefresh(refresh, this.fail);
  }

  start(): () => void {
    this.active = true;
    this.permission.activate();
    this.app.actions.updateNotifications({
      guidance: this.deps.notifications.guidance,
      unsupportedReason: this.deps.notifications.unsupportedReason,
    });
    const stopDelivery = this.delivery.start(
      selectDeliverySnapshot(this.app.getState())
    );
    const stopAudio = connectAudio(this.app, this.deps);
    this.listen();
    this.synchronize();
    void this.refreshNotificationPermission();
    // 전달 방식에 관계없이 같은 입력을 보낸다. 실행 기록과 중복 방지는 adapter가 맡는다.
    const unsubscribe = this.app.subscribe(() => this.synchronize());
    return () => {
      this.active = false;
      this.permission.deactivate();
      stopDelivery();
      unsubscribe();
      stopAudio();
      this.stopListeners();
    };
  }
  readonly refreshNotificationPermission = async (): Promise<void> => {
    this.app.actions.setNow(this.deps.now());
    await Promise.all([this.permission.refresh(), this.delivery.refresh()]);
    if (this.active) {
      this.synchronize();
    }
  };
  readonly requestNotifications = async (): Promise<void> => {
    await this.permission.request();
    if (this.active) {
      if (this.app.getState().notifications.failed) {
        this.retryNotifications();
      } else {
        this.synchronize();
      }
    }
  };
  readonly disableNotifications = (): void => this.permission.disable();
  readonly deferNotificationPrompt = (): void => this.permission.defer();
  readonly hideNotificationPrompt = (): void => {
    this.app.actions.hideNotificationPrompt();
    this.permission.defer();
  };
  readonly enableAudio = (): void => this.app.actions.setAudioEnabled(true);
  readonly disableAudio = (): void => this.app.actions.setAudioEnabled(false);
  readonly testAudio = (): void => {
    void this.deps.audio.testAlertAudio();
  };
  readonly sendTestNotification = async (): Promise<void> => {
    await this.permission.refresh();
    if (!this.canNotify()) {
      return;
    }
    try {
      const result = await this.delivery.sendTest();
      if (result === "requested" && this.canNotify()) {
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
