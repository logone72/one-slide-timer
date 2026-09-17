import { beforeEach, expect, it, vi } from "vitest";

import { capacitorNotifications } from "./capacitorNotifications";

type Action = { notification: { extra: unknown } };
const native = vi.hoisted(() => ({
  checkPermissions: vi.fn(() => Promise.resolve({ display: "prompt" })),
  requestPermissions: vi.fn(() => Promise.resolve({ display: "granted" })),
  addListener:
    vi.fn<
      (
        name: string,
        listener: (event: Action) => void
      ) => Promise<{ remove: () => Promise<void> }>
    >(),
}));
vi.mock("@capacitor/local-notifications", () => ({
  LocalNotifications: native,
}));
beforeEach(() => vi.clearAllMocks());

it("reports actual permission state and does not repeatedly prompt after denial", async () => {
  native.checkPermissions.mockResolvedValueOnce({ display: "denied" });
  expect(await capacitorNotifications.ensurePermission()).toBe(false);
  expect(native.requestPermissions).not.toHaveBeenCalled();
  expect(await capacitorNotifications.ensurePermission()).toBe(true);
  expect(native.requestPermissions).toHaveBeenCalledOnce();
});

it("removes subscriptions that resolve after disposal and ignores late actions", async () => {
  let resolveFirst: (handle: { remove: () => Promise<void> }) => void = () =>
    undefined;
  const first = new Promise<{ remove: () => Promise<void> }>((resolve) => {
    resolveFirst = resolve;
  });
  const removeFirst = vi.fn(() => Promise.resolve());
  const removeSecond = vi.fn(() => Promise.resolve());
  native.addListener
    .mockReturnValueOnce(first)
    .mockResolvedValueOnce({ remove: removeSecond });
  const action = vi.fn();
  const failure = vi.fn();
  const disposeFirst = capacitorNotifications.onNotificationAction(
    action,
    failure
  );
  disposeFirst();
  const disposeSecond = capacitorNotifications.onNotificationAction(
    action,
    failure
  );
  resolveFirst({ remove: removeFirst });
  await vi.waitFor(() => expect(removeFirst).toHaveBeenCalledOnce());
  const event = { notification: { extra: { timerId: "one" } } };
  native.addListener.mock.calls[0]?.[1](event);
  native.addListener.mock.calls[1]?.[1](event);
  expect(action).toHaveBeenCalledOnce();
  disposeSecond();
  disposeSecond();
  expect(removeSecond).toHaveBeenCalledOnce();
  expect(failure).not.toHaveBeenCalled();
});

it("reports listener registration failures", async () => {
  native.addListener.mockRejectedValueOnce(new Error("unavailable"));
  const failure = vi.fn();
  const dispose = capacitorNotifications.onNotificationAction(vi.fn(), failure);
  await vi.waitFor(() => expect(failure).toHaveBeenCalledOnce());
  dispose();
});

it("ignores stale registration failures after a retry replaces the subscription", async () => {
  native.addListener.mockRejectedValueOnce(new Error("late failure"));
  const action = vi.fn();
  const failure = vi.fn();
  const dispose = capacitorNotifications.onNotificationAction(action, failure);
  dispose();
  const remove = vi.fn(() => Promise.resolve());
  native.addListener.mockResolvedValueOnce({ remove });
  const retryDispose = capacitorNotifications.onNotificationAction(
    action,
    failure
  );
  await vi.waitFor(() => expect(native.addListener).toHaveBeenCalledTimes(2));
  native.addListener.mock.calls[1]?.[1]({
    notification: { extra: { timerId: "one" } },
  });
  expect(action).toHaveBeenCalledOnce();
  expect(failure).not.toHaveBeenCalled();
  retryDispose();
  expect(remove).toHaveBeenCalledOnce();
});
