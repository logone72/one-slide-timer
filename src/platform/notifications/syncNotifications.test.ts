import { expect, it, vi } from "vitest";

import type { TimerRecord } from "@/domain/timer/timerTypes";

import type { NotificationPort } from "./notificationPort";
import { createNotificationSync } from "./syncNotifications";

const timer: TimerRecord = {
  id: "one",
  color: "blue",
  createdAt: 0,
  endAt: Date.now() + 60_000,
};
function port() {
  return {
    ensurePermission: vi.fn(() => Promise.resolve(true)),
    cancelTimer: vi.fn(() => Promise.resolve()),
    scheduleTimer: vi.fn<(timer: TimerRecord) => Promise<void>>(() =>
      Promise.resolve()
    ),
    onNotificationAction: () => () => undefined,
  } satisfies NotificationPort;
}

it("waits for permission and never reserves a timer deleted while waiting", async () => {
  const adapter = port();
  let grant: (value: boolean) => void = () => undefined;
  adapter.ensurePermission.mockImplementation(
    () =>
      new Promise((resolve) => {
        grant = resolve;
      })
  );
  const failed = vi.fn();
  const sync = createNotificationSync(adapter, failed);
  sync([timer]);
  await vi.waitFor(() =>
    expect(adapter.ensurePermission).toHaveBeenCalledOnce()
  );
  expect(adapter.scheduleTimer).not.toHaveBeenCalled();
  sync([]);
  grant(true);
  await vi.waitFor(() => expect(adapter.cancelTimer).toHaveBeenCalledTimes(2));
  expect(adapter.scheduleTimer).not.toHaveBeenCalled();
  expect(failed).not.toHaveBeenCalled();
});

it("leaves only the latest deadline scheduled after rapid edits", async () => {
  const adapter = port();
  const scheduled = new Map<string, number>();
  adapter.scheduleTimer.mockImplementation((value) => {
    scheduled.set(value.id, value.endAt);
    return Promise.resolve();
  });
  adapter.cancelTimer.mockImplementation(() => {
    scheduled.delete(timer.id);
    return Promise.resolve();
  });
  const sync = createNotificationSync(adapter, vi.fn());
  sync([timer]);
  const latest = { ...timer, endAt: timer.endAt + 30_000 };
  sync([{ ...timer, endAt: timer.endAt + 10_000 }]);
  sync([latest]);
  await vi.waitFor(() => expect(scheduled.get(timer.id)).toBe(latest.endAt));
  sync([]);
  await vi.waitFor(() => expect(scheduled.size).toBe(0));
});

it("reports denial and failed operations without unhandled rejections", async () => {
  const adapter = port();
  const failed = vi.fn();
  const sync = createNotificationSync(adapter, failed);
  adapter.ensurePermission.mockResolvedValue(false);
  sync([timer]);
  await vi.waitFor(() => expect(failed).toHaveBeenCalledOnce());
  expect(adapter.scheduleTimer).not.toHaveBeenCalled();
  adapter.cancelTimer.mockRejectedValue(new Error("offline"));
  sync([]);
  await vi.waitFor(() => expect(failed).toHaveBeenCalledTimes(2));
});

it("retries failed cancellation even after the timer has been removed", async () => {
  const adapter = port();
  const failed = vi.fn();
  const sync = createNotificationSync(adapter, failed);
  sync([timer]);
  await vi.waitFor(() => expect(adapter.scheduleTimer).toHaveBeenCalledOnce());
  adapter.cancelTimer.mockRejectedValueOnce(new Error("offline"));
  sync([]);
  await vi.waitFor(() => expect(failed).toHaveBeenCalledOnce());
  sync([], true);
  await vi.waitFor(() => expect(adapter.cancelTimer).toHaveBeenCalledTimes(3));
  expect(adapter.scheduleTimer).toHaveBeenCalledOnce();
});
