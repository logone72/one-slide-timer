import { ArrowUp, MoveVertical } from "lucide-react";
import type { CSSProperties } from "react";

import {
  durationMsToPercent,
  formatClock,
  formatTimeLabel,
  rangeMinutesToMs,
} from "@/domain/timer/timerMath";

import type { RailGesture } from "./timerRailGeometry";

export function RailDecorations({
  draft,
  rangeMinutes,
  height,
  empty,
  ending,
}: {
  draft: RailGesture | null;
  rangeMinutes: number;
  height: number;
  empty: boolean;
  ending: boolean;
}) {
  return (
    <>
      <RailScale rangeMinutes={rangeMinutes} />
      <div className="rail-track" aria-hidden="true" />
      {draft !== null && (
        <DraftPin draft={draft} rangeMinutes={rangeMinutes} height={height} />
      )}
      {empty && draft === null && (
        <div className="rail-empty" aria-hidden="true">
          <ArrowUp className="icon icon-lg" />
          <strong>필요한 시간만큼</strong>
          <span>아래 핀을 위로 끌어보세요.</span>
        </div>
      )}
      <button
        className="start-pin"
        type="button"
        aria-label="새 타이머 시작"
        aria-describedby="gesture-help"
      >
        <ArrowUp className="icon icon-xl" />
      </button>
      <div className="start-caption">
        <strong>{ending ? "놓으면 조기 종료" : "끌어서 시작"}</strong>
        <span>
          {draft === null ? "위로 올리고 놓으세요" : "손을 떼면 바로 적용돼요"}
        </span>
      </div>
    </>
  );
}

function DraftPin({
  draft,
  rangeMinutes,
  height,
}: {
  draft: RailGesture;
  rangeMinutes: number;
  height: number;
}) {
  const top =
    (1 - durationMsToPercent(draft.durationMs, rangeMinutes) / 100) * height;
  const caption = draft.timerId === null ? "놓으면 시작" : "놓으면 변경";
  const ending = draft.timerId !== null && draft.durationMs === 0;
  const style: CSSProperties & {
    "--timer-y": string;
    "--timer-color": string;
  } = {
    "--timer-color": draft.color,
    "--timer-y": `${String(top)}px`,
  };
  return (
    <>
      <div
        className="rail-fill"
        style={{
          transform: `translateX(-50%) scaleY(${String(height > 0 ? (height - top) / height : 0)})`,
        }}
      />
      <div className="timer-draft" style={style}>
        <div className="draft-dot">
          <MoveVertical className="icon" />
        </div>
        <div className="draft-label" aria-live="polite">
          <strong>{formatClock(draft.durationMs)}</strong>
          <span>{ending ? "놓으면 조기 종료" : caption}</span>
        </div>
      </div>
    </>
  );
}

function RailScale({ rangeMinutes }: { rangeMinutes: number }) {
  return (
    <div
      className="rail-scale"
      aria-label={`시간 눈금 0부터 ${formatTimeLabel(rangeMinutesToMs(rangeMinutes))}`}
    >
      {Array.from({ length: 31 }, (_, index) => {
        const major = index % 5 === 0;
        const duration = rangeMinutesToMs(rangeMinutes) * (1 - index / 30);
        return (
          <div
            key={index}
            className={`rail-tick${major ? " rail-tick--major" : ""}`}
            style={{ top: `${String((index / 30) * 100)}%` }}
          >
            {major && <span>{formatTimeLabel(duration)}</span>}
          </div>
        );
      })}
    </div>
  );
}
