import type { App } from "@capacitor/app";
import type { LocalNotifications } from "@capacitor/local-notifications";
import { expect, it, vi } from "vitest";

import { capacitorNotifications } from "./capacitorNotifications";

const native = vi.hoisted(() => ({
  getPending: vi.fn<typeof LocalNotifications.getPending>(),
  schedule: vi.fn<typeof LocalNotifications.schedule>(() =>
    Promise.resolve({ notifications: [] })
  ),
  addListener: vi.fn<typeof App.addListener>(),
}));
vi.mock("@capacitor/local-notifications", () => ({
  LocalNotifications: native,
}));
vi.mock("@capacitor/app", () => ({ App: native }));

it("discovers only timer reservations and keeps test notifications separate", async () => {
  native.getPending.mockResolvedValue({
    notifications: [
      {
        id: 1,
        title: "타이머",
        body: "완료",
        extra: { timerId: "saved" },
        schedule: { at: new Date(60000) },
      },
      {
        id: -1,
        title: "테스트",
        body: "확인",
        extra: { notificationTest: true },
      },
      { id: 2, title: "다른 알림", body: "확인" },
    ],
  });
  expect(await capacitorNotifications.getPendingTimers()).toEqual([
    { id: "saved", endAt: 60000, precisionMs: 1000 },
  ]);
  await capacitorNotifications.sendTest();
  const test = native.schedule.mock.calls[0]?.[0].notifications[0];
  expect(test?.id).toBe(-1);
  expect(test?.extra).toEqual({ notificationTest: true });
});

it("removes a late native resume listener and only forwards active transitions", async () => {
  const remove = vi.fn(() => Promise.resolve());
  native.addListener.mockResolvedValue({ remove });
  const resume = vi.fn();
  const fail = vi.fn();
  const stop = capacitorNotifications.onResume(resume, fail);
  await vi.waitFor(() => expect(native.addListener).toHaveBeenCalledOnce());
  const callback = native.addListener.mock.calls[0]?.[1] as
    ((state: { isActive: boolean }) => void) | undefined;
  callback?.({ isActive: false });
  callback?.({ isActive: true });
  expect(resume).toHaveBeenCalledOnce();
  stop();
  stop();
  callback?.({ isActive: true });
  expect(resume).toHaveBeenCalledOnce();
  expect(remove).toHaveBeenCalledOnce();
  expect(fail).not.toHaveBeenCalled();
});
