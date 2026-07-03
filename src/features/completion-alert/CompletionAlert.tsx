import { formatDuration } from "@/domain/timer/timerMath";
import type { TimerRecord } from "@/domain/timer/timerTypes";

type CompletionAlertProps = {
  completedTimers: TimerRecord[];
  now: number;
  onAcknowledge: () => void;
};

export function CompletionAlert({
  completedTimers,
  now,
  onAcknowledge,
}: CompletionAlertProps) {
  if (completedTimers.length === 0) {
    return null;
  }

  return (
    <section className="completion-alert" aria-live="assertive">
      <div>
        <strong>{completedTimers.length} timer complete</strong>
        <p>
          {completedTimers
            .map((timer) => formatDuration(Math.max(0, now - timer.createdAt)))
            .join(", ")}
        </p>
      </div>
      <button type="button" onClick={onAcknowledge}>
        Acknowledge
      </button>
    </section>
  );
}
