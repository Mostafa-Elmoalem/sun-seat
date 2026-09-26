import { describe, it, expect } from 'vitest';
import {
  calculateTripExposure,
  calculateSunVector
} from '../../src/core/exposure/exposure-calculator.ts';
import { defaultVehicleRepository } from '../../src/core/vehicles/vehicle-repository.ts';
import { cairoTimeToUtc } from '../../src/core/astronomy/timezone.ts';
import type { ProcessedRoute } from '../../src/core/types/routes.ts';
import type { VehicleProfile } from '../../src/core/types/vehicle.ts';

function createStraightRoute(
  startLat: number,
  startLng: number,
  endLat: number,
  endLng: number,
  bearingDeg: number,
  distKm: number,
  durationMin: number
): ProcessedRoute {
  return {
    origin: {
      id: 'p-start',
      nameAr: 'نقطة البداية',
      nameEn: 'Start',
      governorateAr: 'القاهرة',
      aliases: [],
      location: { lat: startLat, lng: startLng },
      type: 'station',
      isPopular: true
    },
    destination: {
      id: 'p-end',
      nameAr: 'نقطة النهاية',
      nameEn: 'End',
      governorateAr: 'الإسكندرية',
      aliases: [],
      location: { lat: endLat, lng: endLng },
      type: 'station',
      isPopular: true
    },
    totalDistanceKm: distKm,
    totalDurationMin: durationMin,
    isApproximate: false,
    segments: [
      {
        startLat,
        startLng,
        endLat,
        endLng,
        bearingDeg,
        distanceKm: distKm,
        durationMin
      }
    ]
  };
}

describe('Exposure Engine & Seat Calculation', () => {
  const microbus = defaultVehicleRepository.getProfile('microbus-14');

  // Q1 Golden test 1: straight route heading due north at 8:00 AM Cairo time in June
  it('Q1: recommends LEFT side for due North trip at 8:00 AM in June (sun is in the East on right)', () => {
    const routeNorth = createStraightRoute(30.0, 31.0, 31.0, 31.0, 0.0, 111.0, 60);
    // June 15 at 8:00 AM Cairo local time (DST UTC+3)
    const departureDateUtc = cairoTimeToUtc(2026, 6, 15, 8, 0);

    const verdict = calculateTripExposure(routeNorth, departureDateUtc, microbus);

    expect(verdict.recommendedSide).toBe('left');
    expect(verdict.sidePercentages.leftShade).toBeGreaterThan(verdict.sidePercentages.rightShade);
    expect(verdict.sidePercentages.leftShade).toBeGreaterThan(80);
    expect(verdict.bestSeatIds).toContain(3); // Window left row 1
  });

  // Q2 Golden test 2: same route heading due south flips the verdict
  it('Q2: recommends RIGHT side for due South trip at 8:00 AM in June (verdict flips)', () => {
    const routeSouth = createStraightRoute(31.0, 31.0, 30.0, 31.0, 180.0, 111.0, 60);
    const departureDateUtc = cairoTimeToUtc(2026, 6, 15, 8, 0);

    const verdict = calculateTripExposure(routeSouth, departureDateUtc, microbus);

    expect(verdict.recommendedSide).toBe('right');
    expect(verdict.sidePercentages.rightShade).toBeGreaterThan(verdict.sidePercentages.leftShade);
    expect(verdict.sidePercentages.rightShade).toBeGreaterThan(80);
  });

  // Q3 Golden test 3: trip fully at night returns "night" with 0 exposure
  it('Q3: returns status NIGHT with 0 exposure for trip at 11:00 PM', () => {
    const route = createStraightRoute(30.0, 31.0, 31.0, 31.0, 0.0, 111.0, 60);
    // 11:00 PM Cairo local time (23:00)
    const departureDateUtc = cairoTimeToUtc(2026, 6, 15, 23, 0);

    const verdict = calculateTripExposure(route, departureDateUtc, microbus);

    expect(verdict.status).toBe('NIGHT');
    expect(verdict.sidePercentages.leftShade).toBe(100);
    expect(verdict.sidePercentages.rightShade).toBe(100);
    for (const seat of verdict.seatsExposure) {
      expect(seat.score).toBe(0);
      expect(seat.shadePercentage).toBe(100);
    }
  });

  // Q4 Golden test 4: noon in late June near Cairo (sun very high >68°) returns "doesn't matter"
  it('Q4: returns status DOES_NOT_MATTER for midday summer overhead sun in Cairo', () => {
    const route = createStraightRoute(30.0, 31.0, 30.5, 31.0, 0.0, 55.0, 40);
    // June 21 at 12:55 PM Cairo local time (Solar noon under DST UTC+3, elevation > 83°)
    const departureDateUtc = cairoTimeToUtc(2026, 6, 21, 12, 55);

    const verdict = calculateTripExposure(route, departureDateUtc, microbus);

    expect(verdict.status).toBe('DOES_NOT_MATTER');
    expect(verdict.recommendedSide).toBe('either');
  });

  // Q5 Golden test 5: Cairo -> Alex morning AND Alex -> Cairo afternoon BOTH recommend LEFT side!
  it('Q5: proves the Cairo-Alex roundtrip counter-intuitive paradox (both trips recommend LEFT side)', () => {
    const cairoToAlex = createStraightRoute(30.0832, 31.2588, 31.1853, 29.9281, 320.0, 218.0, 145);
    const alexToCairo = createStraightRoute(31.1853, 29.9281, 30.0832, 31.2588, 140.0, 218.0, 145);

    // Morning trip Cairo -> Alex: 8:30 AM Cairo time
    const morningUtc = cairoTimeToUtc(2026, 6, 15, 8, 30);
    const morningVerdict = calculateTripExposure(cairoToAlex, morningUtc, microbus);

    // Afternoon trip Alex -> Cairo: 4:30 PM Cairo time
    const afternoonUtc = cairoTimeToUtc(2026, 6, 15, 16, 30);
    const afternoonVerdict = calculateTripExposure(alexToCairo, afternoonUtc, microbus);

    // BOTH recommend LEFT side!
    expect(morningVerdict.recommendedSide).toBe('left');
    expect(afternoonVerdict.recommendedSide).toBe('left');

    // Verify mathematical proof: relative angles both fall in (0, 180) meaning sun is on the right (+x)
    const morningAvgRel = morningVerdict.timeline[10]!.relativeAngleDeg;
    const afternoonAvgRel = afternoonVerdict.timeline[10]!.relativeAngleDeg;

    // Both relative angles indicate sun on the right (between 15° and 165°)
    expect(morningAvgRel).toBeGreaterThan(15);
    expect(morningAvgRel).toBeLessThan(165);
    expect(afternoonAvgRel).toBeGreaterThan(15);
    expect(afternoonAvgRel).toBeLessThan(165);
  });

  // Q6: Works with dynamic private car profile without engine changes
  it('Q6: calculates exposure seamlessly for custom 3-seater private car profile', () => {
    const customCar: VehicleProfile = {
      id: 'private-sedan-3',
      nameAr: 'ملاكي',
      nameEn: 'Sedan',
      type: 'custom',
      totalSeats: 3,
      speedFactor: 1.0,
      stopOverheadMin: 0,
      hasCurtains: false,
      dimensions: { lengthM: 4.5, widthM: 1.8, heightM: 1.5, roofOverhangM: 0.1 },
      windows: [
        { id: 'w-l', side: 'left', yStart: 1.0, yEnd: 3.5, zBottom: 0.8, zTop: 1.4 },
        { id: 'w-r', side: 'right', yStart: 1.0, yEnd: 3.5, zBottom: 0.8, zTop: 1.4 }
      ],
      seats: [
        { id: 1, labelAr: 'يمين قدام', labelEn: 'Front R', row: 0, col: 1, side: 'right', isWindow: true, position: { x: 0.45, y: 1.2, z: 0.95 } },
        { id: 2, labelAr: 'شمال ورا', labelEn: 'Rear L', row: 1, col: 0, side: 'left', isWindow: true, position: { x: -0.45, y: 2.5, z: 0.95 } },
        { id: 3, labelAr: 'يمين ورا', labelEn: 'Rear R', row: 1, col: 1, side: 'right', isWindow: true, position: { x: 0.45, y: 2.5, z: 0.95 } }
      ]
    };

    const route = createStraightRoute(30.0, 31.0, 31.0, 31.0, 0.0, 111.0, 60);
    const departureDateUtc = cairoTimeToUtc(2026, 6, 15, 8, 0);

    const verdict = calculateTripExposure(route, departureDateUtc, customCar);
    expect(verdict.recommendedSide).toBe('left');
    expect(verdict.seatsExposure.length).toBe(3);
  });

  // Q7: Benchmark: 4-hour trip completes in < 50 ms in Node
  it('Q7: calculates complete 4-hour trip (240 min) with sensitivity analysis in < 50 ms', () => {
    // 4 hour trip (e.g. Cairo to Assiut, 380 km)
    const longTrip = createStraightRoute(30.0, 31.2, 27.2, 31.2, 180.0, 380.0, 240);
    const departureDateUtc = cairoTimeToUtc(2026, 6, 15, 9, 0);

    const start = performance.now();
    const verdict = calculateTripExposure(longTrip, departureDateUtc, microbus);
    const elapsed = performance.now() - start;

    expect(verdict).toBeDefined();
    expect(verdict.timeline.length).toBeGreaterThan(240);
    // Must complete in < 50 ms
    expect(elapsed).toBeLessThan(50);
  });
});
