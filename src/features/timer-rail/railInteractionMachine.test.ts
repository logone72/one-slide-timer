import { expect, test, vi } from "vitest";
import { createActor } from "xstate";

import * as interaction from "./railInteractionMachine";
import { createGesture } from "./timerRailGeometry";

const timer = { id: "existing", color: "blue", createdAt: 0, endAt: 60_000 };
const fresh = () => createGesture(undefined, "green", 0);
const existing = () => createGesture(timer, "green", 0);

function startActor() {
  const commit = vi.fn<(change: interaction.TimerChange) => void>();
  const actor = createActor(
    interaction.railInteractionMachine.provide({
      actions: { commitTimer: (_, change) => commit(change) },
    })
  ).start();
  return { actor, commit };
}

test("ignores movement and confirmation when no interaction is active", () => {
  const { actor, commit } = startActor();
  actor.send({ type: "MOVE", durationMs: 10_000 });
  actor.send({ type: "COMMIT" });
  actor.send({ type: "RELEASE" });
  actor.send({ type: "APPLY_ADJUSTMENT", durationMs: 10_000, color: "green" });
  expect(actor.getSnapshot().value).toBe("idle");
  expect(commit).not.toHaveBeenCalled();
});

test("ignores duplicate starts and commits the latest move exactly once", () => {
  const { actor, commit } = startActor();
  actor.send({ type: "START", gesture: fresh() });
  actor.send({ type: "START", gesture: existing() });
  expect(actor.getSnapshot().value).toBe("creatingTimer");
  actor.send({ type: "MOVE", durationMs: 20_000 });
  actor.send({ type: "MOVE", durationMs: 30_000 });
  actor.send({ type: "RELEASE" });
  actor.send({ type: "RELEASE" });
  actor.send({ type: "COMMIT" });
  expect(commit).toHaveBeenCalledExactlyOnceWith(
    expect.objectContaining({
      timerId: null,
      durationMs: 30_000,
      color: "green",
    })
  );
  expect(actor.getSnapshot().context).toEqual({
    gesture: null,
    selectedId: null,
    adjustingId: null,
  });
});

test("keeps the existing timer identity and commits zero to end it early", () => {
  const { actor, commit } = startActor();
  actor.send({ type: "START", gesture: existing() });
  expect(actor.getSnapshot().value).toBe("editingTimer");
  actor.send({ type: "MOVE", durationMs: 0 });
  actor.send({ type: "COMMIT" });
  expect(commit).toHaveBeenCalledExactlyOnceWith(
    expect.objectContaining({
      timerId: timer.id,
      durationMs: 0,
      color: timer.color,
    })
  );
  actor.send({ type: "COMMIT" });
  expect(commit).toHaveBeenCalledTimes(1);
});

test("does not create a timer when a zero duration is confirmed", () => {
  const { actor, commit } = startActor();
  actor.send({ type: "START", gesture: fresh() });
  actor.send({ type: "MOVE", durationMs: 0 });
  actor.send({ type: "COMMIT" });
  expect(actor.getSnapshot().value).toBe("idle");
  expect(commit).not.toHaveBeenCalled();
});

test.each(["CANCEL", "INTERRUPT"] as const)(
  "%s discards the draft and menu without saving",
  (type) => {
    const { actor, commit } = startActor();
    actor.send({ type: "START", gesture: existing() });
    actor.send({ type: "MOVE", durationMs: 120_000 });
    actor.send({ type });
    actor.send({ type: "COMMIT" });
    expect(actor.getSnapshot().context.gesture).toBeNull();
    actor.send({ type: "SHOW_ACTIONS", id: timer.id });
    actor.send({ type });
    expect(actor.getSnapshot().value).toBe("idle");
    expect(actor.getSnapshot().context.selectedId).toBeNull();
    expect(commit).not.toHaveBeenCalled();
  }
);

test("a start-pin tap opens adjustment, ignores unrelated events and applies once", () => {
  const { actor, commit } = startActor();
  actor.send({ type: "START", gesture: fresh() });
  actor.send({ type: "RELEASE" });
  expect(actor.getSnapshot().value).toBe("adjustingTime");
  expect(actor.getSnapshot().context).toEqual({
    gesture: null,
    selectedId: null,
    adjustingId: "new",
  });
  actor.send({ type: "INTERRUPT" });
  actor.send({ type: "SHOW_ACTIONS", id: timer.id });
  actor.send({ type: "START", gesture: existing() });
  actor.send({ type: "COMMIT" });
  actor.send({ type: "MOVE", durationMs: 90_000 });
  const apply = {
    type: "APPLY_ADJUSTMENT",
    durationMs: 70_000,
    color: "green",
  } as const;
  actor.send(apply);
  actor.send(apply);
  expect(commit).toHaveBeenCalledExactlyOnceWith({
    timerId: null,
    durationMs: 70_000,
    color: "green",
  });
  expect(actor.getSnapshot().value).toBe("idle");
});

test("an existing timer tap opens actions and adjustment clears its selection", () => {
  const { actor, commit } = startActor();
  actor.send({ type: "START", gesture: existing() });
  actor.send({ type: "RELEASE" });
  expect(actor.getSnapshot().value).toBe("showingTimerActions");
  expect(actor.getSnapshot().context.selectedId).toBe(timer.id);
  actor.send({ type: "OPEN_ADJUSTMENT", id: timer.id });
  expect(actor.getSnapshot().context.selectedId).toBeNull();
  actor.send({ type: "APPLY_ADJUSTMENT", durationMs: 80_000, color: "green" });
  expect(commit).toHaveBeenCalledExactlyOnceWith({
    timerId: timer.id,
    durationMs: 80_000,
    color: "green",
  });
});

test("opening adjustment discards the keyboard preview and cancellation prevents saving", () => {
  const { actor, commit } = startActor();
  actor.send({
    type: "START",
    gesture: { ...fresh(), moved: true, durationMs: 10_000 },
  });
  actor.send({ type: "OPEN_ADJUSTMENT", id: "new" });
  expect(actor.getSnapshot().context.gesture).toBeNull();
  actor.send({ type: "CANCEL" });
  actor.send({ type: "APPLY_ADJUSTMENT", durationMs: 60_000, color: "green" });
  expect(actor.getSnapshot().context.adjustingId).toBeNull();
  expect(commit).not.toHaveBeenCalled();
});

test("the start pin closes an open menu on pointer down but supports keyboard creation", () => {
  const { actor } = startActor();
  actor.send({ type: "SHOW_ACTIONS", id: timer.id });
  actor.send({ type: "START", gesture: { ...fresh(), pointerId: 1 } });
  expect(actor.getSnapshot().value).toBe("idle");
  actor.send({ type: "SHOW_ACTIONS", id: timer.id });
  actor.send({ type: "START", gesture: fresh() });
  expect(actor.getSnapshot().value).toBe("creatingTimer");
  expect(actor.getSnapshot().context.selectedId).toBeNull();
});
