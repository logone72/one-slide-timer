import { expect, it, vi } from "vitest";

import type { NotificationPermission } from "@/platform/notifications/notificationPort";

import { createAppRuntime } from "./appRuntime";
import { createAppStore } from "./state/appStore";
import {
  selectNotificationsEnabled,
  selectShouldPrompt,
} from "./state/notificationState";
import { testDependencies } from "./testDependencies";

function setup(permission: NotificationPermission = "prompt") {
  const { deps } = testDependencies();
  const notifications = {
    ...deps.notifications,
    checkPermission: vi.fn(() => Promise.resolve(permission)),
    requestPermission: vi.fn(() =>
      Promise.resolve<NotificationPermission>("granted")
    ),
    scheduleTimer: vi.fn(() => Promise.resolve()),
    cancelTimer: vi.fn(() => Promise.resolve()),
    getPendingTimers: vi.fn(() =>
      Promise.resolve<Array<{ id: string; endAt: number }>>([])
    ),
    sendTest: vi.fn(() => Promise.resolve()),
  };
  notifications.requestPermission.mockImplementation(() => {
    notifications.checkPermission.mockResolvedValue("granted");
    return Promise.resolve("granted");
  });
  const app = createAppStore();
  const runtime = createAppRuntime(app, { ...deps, notifications });
  return { app, runtime, notifications, deps };
}

it("checks on startup without prompting, deduplicates startup, and only requests from the command", async () => {
  const { app, runtime, notifications } = setup();
  runtime.start();
  runtime.stop();
  runtime.start();
  await vi.waitFor(() => expect(selectShouldPrompt(app.getState())).toBe(true));
  expect(notifications.checkPermission).toHaveBeenCalledOnce();
  expect(notifications.requestPermission).not.toHaveBeenCalled();
  runtime.actions.startTimer(60000, "blue");
  await vi.waitFor(() =>
    expect(notifications.checkPermission.mock.calls.length).toBeGreaterThan(1)
  );
  expect(notifications.requestPermission).not.toHaveBeenCalled();
  await Promise.all([
    runtime.actions.requestNotifications(),
    runtime.actions.requestNotifications(),
  ]);
  expect(notifications.requestPermission).toHaveBeenCalledOnce();
  expect(selectNotificationsEnabled(app.getState())).toBe(true);
  await vi.waitFor(() =>
    expect(notifications.scheduleTimer).toHaveBeenCalledOnce()
  );
  runtime.actions.disableNotifications();
  await vi.waitFor(() =>
    expect(notifications.cancelTimer).toHaveBeenCalledOnce()
  );
  expect(selectNotificationsEnabled(app.getState())).toBe(false);
  runtime.stop();
});

it("ignores an obsolete read and does not let a late grant override explicit off", async () => {
  const { app, runtime, notifications } = setup();
  runtime.start();
  await vi.waitFor(() => expect(selectShouldPrompt(app.getState())).toBe(true));
  const read = deferredPermission();
  notifications.checkPermission.mockReturnValueOnce(read.promise);
  const refreshing = runtime.actions.refreshNotificationPermission();
  const request = deferredPermission();
  notifications.requestPermission.mockReturnValueOnce(request.promise);
  const requesting = runtime.actions.requestNotifications();
  runtime.actions.disableNotifications();
  request.resolve("granted");
  await requesting;
  read.resolve("denied");
  await refreshing;
  expect(app.getState().notifications.permission).toBe("granted");
  expect(app.getState().settings.notificationPreference).toBe(false);
  expect(selectNotificationsEnabled(app.getState())).toBe(false);
  runtime.stop();
});

it("retains preference on external denial, but records failed requests as off", async () => {
  const { app, runtime, notifications } = setup();
  runtime.start();
  await vi.waitFor(() => expect(selectShouldPrompt(app.getState())).toBe(true));
  notifications.requestPermission.mockResolvedValueOnce("denied");
  await runtime.actions.requestNotifications();
  expect(app.getState().settings.notificationPreference).toBe(false);
  notifications.checkPermission.mockResolvedValue("granted");
  await runtime.actions.refreshNotificationPermission();
  expect(selectNotificationsEnabled(app.getState())).toBe(false);
  await runtime.actions.requestNotifications();
  expect(selectNotificationsEnabled(app.getState())).toBe(true);
  notifications.checkPermission.mockResolvedValue("denied");
  await runtime.actions.refreshNotificationPermission();
  expect(app.getState().settings.notificationPreference).toBe(true);
  expect(selectNotificationsEnabled(app.getState())).toBe(false);
  runtime.stop();
});

it("rechecks before new bookings and shares the failed or denied result with the UI", async () => {
  const { app, runtime, notifications } = setup("granted");
  runtime.start();
  await runtime.actions.refreshNotificationPermission();
  notifications.checkPermission.mockRejectedValueOnce(new Error("unavailable"));
  runtime.actions.startTimer(60000, "blue");
  await vi.waitFor(() =>
    expect(app.getState().notifications.phase).toBe("error")
  );
  expect(notifications.scheduleTimer).not.toHaveBeenCalled();
  notifications.checkPermission.mockResolvedValue("denied");
  await runtime.actions.refreshNotificationPermission();
  expect(app.getState().notifications.permission).toBe("denied");
  expect(notifications.scheduleTimer).not.toHaveBeenCalled();
  notifications.checkPermission.mockResolvedValue("granted");
  await runtime.actions.refreshNotificationPermission();
  await vi.waitFor(() =>
    expect(notifications.scheduleTimer).toHaveBeenCalledOnce()
  );
  runtime.stop();
});

it("keeps audio independent and test notifications out of actual timers", async () => {
  const { app, runtime, notifications, deps } = setup("granted");
  runtime.start();
  await runtime.actions.refreshNotificationPermission();
  runtime.actions.startTimer(1000, "blue");
  deps.now.mockReturnValue(2000);
  app.actions.setNow(2000);
  expect(deps.audio.startAlertAudio).toHaveBeenCalledOnce();
  runtime.actions.disableNotifications();
  runtime.actions.testAudio();
  expect(deps.audio.testAlertAudio).toHaveBeenCalledOnce();
  expect(deps.audio.stopAlertAudio).not.toHaveBeenCalled();
  await runtime.actions.sendTestNotification();
  expect(notifications.sendTest).not.toHaveBeenCalled();
  await runtime.actions.requestNotifications();
  const timers = app.getState().timers;
  await runtime.actions.sendTestNotification();
  expect(notifications.sendTest).toHaveBeenCalledOnce();
  expect(app.getState().timers).toBe(timers);
  runtime.actions.acknowledgeTimers(["timer"]);
  expect(deps.audio.stopAlertAudio).toHaveBeenCalledOnce();
  runtime.stop();
});

function deferredPermission() {
  let resolve: (value: NotificationPermission) => void = () => undefined;
  const promise = new Promise<NotificationPermission>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}
