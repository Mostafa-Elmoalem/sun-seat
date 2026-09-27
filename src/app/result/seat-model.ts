import type { TimelineStep, TripExposureVerdict, VehicleProfile } from '../../core/types/vehicle.ts';
import { MILD_SUN, seatSunlightAtStep, STRONG_SUN } from '../../core/exposure/exposure-calculator.ts';

/**
 * How every seat should be drawn, for the whole trip or for one moment.
 * Level 0 is shade; 1 to 3 is more and more sun (drawn as denser hatching).
 */

export type SunKind = 'strong' | 'light' | 'none';

export interface SeatState {
  seatId: number;
  sun: SunKind;
  level: 0 | 1 | 2 | 3;
  /** Whole-trip minutes (the same in both views, for labels). */
  strongMinutes: number;
  lightMinutes: number;
  /** One of the recommended seats for the trip. */
  isBest: boolean;
}

export type SeatView = 'trip' | 'moment';

function bestSet(verdict: TripExposureVerdict): Set<number> {
  return new Set(verdict.seatAdvice && verdict.status !== 'NIGHT' ? verdict.bestSeatIds : []);
}

/** Share of the trip in sun, counting light sun as half. */
function tripLevel(strong: number, light: number, tripMinutes: number): 0 | 1 | 2 | 3 {
  if (strong + light === 0) return 0;
  const share = (strong + 0.5 * light) / Math.max(1, tripMinutes);
  return share < 0.2 ? 1 : share < 0.45 ? 2 : 3;
}

function momentLevel(lit: number): { sun: SunKind; level: 0 | 1 | 2 | 3 } {
  if (lit >= STRONG_SUN) return { sun: 'strong', level: lit >= 0.45 ? 3 : 2 };
  if (lit >= MILD_SUN) return { sun: 'light', level: 1 };
  return { sun: 'none', level: 0 };
}

export function seatStates(verdict: TripExposureVerdict, vehicle: VehicleProfile, step: TimelineStep | null): Map<number, SeatState> {
  const best = bestSet(verdict);
  const exposure = new Map(verdict.seatsExposure.map((e) => [e.seatId, e]));
  const live = step ? seatSunlightAtStep(vehicle, step) : null;
  const out = new Map<number, SeatState>();
  for (const seat of vehicle.seats) {
    const e = exposure.get(seat.id);
    const strongMinutes = e?.strongMinutes ?? 0;
    const lightMinutes = e?.mildMinutes ?? 0;
    const shown = live
      ? momentLevel(live.get(seat.id) ?? 0)
      : { sun: (strongMinutes > 0 ? 'strong' : lightMinutes > 0 ? 'light' : 'none') as SunKind, level: tripLevel(strongMinutes, lightMinutes, verdict.tripMinutes) };
    out.set(seat.id, { seatId: seat.id, ...shown, strongMinutes, lightMinutes, isBest: best.has(seat.id) });
  }
  return out;
}
