import { yToDurationMs } from "@/domain/timer/timerMath";

export function getDurationFromPointer(
  clientY: number,
  rail: DOMRect,
  rangeHours: number
): number {
  return yToDurationMs(clientY, rail.top, rail.height, rangeHours);
}
