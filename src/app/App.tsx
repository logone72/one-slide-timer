import { useMachine } from "@xstate/react";
import { type JSX, useEffect, useMemo, useState } from "react";

import {
  clampRangeHours,
  rangeHoursToMs,
  remainingMs,
} from "@/domain/timer/timerMath";
import {
  loadSettings,
  loadTimers,
  saveSettings,
  saveTimers,
} from "@/domain/timer/timerStorage";
import {
  type AppSettings,
  DEFAULT_SETTINGS,
  type TimerRecord,
} from "@/domain/timer/timerTypes";
import { CompletionAlert } from "@/features/completion-alert/CompletionAlert";
import { SettingsButton } from "@/features/settings/SettingsButton";
import { SettingsPanel } from "@/features/settings/SettingsPanel";
import { TimerRail } from "@/features/timer-rail/TimerRail";
import { getNotificationPort } from "@/platform/notifications";
import { startTimerWorker } from "@/workers/timerWorkerClient";

import { appMachine } from "./appMachine";

const COLORS = ["#2563eb", "#16a34a", "#dc2626", "#7c3aed", "#ea580c"] as const;
const notificationPort = getNotificationPort();

type CreateTimerRecordInput = {
  durationMs: number;
  rangeHours: number;
  timerCount: number;
};

export function App() {
  const [, send] = useMachine(appMachine);
  const [now, setNow] = useState(() => Date.now());
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settings, setSettings] = useState<AppSettings>(() => loadSettings());
  const [timers, setTimers] = useState<TimerRecord[]>(() =>
    loadTimers().filter((timer) => timer.status !== "dismissed")
  );

  const runningTimers = useMemo(
    () => timers.filter((timer) => remainingMs(timer.endAt, now) > 0),
    [now, timers]
  );
  const completedTimers = useMemo(
    () => timers.filter((timer) => remainingMs(timer.endAt, now) === 0),
    [now, timers]
  );

  useEffect(() => {
    return startTimerWorker(setNow);
  }, []);

  useEffect(() => {
    saveTimers(timers);
  }, [timers]);

  useEffect(() => {
    saveSettings(settings);
  }, [settings]);

  useEffect(() => {
    if (completedTimers.length === 0) {
      notificationPort.stopRepeatingAlert();
    } else {
      notificationPort.startRepeatingAlert();
    }

    return () => {
      notificationPort.stopRepeatingAlert();
    };
  }, [completedTimers.length]);

  const handleCreateTimer = (durationMs: number): void => {
    void notificationPort.ensurePermission();

    const timer = createTimerRecord({
      durationMs,
      rangeHours: settings.rangeHours,
      timerCount: timers.length,
    });

    send({ type: "START_CREATING" });
    setTimers((currentTimers) => [...currentTimers, timer]);
    void notificationPort.scheduleTimer(timer);
    send({ type: "FINISH" });
  };

  const handleDismissTimer = (timerId: string): void => {
    setTimers((currentTimers) =>
      currentTimers.filter((timer) => timer.id !== timerId)
    );
    void notificationPort.cancelTimer(timerId);
  };

  const handleAcknowledge = (): void => {
    const completedIds = new Set(completedTimers.map((timer) => timer.id));
    setTimers((currentTimers) =>
      currentTimers.filter((timer) => !completedIds.has(timer.id))
    );
    notificationPort.stopRepeatingAlert();
  };

  return (
    <main className="app-shell">
      <SettingsButton
        onClick={() => {
          setSettingsOpen(true);
        }}
      />
      <AppHeader runningTimerCount={runningTimers.length} />
      <TimerRail
        timers={runningTimers}
        now={now}
        settings={settings}
        onCreateTimer={handleCreateTimer}
        onDismissTimer={handleDismissTimer}
      />
      <CompletionAlert
        completedTimers={completedTimers}
        now={now}
        onAcknowledge={handleAcknowledge}
      />
      <SettingsOverlay
        isOpen={settingsOpen}
        rangeHours={settings.rangeHours}
        onClose={() => {
          setSettingsOpen(false);
        }}
        onRangeHoursChange={(rangeHours) => {
          setSettings({
            ...DEFAULT_SETTINGS,
            rangeHours: clampRangeHours(rangeHours),
          });
        }}
      />
    </main>
  );
}

function AppHeader({
  runningTimerCount,
}: {
  runningTimerCount: number;
}): JSX.Element {
  return (
    <header className="app-header">
      <p>One Slide Timer</p>
      <h1>{runningTimerCount} active timers</h1>
    </header>
  );
}

function SettingsOverlay({
  isOpen,
  onClose,
  onRangeHoursChange,
  rangeHours,
}: {
  isOpen: boolean;
  onClose: () => void;
  onRangeHoursChange: (rangeHours: number) => void;
  rangeHours: number;
}): JSX.Element | null {
  if (!isOpen) {
    return null;
  }

  return (
    <SettingsPanel
      rangeHours={rangeHours}
      onClose={onClose}
      onRangeHoursChange={onRangeHoursChange}
    />
  );
}

function createTimerRecord({
  durationMs,
  rangeHours,
  timerCount,
}: CreateTimerRecordInput): TimerRecord {
  const createdAt = Date.now();

  return {
    id: crypto.randomUUID(),
    color: COLORS[timerCount % COLORS.length] ?? COLORS[0],
    createdAt,
    endAt: createdAt + Math.min(durationMs, rangeHoursToMs(rangeHours)),
    status: "running",
  };
}
