import type { StoreApi } from "zustand/vanilla";

import { clampRangeMinutes } from "@/domain/timer/timerMath";
import type { StorageRead } from "@/domain/timer/timerStorage";
import {
  type AppSettings,
  DEFAULT_SETTINGS,
  type ThemeId,
} from "@/domain/timer/timerTypes";

import type { AppState } from "./appStore";
import { initialStorageState } from "./storageState";

export const initialSettingsState = () => ({
  settings: { ...DEFAULT_SETTINGS },
  settingsStorage: initialStorageState(),
  editedSettings: {} as Partial<AppSettings>,
});

export function createSettingsActions(store: StoreApi<AppState>) {
  const update = (patch: Partial<AppSettings>): void => {
    store.setState((state) => ({
      settings: { ...state.settings, ...patch },
      editedSettings:
        state.settingsStorage.read === "ready"
          ? state.editedSettings
          : { ...state.editedSettings, ...patch },
      settingsStorage: { ...state.settingsStorage, dirty: true },
    }));
  };
  return {
    restoreSettings: (result: StorageRead<AppSettings>): void => {
      store.setState((state) => {
        if (!result.ok) {
          return {
            settingsStorage: { ...state.settingsStorage, read: "failed" },
          };
        }
        return {
          settings: { ...result.value, ...state.editedSettings },
          settingsStorage: { ...state.settingsStorage, read: "ready" },
          editedSettings: {},
        };
      });
    },
    recordSettingsWrite: (ok: boolean): void => {
      store.setState((state) => ({
        settingsStorage: {
          ...state.settingsStorage,
          writeFailed: !ok,
          dirty: !ok,
        },
      }));
    },
    setNotificationPreference: (notificationPreference: boolean | null): void =>
      update({ notificationPreference }),
    setTheme: (theme: ThemeId): void => update({ theme }),
    setRangeMinutes: (rangeMinutes: number): void =>
      update({ rangeMinutes: clampRangeMinutes(rangeMinutes) }),
  };
}
