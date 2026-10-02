import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import { RoutesRepository } from '../../src/adapters/routes-repository.ts';
import { PlacesRepository } from '../../src/adapters/places-repository.ts';
import { getHubById } from '../../src/data/hubs.ts';
import { encodePolyline } from '../../src/core/geometry/polyline-decoder.ts';
import { simplifyPolyline } from '../../src/core/geometry/simplify.ts';
import type { Place } from '../../src/core/types/places.ts';

const memoryStorage = () => {
  const m = new Map<string, string>();
  return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v) };
};

const point = (lat: number, lng: number, name = 'x'): Place => ({
  id: `p:${lat},${lng}`,
  nameAr: name,
  nameEn: name,
  location: { lat, lng },
  kind: 'poi'
});

function jsonResponse(body: unknown, ok = true): Response {
  return { ok, json: async () => body } as unknown as Response;
}

describe('routes repository', () => {
  it('uses the shipped route for hub pairs, and for places within 1 km of a hub', async () => {
    const calls: string[] = [];
    const fetchImpl = (async (url: string) => {
      calls.push(url);
      return jsonResponse(JSON.parse(fs.readFileSync(`public${url}`, 'utf8')));
    }) as unknown as typeof fetch;
    const repo = new RoutesRepository({ fetchImpl, storage: null });
    const ramses = getHubById('cairo-ramses')!;
    const alex = getHubById('alex-moharam-bek')!;
    expect((await repo.getRoute(ramses, alex)).source).toBe('precomputed');
    const nearRamses = point(ramses.location.lat + 0.004, ramses.location.lng);
    expect((await repo.getRoute(nearRamses, alex)).source).toBe('precomputed');
    expect(calls.every((u) => u.startsWith('/data/routes/'))).toBe(true);
  });

  it('fetches a live route for arbitrary places, then serves it from phone storage', async () => {
    const coords: [number, number][] = [];
    for (let i = 0; i <= 50; i++) coords.push([30.5 + i * 0.005, 31.0 + i * 0.002]);
    let live = 0;
    const fetchImpl = (async (url: string) => {
      if (url.startsWith('https://router.project-osrm.org')) {
        live++;
        return jsonResponse({ code: 'Ok', routes: [{ distance: 30000, duration: 1800, geometry: encodePolyline(coords) }] });
      }
      return jsonResponse({}, false);
    }) as unknown as typeof fetch;
    const storage = memoryStorage();
    const a = point(30.5, 31.0);
    const b = point(30.75, 31.1);
    const first = await new RoutesRepository({ fetchImpl, storage, isOnline: () => true }).getRoute(a, b);
    expect(first.source).toBe('live');
    expect(first.totalDurationMin).toBe(30);
    const again = await new RoutesRepository({ fetchImpl, storage, isOnline: () => true }).getRoute(a, b);
    expect(again.source).toBe('cached');
    expect(live).toBe(1);
  });

  it('falls back to a clearly approximate straight line when offline', async () => {
    const repo = new RoutesRepository({
      fetchImpl: (async () => jsonResponse({}, false)) as unknown as typeof fetch,
      storage: null,
      isOnline: () => false
    });
    const r = await repo.getRoute(point(30.5, 31.0), point(30.9, 31.3));
    expect(r.source).toBe('straight');
    expect(r.isApproximate).toBe(true);
    expect(r.approximateReason).toBe('offline');
    expect(r.segments.length).toBeGreaterThan(0);
  });

  it('falls back to straight line with route_failed when online but router fails', async () => {
    const repo = new RoutesRepository({
      fetchImpl: (async () => jsonResponse({}, false)) as unknown as typeof fetch,
      storage: null,
      isOnline: () => true
    });
    const r = await repo.getRoute(point(30.5, 31.0), point(30.9, 31.3));
    expect(r.source).toBe('straight');
    expect(r.isApproximate).toBe(true);
    expect(r.approximateReason).toBe('route_failed');
  });

  it('simplifies without losing the ends or real turns', () => {
    const line: [number, number][] = [];
    for (let i = 0; i <= 100; i++) line.push([30 + i * 0.001, 31]);
    for (let i = 1; i <= 100; i++) line.push([30.1, 31 + i * 0.001]);
    const s = simplifyPolyline(line, 25);
    expect(s[0]).toEqual(line[0]);
    expect(s[s.length - 1]).toEqual(line[line.length - 1]);
    expect(s.length).toBe(3);
  });
});

describe('places search', () => {
  const gazetteer = JSON.parse(fs.readFileSync('public/data/gazetteer-eg.json', 'utf8'));
  const repo = new PlacesRepository({ gazetteer });

  it('finds terminals by their colloquial name', () => {
    expect(repo.search('عبود')[0]?.id).toBe('cairo-abboud');
    expect(repo.search('محطة مصر')[0]?.id).toBe('cairo-ramses');
  });

  it('ignores alef and teh marbuta spelling differences', () => {
    expect(repo.search('جامعه القاهره')[0]?.nameAr).toContain('جامعة القاهرة');
    expect(repo.search('اسكندريه').length).toBeGreaterThan(0);
  });

  it('reaches districts and cities from the OSM gazetteer', () => {
    expect(repo.search('الدقي').some((p) => p.nameEn === 'Dokki')).toBe(true);
    expect(repo.search('Tanta').length).toBeGreaterThan(0);
  });

  it('finds the nearest named place for a GPS fix', () => {
    expect(repo.findNearest(30.1054, 31.2549, 5)?.place.id).toBe('cairo-abboud');
  });

  it('parses online results and drops anything outside Egypt', async () => {
    const fetchImpl = (async () =>
      jsonResponse({
        features: [
          {
            geometry: { coordinates: [31.2, 30.05] },
            properties: { name: 'مدرسة تجريبية', countrycode: 'EG', osm_key: 'amenity', osm_value: 'school', city: 'القاهرة' }
          },
          { geometry: { coordinates: [35.2, 31.7] }, properties: { name: 'Elsewhere', countrycode: 'IL' } }
        ]
      })) as unknown as typeof fetch;
    const online = await new PlacesRepository({ fetchImpl }).searchOnline('مدرسة', 'ar');
    expect(online.map((p) => p.nameAr)).toEqual(['مدرسة تجريبية']);
    expect(online[0]!.kind).toBe('poi');
  });
});
