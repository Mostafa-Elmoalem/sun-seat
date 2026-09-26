import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { HUBS, getHubById } from '../../src/data/hubs.ts';
import { PRECOMPUTED_ROUTE_IDS } from '../../src/data/route-index.ts';
import { decodePolyline } from '../../src/core/geometry/polyline-decoder.ts';
import { calculateDistanceKm } from '../../src/core/geometry/bearing.ts';
import { isInsideEgypt } from '../../scripts/egypt-border.ts';
import { VEHICLES } from '../../src/data/vehicles.ts';
import { validateVehicleProfile } from '../../src/core/vehicles/vehicle-repository.ts';

/**
 * The launch demo once shipped a "Cairo to Alexandria" route that actually started
 * near Qena and produced the wrong verdict. These checks make fake or stale data fail loudly.
 */

const ROUTES_DIR = path.resolve('public/data/routes');

describe('precomputed routes are real and match their endpoints', () => {
  const files = fs.readdirSync(ROUTES_DIR).filter((f) => f.endsWith('.json'));

  it('the index lists exactly the files on disk', () => {
    expect([...PRECOMPUTED_ROUTE_IDS].sort()).toEqual(files.map((f) => f.replace(/\.json$/, '')).sort());
    expect(files.length).toBeGreaterThan(100);
  });

  it.each(files)('%s starts and ends at its hubs and has a plausible length', (file) => {
    const data = JSON.parse(fs.readFileSync(path.join(ROUTES_DIR, file), 'utf8'));
    const [fromId, toId] = file.replace(/\.json$/, '').split('__');
    const from = getHubById(fromId!);
    const to = getHubById(toId!);
    expect(from, `unknown hub ${fromId}`).toBeTruthy();
    expect(to, `unknown hub ${toId}`).toBeTruthy();

    const pts = decodePolyline(data.encodedPolyline);
    expect(pts.length).toBeGreaterThan(5);
    const first = pts[0]!;
    const last = pts[pts.length - 1]!;
    expect(calculateDistanceKm(first[0], first[1], from!.location.lat, from!.location.lng)).toBeLessThan(2.5);
    expect(calculateDistanceKm(last[0], last[1], to!.location.lat, to!.location.lng)).toBeLessThan(2.5);

    let km = 0;
    for (let i = 1; i < pts.length; i++) km += calculateDistanceKm(pts[i - 1]![0], pts[i - 1]![1], pts[i]![0], pts[i]![1]);
    // A simplified polyline is a little shorter than the road, never longer, never wildly shorter.
    expect(km / data.distanceKm).toBeGreaterThan(0.85);
    expect(km / data.distanceKm).toBeLessThan(1.02);

    const straight = calculateDistanceKm(from!.location.lat, from!.location.lng, to!.location.lat, to!.location.lng);
    expect(data.distanceKm).toBeGreaterThanOrEqual(straight * 0.95);
    expect(pts.every(([lat, lng]) => isInsideEgypt(lat, lng))).toBe(true);
  });
});

describe('places data', () => {
  it('every hub is inside Egypt and has an id, Arabic and English name', () => {
    const ids = new Set<string>();
    for (const h of HUBS) {
      expect(ids.has(h.id)).toBe(false);
      ids.add(h.id);
      expect(isInsideEgypt(h.location.lat, h.location.lng), h.id).toBe(true);
      expect(h.nameAr.length).toBeGreaterThan(1);
      expect(h.nameEn.length).toBeGreaterThan(1);
    }
  });

  it('the OSM gazetteer only contains places inside Egypt', () => {
    const g = JSON.parse(fs.readFileSync(path.resolve('public/data/gazetteer-eg.json'), 'utf8'));
    expect(g.places.length).toBeGreaterThan(2000);
    const outside = g.places.filter((p: [string, string, number, number]) => !isInsideEgypt(p[2], p[3]));
    expect(outside).toEqual([]);
  });

  it('knows the real location of Abboud terminal (the old data was 2.5 km off)', () => {
    const abboud = getHubById('cairo-abboud')!;
    expect(calculateDistanceKm(abboud.location.lat, abboud.location.lng, 30.1056, 31.2545)).toBeLessThan(0.3);
  });
});

describe('vehicle profiles', () => {
  it.each(VEHICLES.map((v) => [v.id, v] as const))('%s is valid and geometrically consistent', (_id, v) => {
    expect(validateVehicleProfile(v)).toBe(true);
    const halfW = v.dimensions.widthM / 2;
    for (const s of v.seats) {
      expect(Math.abs(s.position.x)).toBeLessThan(halfW - 0.2);
      expect(s.position.y).toBeGreaterThan(v.dimensions.frontWallY);
      expect(s.position.y).toBeLessThan(v.dimensions.rearWallY);
      expect(s.position.z).toBeGreaterThan(v.dimensions.floorZ);
    }
    for (const w of v.windows) {
      expect(w.zTop).toBeLessThanOrEqual(v.dimensions.roofInnerZ);
      if ('yStart' in w) expect(w.yEnd).toBeLessThanOrEqual(v.dimensions.lengthM);
    }
  });

  it('the microbus has the owner-confirmed layout: 2 up front, 3 rows of 3, a bench of 3', () => {
    const mb = VEHICLES.find((v) => v.id === 'microbus-14')!;
    const perRow = [0, 1, 2, 3, 4].map((r) => mb.seats.filter((s) => s.row === r).length);
    expect(perRow).toEqual([2, 3, 3, 3, 3]);
    expect(mb.driver.x).toBeLessThan(0);
    expect(mb.doorSide).toBe('right');
  });
});

describe('owner rules', () => {
  const walk = (dir: string): string[] =>
    fs.readdirSync(dir, { withFileTypes: true }).flatMap((d) => (d.isDirectory() ? walk(path.join(dir, d.name)) : [path.join(dir, d.name)]));
  const files = ['index.html', 'README.md', 'PRODUCT.md', ...walk('src')].filter((f) => /\.(tsx?|css|html|md)$/.test(f) && fs.existsSync(f));

  it('no em dash or en dash anywhere in copy, code or docs', () => {
    const offenders = files.filter((f) => /[–—]/.test(fs.readFileSync(f, 'utf8')));
    expect(offenders).toEqual([]);
  });
});
