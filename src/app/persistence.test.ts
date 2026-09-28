import { expect, it, vi } from "vitest";

import type { StorageRead } from "@/domain/timer/timerStorage";
import { DEFAULT_SETTINGS } from "@/domain/timer/timerTypes";

import { createPersistence } from "./persistence";
import { createAppStore } from "./state/appStore";

it("preserves unsaved settings and the failure across disconnect and reconnect", () => {
  const app = createAppStore();
  const storage = {
    loadSettings: vi.fn(() => ({ ok: true as const, value: DEFAULT_SETTINGS })),
    loadTimers: vi.fn(() => ({ ok: true as const, value: [] })),
    saveSettings: vi.fn(() => false),
    saveTimers: vi.fn(() => true),
  };
  const persistence = createPersistence(app, storage);
  const stop = persistence.start();
  app.actions.setTheme("ocean");
  stop();
  const stopAgain = persistence.start();
  expect(storage.loadSettings).toHaveBeenCalledOnce();
  expect(app.getState().settings.theme).toBe("ocean");
  expect(app.getState().settingsStorage.writeFailed).toBe(true);
  storage.saveSettings.mockReturnValue(true);
  persistence.retrySettings();
  expect(storage.saveSettings).toHaveBeenLastCalledWith({
    ...DEFAULT_SETTINGS,
    theme: "ocean",
  });
  expect(app.getState().settingsStorage.writeFailed).toBe(false);
  expect(createAppStore().getState().settings.theme).toBe("white");
  stopAgain();
});

it("protects unread data and merges only locally edited fields on explicit recovery", () => {
  const app = createAppStore();
  const stored = { id: "saved", createdAt: 1, endAt: 90000, color: "blue" };
  const local = { ...stored, id: "local" };
  const storage = {
    loadSettings: vi.fn<() => StorageRead<typeof DEFAULT_SETTINGS>>(() => ({
      ok: false,
    })),
    loadTimers: vi.fn<() => StorageRead<Array<typeof stored>>>(() => ({
      ok: false,
    })),
    saveSettings: vi.fn(() => true),
    saveTimers: vi.fn(() => true),
  };
  const persistence = createPersistence(app, storage);
  const stop = persistence.start();
  app.actions.setTheme("ocean");
  app.actions.setNotificationPreference(false);
  app.actions.replaceTimers([local], 100);
  stop();
  const stopAgain = persistence.start();
  expect(storage.loadTimers).toHaveBeenCalledOnce();
  expect(storage.saveTimers).not.toHaveBeenCalled();
  expect(storage.saveSettings).not.toHaveBeenCalled();
  storage.loadSettings.mockReturnValue({
    ok: true,
    value: { ...DEFAULT_SETTINGS, rangeMinutes: 180 },
  });
  storage.loadTimers.mockReturnValue({ ok: true, value: [stored] });
  persistence.retrySettings();
  persistence.retryTimers();
  expect(storage.saveSettings).toHaveBeenCalledExactlyOnceWith({
    ...DEFAULT_SETTINGS,
    rangeMinutes: 180,
    theme: "ocean",
    notificationPreference: false,
  });
  expect(storage.saveTimers).toHaveBeenCalledExactlyOnceWith([stored, local]);
  app.actions.setNow(90000);
  expect(storage.saveTimers).toHaveBeenCalledOnce();
  stopAgain();
});
