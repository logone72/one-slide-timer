import { useLayoutEffect, useRef } from "react";

import { loadSettings, saveSettings } from "@/domain/timer/timerStorage";
import { type AppSettings, DEFAULT_SETTINGS } from "@/domain/timer/timerTypes";

import { useStoredState } from "./useStoredState";

export function useSettings() {
  const edited = useRef<Partial<AppSettings>>({});
  const store = useStoredState(
    loadSettings,
    saveSettings,
    DEFAULT_SETTINGS,
    (stored) => ({ ...stored, ...edited.current })
  );
  useLayoutEffect(() => {
    const root = document.documentElement;
    root.dataset.theme = store.value.theme;
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute(
        "content",
        getComputedStyle(root).getPropertyValue("--color-surface").trim()
      );
  }, [store.value.theme]);
  return {
    ...store,
    update: (next: AppSettings) => {
      if (next.rangeMinutes !== store.value.rangeMinutes) {
        edited.current.rangeMinutes = next.rangeMinutes;
      }
      if (next.theme !== store.value.theme) {
        edited.current.theme = next.theme;
      }
      store.update(next);
    },
  };
}
