import { useCallback, useEffect, useRef, useState } from "react";

import { remainingMs } from "@/domain/timer/timerMath";
import { loadTimers, saveTimers } from "@/domain/timer/timerStorage";
import type { TimerRecord } from "@/domain/timer/timerTypes";
import { startTimerWorker } from "@/workers/timerWorkerClient";

import { useStoredState } from "./useStoredState";
import { useTimerNotifications } from "./useTimerNotifications";

const mergeTimers = (stored: TimerRecord[], current: TimerRecord[]) => [
  ...new Map(
    [...stored, ...current].map((timer) => [timer.id, timer])
  ).values(),
];

export function useTimers() {
  const [now, setNow] = useState(Date.now);
  const refresh = useCallback(() => setNow(Date.now()), []);
  const store = useStoredState(loadTimers, saveTimers, [], mergeTimers);
  const timers = store.value;
  const ticker = useRef<ReturnType<typeof startTimerWorker> | null>(null);
  const runningTimers = timers.filter(
    (timer) => remainingMs(timer.endAt, now) > 0
  );
  const completedTimers = timers.filter(
    (timer) => remainingMs(timer.endAt, now) === 0
  );
  const notification = useTimerNotifications(
    timers,
    completedTimers.length > 0,
    refresh
  );
  useEffect(() => {
    const client = startTimerWorker(refresh);
    ticker.current = client;
    return () => {
      client.stop();
      ticker.current = null;
    };
  }, [refresh]);
  useEffect(() => {
    ticker.current?.update(timers.map((timer) => timer.endAt));
  }, [timers]);
  useEffect(() => {
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [refresh]);
  const createTimer = (durationMs: number, color: string): void => {
    const createdAt = Date.now();
    notification.enableAudio();
    setNow(createdAt);
    const timer = {
      id: crypto.randomUUID(),
      color,
      createdAt,
      endAt: createdAt + durationMs,
    };
    store.update((current) => [...current, timer]);
  };
  const dismissTimer = (id: string): void => {
    store.update((current) => current.filter((timer) => timer.id !== id));
  };
  const updateTimer = (id: string, durationMs: number): void => {
    if (durationMs <= 0) {
      dismissTimer(id);
      return;
    }
    const updatedAt = Date.now();
    setNow(updatedAt);
    store.update((current) =>
      current.map((timer) =>
        timer.id === id ? { ...timer, endAt: updatedAt + durationMs } : timer
      )
    );
  };
  const acknowledge = (): void => {
    const ids = new Set(completedTimers.map((timer) => timer.id));
    store.update((current) => current.filter((timer) => !ids.has(timer.id)));
  };
  return {
    now,
    runningTimers,
    completedTimers,
    createTimer,
    updateTimer,
    dismissTimer,
    acknowledge,
    storageFailed: store.failed,
    retryStorage: store.retry,
    ...notification,
  };
}
