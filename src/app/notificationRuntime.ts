import type { AppDependencies } from "./appDependencies";
import { connectAudio } from "./notificationAudio";
import { createPermissionController } from "./notificationPermission";
import type { AppStore } from "./state/appStore";
import {
  selectDeliverySnapshot,
  selectNotificationsEnabled,
} from "./state/notificationState";

export class NotificationRuntime {
  private active = false;
  private audioChoice = 0;
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
      this.audioChoice++;
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
  readonly enableAudio = async (): Promise<void> => {
    const choice = ++this.audioChoice;
    const ready = await this.deps.audio.prepareAlertAudio();
    // 준비 도중 X를 선택했다면 늦게 도착한 성공으로 다시 켜지 않는다.
    if (this.active && choice === this.audioChoice) {
      this.app.actions.setAudioEnabled(ready);
    }
  };
  readonly disableAudio = (): void => {
    this.audioChoice++;
    this.app.actions.setAudioEnabled(false);
  };
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
