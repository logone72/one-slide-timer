import { BellRing, Check } from "lucide-react";
import { useEffect, useRef } from "react";

import { formatDuration } from "@/domain/timer/timerMath";
import type { TimerRecord } from "@/domain/timer/timerTypes";

export function CompletionAlert({
  completedTimers,
  onAcknowledge,
}: {
  completedTimers: TimerRecord[];
  onAcknowledge: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = dialogRef.current;
    if (completedTimers.length > 0 && dialog !== null && !dialog.open) {
      dialog.showModal();
    }
    return () => dialog?.close();
  }, [completedTimers.length]);

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
      <div className="eyebrow">TIME WELL SPENT</div>
      <h2 id="completion-title">시간이 되었어요.</h2>
      <p>
        {completedTimers.length}개의 타이머가 끝났어요.
        <br />
        확인하면 알림이 멈춰요.
      </p>
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
