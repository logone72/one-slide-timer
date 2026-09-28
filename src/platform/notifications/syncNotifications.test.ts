import { expect, it, vi } from "vitest";

import type { TimerRecord } from "@/domain/timer/timerTypes";

import { NotificationSync } from "./syncNotifications";

const timer = { id: "one", color: "blue", createdAt: 0, endAt: 60000 };
function setup() {
  const port = {
    cancelTimer: vi.fn(() => Promise.resolve()),
    scheduleTimer: vi.fn<(timer: TimerRecord) => Promise<void>>(() =>
      Promise.resolve()
    ),
  };
  const permission = vi.fn(() => Promise.resolve(true));
  const failed = vi.fn();
  return {
    port,
    permission,
    failed,
    sync: new NotificationSync(port, permission, failed, () => 1000),
  };
}
it("never schedules a deleted target and cancellation does not wait for permission", async () => {
  const { port, permission, failed, sync } = setup();
  sync.sync([timer]);
  await vi.waitFor(() => expect(port.scheduleTimer).toHaveBeenCalledOnce());
  let resolve: (value: boolean) => void = () => undefined;
  permission.mockImplementation(
    () =>
      new Promise<boolean>((done) => {
        resolve = done;
      })
  );
  sync.sync([{ ...timer, endAt: 90000 }]);
  await vi.waitFor(() =>
    expect(port.cancelTimer).toHaveBeenCalledExactlyOnceWith(timer.id)
  );
  await vi.waitFor(() => expect(permission).toHaveBeenCalledTimes(2));
  sync.sync([]);
  resolve(true);
  await new Promise((done) => setTimeout(done, 0));
  expect(port.scheduleTimer).toHaveBeenCalledOnce();
  expect(failed).not.toHaveBeenCalled();
});
it("leaves only the latest deadline after rapid edits and a late schedule", async () => {
  const { port, sync } = setup();
  let finish = (): void => undefined;
  port.scheduleTimer.mockImplementationOnce(
    () =>
      new Promise<void>((done) => {
        finish = done;
      })
  );
  sync.sync([timer]);
  await vi.waitFor(() => expect(port.scheduleTimer).toHaveBeenCalledOnce());
  const latest = { ...timer, endAt: 120000 };
  sync.sync([{ ...timer, endAt: 90000 }]);
  sync.sync([latest]);
  finish();
  await vi.waitFor(() =>
    expect(port.scheduleTimer).toHaveBeenLastCalledWith(latest)
  );
  expect(port.cancelTimer).toHaveBeenCalledOnce();
  sync.sync([]);
  await vi.waitFor(() => expect(port.cancelTimer).toHaveBeenCalledTimes(2));
});
it("preserves unchanged reservations and defers denied permission without a plugin error", async () => {
  const { port, permission, failed, sync } = setup();
  sync.sync([timer]);
  await vi.waitFor(() => expect(port.scheduleTimer).toHaveBeenCalledOnce());
  permission.mockResolvedValue(false);
  sync.sync([timer]);
  await new Promise((done) => setTimeout(done, 0));
  expect(port.cancelTimer).not.toHaveBeenCalled();
  expect(permission).toHaveBeenCalledOnce();
  sync.sync([{ ...timer, endAt: 90000 }]);
  await vi.waitFor(() => expect(permission).toHaveBeenCalledTimes(2));
  expect(port.cancelTimer).toHaveBeenCalledOnce();
  expect(failed).not.toHaveBeenCalled();
  permission.mockResolvedValue(true);
  sync.sync([{ ...timer, endAt: 90000 }]);
  await vi.waitFor(() => expect(port.scheduleTimer).toHaveBeenCalledTimes(2));
});
it("retries failed cancellation after deletion, and blocks replacement until cancel succeeds", async () => {
  const { port, failed, sync } = setup();
  sync.sync([timer]);
  await vi.waitFor(() => expect(port.scheduleTimer).toHaveBeenCalledOnce());
  port.cancelTimer.mockRejectedValueOnce(new Error("offline"));
  sync.sync([{ ...timer, endAt: 90000 }]);
  await vi.waitFor(() => expect(failed).toHaveBeenCalledOnce());
  expect(port.scheduleTimer).toHaveBeenCalledOnce();
  port.cancelTimer.mockRejectedValueOnce(new Error("offline"));
  sync.sync([]);
  await vi.waitFor(() => expect(failed).toHaveBeenCalledTimes(2));
  sync.sync([]);
  await vi.waitFor(() => expect(port.cancelTimer).toHaveBeenCalledTimes(3));
});
it("protects unknown stored timers on read failure and cancels them on explicit off", async () => {
  const { port, sync } = setup();
  sync.sync([], false);
  sync.restore([timer], sync.checkpoint());
  await new Promise((done) => setTimeout(done, 0));
  expect(port.cancelTimer).not.toHaveBeenCalled();
  sync.sync([], true);
  await vi.waitFor(() =>
    expect(port.cancelTimer).toHaveBeenCalledWith(timer.id)
  );
});
it("does not reinstate stale inventory after a newer edit", async () => {
  const { port, sync } = setup();
  sync.sync([timer]);
  await vi.waitFor(() => expect(port.scheduleTimer).toHaveBeenCalledOnce());
  const checkpoint = sync.checkpoint();
  const latest = { ...timer, endAt: 90000 };
  sync.sync([latest]);
  await vi.waitFor(() => expect(port.scheduleTimer).toHaveBeenCalledTimes(2));
  sync.restore([timer], checkpoint);
  await new Promise((done) => setTimeout(done, 0));
  expect(port.cancelTimer).toHaveBeenCalledOnce();
  expect(port.scheduleTimer).toHaveBeenLastCalledWith(latest);
});
