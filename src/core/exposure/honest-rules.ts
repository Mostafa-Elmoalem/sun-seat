import type { Side, VerdictStatus } from '../types/vehicle.ts';

/**
 * Honest output policy. Turns per-side sun minutes into a verdict, and says so
 * plainly when the side does not matter or the two sides are too close to call.
 *
 * Inputs are the average direct-sun minutes of the window seats on each side.
 */
export interface VerdictInputs {
  leftSunMinutes: number;
  rightSunMinutes: number;
  tripMinutes: number;
  daylightMinutes: number;
}

export interface VerdictDecision {
  status: VerdictStatus;
  recommendedSide: Side | 'either';
}

export function classifyVerdict({
  leftSunMinutes,
  rightSunMinutes,
  tripMinutes,
  daylightMinutes
}: VerdictInputs): VerdictDecision {
  if (daylightMinutes === 0) return { status: 'NIGHT', recommendedSide: 'either' };

  const worst = Math.max(leftSunMinutes, rightSunMinutes);
  const diff = Math.abs(leftSunMinutes - rightSunMinutes);
  const better: Side = leftSunMinutes <= rightSunMinutes ? 'left' : 'right';

  // Nobody gets more than a few minutes of sun: the roof and the angle protect everyone.
  if (worst < Math.max(3, 0.08 * tripMinutes)) {
    return { status: 'DOES_NOT_MATTER', recommendedSide: 'either' };
  }
  // Both sides suffer about the same (often the sun switches sides mid-trip).
  if (diff < Math.max(4, 0.2 * worst)) {
    return { status: 'TIE', recommendedSide: 'either' };
  }
  if (diff >= Math.max(10, 0.45 * worst)) {
    return { status: 'CLEAR', recommendedSide: better };
  }
  return { status: 'LEANING', recommendedSide: better };
}
