import { describe, it, expect } from 'vitest';
import { RoutesRepository } from '../../src/adapters/routes-repository.ts';
import { calculateBearing, calculateDistanceKm } from '../../src/core/geometry/bearing.ts';
import { encodePolyline, decodePolyline } from '../../src/core/geometry/polyline-decoder.ts';
import type { Place } from '../../src/core/types/places.ts';

describe('Routes Repository & Geometric Bearing', () => {
  // Q3: Bearing tests with known simple paths
  it('calculates exact cardinal bearings (North=0, East=90, South=180, West=270)', () => {
    // Due North
    const northBearing = calculateBearing(30.0, 31.0, 31.0, 31.0);
    expect(northBearing).toBeCloseTo(0.0, 1);

    // Due East (along Equator great circle or local small step)
    const eastBearing = calculateBearing(0.0, 31.0, 0.0, 32.0);
    expect(eastBearing).toBeCloseTo(90.0, 1);

    // Due South
    const southBearing = calculateBearing(31.0, 31.0, 30.0, 31.0);
    expect(southBearing).toBeCloseTo(180.0, 1);

    // Due West (along Equator great circle)
    const westBearing = calculateBearing(0.0, 32.0, 0.0, 31.0);
    expect(westBearing).toBeCloseTo(270.0, 1);
  });

  it('calculates Northwest bearing for Cairo to Alexandria (~315° - 325°)', () => {
    const cairo = { lat: 30.0583, lng: 31.2464 };
    const alex = { lat: 31.1853, lng: 29.9281 };
    const bearing = calculateBearing(cairo.lat, cairo.lng, alex.lat, alex.lng);
    expect(bearing).toBeGreaterThan(315);
    expect(bearing).toBeLessThan(330);
  });

  it('calculates accurate Haversine distance for Cairo to Alexandria (~180 km as the crow flies)', () => {
    const cairo = { lat: 30.0583, lng: 31.2464 };
    const alex = { lat: 31.1853, lng: 29.9281 };
    const dist = calculateDistanceKm(cairo.lat, cairo.lng, alex.lat, alex.lng);
    expect(dist).toBeGreaterThan(175);
    expect(dist).toBeLessThan(190);
  });

  it('encodes and decodes polylines losslessly', () => {
    const originalPoints: [number, number][] = [
      [30.05833, 31.24642],
      [30.55011, 31.00214],
      [31.18532, 29.92811]
    ];
    const encoded = encodePolyline(originalPoints);
    const decoded = decodePolyline(encoded);

    expect(decoded.length).toBe(originalPoints.length);
    for (let i = 0; i < originalPoints.length; i++) {
      expect(decoded[i]![0]).toBeCloseTo(originalPoints[i]![0], 4);
      expect(decoded[i]![1]).toBeCloseTo(originalPoints[i]![1], 4);
    }
  });

  // Q4: Missing route file returns safe approximate fallback without crash
  it('returns approximate straight-line route with isApproximate flag on missing file', async () => {
    const repo = new RoutesRepository();
    const origin: Place = {
      id: 'custom-dokki',
      nameAr: 'الدقي',
      nameEn: 'Dokki',
      governorateAr: 'الجيزة',
      aliases: [],
      location: { lat: 30.0385, lng: 31.2119 },
      type: 'district',
      isPopular: true
    };
    const dest: Place = {
      id: 'custom-tagamoa',
      nameAr: 'التجمع الخامس',
      nameEn: 'New Cairo',
      governorateAr: 'القاهرة',
      aliases: [],
      location: { lat: 30.0074, lng: 31.4339 },
      type: 'district',
      isPopular: true
    };

    const route = await repo.getRoute(origin, dest);
    expect(route).toBeDefined();
    expect(route.isApproximate).toBe(true);
    expect(route.segments.length).toBeGreaterThan(1);
    expect(route.totalDistanceKm).toBeGreaterThan(15);
    expect(route.totalDurationMin).toBeGreaterThan(10);
  });

  it('processes precomputed route segments correctly with bearings and proportional durations', () => {
    const repo = new RoutesRepository();
    const origin: Place = {
      id: 'cairo-abboud',
      nameAr: 'موقف عبود',
      nameEn: 'Abboud',
      governorateAr: 'القاهرة',
      aliases: [],
      location: { lat: 30.0832, lng: 31.2588 },
      type: 'station',
      isPopular: true
    };
    const dest: Place = {
      id: 'alex-moharam-bek',
      nameAr: 'محرم بك',
      nameEn: 'Alex',
      governorateAr: 'الإسكندرية',
      aliases: [],
      location: { lat: 31.1853, lng: 29.9281 },
      type: 'station',
      isPopular: true
    };

    const routeData = {
      routeId: 'cairo-abboud-alex-moharam-bek',
      originId: 'cairo-abboud',
      destinationId: 'alex-moharam-bek',
      distanceKm: 218.4,
      carDurationMin: 145,
      encodedPolyline: encodePolyline([
        [30.0832, 31.2588],
        [30.5, 30.8],
        [31.1853, 29.9281]
      ])
    };

    const processed = repo.processRoute(routeData, origin, dest);
    expect(processed.segments.length).toBe(2);
    expect(processed.isApproximate).toBe(false);

    // Sum of segment durations should roughly equal total duration
    const totalSegmentDuration = processed.segments.reduce((acc, s) => acc + s.durationMin, 0);
    expect(totalSegmentDuration).toBeCloseTo(145, 0);
  });
});
