import type { Place } from '../core/types/places.ts';
import type { RouteData, DecodedRoute, RouteSegment, RouteSource } from '../core/types/routes.ts';
import { decodePolyline, encodePolyline } from '../core/geometry/polyline-decoder.ts';
import { calculateBearing, calculateDistanceKm } from '../core/geometry/bearing.ts';
import { simplifyPolyline } from '../core/geometry/simplify.ts';
import { HUBS } from '../data/hubs.ts';
import { PRECOMPUTED_ROUTE_IDS } from '../data/route-index.ts';
import { routeIdFor } from './route-id.ts';

const PRECOMPUTED = new Set<string>(PRECOMPUTED_ROUTE_IDS);
const OSRM_BASE = 'https://router.project-osrm.org/route/v1/driving/';
const STORAGE_KEY = 'sun_seat_routes_v2';
const MAX_STORED_ROUTES = 30;
/** A searched place this close to a hub reuses that hub's precomputed route. */
const HUB_SNAP_KM = 1.0;

interface StoredRoute {
  d: number;
  t: number;
  p: string;
  at: number;
}

export interface RoutesRepositoryOptions {
  fetchImpl?: typeof fetch;
  storage?: Pick<Storage, 'getItem' | 'setItem'> | null;
  timeoutMs?: number;
  isOnline?: () => boolean;
}

function coordKey(a: Place, b: Place): string {
  const f = (p: Place) => `${p.location.lat.toFixed(3)},${p.location.lng.toFixed(3)}`;
  return `${f(a)}>${f(b)}`;
}

/** Hubs within snapping distance of a place, nearest first (the place itself when it is a hub). */
function nearbyHubs(place: Place): { id: string; km: number }[] {
  if (HUBS.some((h) => h.id === place.id)) return [{ id: place.id, km: 0 }];
  return HUBS.map((h) => ({ id: h.id, km: calculateDistanceKm(place.location.lat, place.location.lng, h.location.lat, h.location.lng) }))
    .filter((h) => h.km < HUB_SNAP_KM)
    .sort((x, y) => x.km - y.km);
}

export function buildSegments(coordinates: [number, number][], totalDurationMin: number): RouteSegment[] {
  const raw: { s: [number, number]; e: [number, number]; km: number; bearing: number }[] = [];
  let totalKm = 0;
  for (let i = 0; i < coordinates.length - 1; i++) {
    const s = coordinates[i]!;
    const e = coordinates[i + 1]!;
    const km = calculateDistanceKm(s[0], s[1], e[0], e[1]);
    if (km < 1e-4) continue;
    totalKm += km;
    raw.push({ s, e, km, bearing: calculateBearing(s[0], s[1], e[0], e[1]) });
  }
  return raw.map((r) => ({
    startLat: r.s[0],
    startLng: r.s[1],
    endLat: r.e[0],
    endLng: r.e[1],
    distanceKm: r.km,
    bearingDeg: r.bearing,
    durationMin: totalKm > 0 ? (r.km / totalKm) * totalDurationMin : 0
  }));
}

export function decodeRoute(
  routeId: string,
  encodedPolyline: string,
  distanceKm: number,
  durationMin: number,
  source: RouteSource
): DecodedRoute {
  const coordinates = decodePolyline(encodedPolyline);
  const segments = buildSegments(coordinates, durationMin);
  const polylineKm = segments.reduce((acc, s) => acc + s.distanceKm, 0);
  return {
    routeId,
    // The simplified polyline is slightly shorter than the road; scale time along it, not distance.
    totalDistanceKm: polylineKm > 0 ? polylineKm : distanceKm,
    totalDurationMin: durationMin,
    source,
    isApproximate: source === 'straight',
    coordinates,
    segments
  };
}

export class RoutesRepository {
  private memory = new Map<string, DecodedRoute>();
  private fetchImpl: typeof fetch | undefined;
  private storage: Pick<Storage, 'getItem' | 'setItem'> | null;
  private timeoutMs: number;
  private isOnline: () => boolean;

  constructor(options: RoutesRepositoryOptions = {}) {
    this.fetchImpl = options.fetchImpl ?? (typeof fetch !== 'undefined' ? fetch.bind(globalThis) : undefined);
    this.storage =
      options.storage !== undefined ? options.storage : typeof localStorage !== 'undefined' ? localStorage : null;
    this.timeoutMs = options.timeoutMs ?? 9000;
    this.isOnline = options.isOnline ?? (() => (typeof navigator === 'undefined' ? true : navigator.onLine !== false));
  }

  /** Precomputed file id for this pair, if the app ships one. */
  precomputedIdFor(origin: Place, dest: Place): string | null {
    // Two terminals can sit within a kilometer of each other (Ramses and Ahmed Helmy);
    // take the closest pair that actually has a shipped route.
    const pairs = nearbyHubs(origin).flatMap((a) => nearbyHubs(dest).map((b) => ({ a: a.id, b: b.id, km: a.km + b.km })));
    pairs.sort((x, y) => x.km - y.km);
    for (const { a, b } of pairs) {
      if (a !== b && PRECOMPUTED.has(routeIdFor(a, b))) return routeIdFor(a, b);
    }
    return null;
  }

  async getRoute(origin: Place, dest: Place): Promise<DecodedRoute> {
    const key = coordKey(origin, dest);
    const inMemory = this.memory.get(key);
    if (inMemory) return inMemory;

    const route =
      (await this.fromPrecomputed(origin, dest)) ??
      this.fromStorage(key) ??
      (await this.fromLiveRouter(origin, dest, key)) ??
      this.straightLine(origin, dest);

    this.memory.set(key, route);
    return route;
  }

  private async fromPrecomputed(origin: Place, dest: Place): Promise<DecodedRoute | null> {
    const id = this.precomputedIdFor(origin, dest);
    if (!id || !this.fetchImpl) return null;
    try {
      const res = await this.fetchImpl(`/data/routes/${id}.json`);
      if (!res.ok) return null;
      const data = (await res.json()) as RouteData;
      return decodeRoute(id, data.encodedPolyline, data.distanceKm, data.carDurationMin, 'precomputed');
    } catch {
      return null;
    }
  }

  private readStore(): Record<string, StoredRoute> {
    if (!this.storage) return {};
    try {
      const raw = this.storage.getItem(STORAGE_KEY);
      const parsed = raw ? (JSON.parse(raw) as unknown) : {};
      return parsed && typeof parsed === 'object' ? (parsed as Record<string, StoredRoute>) : {};
    } catch {
      return {};
    }
  }

  private fromStorage(key: string): DecodedRoute | null {
    const hit = this.readStore()[key];
    if (!hit || typeof hit.p !== 'string') return null;
    return decodeRoute(key, hit.p, hit.d, hit.t, 'cached');
  }

  private saveToStorage(key: string, value: StoredRoute): void {
    if (!this.storage) return;
    try {
      const store = this.readStore();
      store[key] = value;
      const keys = Object.keys(store).sort((a, b) => (store[b]?.at ?? 0) - (store[a]?.at ?? 0));
      for (const old of keys.slice(MAX_STORED_ROUTES)) delete store[old];
      this.storage.setItem(STORAGE_KEY, JSON.stringify(store));
    } catch {
      // Storage full or blocked: the route still works for this session.
    }
  }

  private async fromLiveRouter(origin: Place, dest: Place, key: string): Promise<DecodedRoute | null> {
    if (!this.fetchImpl || !this.isOnline()) return null;
    const url =
      `${OSRM_BASE}${origin.location.lng.toFixed(5)},${origin.location.lat.toFixed(5)};` +
      `${dest.location.lng.toFixed(5)},${dest.location.lat.toFixed(5)}?overview=full&geometries=polyline`;

    const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const timer = controller ? setTimeout(() => controller.abort(), this.timeoutMs) : null;
    try {
      const res = await this.fetchImpl(url, controller ? { signal: controller.signal } : undefined);
      if (!res.ok) return null;
      const data = (await res.json()) as {
        code?: string;
        routes?: { distance: number; duration: number; geometry: string }[];
      };
      const best = data.routes?.[0];
      if (data.code !== 'Ok' || !best) return null;

      const simplified = simplifyPolyline(decodePolyline(best.geometry), 25);
      const encoded = encodePolyline(simplified);
      const distanceKm = best.distance / 1000;
      const durationMin = Math.max(1, Math.round(best.duration / 60));
      this.saveToStorage(key, { d: distanceKm, t: durationMin, p: encoded, at: Date.now() });
      return decodeRoute(key, encoded, distanceKm, durationMin, 'live');
    } catch {
      return null;
    } finally {
      if (timer) clearTimeout(timer);
    }
  }

  /** Last resort: a straight line, clearly labeled approximate in the UI. */
  straightLine(origin: Place, dest: Place): DecodedRoute {
    const km = calculateDistanceKm(origin.location.lat, origin.location.lng, dest.location.lat, dest.location.lng);
    // Roads are ~1.3x longer than the straight line; assume 60 km/h door to door.
    const durationMin = Math.max(10, Math.round(((km * 1.3) / 60) * 60));
    const coords: [number, number][] = [];
    for (let i = 0; i <= 8; i++) {
      const f = i / 8;
      coords.push([
        origin.location.lat + (dest.location.lat - origin.location.lat) * f,
        origin.location.lng + (dest.location.lng - origin.location.lng) * f
      ]);
    }
    return decodeRoute(coordKey(origin, dest), encodePolyline(coords), km * 1.3, durationMin, 'straight');
  }
}

export const defaultRoutesRepository = new RoutesRepository();
