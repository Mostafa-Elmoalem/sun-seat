import { describe, it, expect } from 'vitest';
import { calculateSunPosition, getJulianDay } from '../../src/core/astronomy/noaa-solar.ts';

describe('NOAA Solar Position Calculations', () => {
  // Reference coordinates
  const CAIRO = { lat: 30.0444, lng: 31.2357 };
  const ASWAN = { lat: 24.0889, lng: 32.8998 };

  // Q1: 6 reference cases for Cairo + 1 for Aswan
  // Note on Egyptian solar time: Cairo (31.24° E) has local solar noon at ~09:55 UTC.
  it('Case 1: Cairo Summer Solstice Solar Noon (2026-06-21 09:55 UTC / 12:55 PM Cairo DST)', () => {
    const date = new Date(Date.UTC(2026, 5, 21, 9, 55, 0));
    const pos = calculateSunPosition(CAIRO.lat, CAIRO.lng, date);

    // Cairo is at ~30.04° N, Solar declination is ~23.44°
    // Peak elevation at solar noon: 90 - 30.04 + 23.44 = 83.4° ± 1°
    expect(pos.elevation).toBeGreaterThan(82.5);
    expect(pos.elevation).toBeLessThan(84.5);
    // At solar noon, azimuth faces South (~180° ± 5°)
    expect(pos.azimuth).toBeGreaterThan(170);
    expect(pos.azimuth).toBeLessThan(185);
  });

  it('Case 2: Cairo Winter Solstice Solar Noon (2026-12-21 09:55 UTC / 11:55 AM Cairo Winter)', () => {
    const date = new Date(Date.UTC(2026, 11, 21, 9, 55, 0));
    const pos = calculateSunPosition(CAIRO.lat, CAIRO.lng, date);

    // Declination ~ -23.44°. Elevation ~ 90 - 30.04 - 23.44 ≈ 36.5°
    expect(pos.elevation).toBeGreaterThan(35.5);
    expect(pos.elevation).toBeLessThan(37.5);
    expect(pos.azimuth).toBeGreaterThan(175);
    expect(pos.azimuth).toBeLessThan(185);
  });

  it('Case 3: Cairo Vernal Equinox Solar Noon (2026-03-20 09:55 UTC / 11:55 AM Cairo Winter)', () => {
    const date = new Date(Date.UTC(2026, 2, 20, 9, 55, 0));
    const pos = calculateSunPosition(CAIRO.lat, CAIRO.lng, date);

    // Declination ~ 0°. Elevation ~ 90 - 30.04 ≈ 59.96°
    expect(pos.elevation).toBeGreaterThan(59.0);
    expect(pos.elevation).toBeLessThan(61.0);
    expect(pos.azimuth).toBeGreaterThan(175);
    expect(pos.azimuth).toBeLessThan(185);
  });

  it('Case 4: Cairo Summer Sunrise (2026-06-21 03:00 UTC / 06:00 AM Cairo DST)', () => {
    const date = new Date(Date.UTC(2026, 5, 21, 3, 0, 0));
    const pos = calculateSunPosition(CAIRO.lat, CAIRO.lng, date);

    // At sunrise, elevation is near the horizon (~0° ± 2°)
    expect(pos.elevation).toBeGreaterThan(-1.0);
    expect(pos.elevation).toBeLessThan(3.0);
    // Sun rises in the North-East during summer (azimuth ~ 60° - 65°)
    expect(pos.azimuth).toBeGreaterThan(58);
    expect(pos.azimuth).toBeLessThan(66);
  });

  it('Case 5: Cairo Summer Late Afternoon (2026-06-21 15:30 UTC / 18:30 Cairo DST)', () => {
    const date = new Date(Date.UTC(2026, 5, 21, 15, 30, 0));
    const pos = calculateSunPosition(CAIRO.lat, CAIRO.lng, date);

    // Low elevation before sunset
    expect(pos.elevation).toBeGreaterThan(12);
    expect(pos.elevation).toBeLessThan(18);
    // Setting in the North-West (azimuth ~ 280° - 295°)
    expect(pos.azimuth).toBeGreaterThan(280);
    expect(pos.azimuth).toBeLessThan(295);
  });

  it('Case 6: Cairo Night (2026-06-21 20:00 UTC / 23:00 Cairo DST)', () => {
    const date = new Date(Date.UTC(2026, 5, 21, 20, 0, 0));
    const pos = calculateSunPosition(CAIRO.lat, CAIRO.lng, date);

    // Q3: Night returns negative elevation without errors
    expect(pos.elevation).toBeLessThan(-10);
    expect(pos.zenith).toBeGreaterThan(100);
  });

  it('Case 7: Aswan Summer Solstice Solar Noon (2026-06-21 09:48 UTC / 12:48 Aswan DST)', () => {
    // Aswan is at ~24.09° N, very close to the Tropic of Cancer (~23.44°)!
    // Sun is practically directly overhead (> 88.5° elevation, zenith < 1.5°)
    const date = new Date(Date.UTC(2026, 5, 21, 9, 48, 0));
    const pos = calculateSunPosition(ASWAN.lat, ASWAN.lng, date);

    expect(pos.elevation).toBeGreaterThan(88.5);
    expect(pos.zenith).toBeLessThan(1.5);
  });

  it('calculates correct Julian Day for J2000 epoch', () => {
    const epoch = new Date(Date.UTC(2000, 0, 1, 12, 0, 0));
    const jd = getJulianDay(epoch);
    expect(jd).toBeCloseTo(2451545.0, 4);
  });

  it('handles January and February correctly in Julian Day formula', () => {
    const janDate = new Date(Date.UTC(2024, 0, 15, 12, 0, 0));
    const febDate = new Date(Date.UTC(2024, 1, 15, 12, 0, 0));
    expect(getJulianDay(janDate)).toBeLessThan(getJulianDay(febDate));
  });

  it('completes calculation in under 0.05ms', () => {
    const date = new Date(Date.UTC(2026, 5, 21, 9, 55, 0));
    const start = performance.now();
    for (let i = 0; i < 5000; i++) {
      calculateSunPosition(CAIRO.lat, CAIRO.lng, date);
    }
    const elapsed = performance.now() - start;
    const perCall = elapsed / 5000;
    expect(perCall).toBeLessThan(0.05); // Less than 50 microseconds
  });

  it('handles exact zenith condition (subsolar point)', () => {
    // When latitude equals declination and hourAngle is 0, sun is directly overhead (zenith = 0)
    // On equinox (March 20 ~12:00 UTC at prime meridian 0,0)
    const date = new Date(Date.UTC(2026, 2, 20, 12, 7, 0));
    const pos = calculateSunPosition(0, 0, date);
    expect(pos.elevation).toBeGreaterThan(88.0);
    expect(pos.azimuth).toBeDefined();
  });
});

