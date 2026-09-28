import type { CompletionNotificationDriver } from "./notificationDriver";
import type {
  DeliveryContext,
  NotificationDelivery,
  NotificationPort,
  NotificationSnapshot,
} from "./notificationPort";

export function createCompletionNotifications(
  driver: CompletionNotificationDriver
): NotificationPort {
  return {
    guidance: driver.guidance,
    unsupportedReason: driver.unsupportedReason,
    checkPermission: driver.checkPermission,
    requestPermission: driver.requestPermission,
    onRefresh: driver.onResume,
    createDelivery: (context) => new CompletionDelivery(driver, context),
  };
}

class CompletionDelivery implements NotificationDelivery {
  private active = false;
  private generation = 0;
  private revision = 0;
  private testRevision = 0;
  private snapshot: NotificationSnapshot | undefined;
  private attempted = "";
  private applied = "";
  private failed = false;
  private queue = Promise.resolve();
  constructor(
    private readonly driver: CompletionNotificationDriver,
    private readonly context: DeliveryContext
  ) {}
  start = (snapshot: NotificationSnapshot): (() => void) => {
    const generation = ++this.generation;
    this.active = true;
    this.attempted = "";
    this.update(snapshot);
    return () => {
      if (generation !== this.generation) {
        return;
      }
      this.active = false;
      this.generation++;
      this.revision++;
    };
  };
  update = (snapshot: NotificationSnapshot): void => {
    if (snapshot.mode !== "enabled") {
      this.testRevision++;
    }
    this.snapshot = snapshot;
    if (!this.active) {
      return;
    }
    const timers = snapshot.timers.filter(
      (timer) => timer.endAt <= snapshot.now
    );
    const key = JSON.stringify(timers.map(({ id, endAt }) => [id, endAt]));
    const intent = JSON.stringify([
      snapshot.mode,
      snapshot.timersComplete,
      key,
    ]);
    if (intent === this.attempted) {
      return;
    }
    this.attempted = intent;
    const revision = ++this.revision;
    const isCurrent = (): boolean => this.active && revision === this.revision;
    const target = completionTarget(snapshot, key, timers.length > 0);
    if (target === undefined || target === this.applied) {
      return;
    }
    this.queue = this.queue
      .then(async () => {
        if (!isCurrent()) {
          return;
        }
        // 외부 호출은 끝나기 전에 기기에 반영될 수 있다. 결과가 확정될 때까지
        // 이전 성공 기록을 비워서 도중에 온 끄기·확인이 정리를 생략하지 않게 한다.
        this.applied = "";
        if (target === "clear") {
          await this.driver.clearCompleted(isCurrent);
        } else {
          await this.driver.showCompleted(timers, isCurrent);
        }
        if (isCurrent()) {
          this.applied = target;
          this.failed = false;
        }
      })
      .catch(() => {
        if (isCurrent()) {
          this.failed = true;
          this.context.onFailure();
        }
      });
  };
  refresh = (): Promise<void> => {
    // 복귀·재조회가 성공한 알림을 재전송하지 않도록 실패한 작업만 재시도한다.
    if (this.active && this.failed && this.snapshot !== undefined) {
      this.attempted = "";
      this.update(this.snapshot);
    }
    return this.queue;
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

function completionTarget(
  snapshot: NotificationSnapshot,
  key: string,
  hasCompleted: boolean
): string | undefined {
  // 권한 보류는 기존 표시를 지우라는 뜻이 아니다. 명시적 끄기와 완료 확인만 닫는다.
  if (snapshot.mode === "off") {
    return "clear";
  }
  if (!hasCompleted) {
    return snapshot.timersComplete ? "clear" : undefined;
  }
  return snapshot.mode === "enabled" ? key : undefined;
}
