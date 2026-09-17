import { type CSSProperties, useRef, useState } from "react";

import {
  type AppSettings,
  TIMER_COLORS,
  type TimerRecord,
} from "@/domain/timer/timerTypes";

import { RailDecorations, RailHelp } from "./RailDecorations";
import { TimerAdjustment } from "./TimerAdjustment";
import { TimerPin } from "./TimerPin";
import { useRailGesture } from "./useRailGesture";
import { useRailLayout } from "./useRailLayout";

type TimerRailProps = {
  timers: TimerRecord[];
  now: number;
  settings: AppSettings;
  onCreateTimer: (durationMs: number, color: string) => void;
  onUpdateTimer: (timerId: string, durationMs: number) => void;
  onDismissTimer: (timerId: string) => void;
};

export function TimerRail({
  timers,
  now,
  settings,
  onCreateTimer,
  onUpdateTimer,
  onDismissTimer,
}: TimerRailProps) {
  const [adjusting, setAdjusting] = useState<string | null>(null);
  const railRef = useRef<HTMLDivElement>(null);
  const color =
    TIMER_COLORS[timers.length % TIMER_COLORS.length] ?? TIMER_COLORS[0];
  const gesture = useRailGesture({
    railRef,
    timers,
    rangeMinutes: settings.rangeMinutes,
    color,
    onCreateTimer,
    onUpdateTimer,
    onStartAdjust: () => setAdjusting("new"),
  });
  const { height, motions, pitch } = useRailLayout(
    railRef,
    timers,
    now,
    settings.rangeMinutes
  );
  const draft = gesture.draft;
  const ending = gesture.editing && draft?.durationMs === 0;

  return (
    <section
      className={`timer-stage${draft !== null ? " timer-stage--dragging" : ""}${ending ? " timer-stage--ending" : ""}`}
      aria-label="카운트다운 레일"
    >
      <div
        className="timer-rail"
        ref={railRef}
        data-testid="timer-rail"
        style={
          {
            "--timer-count": timers.length,
            "--rail-label-pitch": `${String(pitch)}px`,
            "--rail-height": `${String(height)}px`,
          } as CSSProperties
        }
        {...gesture.handlers}
      >
        <RailDecorations
          draft={draft}
          rangeMinutes={settings.rangeMinutes}
          height={height}
          empty={timers.length === 0}
          ending={ending}
          onStartAdjust={() => {
            gesture.cancel();
            setAdjusting("new");
          }}
        />
        {timers.map((timer) => (
          <TimerPin
            key={timer.id}
            timer={timer}
            now={now}
            motion={motions.get(timer.id)}
            editing={draft?.timerId === timer.id}
            selected={gesture.selectedId === timer.id}
            onSelect={() => gesture.select(timer.id)}
            onClose={gesture.cancel}
            onAdjust={() => {
              setAdjusting(timer.id);
              gesture.cancel();
            }}
            onDismiss={() => {
              onDismissTimer(timer.id);
              gesture.cancel();
            }}
          />
        ))}
      </div>
      <TimerAdjustment
        timerId={adjusting}
        timers={timers}
        rangeMinutes={settings.rangeMinutes}
        onClose={() => setAdjusting(null)}
        onApply={(duration) => {
          if (adjusting === "new") {
            onCreateTimer(duration, color);
          } else if (adjusting !== null) {
            onUpdateTimer(adjusting, duration);
          }
          setAdjusting(null);
        }}
      />
      <RailHelp running={timers.length > 0} />
    </section>
  );
}
