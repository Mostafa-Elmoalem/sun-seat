/**
 * Builds public/data/gazetteer-eg.json: every city, town, village, district,
 * microbus/bus station, rail/metro station and university in Egypt that has a
 * usable name in OpenStreetMap.
 *
 * Usage:
 *   node --experimental-strip-types scripts/build-places.ts          (uses scripts/.cache)
 *   node --experimental-strip-types scripts/build-places.ts --fetch  (refreshes the cache from Overpass)
 *
 * Output format (compact, loaded lazily by the app and cached by the service worker):
 *   { v, attribution, types: string[], places: [nameAr, nameEn, lat, lng, typeIndex, nearIndex][] }
 * nearIndex points at the closest city/town entry (for "near X" context), or -1.
 *
 * Data: © OpenStreetMap contributors, ODbL 1.0.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { isInsideEgypt } from './egypt-border.ts';
import { normalizeArabic } from '../src/core/geometry/normalize-arabic.ts';

const CACHE_DIR = path.resolve('scripts/.cache');
const OUT_FILE = path.resolve('public/data/gazetteer-eg.json');
const BBOX = '21.9,24.6,31.8,37.1';
const OVERPASS_HOSTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter'
];

const QUERIES: Record<string, string> = {
  city_town: '(node["place"="city"];node["place"="town"];);',
  village: '(node["place"="village"];);',
  suburb: '(node["place"~"^(suburb|neighbourhood|quarter)$"];);',
  transport: '(nwr["amenity"~"^(bus_station|university)$"];nwr["railway"="station"];);',
  admin: '(rel["boundary"="administrative"]["admin_level"~"^(8|9)$"];);'
};

/** Order matters: lower index wins dedupe ties and ranks higher in search. */
export const GAZETTEER_TYPES = ['city', 'town', 'station', 'metro', 'rail', 'university', 'district', 'village'] as const;
type GazType = (typeof GAZETTEER_TYPES)[number];

interface OsmElement {
  type: string;
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
}

interface Candidate {
  ar: string;
  en: string;
  lat: number;
  lng: number;
  type: GazType;
  norm: string;
}

const ARABIC = /[؀-ۿ]/;
const LATIN = /[A-Za-z]/;

async function fetchCache(): Promise<void> {
  fs.mkdirSync(CACHE_DIR, { recursive: true });
  for (const [key, body] of Object.entries(QUERIES)) {
    const query = `[out:json][timeout:180][bbox:${BBOX}];${body}out tags center;`;
    let saved = false;
    for (let attempt = 0; attempt < 3 && !saved; attempt++) {
      for (const host of OVERPASS_HOSTS) {
        const res = await fetch(host, {
          method: 'POST',
          headers: {
            'User-Agent': 'sun-seat-data-build/1.0',
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          body: `data=${encodeURIComponent(query)}`
        }).catch(() => null);
        const text = res && res.ok ? await res.text() : '';
        if (text.startsWith('{')) {
          fs.writeFileSync(path.join(CACHE_DIR, `osm-${key}.json`), text);
          console.log(`[fetch] ${key} from ${host} (${text.length} bytes)`);
          saved = true;
          break;
        }
        console.warn(`[fetch] ${key} failed at ${host}, retrying`);
        await new Promise((r) => setTimeout(r, 8000));
      }
    }
    if (!saved) throw new Error(`Could not fetch ${key} from any Overpass mirror`);
  }
}

function classify(tags: Record<string, string>): GazType | null {
  if (tags.place === 'city') return 'city';
  if (tags.place === 'town') return 'town';
  if (tags.place === 'village') return 'village';
  if (tags.place === 'suburb' || tags.place === 'neighbourhood' || tags.place === 'quarter') return 'district';
  if (tags.amenity === 'university') return 'university';
  if (tags.amenity === 'bus_station') return 'station';
  if (tags.railway === 'station') return tags.station === 'subway' ? 'metro' : 'rail';
  if (tags.boundary === 'administrative') return 'district';
  return null;
}

function pickNames(tags: Record<string, string>): { ar: string; en: string } | null {
  const name = (tags.name ?? '').trim();
  const ar = (tags['name:ar'] ?? (ARABIC.test(name) ? name : '')).trim();
  const en = (tags['name:en'] ?? (LATIN.test(name) && !ARABIC.test(name) ? name : '')).trim();
  if (!ar && !en) return null;
  return { ar: ar || en, en: en || ar };
}

/** Bus "stations" in OSM include tiny stops; keep the ones that read like a real terminal. */
function isUsefulStation(ar: string, en: string): boolean {
  return /موقف|مواقف|محطة|ميناء|terminal|station/i.test(`${ar} ${en}`);
}

function decorate(type: GazType, ar: string, en: string): { ar: string; en: string } {
  if (type === 'metro' && !/مترو/.test(ar)) {
    return { ar: `محطة مترو ${ar.replace(/^محطة\s+/, '')}`, en: /metro/i.test(en) ? en : `${en} Metro` };
  }
  if (type === 'rail' && !/محطة|قطار|سكة/.test(ar)) {
    return { ar: `محطة قطار ${ar}`, en: /station/i.test(en) ? en : `${en} Railway Station` };
  }
  return { ar, en };
}

function distanceKm(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const toRad = Math.PI / 180;
  const dLat = (bLat - aLat) * toRad;
  const dLng = (bLng - aLng) * toRad;
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(aLat * toRad) * Math.cos(bLat * toRad) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

function build(): void {
  const candidates: Candidate[] = [];
  let droppedOutside = 0;

  for (const key of Object.keys(QUERIES)) {
    const file = path.join(CACHE_DIR, `osm-${key}.json`);
    const data = JSON.parse(fs.readFileSync(file, 'utf8')) as { elements: OsmElement[] };
    for (const el of data.elements) {
      const tags = el.tags ?? {};
      const type = classify(tags);
      if (!type) continue;
      const lat = el.lat ?? el.center?.lat;
      const lng = el.lon ?? el.center?.lon;
      if (lat === undefined || lng === undefined) continue;
      if (!isInsideEgypt(lat, lng)) {
        droppedOutside++;
        continue;
      }
      const names = pickNames(tags);
      if (!names) continue;
      if (type === 'station' && !isUsefulStation(names.ar, names.en)) continue;
      const { ar, en } = decorate(type, names.ar, names.en);
      candidates.push({ ar, en, lat, lng, type, norm: normalizeArabic(ar) });
    }
  }

  // Dedupe: same normalized Arabic name within 1.5 km keeps the higher-priority type.
  candidates.sort((a, b) => GAZETTEER_TYPES.indexOf(a.type) - GAZETTEER_TYPES.indexOf(b.type));
  const kept: Candidate[] = [];
  const byName = new Map<string, Candidate[]>();
  for (const c of candidates) {
    const same = byName.get(c.norm) ?? [];
    if (same.some((k) => distanceKm(k.lat, k.lng, c.lat, c.lng) < 1.5)) continue;
    same.push(c);
    byName.set(c.norm, same);
    kept.push(c);
  }

  const settlements = kept
    .map((c, index) => ({ c, index }))
    .filter(({ c }) => c.type === 'city' || c.type === 'town');

  const rows = kept.map((c) => {
    let near = -1;
    if (c.type !== 'city') {
      let best = 40;
      for (const s of settlements) {
        if (s.c === c) continue;
        const d = distanceKm(c.lat, c.lng, s.c.lat, s.c.lng);
        if (d < best) {
          best = d;
          near = s.index;
        }
      }
    }
    return [
      c.ar,
      c.en,
      Number(c.lat.toFixed(4)),
      Number(c.lng.toFixed(4)),
      GAZETTEER_TYPES.indexOf(c.type),
      near
    ];
  });

  const out = {
    v: 1,
    attribution: '© OpenStreetMap contributors, ODbL',
    types: GAZETTEER_TYPES,
    places: rows
  };
  fs.writeFileSync(OUT_FILE, JSON.stringify(out));

  const counts: Record<string, number> = {};
  for (const c of kept) counts[c.type] = (counts[c.type] ?? 0) + 1;
  console.log(`[build] ${kept.length} places (dropped ${droppedOutside} outside Egypt)`, counts);
  console.log(`[build] wrote ${OUT_FILE} (${fs.statSync(OUT_FILE).size} bytes)`);
}

if (process.argv.includes('--fetch')) {
  await fetchCache();
}
build();
