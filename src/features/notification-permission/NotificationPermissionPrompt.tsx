import { useSelector } from "@xstate/react";
import { useEffect, useRef } from "react";

import { selectShouldPrompt } from "@/app/state/notificationState";
import { selectHasCompleted } from "@/app/state/timerState";
import { useAppActions, useAppStore } from "@/app/useAppState";
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
      <h2 id="permission-title">타이머 완료 알림을 받을까요?</h2>
      <p id="permission-description">
        완료 시 기기 알림을 받을 수 있도록 알림 권한을 허용해 주세요. 설정에서
        언제든 사용 여부를 바꿀 수 있어요.
      </p>
      <p>확인을 누르면 기기 권한 창이 열려요.</p>
      <div className="notification-buttons">
        <button
          className="secondary-button"
          type="button"
          onClick={actions.deferNotificationPrompt}
        >
          나중에
        </button>
        <button
          className="primary-button"
          type="button"
          onClick={actions.requestNotifications}
        >
          확인
        </button>
      </div>
    </dialog>
  );
}
