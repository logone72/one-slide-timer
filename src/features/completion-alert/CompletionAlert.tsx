import { BellRing, Check } from "lucide-react";
import { type ReactNode, useEffect, useRef } from "react";
import { useShallow } from "zustand/react/shallow";

import { selectCompletedTimers } from "@/app/state/timerState";
import { useAppActions, useAppStore } from "@/app/useAppState";
import { formatDuration } from "@/domain/timer/timerMath";

export function CompletionAlert({ notices }: { notices?: ReactNode }) {
  const completedTimers = useAppStore(useShallow(selectCompletedTimers));
  const { acknowledgeTimers } = useAppActions();
  const onAcknowledge = (): void =>
    acknowledgeTimers(completedTimers.map((timer) => timer.id));
  const dialogRef = useRef<HTMLDialogElement>(null);
  const open = completedTimers.length > 0;
  useEffect(() => {
    const dialog = dialogRef.current;
    if (open && dialog !== null && !dialog.open) {
      dialog.showModal();
    }
    return () => dialog?.close();
  }, [open]);

  if (completedTimers.length === 0) {
    return null;
  }

  return (
    <dialog
      ref={dialogRef}
      className="completion-alert"
      aria-labelledby="completion-title"
      onCancel={(event) => event.preventDefault()}
    >
      <span className="completion-icon">
        <BellRing className="icon icon-xl" />
      </span>
      <h2 id="completion-title">시간이 되었어요.</h2>
      <p>
        {completedTimers.length}개의 타이머가 끝났어요.
        <br />
        확인하면 알림이 멈춰요.
      </p>
      {notices}
      <ul>
        {completedTimers.map((timer) => (
          <li key={timer.id}>
            <i style={{ background: timer.color }} />
            <span>
              {formatDuration(Math.max(0, timer.endAt - timer.createdAt))}
            </span>
            <Check className="icon icon-sm" />
          </li>
        ))}
      </ul>
      <button className="primary-button" type="button" onClick={onAcknowledge}>
        확인했어요 <Check className="icon icon-sm" />
      </button>
    </dialog>
  );
}
