import { describe, it, expect } from 'vitest';
import {
  calculateTripExposure,
  calculateSunVector,
  circularMeanDeg,
  seatSunlightAtStep,
  STRONG_SUN
} from '../../src/core/exposure/exposure-calculator.ts';
import { buildCabinModel, litBodyParts, pointSunlight, seatSunlight, toVehicleFrame } from '../../src/core/exposure/seat-rays.ts';
import { cairoTimeToUtc } from '../../src/core/astronomy/timezone.ts';
import { MICROBUS_14, BUS_49 } from '../../src/data/vehicles.ts';
import type { ProcessedRoute } from '../../src/core/types/routes.ts';

/**
 * Ground truth comes from geometry anyone can check with a compass:
 * in Egypt the sun rises in the east, sits in the south at noon, and sets in the west.
 * Driving north, east is on your right (door side) and west is on your left (driver side).
 */

function straightRoute(bearingDeg: number, durationMin: number, lat = 30.3, lng = 31.2): ProcessedRoute {
  const km = durationMin; // 60 km/h
  const rad = (bearingDeg * Math.PI) / 180;
  const endLat = lat + (Math.cos(rad) * km) / 111;
  const endLng = lng + (Math.sin(rad) * km) / (111 * Math.cos((lat * Math.PI) / 180));
  return {
    totalDistanceKm: km,
    totalDurationMin: durationMin,
    segments: [{ startLat: lat, startLng: lng, endLat, endLng, bearingDeg, distanceKm: km, durationMin }]
  };
}

const sept = (h: number, m = 0) => cairoTimeToUtc(2026, 9, 26, h, m);

describe('sun vector', () => {
  it('puts an east sun on the right of a north-facing vehicle', () => {
    const v = calculateSunVector(90, 20, 0);
    expect(v.ux).toBeGreaterThan(0.9);
    expect(Math.abs(v.uy)).toBeLessThan(0.01);
  });
  it('puts a west sun on the left of a north-facing vehicle', () => {
    expect(calculateSunVector(270, 20, 0).ux).toBeLessThan(-0.9);
  });
  it('averages headings on a circle, not a line', () => {
    expect(Math.round(circularMeanDeg([350, 10]) % 360)).toBe(0);
    expect(Math.round(circularMeanDeg([90, 90, 270, 90]))).toBe(90);
  });
});

describe('trip verdicts against compass ground truth', () => {
  it('northbound in the afternoon: sun on the driver side, sit on the door side', () => {
    const v = calculateTripExposure(straightRoute(0, 90), sept(15), MICROBUS_14);
    expect(v.recommendedSide).toBe('right');
    expect(v.status).toBe('CLEAR');
    expect(v.sides.leftSunMinutes).toBeGreaterThan(v.sides.rightSunMinutes + 20);
  });

  it('northbound in the morning: sun on the door side, sit on the driver side', () => {
    const v = calculateTripExposure(straightRoute(0, 90), sept(8), MICROBUS_14);
    expect(v.recommendedSide).toBe('left');
  });

  it('southbound in the morning flips it: sit on the door side', () => {
    const v = calculateTripExposure(straightRoute(180, 90), sept(8), MICROBUS_14);
    expect(v.recommendedSide).toBe('right');
  });

  it('eastbound in the afternoon has the sun behind: little side difference', () => {
    const v = calculateTripExposure(straightRoute(90, 60), sept(16), MICROBUS_14);
    expect(['TIE', 'DOES_NOT_MATTER', 'LEANING']).toContain(v.status);
  });

  it('summer noon: the roof shades everyone, so it does not matter', () => {
    const noon = cairoTimeToUtc(2026, 6, 21, 12, 30);
    const v = calculateTripExposure(straightRoute(0, 60), noon, MICROBUS_14);
    expect(v.status).toBe('DOES_NOT_MATTER');
    expect(v.recommendedSide).toBe('either');
  });

  it('a night trip has no sun at all', () => {
    const v = calculateTripExposure(straightRoute(0, 60), sept(21), MICROBUS_14);
    expect(v.status).toBe('NIGHT');
    expect(v.seatsExposure.every((s) => s.sunMinutes === 0)).toBe(true);
  });

  it('the recommendation holds for the bus too', () => {
    const v = calculateTripExposure(straightRoute(0, 120), sept(14), BUS_49);
    expect(v.recommendedSide).toBe('right');
  });
});

describe('seat level physics', () => {
  it('middle seats get less sun than the window seat next to them (the neighbor blocks it)', () => {
    const v = calculateTripExposure(straightRoute(0, 90), sept(15), MICROBUS_14);
    const byId = new Map(v.seatsExposure.map((s) => [s.seatId, s.sunMinutes]));
    // Row 1: seat 3 is the driver-side window, seat 4 is the middle.
    expect(byId.get(3)!).toBeGreaterThan(byId.get(4)! * 2);
  });

  it('the best seats are on the recommended side or in the shaded middle', () => {
    const v = calculateTripExposure(straightRoute(0, 90), sept(15), MICROBUS_14);
    const seats = new Map(MICROBUS_14.seats.map((s) => [s.id, s]));
    for (const id of v.bestSeatIds) expect(seats.get(id)!.side).not.toBe('left');
  });

  it('driving into a low morning sun lights the front row through the windshield', () => {
    const v = calculateTripExposure(straightRoute(100, 40), sept(7, 30), MICROBUS_14);
    const byId = new Map(v.seatsExposure.map((s) => [s.seatId, s.sunMinutes]));
    expect(byId.get(1)! + byId.get(2)!).toBeGreaterThan(byId.get(13)! + byId.get(14)!);
  });

  it('a ray straight up always hits the roof', () => {
    const cabin = buildCabinModel(MICROBUS_14);
    const seat = MICROBUS_14.seats[2]!;
    const p = { x: seat.position.x, y: seat.position.y, z: seat.position.z + 0.5 };
    expect(pointSunlight(cabin, p, toVehicleFrame(0, 0, 1))).toBe(0);
  });

  it('a low side ray through the adjacent window reaches the window passenger', () => {
    const cabin = buildCabinModel(MICROBUS_14);
    const seat = MICROBUS_14.seats.find((s) => s.id === 3)!; // left window, row 1
    // The window-side shoulder, just outside the torso.
    const p = { x: seat.position.x - 0.21, y: seat.position.y - 0.02, z: seat.position.z + 0.45 };
    const { ux, uy, uz } = calculateSunVector(270, 15, 0);
    const d = toVehicleFrame(ux, uy, uz);
    expect(pointSunlight(cabin, p, d)).toBeGreaterThan(0.5);
    // The same ray from the far shoulder has to cross the passenger's own body.
    expect(pointSunlight(cabin, { ...p, x: seat.position.x + 0.21 }, d)).toBe(0);
  });

  it('instant per-seat sunlight matches the side the sun is on', () => {
    const v = calculateTripExposure(straightRoute(0, 90), sept(15), MICROBUS_14);
    const step = v.timeline[20]!;
    const lit = seatSunlightAtStep(MICROBUS_14, step);
    expect(step.sunSide).toBe('left');
    expect(lit.get(3)!).toBeGreaterThan(lit.get(5)!);
  });
});

describe('sun from behind and the back bench (owner field reports, September 2026)', () => {
  // Winter noon, heading north: the sun sits straight behind the vehicle at about 37 degrees.
  const winterNoonNorth = () => calculateTripExposure(straightRoute(0, 60), cairoTimeToUtc(2026, 12, 21, 12, 0), MICROBUS_14);

  it('lights the backs of the back bench through the rear glass for most of the trip', () => {
    const v = winterNoonNorth();
    const byId = new Map(v.seatsExposure.map((s) => [s.seatId, s]));
    for (const id of [12, 13, 14]) {
      const s = byId.get(id)!;
      expect(s.strongMinutes + s.mildMinutes).toBeGreaterThan(0.8 * v.tripMinutes);
    }
    // The benches in front sit behind people and headrests: at most a little sun.
    for (const id of [4, 7, 10]) expect(byId.get(id)!.sunMinutes).toBeLessThan(3);
  });

  it('says so even though neither side is better: avoid the back bench', () => {
    const v = winterNoonNorth();
    expect(v.recommendedSide).toBe('either');
    expect(v.endAdvice).toBe('avoid-back');
    expect(v.seatAdvice).toBe(true);
    for (const id of v.bestSeatIds) expect([12, 13, 14]).not.toContain(id);
    expect(v.worstSeatIds.every((id) => [12, 13, 14].includes(id))).toBe(true);
  });

  it('it is the upper back and shoulders that take it, the short backrest covers only the lower back', () => {
    const cabin = buildCabinModel(MICROBUS_14);
    const { ux, uy, uz } = calculateSunVector(180, 30, 0);
    const parts = litBodyParts(cabin, 13, toVehicleFrame(ux, uy, uz), 30);
    expect(parts).toContain('upperBack');
    expect(parts).not.toContain('face');
    expect(seatSunlight(cabin, 13, toVehicleFrame(ux, uy, uz), 30)).toBeGreaterThanOrEqual(STRONG_SUN);
  });

  it('a commuter seat with a tall backrest and headrest keeps the back in shade', () => {
    const cabin = buildCabinModel(MICROBUS_14);
    const { ux, uy, uz } = calculateSunVector(180, 30, 0);
    expect(litBodyParts(cabin, 7, toVehicleFrame(ux, uy, uz), 30)).not.toContain('upperBack');
  });
});

describe('graded sun', () => {
  it('a sun slightly off the nose still reaches the window seats, as light sun', () => {
    // Heading 100 degrees at 7:30 in September: the low sun is ahead and a little to the door side.
    const v = calculateTripExposure(straightRoute(100, 40), sept(7, 30), MICROBUS_14);
    const mild = v.seatsExposure.reduce((a, s) => a + s.mildMinutes, 0);
    expect(mild).toBeGreaterThan(0);
  });

  it('strong and light minutes never add up to more than the trip', () => {
    const v = calculateTripExposure(straightRoute(0, 90), sept(15), MICROBUS_14);
    for (const s of v.seatsExposure) expect(s.strongMinutes + s.mildMinutes).toBeLessThanOrEqual(v.tripMinutes);
  });

  it('the front row keeps its knees under the dashboard when a summer sun stands almost overhead', () => {
    const v = calculateTripExposure(straightRoute(0, 60), cairoTimeToUtc(2026, 6, 21, 12, 30), MICROBUS_14);
    const byId = new Map(v.seatsExposure.map((s) => [s.seatId, s]));
    expect(byId.get(1)!.strongMinutes).toBe(0);
    expect(byId.get(2)!.strongMinutes).toBe(0);
  });
});

describe('seat ranking', () => {
  const score = (s: { sunMinutes: number; strongMinutes: number; mildMinutes: number }) => s.sunMinutes + 0.25 * (s.strongMinutes + s.mildMinutes);

  // Cases the old pairwise "within one minute" comparison got wrong.
  const cases: [string, number, number, number, number][] = [
    ['June, heading 120, 10:00', 120, 6, 10, 40],
    ['January, heading 150, 9:00', 150, 1, 9, 40],
    ['December, heading 150, 6:00', 150, 12, 6, 40]
  ];
  for (const [label, bearing, month, hour, minutes] of cases) {
    it(`never ranks a sunnier seat above a shadier one (${label})`, () => {
      const v = calculateTripExposure(straightRoute(bearing, minutes), cairoTimeToUtc(2026, month, 15, hour, 0), MICROBUS_14);
      const byId = new Map(v.seatsExposure.map((s) => [s.seatId, s]));
      const worstBest = Math.max(...v.bestSeatIds.map((id) => score(byId.get(id)!)));
      for (const s of v.seatsExposure) {
        if (!v.bestSeatIds.includes(s.seatId)) expect(score(s)).toBeGreaterThan(worstBest - 1.01);
      }
    });
  }

  it('the order is a strict total order (sorting twice gives the same result)', () => {
    const v = calculateTripExposure(straightRoute(40, 120), sept(9), MICROBUS_14);
    const again = calculateTripExposure(straightRoute(40, 120), sept(9), MICROBUS_14);
    expect(again.bestSeatIds).toEqual(v.bestSeatIds);
    expect(again.worstSeatIds).toEqual(v.worstSeatIds);
  });
});

describe('performance on a phone budget', () => {
  it('a 4 hour microbus trip with sensitivity passes runs well under 250 ms', () => {
    const t0 = performance.now();
    calculateTripExposure(straightRoute(315, 240), sept(13), MICROBUS_14);
    expect(performance.now() - t0).toBeLessThan(250);
  });
});
