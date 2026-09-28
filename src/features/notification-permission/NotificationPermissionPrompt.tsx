import { useSelector } from "@xstate/react";
import { useEffect, useRef } from "react";

import { selectShouldPrompt } from "@/app/state/notificationState";
import { selectHasCompleted } from "@/app/state/timerState";
import { useAppActions, useAppStore } from "@/app/useAppState";
import { AudioToggle } from "@/features/settings/AudioSettings";
import { NotificationChoices } from "@/features/settings/NotificationSettings";
import type { RailActor } from "@/features/timer-rail/timerRailActions";

export function NotificationPermissionPrompt({ actor }: { actor: RailActor }) {
  const idle = useSelector(actor, (state) => state.matches("idle"));
  const shouldPrompt = useAppStore(selectShouldPrompt);
  const settingsOpen = useAppStore((state) => state.settingsOpen);
  const completed = useAppStore(selectHasCompleted);
  const actions = useAppActions();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const open = idle && shouldPrompt && !settingsOpen && !completed;
  useEffect(() => {
    if (!open) {
      return undefined;
    }
    const dialog = dialogRef.current;
    const opener = document.activeElement;
    dialog?.showModal();
    return () => {
      dialog?.close();
      if (opener instanceof HTMLElement && opener !== document.body) {
        opener.focus();
      } else {
        document.querySelector<HTMLElement>(".start-pin")?.focus();
      }
    };
  }, [open]);
  if (!open) {
    return null;
  }
  return (
    <dialog
      ref={dialogRef}
      className="permission-prompt"
      aria-labelledby="permission-title"
      aria-describedby="permission-description"
      onCancel={(event) => {
        event.preventDefault();
        actions.deferNotificationPrompt();
      }}
    >
      <h2 id="permission-title">완료 알림 설정</h2>
      <p id="permission-description">
        타이머가 끝나면 알 수 있도록 알림을 켜 주세요.
      </p>
      <NotificationChoices />
      <AudioToggle />
      <div className="permission-actions">
        <button
          className="primary-button"
          type="button"
          onClick={actions.deferNotificationPrompt}
        >
          완료
        </button>
        <button
          className="permission-dismiss"
          type="button"
          onClick={actions.hideNotificationPrompt}
        >
          다시 묻지 않기
        </button>
      </div>
    </dialog>
  );
}
