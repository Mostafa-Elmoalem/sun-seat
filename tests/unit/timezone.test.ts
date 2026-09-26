import { describe, it, expect } from 'vitest';
import {
  getCairoOffsetHours,
  cairoTimeToUtc,
  formatCairoTime
} from '../../src/core/astronomy/timezone.ts';

describe('Egyptian Timezone and DST Handling (Africa/Cairo)', () => {
  // Egypt DST Law (reintroduced 2023):
  // Starts: Last Friday of April at 00:00 (clocks move to 01:00 UTC+3)
  // Ends: Last Thursday of October at 24:00 (clocks move to 23:00 UTC+2)

  it('detects Standard Time (+2) in Winter (January)', () => {
    const winterDate = new Date(Date.UTC(2026, 0, 15, 10, 0, 0));
    expect(getCairoOffsetHours(winterDate)).toBe(2);
  });

  it('detects Daylight Saving Time (+3) in Summer (July)', () => {
    const summerDate = new Date(Date.UTC(2026, 6, 15, 10, 0, 0));
    expect(getCairoOffsetHours(summerDate)).toBe(3);
  });

  // Q2: DST Transition tests (Day before vs Day after in April 2026)
  // In 2026, the last Friday of April is April 24, 2026.
  it('converts correctly the day before DST starts (2026-04-20 -> UTC+2)', () => {
    const utc = cairoTimeToUtc(2026, 4, 20, 12, 0, 0);
    // Local 12:00 at UTC+2 = 10:00 UTC
    expect(utc.getUTCHours()).toBe(10);
    expect(utc.getUTCDate()).toBe(20);
  });

  it('converts correctly after DST starts (2026-05-01 -> UTC+3)', () => {
    const utc = cairoTimeToUtc(2026, 5, 1, 12, 0, 0);
    // Local 12:00 at UTC+3 = 09:00 UTC
    expect(utc.getUTCHours()).toBe(9);
    expect(utc.getUTCDate()).toBe(1);
  });

  // Q2: DST Transition tests (Day before vs Day after in October/November 2026)
  // In 2026, the last Thursday of October is October 29, 2026.
  it('converts correctly before DST ends (2026-10-25 -> UTC+3)', () => {
    const utc = cairoTimeToUtc(2026, 10, 25, 12, 0, 0);
    // Local 12:00 at UTC+3 = 09:00 UTC
    expect(utc.getUTCHours()).toBe(9);
  });

  it('converts correctly after DST ends (2026-11-05 -> UTC+2)', () => {
    const utc = cairoTimeToUtc(2026, 11, 5, 12, 0, 0);
    // Local 12:00 at UTC+2 = 10:00 UTC
    expect(utc.getUTCHours()).toBe(10);
  });

  it('formats Cairo time accurately', () => {
    // 09:00 UTC in July = 12:00 PM in Cairo
    const date = new Date(Date.UTC(2026, 6, 1, 9, 0, 0));
    const formatted = formatCairoTime(date, 'time');
    expect(formatted).toMatch(/12:00/);

    const formattedFull = formatCairoTime(date, 'full');
    expect(formattedFull).toContain('2026');
  });
});

