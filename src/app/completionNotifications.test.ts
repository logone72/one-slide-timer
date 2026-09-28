import { expect, it, vi } from "vitest";

import { createCompletionNotifications } from "@/platform/notifications/completionNotifications";
import type { CompletionNotificationDriver } from "@/platform/notifications/notificationDriver";

import { createAppRuntime } from "./appRuntime";
import { createAppStore } from "./state/appStore";
import { testDependencies } from "./testDependencies";

function setup() {
  const { deps } = testDependencies();
  const notifications = {
    unsupportedReason: "",
    guidance: "웹 알림",
    checkPermission: vi.fn(() => Promise.resolve("granted" as const)),
    requestPermission: vi.fn(() => Promise.resolve("granted" as const)),
    sendTest: vi.fn(() => Promise.resolve()),
    onResume: () => () => undefined,
    showCompleted: vi.fn<CompletionNotificationDriver["showCompleted"]>(() =>
      Promise.resolve()
    ),
    clearCompleted: vi.fn(() => Promise.resolve()),
  } satisfies CompletionNotificationDriver;
  const app = createAppStore();
  const runtime = createAppRuntime(app, {
    ...deps,
    notifications: createCompletionNotifications(notifications),
  });
  runtime.start();
  return { app, runtime, notifications, deps };
}

it("delivers only once at completion and clears on acknowledgement", async () => {
  const { app, runtime, notifications, deps } = setup();
  await runtime.actions.refreshNotificationPermission();
  runtime.actions.startTimer(1000, "blue");
  await Promise.resolve();
  expect(notifications.showCompleted).not.toHaveBeenCalled();
  app.actions.setNow(2000);
  await vi.waitFor(() =>
    expect(notifications.showCompleted).toHaveBeenCalledOnce()
  );
  deps.now.mockReturnValue(3000);
  await runtime.actions.refreshNotificationPermission();
  app.actions.setNow(3000);
  await Promise.resolve();
  expect(notifications.showCompleted).toHaveBeenCalledOnce();
  notifications.clearCompleted.mockClear();
  runtime.actions.acknowledgeTimers(["timer"]);
  await vi.waitFor(() =>
    expect(notifications.clearCompleted).toHaveBeenCalled()
  );
  expect(app.getState().timers).toHaveLength(0);
  runtime.stop();
});

it("invalidates delayed delivery on explicit off and keeps internal audio running", async () => {
  const { app, runtime, notifications, deps } = setup();
  await runtime.actions.refreshNotificationPermission();
  let finish = (): void => undefined;
  let allowed = true;
  notifications.showCompleted.mockImplementation(
    (_timers, isCurrent) =>
      new Promise<void>((resolve) => {
        finish = () => {
          allowed = isCurrent();
          resolve();
        };
      })
  );
  runtime.actions.startTimer(1000, "blue");
  app.actions.setNow(2000);
  await vi.waitFor(() =>
    expect(notifications.showCompleted).toHaveBeenCalledOnce()
  );
  runtime.actions.disableNotifications();
  finish();
  await vi.waitFor(() => expect(allowed).toBe(false));
  expect(deps.audio.startAlertAudio).toHaveBeenCalledOnce();
  runtime.stop();
});

it("reports failure once, retries explicitly, and suppresses stopped work", async () => {
  const { app, runtime, notifications, deps } = setup();
  await runtime.actions.refreshNotificationPermission();
  notifications.showCompleted.mockRejectedValueOnce(
    new Error("display failed")
  );
  runtime.actions.startTimer(1000, "blue");
  deps.now.mockReturnValue(2000);
  app.actions.setNow(2000);
  await vi.waitFor(() =>
    expect(app.getState().notifications.failed).toBe(true)
  );
  app.actions.setNow(3000);
  await Promise.resolve();
  expect(notifications.showCompleted).toHaveBeenCalledOnce();
  await runtime.actions.requestNotifications();
  await vi.waitFor(() =>
    expect(notifications.showCompleted).toHaveBeenCalledTimes(2)
  );
  runtime.stop();
  expect(notifications.showCompleted.mock.calls[1]?.[1]()).toBe(false);
});

it("merges restored completions and invalidates acknowledgement during a permission refresh", async () => {
  const { app, runtime, notifications, deps } = setup();
  await runtime.actions.refreshNotificationPermission();
  const first = { id: "first", createdAt: 0, endAt: 2000, color: "blue" };
  const second = { ...first, id: "second", endAt: 3000 };
  app.actions.restoreTimers({ ok: true, value: [first, second] });
  app.actions.setNow(2000);
  await vi.waitFor(() =>
    expect(notifications.showCompleted).toHaveBeenCalledOnce()
  );
  app.actions.setNow(3000);
  await vi.waitFor(() =>
    expect(notifications.showCompleted).toHaveBeenCalledTimes(2)
  );
  expect(notifications.showCompleted.mock.calls[1]?.[0]).toEqual([
    first,
    second,
  ]);
  const isCurrent = notifications.showCompleted.mock.calls[1]?.[1];
  deps.now.mockReturnValue(3000);
  let resolve = (): void => undefined;
  notifications.checkPermission.mockImplementationOnce(
    () =>
      new Promise((done) => {
        resolve = () => done("granted");
      })
  );
  const refreshing = runtime.actions.refreshNotificationPermission();
  runtime.actions.acknowledgeTimers(["first", "second"]);
  expect(isCurrent?.()).toBe(false);
  resolve();
  await refreshing;
  runtime.stop();
});

it("does not report a delayed test as successful after the user switches notifications off", async () => {
  const { app, runtime, notifications } = setup();
  await runtime.actions.refreshNotificationPermission();
  let finish = (): void => undefined;
  notifications.sendTest.mockImplementationOnce(
    () =>
      new Promise<void>((resolve) => {
        finish = resolve;
      })
  );
  const sending = runtime.actions.sendTestNotification();
  await vi.waitFor(() => expect(notifications.sendTest).toHaveBeenCalledOnce());
  runtime.actions.disableNotifications();
  finish();
  await sending;
  expect(app.getState().notifications.message).toBe("");
  runtime.stop();
});
