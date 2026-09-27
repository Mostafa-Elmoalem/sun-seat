import type { EndAdvice, Side, TripExposureVerdict, VehicleProfile, VerdictStatus } from '../../core/types/vehicle.ts';
import { calculateSunPosition } from '../../core/astronomy/noaa-solar.ts';

/**
 * What the answer says, as data. The UI turns it into words in either language;
 * nothing here knows about Arabic, English or HTML.
 */

export type VerdictReason =
  /** One side is better: how much sun a window seat gets on each side. */
  | { kind: 'sides'; sunny: Side; sunnyMinutes: number; good: Side; goodMinutes: number }
  /** The sun changes sides mid-trip. */
  | { kind: 'switch'; first: Side; firstForMinutes: number; second: Side }
  /** Both sides get about the same. */
  | { kind: 'tie'; minutes: number }
  | { kind: 'sunHigh' }
  | { kind: 'sunAheadOrBehind' }
  | { kind: 'night'; sunriseMs: number | null };

export interface VerdictModel {
  status: VerdictStatus;
  side: Side | 'either';
  reason: VerdictReason;
  /** Avoid the back bench or the front row, whatever the side. */
  endAdvice: EndAdvice;
  /** Seats worth naming; empty when naming seats would not help (night, or every seat alike). */
  bestSeats: number[];
  /** Coaches have curtains: the sunny side still runs hotter. */
  curtainsCaveat: boolean;
}

/** Night trips: when the sun comes up after departure (5 minute steps, up to 14 hours ahead). */
function sunriseAfter(verdict: TripExposureVerdict): number | null {
  const first = verdict.timeline[0];
  if (!first) return null;
  for (let m = 5; m <= 14 * 60; m += 5) {
    const t = first.timeMs + m * 60_000;
    if (calculateSunPosition(first.location.lat, first.location.lng, new Date(t)).elevation > 0) return t;
  }
  return null;
}

function reasonFor(verdict: TripExposureVerdict): VerdictReason {
  const { status, recommendedSide, sides } = verdict;
  const minutesOn = (side: Side) => (side === 'left' ? sides.leftSunMinutes : sides.rightSunMinutes);
  if ((status === 'CLEAR' || status === 'LEANING') && recommendedSide !== 'either') {
    const sunny: Side = recommendedSide === 'left' ? 'right' : 'left';
    return { kind: 'sides', sunny, sunnyMinutes: minutesOn(sunny), good: recommendedSide, goodMinutes: minutesOn(recommendedSide) };
  }
  if (status === 'TIE') {
    const lateral = verdict.spans.filter((s) => (s.side === 'left' || s.side === 'right') && s.endMinute - s.startMinute >= 10);
    const first = lateral[0];
    const switched = first ? lateral.find((s) => s.side !== first.side) : undefined;
    if (first && switched) {
      return { kind: 'switch', first: first.side as Side, firstForMinutes: switched.startMinute - first.startMinute, second: switched.side as Side };
    }
    return { kind: 'tie', minutes: Math.max(sides.leftSunMinutes, sides.rightSunMinutes) };
  }
  if (status === 'DOES_NOT_MATTER') {
    const overhead = verdict.timeline.filter((t) => t.sunSide === 'overhead').length;
    return overhead > verdict.timeline.length * 0.3 ? { kind: 'sunHigh' } : { kind: 'sunAheadOrBehind' };
  }
  return { kind: 'night', sunriseMs: sunriseAfter(verdict) };
}

export function presentVerdict(verdict: TripExposureVerdict, vehicle: VehicleProfile): VerdictModel {
  return {
    status: verdict.status,
    side: verdict.recommendedSide,
    reason: reasonFor(verdict),
    endAdvice: verdict.status === 'NIGHT' ? null : verdict.endAdvice,
    bestSeats: verdict.seatAdvice && verdict.status !== 'NIGHT' ? verdict.bestSeatIds : [],
    curtainsCaveat: vehicle.hasCurtains && (verdict.status === 'CLEAR' || verdict.status === 'LEANING')
  };
}
