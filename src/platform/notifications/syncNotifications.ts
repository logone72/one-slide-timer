import type { TimerRecord } from "@/domain/timer/timerTypes";

import type { NotificationPort } from "./notificationPort";

// 같은 ID의 예약·취소만 직렬화한다. 다른 타이머는 서로 기다리지 않는다.
export function createNotificationSync(
  port: NotificationPort,
  onFailure: () => void
) {
  let desired = new Map<string, TimerRecord>();
  const pending = new Map<string, Promise<void>>();
  const failed = new Set<string>();
  let permission: Promise<boolean> | undefined;
  return (timers: TimerRecord[], retry = false): void => {
    const next = new Map(timers.map((timer) => [timer.id, timer]));
    const ids = new Set([...desired.keys(), ...next.keys(), ...failed]);
    const previous = desired;
    desired = next;
    for (const id of ids) {
      if (!retry && previous.get(id)?.endAt === next.get(id)?.endAt) {
        continue;
      }
      const target = next.get(id);
      const operation = (pending.get(id) ?? Promise.resolve())
        .then(async () => {
          await port.cancelTimer(id);
          failed.delete(id);
          if (!isCurrent(target)) {
            return;
          }
          permission ??= port.ensurePermission().finally(() => {
            permission = undefined;
          });
          if (!(await permission)) {
            throw new Error("Notification permission denied");
          }
          if (isCurrent(target)) {
            await port.scheduleTimer(target);
          }
        })
        .catch(() => {
          failed.add(id);
          onFailure();
        });
      pending.set(id, operation);
      void operation.then(() => {
        if (pending.get(id) === operation) {
          pending.delete(id);
        }
      });
    }
  };
  function isCurrent(timer: TimerRecord | undefined): timer is TimerRecord {
    return (
      timer !== undefined &&
      desired.get(timer.id)?.endAt === timer.endAt &&
      timer.endAt > Date.now()
    );
  }
}
