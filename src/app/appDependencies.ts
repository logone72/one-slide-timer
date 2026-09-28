import * as storage from "@/domain/timer/timerStorage";
import type { ThemeId } from "@/domain/timer/timerTypes";
import { getNotificationPort } from "@/platform/notifications";
import * as audio from "@/platform/notifications/alertAudio";
import type { NotificationPort } from "@/platform/notifications/notificationPort";
import { startTimerWorker } from "@/workers/timerWorkerClient";

import type { AppStorage } from "./persistence";

export type AppDependencies = {
  storage: AppStorage;
  notifications: NotificationPort;
  audio: typeof audio;
  now: () => number;
  newId: () => string;
  startWorker: typeof startTimerWorker;
  applyTheme: (theme: ThemeId) => void;
};

export function browserDependencies(): AppDependencies {
  return {
    storage,
    audio,
    notifications: getNotificationPort(),
    now: Date.now,
    newId: () => crypto.randomUUID(),
    startWorker: startTimerWorker,
    applyTheme: (theme) => {
      const root = document.documentElement;
      root.dataset.theme = theme;
      document
        .querySelector('meta[name="theme-color"]')
        ?.setAttribute(
          "content",
          getComputedStyle(root).getPropertyValue("--color-surface").trim()
        );
    },
  };
}
