import { describe, it, expect } from 'vitest';
import { serializeTripToQuery, parseTripFromQuery } from '../../src/app/trip/share-link.ts';
import { getHubById } from '../../src/data/hubs.ts';
import { COPY, formatDuration, verdictHeadline } from '../../src/ui/i18n/copy.ts';
import { classifyVerdict } from '../../src/core/exposure/honest-rules.ts';
import type { Place } from '../../src/core/types/places.ts';

describe('share links', () => {
  const departure = new Date(Date.UTC(2026, 8, 26, 11, 25));

  it('round-trips hubs by id', () => {
    const q = serializeTripToQuery({
      origin: getHubById('cairo-ramses')!,
      destination: getHubById('alex-moharam-bek')!,
      vehicleId: 'bus-49',
      departure,
      lang: 'ar'
    });
    expect(q).toContain('f=cairo-ramses');
    const back = parseTripFromQuery(q)!;
    expect(back.origin.id).toBe('cairo-ramses');
    expect(back.vehicleId).toBe('bus-49');
    expect(back.departure.getTime()).toBe(departure.getTime());
  });

  it('round-trips any place as rounded coordinates and a name', () => {
    const school: Place = { id: 'p:x', nameAr: 'مدرسة النصر', nameEn: 'x', location: { lat: 30.123456, lng: 31.654321 }, kind: 'poi' };
    const q = serializeTripToQuery({ origin: school, destination: getHubById('gharbia-tanta')!, vehicleId: 'microbus-14', departure, lang: 'ar' });
    const back = parseTripFromQuery(q)!;
    expect(back.origin.nameAr).toBe('مدرسة النصر');
    expect(back.origin.location.lat).toBeCloseTo(30.123, 3);
  });

  it('never puts a precise GPS fix in a link (rounded to about 1 km, named by the nearby place)', () => {
    const me: Place = {
      id: 'gps',
      nameAr: 'موقعي',
      nameEn: 'My location',
      contextAr: 'قريب من الدقي',
      location: { lat: 30.038912, lng: 31.211876 },
      kind: 'gps'
    };
    const q = serializeTripToQuery({ origin: me, destination: getHubById('gharbia-tanta')!, vehicleId: 'microbus-14', departure, lang: 'ar' });
    expect(decodeURIComponent(q.replace(/\+/g, ' '))).toContain('@30.04,31.21~قريب من الدقي');
  });

  it('rejects coordinates outside Egypt', () => {
    expect(parseTripFromQuery('?f=@48.85,2.35~Paris&t=cairo-ramses')).toBeNull();
  });
});

describe('copy', () => {
  it('names sides by what riders see, never شمال or يمين', () => {
    const h = verdictHeadline('CLEAR', 'right', 'ar');
    expect(`${h.lead}${h.mark}`).toBe('اقعد ناحية الباب');
    expect(verdictHeadline('CLEAR', 'left', 'ar').mark).toBe('ناحية السواق');
    expect(JSON.stringify(COPY.ar)).not.toMatch(/اقعد (شمال|يمين)/);
  });

  it('speaks durations the Egyptian way', () => {
    expect(formatDuration(1, 'ar')).toBe('دقيقة');
    expect(formatDuration(2, 'ar')).toBe('دقيقتين');
    expect(formatDuration(5, 'ar')).toBe('5 دقايق');
    expect(formatDuration(45, 'ar')).toBe('45 دقيقة');
    expect(formatDuration(90, 'ar')).toBe('ساعة ونص');
    expect(formatDuration(137, 'ar')).toBe('ساعتين و17 دقيقة');
    expect(formatDuration(90, 'en')).toBe('1 h 30 min');
  });
});

describe('honest output policy', () => {
  const base = { tripMinutes: 120, daylightMinutes: 120 };
  it('says NIGHT when the sun never rises during the trip', () => {
    expect(classifyVerdict({ ...base, leftSunMinutes: 0, rightSunMinutes: 0, daylightMinutes: 0 }).status).toBe('NIGHT');
  });
  it('says it does not matter when nobody gets more than a few minutes', () => {
    expect(classifyVerdict({ ...base, leftSunMinutes: 6, rightSunMinutes: 1 }).status).toBe('DOES_NOT_MATTER');
  });
  it('calls a tie when both sides suffer about the same', () => {
    expect(classifyVerdict({ ...base, leftSunMinutes: 50, rightSunMinutes: 45 })).toEqual({ status: 'TIE', recommendedSide: 'either' });
  });
  it('picks the side with less sun, clearly when the gap is large', () => {
    expect(classifyVerdict({ ...base, leftSunMinutes: 80, rightSunMinutes: 5 })).toEqual({ status: 'CLEAR', recommendedSide: 'right' });
    expect(classifyVerdict({ ...base, leftSunMinutes: 30, rightSunMinutes: 45 })).toEqual({ status: 'LEANING', recommendedSide: 'left' });
  });
});
