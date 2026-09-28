import { useActorRef } from "@xstate/react";
import { AudioLines } from "lucide-react";

import { CompletionAlert } from "@/features/completion-alert/CompletionAlert";
import { NotificationPermissionPrompt } from "@/features/notification-permission/NotificationPermissionPrompt";
import { SettingsButton } from "@/features/settings/SettingsButton";
import { SettingsPanel } from "@/features/settings/SettingsPanel";
import { RailHeading } from "@/features/timer-rail/RailHeading";
import { railInteractionMachine } from "@/features/timer-rail/railInteractionMachine";
import { TimerRail } from "@/features/timer-rail/TimerRail";
import { commitTimer } from "@/features/timer-rail/timerRailActions";

import { AppNotices } from "./AppNotices";
import { useAppActions, useAppStore } from "./useAppState";

export function App() {
  const settingsOpen = useAppStore((state) => state.settingsOpen);
  const actions = useAppActions();
  const actor = useActorRef(
    railInteractionMachine.provide({
      actions: {
        commitTimer: (_, change) =>
          commitTimer(change, {
            onCreateTimer: actions.startTimer,
            onUpdateTimer: actions.adjustTimer,
          }),
      },
    })
  );
  const notices = <AppNotices />;
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
          <SettingsButton onClick={actions.openSettings} />
        </header>
        <RailHeading />
        <TimerRail actor={actor} />
        {notices}
        <footer className="app-footer">
          <AudioLines className="icon icon-sm" /> 앱을 열어두면 완료 알림이
          울려요.
        </footer>
      </div>
      {settingsOpen && <SettingsPanel notices={notices} />}
      <NotificationPermissionPrompt actor={actor} />
      <CompletionAlert notices={notices} />
    </main>
  );
}
