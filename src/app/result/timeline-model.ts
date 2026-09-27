import type { TripExposureVerdict, VehicleProfile } from '../../core/types/vehicle.ts';
import { calculateSunVector, getCabin, MILD_SUN, STRONG_SUN } from '../../core/exposure/exposure-calculator.ts';
import { seatSunlight, toVehicleFrame } from '../../core/exposure/seat-rays.ts';

/**
 * The trip as a strip of time cells, each with how much sun reaches the window seats
 * on the driver side and on the door side. This is what the time bar draws.
 */

export type BandLevel = 'strong' | 'light' | 'none' | 'night';

export interface TimelineCell {
  startMinute: number;
  endMinute: number;
  /** Average share of the body in sun on that side's window seats, 0 to 1. */
  driver: number;
  door: number;
  night: boolean;
}

export function bandLevel(value: number, night: boolean): BandLevel {
  if (night) return 'night';
  return value >= STRONG_SUN ? 'strong' : value >= MILD_SUN ? 'light' : 'none';
}

export function timelineCells(vehicle: VehicleProfile, verdict: TripExposureVerdict, maxCells = 48): TimelineCell[] {
  const { timeline } = verdict;
  const cabin = getCabin(vehicle);
  const driverSeats = vehicle.seats.filter((s) => s.isWindow && s.side === 'left').map((s) => s.id);
  const doorSeats = vehicle.seats.filter((s) => s.isWindow && s.side === 'right').map((s) => s.id);

  const perStep = timeline.map((step) => {
    if (step.isNight) return null;
    const { ux, uy, uz } = calculateSunVector(step.solarAzimuthDeg, step.solarElevationDeg, step.headingDeg);
    const d = toVehicleFrame(ux, uy, uz);
    const average = (ids: number[]) => ids.reduce((a, id) => a + seatSunlight(cabin, id, d, step.solarElevationDeg), 0) / Math.max(1, ids.length);
    return { driver: average(driverSeats), door: average(doorSeats) };
  });

  // Every step but the arrival mark stands for the interval up to the next step.
  const steps = Math.max(1, timeline.length - 1);
  const count = Math.max(1, Math.min(maxCells, steps));
  const cells: TimelineCell[] = [];
  for (let k = 0; k < count; k++) {
    const i0 = Math.floor((k * steps) / count);
    const i1 = Math.max(i0 + 1, Math.floor(((k + 1) * steps) / count));
    const day = perStep.slice(i0, i1).filter((p): p is { driver: number; door: number } => p !== null);
    cells.push({
      startMinute: timeline[i0]?.minuteOffset ?? 0,
      endMinute: timeline[Math.min(i1, timeline.length - 1)]?.minuteOffset ?? verdict.tripMinutes,
      driver: day.length ? day.reduce((a, p) => a + p.driver, 0) / day.length : 0,
      door: day.length ? day.reduce((a, p) => a + p.door, 0) / day.length : 0,
      night: day.length === 0
    });
  }
  return cells;
}
