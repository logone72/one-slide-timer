import { vi } from "vitest";

import { DEFAULT_SETTINGS } from "@/domain/timer/timerTypes";
import { browserNotifications } from "@/platform/notifications/browserNotifications";

import type { AppDependencies } from "./appDependencies";

export function testDependencies() {
  const worker = { update: vi.fn(), stop: vi.fn() };
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
    notifications: { ...browserNotifications, onResume: vi.fn(() => vi.fn()) },
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
  return { deps, worker };
}
