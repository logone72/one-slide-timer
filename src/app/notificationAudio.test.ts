import { expect, it } from "vitest";

import { DEFAULT_SETTINGS } from "@/domain/timer/timerTypes";

import { createAppRuntime } from "./appRuntime";
import { createAppStore } from "./state/appStore";
import { testDependencies } from "./testDependencies";

it("persists off, stops completion audio, and keeps timers and device notifications independent", async () => {
  const { deps } = testDependencies();
  const app = createAppStore();
  const runtime = createAppRuntime(app, deps);
  runtime.start();
  runtime.actions.startTimer(1000, "blue");
  app.actions.setNow(2000);
  expect(deps.audio.startAlertAudio).toHaveBeenCalledOnce();
  runtime.actions.disableAudio();
  expect(deps.audio.stopAlertAudio).toHaveBeenCalledOnce();
  expect(deps.storage.saveSettings).toHaveBeenLastCalledWith({
    ...DEFAULT_SETTINGS,
    audioEnabled: false,
  });
  expect(app.getState().timers).toHaveLength(1);
  expect(app.getState().settings.notificationPreference).toBeNull();
  deps.audio.prepareAlertAudio.mockClear();
  runtime.actions.startTimer(2000, "blue");
  expect(deps.audio.prepareAlertAudio).not.toHaveBeenCalled();
  app.actions.setNow(4000);
  await runtime.actions.enableAudio();
  expect(deps.audio.startAlertAudio).toHaveBeenCalledTimes(2);
  runtime.stop();
});

it("keeps off after failed preparation or a late success following X, and testing does not enable audio", async () => {
  const { deps } = testDependencies();
  deps.storage.loadSettings.mockReturnValue({
    ok: true,
    value: { ...DEFAULT_SETTINGS, audioEnabled: false },
  });
  const app = createAppStore();
  const runtime = createAppRuntime(app, deps);
  runtime.start();
  deps.audio.prepareAlertAudio.mockResolvedValueOnce(false);
  await runtime.actions.enableAudio();
  expect(app.getState().settings.audioEnabled).toBe(false);
  let finish: (ready: boolean) => void = () => undefined;
  deps.audio.prepareAlertAudio.mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      })
  );
  const enabling = runtime.actions.enableAudio();
  runtime.actions.disableAudio();
  finish(true);
  await enabling;
  runtime.actions.testAudio();
  expect(app.getState().settings.audioEnabled).toBe(false);
  expect(deps.audio.testAlertAudio).toHaveBeenCalledOnce();
  runtime.stop();
});

it("does not play on unread settings and preserves a local X when storage recovers", () => {
  const { deps } = testDependencies();
  const app = createAppStore();
  app.actions.restoreSettings({ ok: false });
  app.actions.replaceTimers(
    [{ id: "done", createdAt: 0, endAt: 1, color: "blue" }],
    1000
  );
  const runtime = createAppRuntime(app, {
    ...deps,
    storage: { ...deps.storage, loadSettings: () => ({ ok: false }) },
  });
  runtime.start();
  expect(deps.audio.startAlertAudio).not.toHaveBeenCalled();
  runtime.actions.disableAudio();
  app.actions.restoreSettings({
    ok: true,
    value: { ...DEFAULT_SETTINGS, theme: "ocean" },
  });
  expect(app.getState().settings).toEqual({
    ...DEFAULT_SETTINGS,
    theme: "ocean",
    audioEnabled: false,
  });
  expect(deps.audio.startAlertAudio).not.toHaveBeenCalled();
  runtime.stop();
});
