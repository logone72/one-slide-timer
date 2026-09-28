import { afterEach, expect, it, vi } from "vitest";

import { createBrowserDriver } from "./browserNotifications";

function setup(value: NotificationPermission = "default") {
  const api = {
    permission: value,
    requestPermission: vi.fn(() => {
      api.permission = "granted";
      return Promise.resolve("granted");
    }),
  };
  const worker = {
    active: {},
    showNotification: vi.fn(() => Promise.resolve()),
    getNotifications: vi.fn(() => Promise.resolve([{ close: vi.fn() }])),
  };
  const serviceWorker = {
    register: vi.fn(() => Promise.resolve(worker)),
    getRegistration: vi.fn(() => Promise.resolve(worker)),
  };
  vi.stubGlobal("window", { isSecureContext: true, Notification: api });
  vi.stubGlobal("Notification", api);
  vi.stubGlobal("navigator", { serviceWorker });
  return { port: createBrowserDriver(), api, worker, serviceWorker };
}
afterEach(() => vi.unstubAllGlobals());

it("checks capability without requesting and starts requests synchronously on user action", async () => {
  const { port, api, serviceWorker } = setup();
  expect(await port.checkPermission()).toBe("prompt");
  expect(api.requestPermission).not.toHaveBeenCalled();
  const requested = port.requestPermission();
  expect(api.requestPermission).toHaveBeenCalledOnce();
  expect(await requested).toBe("granted");
  expect(serviceWorker.register).not.toHaveBeenCalled();
  api.permission = "denied";
  expect(await port.requestPermission()).toBe("denied");
  expect(api.requestPermission).toHaveBeenCalledOnce();
  vi.stubGlobal("window", { isSecureContext: false, Notification: api });
  expect(await port.checkPermission()).toBe("unsupported");
  vi.stubGlobal("window", { isSecureContext: true });
  expect(await port.checkPermission()).toBe("unsupported");
});

it("uses service-worker notifications and closes only the completion tag", async () => {
  const { port, worker } = setup("granted");
  await port.showCompleted(
    [{ id: "one", endAt: 1000, createdAt: 0, color: "blue" }],
    () => true
  );
  expect(worker.showNotification).toHaveBeenCalledWith(
    "One Slide Timer",
    expect.objectContaining({ tag: "one-slide-timer-completed" })
  );
  await port.sendTest();
  expect(worker.showNotification).toHaveBeenLastCalledWith(
    "One Slide Timer",
    expect.objectContaining({ tag: "one-slide-timer-test" })
  );
  await port.clearCompleted(() => true);
  expect(worker.getNotifications).toHaveBeenCalledWith({
    tag: "one-slide-timer-completed",
  });
});

it("checks latest intent after worker registration and retries failed registration", async () => {
  const { port, worker, serviceWorker } = setup("granted");
  serviceWorker.register.mockRejectedValueOnce(
    new Error("registration failed")
  );
  await expect(port.sendTest()).rejects.toThrow("registration failed");
  let current = true;
  const sending = port.sendTest(() => current);
  current = false;
  await sending;
  expect(worker.showNotification).not.toHaveBeenCalled();
  await port.sendTest();
  expect(worker.showNotification).toHaveBeenCalledOnce();
  expect(serviceWorker.register).toHaveBeenCalledTimes(2);
});

it("waits for worker activation and does not close alerts after cleanup becomes obsolete", async () => {
  const { port, worker, serviceWorker } = setup("granted");
  const installing = Object.assign(new EventTarget(), { state: "installing" });
  serviceWorker.register.mockResolvedValueOnce({
    ...worker,
    active: null,
    installing,
  } as unknown as typeof worker);
  const sending = port.sendTest();
  await Promise.resolve();
  expect(worker.showNotification).not.toHaveBeenCalled();
  installing.state = "activated";
  installing.dispatchEvent(new Event("statechange"));
  await sending;
  expect(worker.showNotification).toHaveBeenCalledOnce();
  const close = vi.fn();
  worker.getNotifications.mockResolvedValueOnce([{ close }]);
  await port.clearCompleted(() => false);
  expect(close).not.toHaveBeenCalled();
});

it("uses the browser constructor when service workers are unavailable", async () => {
  setup("granted");
  const close = vi.fn();
  const api = Object.assign(
    vi.fn(function () {
      return { close, onclick: null };
    }),
    { permission: "granted" }
  );
  vi.stubGlobal("Notification", api);
  vi.stubGlobal("navigator", {});
  const port = createBrowserDriver();
  await port.sendTest();
  expect(api).toHaveBeenCalledOnce();
  await port.sendTest();
  expect(close).toHaveBeenCalledOnce();
});
