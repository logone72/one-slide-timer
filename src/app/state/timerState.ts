import type { StoreApi } from "zustand/vanilla";

import type { StorageRead } from "@/domain/timer/timerStorage";
import type { TimerRecord } from "@/domain/timer/timerTypes";

import type { AppState } from "./appStore";
import { initialStorageState } from "./storageState";

export const initialTimerState = () => ({
  timers: [] as TimerRecord[],
  now: 0,
  timerStorage: initialStorageState(),
});

export function createTimerActions(store: StoreApi<AppState>) {
  const replaceTimers = (timers: TimerRecord[], now: number): void => {
    store.setState((state) => ({
      timers,
      now,
      timerStorage: { ...state.timerStorage, dirty: true },
    }));
  };
  return {
    restoreTimers: (result: StorageRead<TimerRecord[]>): void => {
      store.setState((state) => {
        if (!result.ok) {
          return { timerStorage: { ...state.timerStorage, read: "failed" } };
        }
        const timers = [
          ...new Map(
            [...result.value, ...state.timers].map((timer) => [timer.id, timer])
          ).values(),
        ];
        return {
          timers,
          timerStorage: { ...state.timerStorage, read: "ready" },
        };
      });
    },
    recordTimersWrite: (ok: boolean): void => {
      store.setState((state) => ({
        timerStorage: { ...state.timerStorage, writeFailed: !ok, dirty: !ok },
      }));
    },
    replaceTimers,
    setNow: (now: number): void => store.setState({ now }),
  };
}

export const selectRunningTimers = ({ timers, now }: AppState): TimerRecord[] =>
  timers.filter((timer) => timer.endAt > now);

export const selectCompletedTimers = ({
  timers,
  now,
}: AppState): TimerRecord[] => timers.filter((timer) => timer.endAt <= now);

export const selectHasCompleted = ({ timers, now }: AppState): boolean =>
  timers.some((timer) => timer.endAt <= now);
