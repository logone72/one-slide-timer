import { expect, it, vi } from "vitest";

import { createCompletionNotifications } from "./completionNotifications";
import type {
  CompletionNotificationDriver,
  PendingTimerNotification,
  ScheduledNotificationDriver,
} from "./notificationDriver";
import type { NotificationSnapshot } from "./notificationPort";
import { createScheduledNotifications } from "./scheduledNotifications";

const timer = { id: "timer", createdAt: 0, endAt: 2000, color: "blue" };
const input: NotificationSnapshot = {
  timers: [timer],
  now: 1000,
  timersComplete: true,
  mode: "enabled",
};
function setup() {
  const driver = {
    guidance: "",
    unsupportedReason: "",
    checkPermission: () => Promise.resolve("granted" as const),
    requestPermission: () => Promise.resolve("granted" as const),
    onResume: () => () => undefined,
    onNotificationAction: () => () => undefined,
    sendTest: vi.fn<CompletionNotificationDriver["sendTest"]>(() =>
      Promise.resolve()
    ),
    showCompleted: vi.fn<CompletionNotificationDriver["showCompleted"]>(() =>
      Promise.resolve()
    ),
    clearCompleted: vi.fn<CompletionNotificationDriver["clearCompleted"]>(() =>
      Promise.resolve()
    ),
    getPendingTimers: vi.fn<ScheduledNotificationDriver["getPendingTimers"]>(
      () => Promise.resolve([])
    ),
    scheduleTimer: vi.fn(() => Promise.resolve()),
    cancelTimer: vi.fn(() => Promise.resolve()),
  };
  const context = {
    now: () => 1000,
    confirmPermission: vi.fn(() => Promise.resolve(true)),
    onFailure: vi.fn(),
  };
  return { driver, context };
}

for (const [name, create] of [
  ["web", createCompletionNotifications],
  ["native", createScheduledNotifications],
] as const) {
  it(`${name} cancels an obsolete test across off/on and reconnect without caller guards`, async () => {
    const { driver, context } = setup();
    const delivery = create(driver).createDelivery(context);
    let finish = (): void => undefined;
    let current = true;
    driver.sendTest.mockImplementation(
      (isCurrent = () => true) =>
        new Promise<void>((resolve) => {
          finish = () => {
            current = isCurrent();
            resolve();
          };
        })
    );
    const stop = delivery.start(input);
    const sending = delivery.sendTest();
    delivery.update({ ...input, mode: "off" });
    delivery.update(input);
    finish();
    expect(await sending).toBe("skipped");
    expect(current).toBe(false);
    const next = delivery.sendTest();
    stop();
    const stopAgain = delivery.start(input);
    finish();
    expect(await next).toBe("skipped");
    stopAgain();
  });
}

it("web clears an in-flight display even when the last successful action already cleared", async () => {
  const { driver, context } = setup();
  const delivery =
    createCompletionNotifications(driver).createDelivery(context);
  const stop = delivery.start({ ...input, timers: [] });
  await delivery.refresh();
  expect(driver.clearCompleted).toHaveBeenCalledOnce();
  let finish = (): void => undefined;
  driver.showCompleted.mockImplementation(
    () =>
      new Promise<void>((resolve) => {
        finish = resolve;
      })
  );
  delivery.update({ ...input, now: 2000 });
  await vi.waitFor(() => expect(driver.showCompleted).toHaveBeenCalledOnce());
  delivery.update({ ...input, now: 2000, mode: "off" });
  finish();
  await delivery.refresh();
  expect(driver.clearCompleted).toHaveBeenCalledTimes(2);
  stop();
});

it("web preserves delivered alerts across permission holds and reconnects, but clears on explicit off", async () => {
  const { driver, context } = setup();
  const delivery =
    createCompletionNotifications(driver).createDelivery(context);
  const completed = { ...input, now: 2000 };
  const stop = delivery.start(completed);
  await delivery.refresh();
  delivery.update({ ...completed, mode: "paused" });
  await delivery.refresh();
  expect(driver.clearCompleted).not.toHaveBeenCalled();
  stop();
  const stopAgain = delivery.start(completed);
  await delivery.refresh();
  expect(driver.showCompleted).toHaveBeenCalledOnce();
  delivery.update({ ...completed, timers: [], timersComplete: false });
  await delivery.refresh();
  expect(driver.clearCompleted).not.toHaveBeenCalled();
  delivery.update({
    ...completed,
    timers: [],
    timersComplete: false,
    mode: "off",
  });
  await delivery.refresh();
  expect(driver.clearCompleted).toHaveBeenCalledOnce();
  stopAgain();
});

it("native ignores an old inventory response after reconnect and discovers the current inventory itself", async () => {
  const { driver, context } = setup();
  let finish: (records: PendingTimerNotification[]) => void = () => undefined;
  driver.getPendingTimers.mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      })
  );
  driver.getPendingTimers.mockResolvedValue([{ id: "current", endAt: 3000 }]);
  const delivery = createScheduledNotifications(driver).createDelivery(context);
  const stop = delivery.start(input);
  const oldRead = delivery.refresh();
  stop();
  const stopAgain = delivery.start({ ...input, mode: "off" });
  const newRead = delivery.refresh();
  finish([{ id: "obsolete", endAt: 2000 }]);
  await Promise.all([oldRead, newRead]);
  await vi.waitFor(() =>
    expect(driver.cancelTimer).toHaveBeenCalledExactlyOnceWith("current")
  );
  expect(driver.scheduleTimer).not.toHaveBeenCalled();
  stopAgain();
});

it("native reconnects without waiting for an obsolete permission check", async () => {
  const { driver, context } = setup();
  let finish: (allowed: boolean) => void = () => undefined;
  context.confirmPermission.mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      })
  );
  const delivery = createScheduledNotifications(driver).createDelivery(context);
  const stop = delivery.start(input);
  await delivery.refresh();
  await vi.waitFor(() =>
    expect(context.confirmPermission).toHaveBeenCalledOnce()
  );
  stop();
  const stopAgain = delivery.start(input);
  await delivery.refresh();
  await vi.waitFor(() =>
    expect(driver.scheduleTimer).toHaveBeenCalledExactlyOnceWith(timer)
  );
  finish(true);
  await new Promise((resolve) => setTimeout(resolve, 0));
  expect(driver.scheduleTimer).toHaveBeenCalledOnce();
  stopAgain();
});
