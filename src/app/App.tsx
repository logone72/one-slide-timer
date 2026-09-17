import { AudioLines } from "lucide-react";
import { useState } from "react";

import { formatTimeLabel, rangeMinutesToMs } from "@/domain/timer/timerMath";
import { CompletionAlert } from "@/features/completion-alert/CompletionAlert";
import { SettingsButton } from "@/features/settings/SettingsButton";
import { SettingsPanel } from "@/features/settings/SettingsPanel";
import { TimerRail } from "@/features/timer-rail/TimerRail";

import { AppNotices } from "./AppNotices";
import { useSettings } from "./useSettings";
import { useTimers } from "./useTimers";

export function App() {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const settingsStore = useSettings();
  const settings = settingsStore.value;
  const timers = useTimers();

  const notices = <AppNotices settingsStore={settingsStore} timers={timers} />;
  return (
    <main className="app-shell">
      <div className="timer-screen">
        <header className="app-header">
          <h1 className="wordmark" aria-label="One Slide Timer">
            <span className="brand-mark" aria-hidden="true">
              <i />
              <i />
              <i />
            </span>
            <span>
              one slide<span className="wordmark__caption">timer</span>
            </span>
          </h1>
          <SettingsButton onClick={() => setSettingsOpen(true)} />
        </header>
        <div className="rail-heading">
          <span
            className={`activity-status${timers.runningTimers.length > 0 ? " activity-status--running" : ""}`}
          >
            <i />
            {timers.runningTimers.length > 0
              ? `${String(timers.runningTimers.length)}개 진행 중`
              : "진행 중인 타이머 없음"}
          </span>
          <span>
            0 — {formatTimeLabel(rangeMinutesToMs(settings.rangeMinutes))}
          </span>
        </div>
        <TimerRail
          timers={timers.runningTimers}
          now={timers.now}
          settings={settings}
          onCreateTimer={timers.createTimer}
          onUpdateTimer={timers.updateTimer}
          onDismissTimer={timers.dismissTimer}
        />
        {notices}
        <footer className="app-footer">
          <AudioLines className="icon icon-sm" /> 앱을 열어두면 완료 알림이
          울려요.
        </footer>
      </div>
      {settingsOpen && (
        <SettingsPanel
          settings={settings}
          onClose={() => setSettingsOpen(false)}
          onChange={settingsStore.update}
          notices={notices}
        />
      )}
      <CompletionAlert
        completedTimers={timers.completedTimers}
        onAcknowledge={timers.acknowledge}
        notices={notices}
      />
    </main>
  );
}
