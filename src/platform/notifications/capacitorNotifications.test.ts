import type { LocalNotifications } from "@capacitor/local-notifications";
import { beforeEach, expect, it, vi } from "vitest";

import { capacitorNotifications } from "./capacitorNotifications";

type Action = { notification: { extra: unknown } };
const native = vi.hoisted(() => ({
  schedule: vi.fn<typeof LocalNotifications.schedule>(() =>
    Promise.resolve({ notifications: [] })
  ),
  cancel: vi.fn<typeof LocalNotifications.cancel>(() => Promise.resolve()),
  checkPermissions: vi.fn(() => Promise.resolve({ display: "prompt" })),
  requestPermissions: vi.fn(() => Promise.resolve({ display: "granted" })),
  addListener:
    vi.fn<
      (
        name: string,
        listener: (event: Action) => void
      ) => Promise<{ remove: () => Promise<void> }>
    >(),
}));
vi.mock("@capacitor/local-notifications", () => ({
  LocalNotifications: native,
}));
beforeEach(() => vi.clearAllMocks());

it("preserves deadline and identity when scheduling, editing and cancelling native alerts", async () => {
  const timer = {
    id: "first-timer",
    color: "blue",
    createdAt: 1000,
    endAt: 1_800_123,
  };
  await capacitorNotifications.scheduleTimer(timer);
  const first = scheduledNotification(0);
  expect(first.schedule).toEqual({ at: new Date(timer.endAt) });
  expect(first.extra).toEqual({ timerId: timer.id });
  expect(Number.isInteger(first.id)).toBe(true);
  expect(first.id).toBeGreaterThanOrEqual(0);
  expect(first.id).toBeLessThanOrEqual(2_147_483_647);
  await capacitorNotifications.scheduleTimer({ ...timer, endAt: 2_400_321 });
  expect(native.schedule.mock.calls[1]?.[0].notifications).toEqual([
    { ...first, schedule: { at: new Date(2_400_321) } },
  ]);
  await capacitorNotifications.scheduleTimer({ ...timer, id: "second-timer" });
  const second = scheduledNotification(2);
  expect(second.id).not.toBe(first.id);
  await capacitorNotifications.cancelTimer(timer.id);
  await capacitorNotifications.cancelTimer("second-timer");
  expect(native.cancel.mock.calls).toEqual([
    [{ notifications: [{ id: first.id }] }],
    [{ notifications: [{ id: second.id }] }],
  ]);
});

function scheduledNotification(index: number) {
  const notification = native.schedule.mock.calls[index]?.[0].notifications[0];
  if (notification === undefined) {
    throw new Error("Native notification was not scheduled");
  }
  return notification;
}

it("propagates native scheduling and cancellation failures for retry", async () => {
  native.schedule.mockRejectedValueOnce(new Error("schedule failed"));
  await expect(
    capacitorNotifications.scheduleTimer({
      id: "one",
      color: "blue",
      createdAt: 0,
      endAt: 1000,
    })
  ).rejects.toThrow("schedule failed");
  native.cancel.mockRejectedValueOnce(new Error("cancel failed"));
  await expect(capacitorNotifications.cancelTimer("one")).rejects.toThrow(
    "cancel failed"
  );
});

it("reports actual permission state and does not repeatedly prompt after denial", async () => {
  native.checkPermissions.mockResolvedValueOnce({ display: "denied" });
  expect(await capacitorNotifications.ensurePermission()).toBe(false);
  expect(native.requestPermissions).not.toHaveBeenCalled();
  expect(await capacitorNotifications.ensurePermission()).toBe(true);
  expect(native.requestPermissions).toHaveBeenCalledOnce();
});

it("removes subscriptions that resolve after disposal and ignores late actions", async () => {
  let resolveFirst: (handle: { remove: () => Promise<void> }) => void = () =>
    undefined;
  const first = new Promise<{ remove: () => Promise<void> }>((resolve) => {
    resolveFirst = resolve;
  });
  const removeFirst = vi.fn(() => Promise.resolve());
  const removeSecond = vi.fn(() => Promise.resolve());
  native.addListener
    .mockReturnValueOnce(first)
    .mockResolvedValueOnce({ remove: removeSecond });
  const action = vi.fn();
  const failure = vi.fn();
  const disposeFirst = capacitorNotifications.onNotificationAction(
    action,
    failure
  );
  disposeFirst();
  const disposeSecond = capacitorNotifications.onNotificationAction(
    action,
    failure
  );
  resolveFirst({ remove: removeFirst });
  await vi.waitFor(() => expect(removeFirst).toHaveBeenCalledOnce());
  const event = { notification: { extra: { timerId: "one" } } };
  native.addListener.mock.calls[0]?.[1](event);
  native.addListener.mock.calls[1]?.[1](event);
  expect(action).toHaveBeenCalledOnce();
  disposeSecond();
  disposeSecond();
  expect(removeSecond).toHaveBeenCalledOnce();
  expect(failure).not.toHaveBeenCalled();
});

it("reports listener registration failures", async () => {
  native.addListener.mockRejectedValueOnce(new Error("unavailable"));
  const failure = vi.fn();
  const dispose = capacitorNotifications.onNotificationAction(vi.fn(), failure);
  await vi.waitFor(() => expect(failure).toHaveBeenCalledOnce());
  dispose();
});

it("ignores stale registration failures after a retry replaces the subscription", async () => {
  native.addListener.mockRejectedValueOnce(new Error("late failure"));
  const action = vi.fn();
  const failure = vi.fn();
  const dispose = capacitorNotifications.onNotificationAction(action, failure);
  dispose();
  const remove = vi.fn(() => Promise.resolve());
  native.addListener.mockResolvedValueOnce({ remove });
  const retryDispose = capacitorNotifications.onNotificationAction(
    action,
    failure
  );
  await vi.waitFor(() => expect(native.addListener).toHaveBeenCalledTimes(2));
  native.addListener.mock.calls[1]?.[1]({
    notification: { extra: { timerId: "one" } },
  });
  expect(action).toHaveBeenCalledOnce();
  expect(failure).not.toHaveBeenCalled();
  retryDispose();
  expect(remove).toHaveBeenCalledOnce();
});
