import { expect, it, vi } from "vitest";

import { DEFAULT_SETTINGS } from "@/domain/timer/timerTypes";
import type { NotificationPermission } from "@/platform/notifications/notificationPort";
import { createScheduledNotifications } from "@/platform/notifications/scheduledNotifications";

import { createAppRuntime } from "./appRuntime";
import { createAppStore } from "./state/appStore";
import { testDependencies } from "./testDependencies";

it("discovers and cancels old bookings for saved off without waiting for permission", async () => {
  const { deps, driver } = testDependencies();
  deps.storage.loadSettings.mockReturnValue({
    ok: true,
    value: { ...DEFAULT_SETTINGS, notificationPreference: false },
  });
  const cancelled = vi.fn(() => Promise.resolve());
  const check = vi.fn(
    () => new Promise<NotificationPermission>(() => undefined)
  );
  const runtime = createAppRuntime(createAppStore(), {
    ...deps,
    notifications: createScheduledNotifications({
      ...driver,
      checkPermission: check,
      cancelTimer: cancelled,
      getPendingTimers: () => Promise.resolve([{ id: "old", endAt: 2000 }]),
    }),
  });
  runtime.start();
  await vi.waitFor(() =>
    expect(cancelled).toHaveBeenCalledExactlyOnceWith("old")
  );
  expect(check).toHaveBeenCalledOnce();
  runtime.stop();
});

it("does not cancel unread records or cancel native bookings on unmount", async () => {
  const { deps, driver } = testDependencies();
  const cancelled = vi.fn(() => Promise.resolve());
  const runtime = createAppRuntime(createAppStore(), {
    ...deps,
    storage: { ...deps.storage, loadTimers: () => ({ ok: false }) },
    notifications: createScheduledNotifications({
      ...driver,
      checkPermission: () => Promise.resolve("granted"),
      cancelTimer: cancelled,
      getPendingTimers: () => Promise.resolve([{ id: "unread", endAt: 60000 }]),
    }),
  });
  runtime.start();
  await runtime.actions.refreshNotificationPermission();
  runtime.stop();
  await new Promise((done) => setTimeout(done, 0));
  expect(cancelled).not.toHaveBeenCalled();
});

it("restores an unchanged existing booking before considering a new schedule", async () => {
  const { deps, driver } = testDependencies();
  const timer = { id: "saved", createdAt: 1, endAt: 60000, color: "blue" };
  const schedule = vi.fn(() => Promise.resolve());
  const cancel = vi.fn(() => Promise.resolve());
  let finish: (records: Array<{ id: string; endAt: number }>) => void = () =>
    undefined;
  const inventory = new Promise<Array<{ id: string; endAt: number }>>(
    (resolve) => {
      finish = resolve;
    }
  );
  const runtime = createAppRuntime(createAppStore(), {
    ...deps,
    storage: {
      ...deps.storage,
      loadTimers: () => ({ ok: true, value: [timer] }),
    },
    notifications: createScheduledNotifications({
      ...driver,
      checkPermission: () => Promise.resolve("granted"),
      getPendingTimers: () => inventory,
      scheduleTimer: schedule,
      cancelTimer: cancel,
    }),
  });
  runtime.start();
  await new Promise((done) => setTimeout(done, 0));
  expect(schedule).not.toHaveBeenCalled();
  finish([timer]);
  await runtime.actions.refreshNotificationPermission();
  await new Promise((done) => setTimeout(done, 0));
  expect(schedule).not.toHaveBeenCalled();
  expect(cancel).not.toHaveBeenCalled();
  runtime.stop();
});

it("honors explicit in-memory opt-in during a settings read failure", async () => {
  const { deps, driver } = testDependencies();
  const app = createAppStore();
  const schedule = vi.fn(() => Promise.resolve());
  const runtime = createAppRuntime(app, {
    ...deps,
    storage: { ...deps.storage, loadSettings: () => ({ ok: false }) },
    notifications: createScheduledNotifications({
      ...driver,
      checkPermission: () => Promise.resolve("granted"),
      scheduleTimer: schedule,
    }),
  });
  runtime.start();
  await runtime.actions.refreshNotificationPermission();
  runtime.actions.startTimer(60000, "blue");
  await new Promise((done) => setTimeout(done, 0));
  expect(schedule).not.toHaveBeenCalled();
  await runtime.actions.requestNotifications();
  await vi.waitFor(() => expect(schedule).toHaveBeenCalledOnce());
  expect(app.getState().editedSettings.notificationPreference).toBe(true);
  expect(deps.storage.saveSettings).not.toHaveBeenCalled();
  runtime.stop();
});

it("cancels actual reservations returned after the user switches off during startup discovery", async () => {
  const { deps, driver } = testDependencies();
  const timer = { id: "saved", createdAt: 1, endAt: 60000, color: "blue" };
  const cancel = vi.fn(() => Promise.resolve());
  let finish: (records: Array<{ id: string; endAt: number }>) => void = () =>
    undefined;
  const inventory = new Promise<Array<{ id: string; endAt: number }>>(
    (resolve) => {
      finish = resolve;
    }
  );
  const runtime = createAppRuntime(createAppStore(), {
    ...deps,
    storage: {
      ...deps.storage,
      loadTimers: () => ({ ok: true, value: [timer] }),
    },
    notifications: createScheduledNotifications({
      ...driver,
      getPendingTimers: () => inventory,
      cancelTimer: cancel,
    }),
  });
  runtime.start();
  runtime.actions.disableNotifications();
  finish([timer]);
  await vi.waitFor(() =>
    expect(cancel).toHaveBeenCalledExactlyOnceWith(timer.id)
  );
  runtime.stop();
});
