import { type RefObject, useLayoutEffect, useState } from "react";

import { layoutLabels } from "@/domain/timer/labelLayout";
import { durationMsToPercent, remainingMs } from "@/domain/timer/timerMath";
import { TIMER_TICK_MS, type TimerRecord } from "@/domain/timer/timerTypes";

import type { TimerMotion } from "./useTimerMotion";
export function useRailLayout(
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
          pitch:
            Math.max(
              parseFloat(css.getPropertyValue("--rail-label-height")),
              ...Array.from(
                rail.querySelectorAll<HTMLElement>(".timer-pin"),
                (card) => card.offsetHeight
              )
            ) + parseFloat(css.getPropertyValue("--rail-label-gap")),
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
      rail
        .querySelectorAll(".timer-pin")
        .forEach((card) => observer.observe(card));
    }
    return () => observer.disconnect();
  }, [railRef, timers.length]);
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
  return { height, motions, pitch };

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
