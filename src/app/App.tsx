import { ArrowUpRight, AudioLines } from "lucide-react";
import { useState } from "react";

import { formatTimeLabel, rangeMinutesToMs } from "@/domain/timer/timerMath";
import { CompletionAlert } from "@/features/completion-alert/CompletionAlert";
import { SettingsButton } from "@/features/settings/SettingsButton";
import { SettingsPanel } from "@/features/settings/SettingsPanel";
import { TimerRail } from "@/features/timer-rail/TimerRail";

import { useSettings } from "./useSettings";
import { useTimers } from "./useTimers";

export function App() {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settings, setSettings] = useSettings();
  const timers = useTimers();

  return (
    <main className="app-shell">
      <div className="timer-screen">
        <header className="app-header">
          <div className="wordmark" aria-label="One Slide Timer">
            <span className="brand-mark" aria-hidden="true">
              <i />
              <i />
              <i />
            </span>
            <span>
              one slide<span className="wordmark__caption">TIMER</span>
            </span>
          </div>
          <SettingsButton onClick={() => setSettingsOpen(true)} />
        </header>
        <section className="intro" aria-labelledby="page-title">
          <div className="eyebrow">
            MAKE ROOM FOR YOUR TIME <ArrowUpRight className="icon icon-sm" />
          </div>
          <h1 id="page-title">시간을, 가볍게.</h1>
          <p>핀을 올리고 놓으면, 나만의 시간이 시작돼요.</p>
        </section>
        <div className="rail-heading">
          <span
            className={`activity-status${timers.runningTimers.length > 0 ? " activity-status--running" : ""}`}
          >
            <i />
            {timers.runningTimers.length > 0
              ? `${String(timers.runningTimers.length)}개의 타이머 진행 중`
              : "시작할 준비가 됐어요"}
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
        <footer className="app-footer">
          <AudioLines className="icon icon-sm" /> 시간이 끝나면, 소리로
          알려드릴게요.
        </footer>
      </div>
      {settingsOpen && (
        <SettingsPanel
          settings={settings}
          onClose={() => setSettingsOpen(false)}
          onChange={setSettings}
        />
      )}
      <CompletionAlert
        completedTimers={timers.completedTimers}
        onAcknowledge={timers.acknowledge}
      />
    </main>
  );
}
