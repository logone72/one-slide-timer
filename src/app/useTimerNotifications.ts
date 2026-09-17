import { useEffect, useState, useSyncExternalStore } from "react";

import type { TimerRecord } from "@/domain/timer/timerTypes";
import { getNotificationPort } from "@/platform/notifications";
import {
  isAlertAudioReady,
  prepareAlertAudio,
  startAlertAudio,
  stopAlertAudio,
  subscribeAlertAudio,
} from "@/platform/notifications/alertAudio";
import { createNotificationSync } from "@/platform/notifications/syncNotifications";

const port = getNotificationPort();
export function useTimerNotifications(
  timers: TimerRecord[],
  completed: boolean,
  refresh: () => void
) {
  const [failed, setFailed] = useState(false);
  const [subscriptionAttempt, setSubscriptionAttempt] = useState(0);
  const audioReady = useSyncExternalStore(
    subscribeAlertAudio,
    isAlertAudioReady
  );
  const [sync] = useState(() =>
    createNotificationSync(port, () => setFailed(true))
  );
  useEffect(() => sync(timers), [sync, timers]);
  useEffect(() => {
    if (completed) {
      startAlertAudio();
    }
    return stopAlertAudio;
  }, [completed]);
  const enableAudio = (): void => {
    void prepareAlertAudio();
  };
  useEffect(() => {
    return port.onNotificationAction(refresh, () => setFailed(true));
  }, [refresh, subscriptionAttempt]);
  return {
    failed,
    audioReady,
    enableAudio,
    retryNotifications: () => {
      setFailed(false);
      setSubscriptionAttempt((attempt) => attempt + 1);
      sync(timers, true);
    },
  };
}
