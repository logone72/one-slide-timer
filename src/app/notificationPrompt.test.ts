import { expect, it, vi } from "vitest";

import { DEFAULT_SETTINGS } from "@/domain/timer/timerTypes";

import { createAppRuntime } from "./appRuntime";
import { createAppStore } from "./state/appStore";
import { testDependencies } from "./testDependencies";

it.each([
  {
    permission: "granted",
    ready: true,
    hidden: false,
    off: false,
    open: false,
  },
  {
    permission: "granted",
    ready: false,
    hidden: false,
    off: false,
    open: false,
  },
  { permission: "denied", ready: true, hidden: false, off: false, open: true },
  {
    permission: "unsupported",
    ready: true,
    hidden: false,
    off: false,
    open: true,
  },
  { permission: "prompt", ready: false, hidden: true, off: false, open: false },
  { permission: "prompt", ready: false, hidden: false, off: true, open: true },
] as const)(
  "startup setup: %j",
  async ({ permission, ready, hidden, off, open }) => {
    const { deps } = testDependencies();
    deps.audio.isAlertAudioReady.mockReturnValue(ready);
    deps.storage.loadSettings.mockReturnValue({
      ok: true,
      value: {
        ...DEFAULT_SETTINGS,
        audioEnabled: !off,
        notificationPreference: off ? false : null,
        hideNotificationPrompt: hidden,
      },
    });
    deps.notifications.checkPermission = vi.fn(() =>
      Promise.resolve(permission)
    );
    deps.notifications.requestPermission = vi.fn(() =>
      Promise.resolve("granted" as const)
    );
    const app = createAppStore();
    const runtime = createAppRuntime(app, deps);
    runtime.start();
    await runtime.actions.refreshNotificationPermission();
    expect(app.getState().notifications.promptOpen).toBe(open);
    expect(deps.notifications.requestPermission).not.toHaveBeenCalled();
    if (open) {
      await runtime.actions.requestNotifications();
      expect(app.getState().notifications.promptOpen).toBe(true);
      runtime.actions.deferNotificationPrompt();
      await runtime.actions.refreshNotificationPermission();
      expect(app.getState().notifications.promptOpen).toBe(false);
      expect(app.getState().settings.hideNotificationPrompt).toBe(false);
    }
    runtime.stop();
  }
);

it("persists never ask again without changing either notification preference", async () => {
  const { deps } = testDependencies();
  deps.audio.isAlertAudioReady.mockReturnValue(false);
  const app = createAppStore();
  const runtime = createAppRuntime(app, deps);
  runtime.start();
  await runtime.actions.refreshNotificationPermission();
  expect(app.getState().notifications.promptOpen).toBe(true);
  runtime.actions.hideNotificationPrompt();
  expect(app.getState().notifications.promptOpen).toBe(false);
  expect(app.getState().settings).toEqual({
    ...DEFAULT_SETTINGS,
    hideNotificationPrompt: true,
  });
  expect(deps.storage.saveSettings).toHaveBeenLastCalledWith(
    app.getState().settings
  );
  runtime.stop();
  deps.storage.loadSettings.mockReturnValue({
    ok: true,
    value: app.getState().settings,
  });
  const restored = createAppStore();
  const next = createAppRuntime(restored, deps);
  next.start();
  await next.actions.refreshNotificationPermission();
  expect(restored.getState().notifications.promptOpen).toBe(false);
  next.stop();
});

it.each(["audio", "device"] as const)(
  "shows startup setup with only %s explicitly off",
  async (channel) => {
    const { deps } = testDependencies();
    deps.notifications.checkPermission = () => Promise.resolve("granted");
    deps.storage.loadSettings.mockReturnValue({
      ok: true,
      value: {
        ...DEFAULT_SETTINGS,
        audioEnabled: channel !== "audio",
        notificationPreference: channel !== "device",
      },
    });
    const app = createAppStore();
    const runtime = createAppRuntime(app, deps);
    runtime.start();
    await runtime.actions.refreshNotificationPermission();
    expect(app.getState().notifications.promptOpen).toBe(true);
    runtime.stop();
  }
);
