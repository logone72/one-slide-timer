import { expect, it } from "vitest";

import { DEFAULT_SETTINGS } from "@/domain/timer/timerTypes";

import { createAppRuntime } from "./appRuntime";
import { createAppStore } from "./state/appStore";
import { selectAudioEnabled } from "./state/notificationState";
import { testDependencies } from "./testDependencies";

it("persists off, stops completion audio, and keeps timers and device notifications independent", () => {
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
  runtime.actions.enableAudio();
  expect(deps.audio.startAlertAudio).toHaveBeenCalledTimes(2);
  runtime.stop();
});

it("restores ON before audio is ready and prepares only when creating a timer", async () => {
  const { deps } = testDependencies();
  deps.audio.isAlertAudioReady.mockReturnValue(false);
  const app = createAppStore();
  const runtime = createAppRuntime(app, deps);
  runtime.start();
  expect(selectAudioEnabled(app.getState())).toBe(true);
  expect(deps.audio.prepareAlertAudio).not.toHaveBeenCalled();
  expect(deps.audio.startAlertAudio).not.toHaveBeenCalled();
  deps.audio.prepareAlertAudio.mockResolvedValueOnce(false);
  runtime.actions.startTimer(1000, "blue");
  expect(deps.audio.prepareAlertAudio).toHaveBeenCalledOnce();
  await Promise.resolve();
  expect(selectAudioEnabled(app.getState())).toBe(true);
  expect(deps.audio.startAlertAudio).not.toHaveBeenCalled();
  app.actions.setNow(2000);
  expect(deps.audio.startAlertAudio).toHaveBeenCalledOnce();
  runtime.actions.disableAudio();
  deps.audio.prepareAlertAudio.mockClear();
  runtime.actions.startTimer(2000, "blue");
  expect(deps.audio.prepareAlertAudio).not.toHaveBeenCalled();
  runtime.actions.enableAudio();
  expect(selectAudioEnabled(app.getState())).toBe(true);
  expect(deps.audio.prepareAlertAudio).not.toHaveBeenCalled();
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
