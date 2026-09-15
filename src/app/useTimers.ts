import { useEffect, useState } from "react";

import { remainingMs } from "@/domain/timer/timerMath";
import { loadTimers, saveTimers } from "@/domain/timer/timerStorage";
import type { TimerRecord } from "@/domain/timer/timerTypes";
import { getNotificationPort } from "@/platform/notifications";
import { startTimerWorker } from "@/workers/timerWorkerClient";

const notifications = getNotificationPort();

export function useTimers() {
  const [now, setNow] = useState(Date.now);
  const [timers, setTimers] = useState(() =>
    loadTimers().filter((timer) => timer.status !== "dismissed")
  );
  const runningTimers = timers.filter(
    (timer) => remainingMs(timer.endAt, now) > 0
  );
  const completedTimers = timers.filter(
    (timer) => remainingMs(timer.endAt, now) === 0
  );

  useEffect(() => startTimerWorker(() => setNow(Date.now())), []);
  useEffect(() => {
    const refresh = (): void => setNow(Date.now());
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, []);
  useEffect(() => saveTimers(timers), [timers]);
  useEffect(() => {
    if (completedTimers.length > 0) {
      notifications.startRepeatingAlert();
    }
    return () => notifications.stopRepeatingAlert();
  }, [completedTimers.length]);

  const createTimer = (durationMs: number, color: string): void => {
    const createdAt = Date.now();
    const timer: TimerRecord = {
      id: crypto.randomUUID(),
      color,
      createdAt,
      endAt: createdAt + durationMs,
      status: "running",
    };
    void notifications.ensurePermission();
    setNow(createdAt);
    setTimers((current) => [...current, timer]);
    void notifications.scheduleTimer(timer);
  };
  const dismissTimer = (id: string): void => {
    setTimers((current) => current.filter((timer) => timer.id !== id));
    void notifications.cancelTimer(id);
  };
  const updateTimer = (id: string, durationMs: number): void => {
    if (durationMs <= 0) {
      dismissTimer(id);
      return;
    }
    const timer = timers.find((item) => item.id === id);
    if (timer === undefined) {
      return;
    }
    const updated = { ...timer, endAt: Date.now() + durationMs };
    setNow(Date.now());
    setTimers((current) =>
      current.map((item) => (item.id === id ? updated : item))
    );
    void notifications
      .cancelTimer(id)
      .then(() => notifications.scheduleTimer(updated));
  };
  const acknowledge = (): void => {
    const ids = new Set(completedTimers.map((timer) => timer.id));
    setTimers((current) => current.filter((timer) => !ids.has(timer.id)));
    notifications.stopRepeatingAlert();
  };

  return {
    now,
    runningTimers,
    completedTimers,
    createTimer,
    updateTimer,
    dismissTimer,
    acknowledge,
  };
}
