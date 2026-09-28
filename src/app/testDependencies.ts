import { vi } from "vitest";

import { DEFAULT_SETTINGS } from "@/domain/timer/timerTypes";
import type { ScheduledNotificationDriver } from "@/platform/notifications/notificationDriver";
import { createScheduledNotifications } from "@/platform/notifications/scheduledNotifications";

import type { AppDependencies } from "./appDependencies";

export function testDependencies() {
  const worker = { update: vi.fn(), stop: vi.fn() };
  const driver = {
    unsupportedReason: "",
    guidance: "",
    checkPermission: () => Promise.resolve("unsupported"),
    requestPermission: () => Promise.resolve("unsupported"),
    scheduleTimer: () => Promise.resolve(),
    cancelTimer: () => Promise.resolve(),
    getPendingTimers: () => Promise.resolve([]),
    sendTest: () => Promise.resolve(),
    onResume: vi.fn(() => vi.fn()),
    onNotificationAction: () => () => undefined,
  } satisfies ScheduledNotificationDriver;
  const deps = {
    storage: {
      loadSettings: vi.fn(() => ({
        ok: true as const,
        value: DEFAULT_SETTINGS,
      })),
      loadTimers: vi.fn(() => ({ ok: true as const, value: [] })),
      saveSettings: vi.fn(() => true),
      saveTimers: vi.fn(() => true),
    },
    notifications: createScheduledNotifications(driver),
    audio: {
      prepareAlertAudio: vi.fn(() => Promise.resolve(true)),
      isAlertAudioReady: vi.fn(() => true),
      subscribeAlertAudio: vi.fn(() => vi.fn()),
      testAlertAudio: vi.fn(() => Promise.resolve(true)),
      startAlertAudio: vi.fn(),
      stopAlertAudio: vi.fn(),
    },
    now: vi.fn(() => 1000),
    newId: () => "timer",
    startWorker: vi.fn(() => worker),
    applyTheme: vi.fn(),
  } satisfies AppDependencies;
  return { deps, worker, driver };
}
