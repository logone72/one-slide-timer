import type { TimerRecord } from "@/domain/timer/timerTypes";

import type {
  PendingTimerNotification,
  ScheduledNotificationDriver,
} from "./notificationDriver";

type BookingPort = Pick<
  ScheduledNotificationDriver,
  "scheduleTimer" | "cancelTimer"
>;

// 권한 대기는 ID별 네이티브 변경 큐 밖에 둔다. 취소를 권한 응답 뒤로 미루지 않는다.
export class NotificationSync {
  private desired = new Map<string, TimerRecord>();
  private readonly booked = new Map<string, PendingTimerNotification>();
  private readonly pending = new Map<string, Promise<void>>();
  private readonly checking = new Map<string, number>();
  private readonly removed = new Set<string>();
  private readonly versions = new Map<string, number>();
  private revision = 0;
  private authoritative = false;
  private active = true;
  private generation = 0;

  constructor(
    private readonly port: BookingPort,
    private readonly canSchedule: () => Promise<boolean>,
    private readonly onFailure: () => void,
    private readonly now: () => number = Date.now
  ) {}

  checkpoint(): number {
    return this.revision;
  }
  setActive(active: boolean): void {
    this.active = active;
    if (!active) {
      // 재연결에서는 같은 타이머라도 새 권한 확인을 시작한다. 이전 응답은 무효다.
      this.generation++;
      this.checking.clear();
    }
  }

  sync(timers: TimerRecord[], authoritative = true): void {
    const previous = this.desired;
    this.desired = new Map(timers.map((timer) => [timer.id, timer]));
    this.authoritative = authoritative;
    const ids = new Set([
      ...previous.keys(),
      ...this.desired.keys(),
      ...this.booked.keys(),
    ]);
    for (const id of ids) {
      if (previous.get(id)?.endAt !== this.desired.get(id)?.endAt) {
        if (this.desired.has(id)) {
          this.removed.delete(id);
        } else {
          this.removed.add(id);
        }
      }
      this.reconcile(id);
    }
  }

  restore(records: PendingTimerNotification[], checkpoint: number): void {
    const present = new Set(records.map((record) => record.id));
    for (const id of this.booked.keys()) {
      if (!present.has(id) && this.unchangedSince(id, checkpoint)) {
        this.booked.delete(id);
      }
    }
    for (const record of records) {
      if (this.unchangedSince(record.id, checkpoint)) {
        this.booked.set(record.id, record);
      }
    }
    for (const id of new Set([...this.booked.keys(), ...this.desired.keys()])) {
      this.reconcile(id);
    }
  }

  private unchangedSince(id: string, checkpoint: number): boolean {
    return (this.versions.get(id) ?? 0) <= checkpoint;
  }
  private matchesBooking(id: string, endAt: number | undefined): boolean {
    const booking = this.booked.get(id);
    if (booking === undefined || endAt === undefined) {
      return false;
    }
    const precision = booking.precisionMs ?? 1;
    return (
      Math.floor(booking.endAt / precision) === Math.floor(endAt / precision)
    );
  }
  private needsCancellation(id: string): boolean {
    const target = this.desired.get(id);
    return (
      this.booked.has(id) &&
      !this.matchesBooking(id, target?.endAt) &&
      (target !== undefined || this.authoritative || this.removed.has(id))
    );
  }

  private isCurrent(timer: TimerRecord): boolean {
    return (
      this.active &&
      this.desired.get(timer.id)?.endAt === timer.endAt &&
      timer.endAt > this.now()
    );
  }

  private reconcile(id: string): void {
    this.enqueue(id, async () => {
      if (!this.active) {
        return;
      }
      if (this.needsCancellation(id)) {
        await this.port.cancelTimer(id);
        this.booked.delete(id);
        this.versions.set(id, ++this.revision);
      }
      const latest = this.desired.get(id);
      if (
        latest !== undefined &&
        !this.matchesBooking(id, latest.endAt) &&
        this.isCurrent(latest)
      ) {
        this.prepare(latest);
      }
    });
  }

  private prepare(timer: TimerRecord): void {
    if (this.checking.get(timer.id) === timer.endAt) {
      return;
    }
    const generation = this.generation;
    this.checking.set(timer.id, timer.endAt);
    void this.canSchedule()
      .then((allowed) => {
        if (
          !allowed ||
          generation !== this.generation ||
          !this.isCurrent(timer)
        ) {
          return;
        }
        this.enqueue(timer.id, async () => {
          if (
            generation !== this.generation ||
            !this.isCurrent(timer) ||
            this.booked.has(timer.id)
          ) {
            return;
          }
          // 호출이 실패하더라도 OS에 반영되었을 수 있으므로 재시도에서 먼저 취소한다.
          this.booked.set(timer.id, { id: timer.id, endAt: 0 });
          this.versions.set(timer.id, ++this.revision);
          try {
            await this.port.scheduleTimer(timer);
            this.booked.set(timer.id, { id: timer.id, endAt: timer.endAt });
          } finally {
            this.versions.set(timer.id, ++this.revision);
          }
        });
      })
      .catch(this.onFailure)
      .finally(() => {
        if (
          generation === this.generation &&
          this.checking.get(timer.id) === timer.endAt
        ) {
          this.checking.delete(timer.id);
        }
      });
  }

  private enqueue(id: string, action: () => Promise<void>): void {
    const operation = (this.pending.get(id) ?? Promise.resolve())
      .then(action)
      .catch(this.onFailure);
    this.pending.set(id, operation);
    void operation.then(() => {
      if (this.pending.get(id) === operation) {
        this.pending.delete(id);
      }
    });
  }
}
