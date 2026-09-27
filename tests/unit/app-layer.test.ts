import { describe, it, expect } from 'vitest';
import { calculateTripExposure } from '../../src/core/exposure/exposure-calculator.ts';
import { cairoTimeToUtc } from '../../src/core/astronomy/timezone.ts';
import { MICROBUS_14 } from '../../src/data/vehicles.ts';
import type { ProcessedRoute } from '../../src/core/types/routes.ts';
import type { Place } from '../../src/core/types/places.ts';
import { presentVerdict } from '../../src/app/result/verdict-model.ts';
import { seatStates, SHADE_BELOW } from '../../src/app/result/seat-model.ts';
import { bandLevel, timelineCells } from '../../src/app/result/timeline-model.ts';
import { fromNow, roundToFiveMinutes, tomorrowSameTime } from '../../src/app/trip/departure.ts';
import { addRecent, recentPlaces, type RecentTrip } from '../../src/app/trip/recents.ts';
import { calculateTrip, validateTrip } from '../../src/app/trip/calculate-trip.ts';

function straightRoute(bearingDeg: number, durationMin: number, lat = 30.3, lng = 31.2): ProcessedRoute {
  const km = durationMin;
  const rad = (bearingDeg * Math.PI) / 180;
  const endLat = lat + (Math.cos(rad) * km) / 111;
  const endLng = lng + (Math.sin(rad) * km) / (111 * Math.cos((lat * Math.PI) / 180));
  return { totalDistanceKm: km, totalDurationMin: durationMin, segments: [{ startLat: lat, startLng: lng, endLat, endLng, bearingDeg, distanceKm: km, durationMin }] };
}

const place = (id: string, lat: number, lng: number, kind: Place['kind'] = 'station'): Place => ({ id, nameAr: id, nameEn: id, location: { lat, lng }, kind });

const afternoonNorth = () => calculateTripExposure(straightRoute(0, 90), cairoTimeToUtc(2026, 9, 26, 15, 0), MICROBUS_14);
const winterNoonNorth = () => calculateTripExposure(straightRoute(0, 60), cairoTimeToUtc(2026, 12, 21, 12, 0), MICROBUS_14);
const nightTrip = () => calculateTripExposure(straightRoute(0, 60), cairoTimeToUtc(2026, 9, 26, 21, 0), MICROBUS_14);

describe('verdict model', () => {
  it('explains a clear verdict with the minutes on each side', () => {
    const m = presentVerdict(afternoonNorth(), MICROBUS_14);
    expect(m.side).toBe('right');
    expect(m.reason).toMatchObject({ kind: 'sides', sunny: 'left', good: 'right' });
    if (m.reason.kind === 'sides') expect(m.reason.sunnyMinutes).toBeGreaterThan(m.reason.goodMinutes);
    expect(m.bestSeats.length).toBeGreaterThan(0);
  });

  it('keeps seat advice and the back-bench warning when neither side is better', () => {
    const m = presentVerdict(winterNoonNorth(), MICROBUS_14);
    expect(m.side).toBe('either');
    expect(m.endAdvice).toBe('avoid-back');
    expect(m.bestSeats.length).toBeGreaterThan(0);
    for (const id of m.bestSeats) expect([12, 13, 14]).not.toContain(id);
  });

  it('names no seats and gives the sunrise at night', () => {
    const m = presentVerdict(nightTrip(), MICROBUS_14);
    expect(m.status).toBe('NIGHT');
    expect(m.bestSeats).toEqual([]);
    expect(m.endAdvice).toBeNull();
    expect(m.reason.kind).toBe('night');
  });
});

describe('seat model', () => {
  it('whole trip: the sunny side is drawn sunny, the best seats are flagged', () => {
    const v = afternoonNorth();
    const states = seatStates(v, MICROBUS_14, null);
    expect(states.get(3)!.level).toBeGreaterThan(0);
    expect(states.get(3)!.sun).toBe('strong');
    for (const id of v.bestSeatIds) expect(states.get(id)!.isBest).toBe(true);
    for (const s of states.values()) if (s.strongMinutes + s.lightMinutes === 0) expect(s.level).toBe(0);
  });

  it('a trace of light sun on a recommended seat still reads as shade', () => {
    const v = afternoonNorth();
    const states = seatStates(v, MICROBUS_14, null);
    for (const id of v.bestSeatIds) {
      const s = states.get(id)!;
      const share = (s.strongMinutes + 0.5 * s.lightMinutes) / v.tripMinutes;
      if (share < SHADE_BELOW) expect(s.level).toBe(0);
    }
    expect(states.get(3)!.level).toBeGreaterThanOrEqual(2);
  });

  it('one moment: follows the sunlight at that step, not the trip totals', () => {
    const v = afternoonNorth();
    const step = v.timeline[20]!;
    const states = seatStates(v, MICROBUS_14, step);
    expect(states.get(3)!.sun).not.toBe('none');
    expect(states.get(5)!.sun).toBe('none');
  });
});

describe('timeline model', () => {
  it('lights the driver side more than the door side on an afternoon trip north', () => {
    const cells = timelineCells(MICROBUS_14, afternoonNorth(), 40);
    expect(cells.length).toBeLessThanOrEqual(40);
    const driverLit = cells.filter((c) => bandLevel(c.driver, c.night) !== 'none').length;
    const doorLit = cells.filter((c) => bandLevel(c.door, c.night) !== 'none').length;
    expect(driverLit).toBeGreaterThan(doorLit);
  });

  it('marks night cells as night', () => {
    const cells = timelineCells(MICROBUS_14, nightTrip(), 30);
    expect(cells.every((c) => c.night)).toBe(true);
  });

  it('covers the trip from departure to arrival in order', () => {
    const v = afternoonNorth();
    const cells = timelineCells(MICROBUS_14, v, 24);
    expect(cells[0]!.startMinute).toBe(0);
    for (let i = 1; i < cells.length; i++) expect(cells[i]!.startMinute).toBeGreaterThanOrEqual(cells[i - 1]!.startMinute);
  });
});

describe('departure rules', () => {
  it('rounds to five minutes', () => {
    expect(roundToFiveMinutes(new Date(Date.UTC(2026, 8, 26, 10, 2, 40))).getUTCMinutes()).toBe(5);
  });
  it('counts "in 30 minutes" from the tap', () => {
    const now = new Date(Date.UTC(2026, 8, 26, 10, 0));
    expect(fromNow(30, now).getTime()).toBe(Date.UTC(2026, 8, 26, 10, 30));
  });
  it('never puts "tomorrow" in the past', () => {
    const now = new Date(Date.UTC(2026, 8, 26, 10, 0));
    const past = new Date(Date.UTC(2026, 8, 25, 8, 0));
    expect(tomorrowSameTime(past, now).getTime()).toBe(Date.UTC(2026, 8, 27, 10, 0));
    const later = new Date(Date.UTC(2026, 8, 26, 18, 0));
    expect(tomorrowSameTime(later, now).getTime()).toBe(Date.UTC(2026, 8, 27, 18, 0));
  });
});

describe('recents', () => {
  it('puts the latest trip first without duplicates', () => {
    const a = place('a', 30, 31);
    const b = place('b', 30.5, 31.5);
    let list: RecentTrip[] = [];
    list = addRecent(list, { origin: a, destination: b, vehicleId: 'microbus-14' }, 1);
    list = addRecent(list, { origin: b, destination: a, vehicleId: 'microbus-14' }, 2);
    list = addRecent(list, { origin: a, destination: b, vehicleId: 'microbus-14' }, 3);
    expect(list.map((r) => r.at)).toEqual([3, 2]);
  });
  it('offers distinct places and never a GPS fix', () => {
    const gps = place('gps', 30.1, 31.1, 'gps');
    const a = place('a', 30, 31);
    const list: RecentTrip[] = [{ origin: gps, destination: a, vehicleId: 'microbus-14', at: 1 }, { origin: a, destination: gps, vehicleId: 'microbus-14', at: 0 }];
    expect(recentPlaces(list).map((p) => p.id)).toEqual(['a']);
  });
});

describe('calculate trip use case', () => {
  it('refuses a missing or identical pair of places', () => {
    const a = place('a', 30, 31);
    expect(validateTrip(null, a)).toBe('MISSING');
    expect(validateTrip(a, place('a2', 30.0005, 31.0005))).toBe('SAME');
    expect(validateTrip(a, place('b', 30.5, 31.5))).toBeNull();
  });
  it('runs with injected dependencies, no network', async () => {
    const result = await calculateTrip(
      { origin: place('a', 30.3, 31.2), destination: place('b', 31, 31.2), vehicleId: 'microbus-14', departure: cairoTimeToUtc(2026, 9, 26, 15, 0) },
      {
        getRoute: async () => ({ ...straightRoute(0, 60), coordinates: [], source: 'straight', isApproximate: true } as never),
        getVehicle: () => MICROBUS_14
      }
    );
    expect(result.verdict.recommendedSide).toBe('right');
    expect(result.vehicle).toBe(MICROBUS_14);
  });
});
