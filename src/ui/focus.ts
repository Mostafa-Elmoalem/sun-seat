import type { TripExposureVerdict } from '../core/types/vehicle.ts';

/** The moment every figure shows when the rider has not picked one (ruler, route, 3D): the middle of the longest side-on stretch. */
export function defaultFocusIndex(verdict: TripExposureVerdict): number {
  const lateral = verdict.spans
    .filter((s) => s.side === 'left' || s.side === 'right')
    .sort((a, b) => b.endMinute - b.startMinute - (a.endMinute - a.startMinute))[0];
  const target = lateral
    ? (lateral.startMinute + lateral.endMinute) / 2
    : (() => {
        const day = verdict.timeline.filter((t) => !t.isNight);
        return day[Math.floor(day.length / 2)]?.minuteOffset ?? 0;
      })();
  let best = 0;
  verdict.timeline.forEach((t, i) => {
    if (Math.abs(t.minuteOffset - target) < Math.abs((verdict.timeline[best]?.minuteOffset ?? 0) - target)) best = i;
  });
  return best;
}
