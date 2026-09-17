import { type CSSProperties, useRef } from "react";

import {
  type AppSettings,
  TIMER_COLORS,
  type TimerRecord,
} from "@/domain/timer/timerTypes";

import { RailDecorations, RailHelp } from "./RailDecorations";
import { TimerAdjustment } from "./TimerAdjustment";
import { TimerPin } from "./TimerPin";
import { useRailInteraction } from "./useRailInteraction";
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
  const railRef = useRef<HTMLDivElement>(null);
  const color =
    TIMER_COLORS[timers.length % TIMER_COLORS.length] ?? TIMER_COLORS[0];
  const interaction = useRailInteraction({
    railRef,
    timers,
    rangeMinutes: settings.rangeMinutes,
    color,
    onCreateTimer,
    onUpdateTimer,
  });
  const { height, motions, pitch } = useRailLayout(
    railRef,
    timers,
    now,
    settings.rangeMinutes
  );
  const draft = interaction.draft;
  const ending = interaction.editing && draft?.durationMs === 0;

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
        {...interaction.handlers}
      >
        <RailDecorations
          draft={draft}
          rangeMinutes={settings.rangeMinutes}
          height={height}
          empty={timers.length === 0}
          ending={ending}
          onStartAdjust={() => interaction.openAdjustment("new")}
        />
        {timers.map((timer) => (
          <TimerPin
            key={timer.id}
            timer={timer}
            now={now}
            motion={motions.get(timer.id)}
            editing={draft?.timerId === timer.id}
            selected={interaction.selectedId === timer.id}
            onSelect={() => interaction.select(timer.id)}
            onClose={interaction.cancel}
            onAdjust={() => interaction.openAdjustment(timer.id)}
            onDismiss={() => {
              onDismissTimer(timer.id);
              interaction.cancel();
            }}
          />
        ))}
      </div>
      <TimerAdjustment
        timerId={interaction.adjustingId}
        timers={timers}
        rangeMinutes={settings.rangeMinutes}
        onClose={interaction.cancel}
        onApply={interaction.applyAdjustment}
      />
      <RailHelp running={timers.length > 0} />
    </section>
  );
}
