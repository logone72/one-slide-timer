import { expect, it } from "vitest";

import { createAppRuntime } from "./appRuntime";
import { createAppStore } from "./state/appStore";
import { testDependencies } from "./testDependencies";

it("keeps one active set of resources and preserves unsaved memory across restart", () => {
  const { deps, worker } = testDependencies();
  const app = createAppStore();
  const runtime = createAppRuntime(app, deps);
  expect(deps.storage.loadTimers).not.toHaveBeenCalled();
  expect(deps.startWorker).not.toHaveBeenCalled();
  runtime.start();
  runtime.start();
  expect(deps.startWorker).toHaveBeenCalledOnce();
  deps.storage.saveTimers.mockReturnValue(false);
  runtime.actions.startTimer(10000, "blue");
  runtime.actions.setTheme("ocean");
  const timers = app.getState().timers;
  const writes = deps.storage.saveTimers.mock.calls.length;
  const updates = worker.update.mock.calls.length;
  app.actions.setNow(5000);
  expect(deps.storage.saveTimers).toHaveBeenCalledTimes(writes);
  expect(worker.update).toHaveBeenCalledTimes(updates);
  expect(deps.applyTheme).toHaveBeenCalledTimes(2);
  runtime.stop();
  runtime.stop();
  expect(worker.stop).toHaveBeenCalledOnce();
  expect(
    deps.audio.subscribeAlertAudio.mock.results[0]?.value
  ).toHaveBeenCalledOnce();
  runtime.start();
  expect(deps.startWorker).toHaveBeenCalledTimes(2);
  expect(deps.storage.loadTimers).toHaveBeenCalledOnce();
  expect(app.getState().timers).toBe(timers);
  expect(app.getState().timerStorage.writeFailed).toBe(true);
  deps.storage.saveTimers.mockReturnValue(true);
  runtime.actions.retryTimerStorage();
  expect(deps.storage.saveTimers).toHaveBeenLastCalledWith(timers);
  expect(app.getState().timerStorage.writeFailed).toBe(false);
  runtime.stop();
});
