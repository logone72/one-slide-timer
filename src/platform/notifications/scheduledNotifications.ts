import type { ScheduledNotificationDriver } from "./notificationDriver";
import type {
  DeliveryContext,
  NotificationDelivery,
  NotificationPort,
  NotificationSnapshot,
} from "./notificationPort";
import { NotificationSync } from "./syncNotifications";

export function createScheduledNotifications(
  driver: ScheduledNotificationDriver
): NotificationPort {
  return {
    guidance: driver.guidance,
    unsupportedReason: driver.unsupportedReason,
    checkPermission: driver.checkPermission,
    requestPermission: driver.requestPermission,
    onRefresh: (listener, onFailure) => {
      const resume = driver.onResume(listener, onFailure);
      const action = driver.onNotificationAction(listener, onFailure);
      return () => {
        resume();
        action();
      };
    },
    createDelivery: (context) => new ScheduledDelivery(driver, context),
  };
}

class ScheduledDelivery implements NotificationDelivery {
  private active = false;
  private generation = 0;
  private testRevision = 0;
  private snapshot: NotificationSnapshot | undefined;
  private inventoryReady = false;
  private inventory: Promise<void> | undefined;
  private readonly sync;
  constructor(
    private readonly driver: ScheduledNotificationDriver,
    private readonly context: DeliveryContext
  ) {
    this.sync = new NotificationSync(
      driver,
      this.canSchedule,
      context.onFailure,
      context.now
    );
    this.sync.setActive(false);
  }
  private readonly canSchedule = async (): Promise<boolean> => {
    const generation = this.generation;
    await this.inventory;
    if (
      !this.active ||
      !this.inventoryReady ||
      generation !== this.generation
    ) {
      return false;
    }
    const allowed = await this.context.confirmPermission();
    return (
      allowed &&
      generation === this.generation &&
      this.snapshot?.mode === "enabled"
    );
  };
  start = (snapshot: NotificationSnapshot): (() => void) => {
    const generation = ++this.generation;
    this.active = true;
    this.inventoryReady = false;
    this.sync.setActive(true);
    this.snapshot = undefined;
    this.update(snapshot);
    return () => {
      if (generation !== this.generation) {
        return;
      }
      this.active = false;
      this.generation++;
      this.sync.setActive(false);
    };
  };
  update = (snapshot: NotificationSnapshot): void => {
    const previous = this.snapshot;
    if (snapshot.mode !== "enabled") {
      this.testRevision++;
    }
    this.snapshot = snapshot;
    if (!this.active) {
      return;
    }
    // 초 갱신이나 화면 메시지는 예약 목표를 바꾸지 않는다. 권한 재조회의 반복도 막는다.
    if (
      previous?.timers === snapshot.timers &&
      previous.mode === snapshot.mode &&
      previous.timersComplete === snapshot.timersComplete
    ) {
      return;
    }
    this.synchronize();
  };
  private synchronize(): void {
    if (this.snapshot === undefined) {
      return;
    }
    const { timers, mode, timersComplete } = this.snapshot;
    // 보류 중에도 변경·삭제로 무효가 된 예약은 취소한다. 새 예약만 권한 확인을 기다린다.
    this.sync.sync(
      mode === "off" ? [] : timers,
      mode === "off" || timersComplete
    );
  }
  refresh = (): Promise<void> => {
    if (!this.active) {
      return Promise.resolve();
    }
    const generation = this.generation;
    const checkpoint = this.sync.checkpoint();
    // 목록 조회는 권한 대기와 독립적이다. 시작 시 저장된 X 선택도 기존 예약을 정리해야 한다.
    this.inventory ??= this.driver
      .getPendingTimers()
      .then((records) => {
        if (this.active && generation === this.generation) {
          this.inventoryReady = true;
          this.sync.restore(records, checkpoint);
        }
      })
      .catch(() => {
        if (this.active && generation === this.generation) {
          this.context.onFailure();
        }
      })
      .finally(() => {
        this.inventory = undefined;
      });
    return this.inventory.then(async () => {
      if (!this.active) {
        return;
      }
      // 재연결 전에 시작한 조회는 버리고 새 실행의 목록을 다시 확인한다.
      if (generation !== this.generation) {
        await this.refresh();
        return;
      }
      this.synchronize();
    });
  };
  sendTest = async (): Promise<"requested" | "skipped"> => {
    const generation = this.generation;
    const revision = this.testRevision;
    const isCurrent = (): boolean =>
      this.active &&
      generation === this.generation &&
      revision === this.testRevision &&
      this.snapshot?.mode === "enabled";
    if (!isCurrent()) {
      return "skipped";
    }
    await this.driver.sendTest(isCurrent);
    return isCurrent() ? "requested" : "skipped";
  };
}
