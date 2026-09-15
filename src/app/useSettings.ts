import { useEffect, useLayoutEffect, useState } from "react";

import { loadSettings, saveSettings } from "@/domain/timer/timerStorage";

export function useSettings() {
  const [settings, setSettings] = useState(loadSettings);
  useEffect(() => saveSettings(settings), [settings]);
  useLayoutEffect(() => {
    const root = document.documentElement;
    root.dataset.theme = settings.theme;
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute(
        "content",
        getComputedStyle(root).getPropertyValue("--color-surface").trim()
      );
  }, [settings.theme]);
  return [settings, setSettings] as const;
}
