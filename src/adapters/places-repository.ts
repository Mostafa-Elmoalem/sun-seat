import type { Place, PlaceKind } from '../core/types/places.ts';
import { normalizeArabic, stripAlPrefix } from '../core/geometry/normalize-arabic.ts';
import { calculateDistanceKm } from '../core/geometry/bearing.ts';
import { HUBS, getHubById } from '../data/hubs.ts';

/**
 * Place search in three layers, fastest first:
 *   1. curated hubs bundled in the app (instant, offline)
 *   2. the OSM gazetteer of ~2,400 Egyptian places, fetched once after first paint (offline after that)
 *   3. Photon (OpenStreetMap) online search for anything else: streets, schools, shops
 */

const GAZETTEER_URL = '/data/gazetteer-eg.json';
const PHOTON_URL = 'https://photon.komoot.io/api/';
const EGYPT_BBOX = '24.6,21.9,37.1,31.8';

type GazRow = [nameAr: string, nameEn: string, lat: number, lng: number, typeIndex: number, nearIndex: number];

interface GazetteerFile {
  v: number;
  types: string[];
  places: GazRow[];
}

interface Indexed {
  place: Place;
  ar: string;
  arStripped: string;
  en: string;
  aliases: string[];
  isHub: boolean;
}

const KIND_BONUS: Record<PlaceKind, number> = {
  city: 60,
  town: 40,
  station: 45,
  university: 35,
  metro: 25,
  rail: 20,
  district: 30,
  village: 0,
  poi: 0,
  gps: 0
};

function toKind(type: string | undefined): PlaceKind {
  switch (type) {
    case 'city':
    case 'town':
    case 'station':
    case 'metro':
    case 'rail':
    case 'university':
    case 'district':
    case 'village':
      return type;
    default:
      return 'poi';
  }
}

function indexPlace(place: Place, isHub: boolean): Indexed {
  const ar = normalizeArabic(place.nameAr);
  return {
    place,
    ar,
    arStripped: stripAlPrefix(ar),
    en: place.nameEn.toLowerCase(),
    aliases: (place.aliases ?? []).map((a) => normalizeArabic(a)),
    isHub
  };
}

function scoreEntry(item: Indexed, q: string, qStripped: string, tokens: string[]): number {
  let best = 0;
  const consider = (text: string, full: number, prefix: number, wordPrefix: number, contains: number) => {
    if (!text) return;
    if (text === q) best = Math.max(best, full);
    else if (text.startsWith(q)) best = Math.max(best, prefix);
    else if (text.split(' ').some((w) => w.startsWith(q))) best = Math.max(best, wordPrefix);
    else if (text.includes(q)) best = Math.max(best, contains);
  };

  consider(item.ar, 1000, 620, 420, 260);
  consider(item.arStripped, 950, 600, 400, 240);
  if (qStripped !== q) consider(item.arStripped, 950, 600, 400, 240);
  consider(item.en, 900, 560, 380, 220);
  for (const alias of item.aliases) consider(alias, 980, 540, 360, 200);

  if (best === 0 && tokens.length > 1) {
    const hay = `${item.arStripped} ${item.en} ${item.aliases.join(' ')}`;
    if (tokens.every((t) => hay.includes(t))) best = 150;
  }
  if (best === 0) return 0;

  let bonus = KIND_BONUS[item.place.kind];
  if (item.isHub) bonus += 90;
  if (item.place.isPopular) bonus += 40;
  return best + bonus - Math.min(40, item.place.nameAr.length * 0.6);
}

export class PlacesRepository {
  private hubs: Indexed[];
  private gazetteer: Indexed[] = [];
  private gazetteerPromise: Promise<void> | null = null;
  private fetchImpl: typeof fetch | undefined;

  constructor(options: { fetchImpl?: typeof fetch; gazetteer?: GazetteerFile } = {}) {
    this.fetchImpl = options.fetchImpl ?? (typeof fetch !== 'undefined' ? fetch.bind(globalThis) : undefined);
    this.hubs = HUBS.map((h) => indexPlace(h, true));
    if (options.gazetteer) this.ingestGazetteer(options.gazetteer);
  }

  get isGazetteerLoaded(): boolean {
    return this.gazetteer.length > 0;
  }

  /** Fetches the OSM gazetteer once. Safe to call many times; never throws. */
  loadGazetteer(): Promise<void> {
    if (this.gazetteerPromise) return this.gazetteerPromise;
    if (!this.fetchImpl) return Promise.resolve();
    this.gazetteerPromise = this.fetchImpl(GAZETTEER_URL)
      .then((res) => (res.ok ? (res.json() as Promise<GazetteerFile>) : null))
      .then((data) => {
        if (data) this.ingestGazetteer(data);
      })
      .catch(() => {
        this.gazetteerPromise = null;
      });
    return this.gazetteerPromise ?? Promise.resolve();
  }

  private ingestGazetteer(data: GazetteerFile): void {
    const rows = data.places;
    this.gazetteer = rows.map(([nameAr, nameEn, lat, lng, typeIndex, nearIndex], i) => {
      const near = nearIndex >= 0 ? rows[nearIndex] : undefined;
      const place: Place = {
        id: `g:${i}`,
        nameAr,
        nameEn,
        contextAr: near ? `قريب من ${near[0]}` : undefined,
        contextEn: near ? `near ${near[1]}` : undefined,
        location: { lat, lng },
        kind: toKind(data.types[typeIndex])
      };
      return indexPlace(place, false);
    });
  }

  /** Local search over hubs and (if loaded) the gazetteer. Sub-millisecond on a phone. */
  search(query: string, limit = 8): Place[] {
    const q = normalizeArabic(query);
    if (!q) return this.getPopular(limit);
    const qStripped = stripAlPrefix(q);
    const tokens = qStripped.split(' ').filter(Boolean);

    const scored: { item: Indexed; score: number }[] = [];
    for (const item of this.hubs) {
      const score = scoreEntry(item, q, qStripped, tokens);
      if (score > 0) scored.push({ item, score });
    }
    for (const item of this.gazetteer) {
      const score = scoreEntry(item, q, qStripped, tokens);
      if (score > 0) scored.push({ item, score });
    }
    scored.sort((a, b) => b.score - a.score);

    const out: Place[] = [];
    for (const { item } of scored) {
      const dup = out.some(
        (p) =>
          normalizeArabic(p.nameAr) === item.ar &&
          calculateDistanceKm(p.location.lat, p.location.lng, item.place.location.lat, item.place.location.lng) < 3
      );
      if (!dup) out.push(item.place);
      if (out.length >= limit) break;
    }
    return out;
  }

  /** Online OSM search via Photon. Returns [] when offline or on any failure. */
  async searchOnline(query: string, lang: 'ar' | 'en', signal?: AbortSignal): Promise<Place[]> {
    const q = query.trim();
    if (q.length < 2 || !this.fetchImpl) return [];
    const url = `${PHOTON_URL}?q=${encodeURIComponent(q)}&limit=8&bbox=${EGYPT_BBOX}${lang === 'en' ? '&lang=en' : ''}`;
    try {
      const res = await this.fetchImpl(url, signal ? { signal } : undefined);
      if (!res.ok) return [];
      const data = (await res.json()) as {
        features?: {
          geometry: { coordinates: [number, number] };
          properties: Record<string, string | undefined>;
        }[];
      };
      const places: Place[] = [];
      for (const f of data.features ?? []) {
        const p = f.properties;
        if (p.countrycode && p.countrycode !== 'EG') continue;
        if (!p.name) continue;
        const [lng, lat] = f.geometry.coordinates;
        const context = [p.district ?? p.city ?? p.county, p.state].filter(Boolean).join('، ');
        places.push({
          id: `p:${lat.toFixed(5)},${lng.toFixed(5)}`,
          nameAr: p.name,
          nameEn: p.name,
          contextAr: context || undefined,
          contextEn: context || undefined,
          location: { lat, lng },
          kind: photonKind(p.osm_key, p.osm_value)
        });
      }
      return places;
    } catch {
      return [];
    }
  }

  getPopular(limit = 8): Place[] {
    return HUBS.filter((h) => h.isPopular).slice(0, limit);
  }

  getById(id: string): Place | undefined {
    const hub = getHubById(id);
    if (hub) return hub;
    return this.gazetteer.find((g) => g.place.id === id)?.place;
  }

  /** Closest named place to a coordinate (hubs and gazetteer), within maxKm. */
  findNearest(lat: number, lng: number, maxKm = 5): { place: Place; km: number } | null {
    let best: { place: Place; km: number } | null = null;
    const consider = (item: Indexed) => {
      if (item.place.kind === 'rail' || item.place.kind === 'metro') return;
      const km = calculateDistanceKm(lat, lng, item.place.location.lat, item.place.location.lng);
      const adjusted = item.isHub ? km * 0.7 : km;
      if (adjusted <= maxKm && (!best || adjusted < best.km)) best = { place: item.place, km: adjusted };
    };
    this.hubs.forEach(consider);
    this.gazetteer.forEach(consider);
    return best;
  }
}

function photonKind(key?: string, value?: string): PlaceKind {
  if (value === 'bus_station') return 'station';
  if (value === 'university' || value === 'college') return 'university';
  if (key === 'railway') return value === 'subway_entrance' ? 'metro' : 'rail';
  if (key === 'place') {
    if (value === 'city') return 'city';
    if (value === 'town') return 'town';
    if (value === 'village' || value === 'hamlet') return 'village';
    return 'district';
  }
  return 'poi';
}

export const defaultPlacesRepository = new PlacesRepository();
