import type { LocalNotifications } from "@capacitor/local-notifications";
import { beforeEach, expect, it, vi } from "vitest";

import { capacitorNotifications } from "@/platform/notifications/capacitorNotifications";
import { createScheduledNotifications } from "@/platform/notifications/scheduledNotifications";

import { createAppRuntime } from "./appRuntime";
import { createAppStore } from "./state/appStore";
import { testDependencies } from "./testDependencies";

const native = vi.hoisted(() => ({
  getPending: vi.fn<typeof LocalNotifications.getPending>(),
  checkPermissions: vi.fn(() => Promise.resolve({ display: "granted" })),
  schedule: vi.fn<typeof LocalNotifications.schedule>(() =>
    Promise.resolve({ notifications: [] })
  ),
  cancel: vi.fn<typeof LocalNotifications.cancel>(() => Promise.resolve()),
}));
vi.mock("@capacitor/local-notifications", () => ({
  LocalNotifications: native,
}));
beforeEach(() => vi.clearAllMocks());

it.each([
  [true, false],
  [true, true],
  [false, false],
  [false, true],
])(
  "preserves native reservations (legacy: %s, failed permission query: %s)",
  async (legacy, failQuery) => {
    const { deps, driver } = testDependencies();
    deps.now.mockReturnValue(1789);
    const timer = { id: "saved", createdAt: 1789, endAt: 61789, color: "blue" };
    native.checkPermissions.mockResolvedValue({ display: "granted" });
    native.getPending.mockResolvedValue({
      notifications: [
        {
          id: 123,
          title: "타이머",
          body: "완료",
          extra: legacy
            ? { timerId: timer.id }
            : { timerId: timer.id, endAt: timer.endAt },
          // iOS returns an ISO string without fractional seconds despite the Date type.
          schedule: { at: "1970-01-01T00:01:01Z" as unknown as Date },
        },
      ],
    });
    const app = createAppStore();
    const runtime = createAppRuntime(app, {
      ...deps,
      storage: {
        ...deps.storage,
        loadTimers: () => ({ ok: true, value: [timer] }),
      },
      notifications: createScheduledNotifications({
        ...capacitorNotifications,
        onResume: driver.onResume,
        onNotificationAction: driver.onNotificationAction,
      }),
    });
    try {
      runtime.start();
      await runtime.actions.refreshNotificationPermission();
      if (failQuery) {
        native.checkPermissions.mockRejectedValue(new Error("unavailable"));
      }
      await runtime.actions.refreshNotificationPermission();
      await new Promise((resolve) => setTimeout(resolve, 0));
      expect(native.cancel).not.toHaveBeenCalled();
      expect(native.schedule).not.toHaveBeenCalled();
      expect(app.getState().timers[0]?.endAt).toBe(timer.endAt);
      native.checkPermissions.mockResolvedValue({ display: "granted" });
      runtime.actions.adjustTimer(timer.id, 70000);
      await vi.waitFor(() => expect(native.schedule).toHaveBeenCalledOnce());
      expect(native.cancel).toHaveBeenCalledOnce();
      expect(
        native.schedule.mock.calls[0]?.[0].notifications[0]?.extra
      ).toEqual({ timerId: timer.id, endAt: 71789 });
      runtime.actions.disableNotifications();
      await vi.waitFor(() => expect(native.cancel).toHaveBeenCalledTimes(2));
    } finally {
      runtime.stop();
    }
  }
);
