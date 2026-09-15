import { MoveVertical } from "lucide-react";
import {
  type CSSProperties,
  type RefObject,
  useLayoutEffect,
  useRef,
  useState,
} from "react";

import { layoutLabels } from "@/domain/timer/labelLayout";
import { durationMsToPercent, remainingMs } from "@/domain/timer/timerMath";
import {
  type AppSettings,
  TIMER_COLORS,
  TIMER_TICK_MS,
  type TimerRecord,
} from "@/domain/timer/timerTypes";

import { RailDecorations } from "./RailDecorations";
import { TimerPin } from "./TimerPin";
import { useRailGesture } from "./useRailGesture";
import type { TimerMotion } from "./useTimerMotion";

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
  const gesture = useRailGesture({
    railRef,
    timers,
    rangeMinutes: settings.rangeMinutes,
    color,
    onCreateTimer,
    onUpdateTimer,
  });
  const { height, motions } = useRailLayout(
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
            onDismiss={() => {
              onDismissTimer(timer.id);
              gesture.cancel();
            }}
          />
        ))}
      </div>
      <p className="rail-help">
        <MoveVertical className="icon icon-sm" />{" "}
        {timers.length > 0
          ? "타이머를 끌어 조정 · 탭해서 조기 종료"
          : "끌어서 시간을 고르고, 놓으면 시작"}
      </p>
      <span id="gesture-help" className="sr-only">
        위아래 화살표로 10초씩, Shift와 화살표로 1분씩 조정합니다. Enter로
        확정하고 Escape로 취소합니다.
      </span>
    </section>
  );
}

function useRailLayout(
  railRef: RefObject<HTMLDivElement | null>,
  timers: TimerRecord[],
  now: number,
  rangeMinutes: number
) {
  const [geometry, setGeometry] = useState({
    height: 0,
    pitch: 0,
    clearance: 0,
    connectorWidth: 0,
  });
  const { height, pitch, clearance, connectorWidth } = geometry;
  useLayoutEffect(() => {
    const rail = railRef.current;
    const measure = (): void => {
      if (rail !== null) {
        const css = getComputedStyle(rail);
        setGeometry({
          height: rail.getBoundingClientRect().height,
          connectorWidth: parseFloat(
            css.getPropertyValue("--rail-connector-width")
          ),
          pitch: parseFloat(css.getPropertyValue("--rail-label-pitch")),
          clearance: parseFloat(
            css.getPropertyValue("--rail-bottom-clearance")
          ),
        });
      }
    };
    measure();
    const observer = new ResizeObserver(measure);
    if (rail !== null) {
      observer.observe(rail);
    }
    return () => observer.disconnect();
  }, [railRef]);
  const current = positionsAt(now);
  const next = positionsAt(now + TIMER_TICK_MS);
  const motions = new Map(
    timers.map((timer, index) => {
      const motion: TimerMotion = {
        current: {
          pin: current.positions[index]?.position ?? 0,
          label: current.labels.get(timer.id) ?? 0,
        },
        next: {
          pin: next.positions[index]?.position ?? 0,
          label: next.labels.get(timer.id) ?? 0,
        },
        connectorWidth,
      };
      return [timer.id, motion];
    })
  );
  return { height, motions };

  function positionsAt(time: number) {
    const positions = timers.map((timer) => ({
      id: timer.id,
      size: pitch,
      position:
        (1 -
          durationMsToPercent(remainingMs(timer.endAt, time), rangeMinutes) /
            100) *
        height,
    }));
    const labels = new Map(
      layoutLabels(positions, height - clearance).map((label) => [
        label.id,
        label.position + pitch / 2,
      ])
    );
    return { positions, labels };
  }
}
