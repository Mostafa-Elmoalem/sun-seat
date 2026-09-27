import type { Place } from '../../core/types/places.ts';

/** The last few trips, kept on the phone only, as a convenience. */

const RECENTS_KEY = 'sun_seat_recent_v2';
export const MAX_RECENTS = 4;

export interface RecentTrip {
  origin: Place;
  destination: Place;
  vehicleId: string;
  at: number;
}

type Storage = Pick<globalThis.Storage, 'getItem' | 'setItem'>;

function storage(): Storage | null {
  try {
    return typeof localStorage !== 'undefined' ? localStorage : null;
  } catch {
    return null;
  }
}

export function loadRecents(store: Storage | null = storage()): RecentTrip[] {
  try {
    const raw = store?.getItem(RECENTS_KEY) ?? null;
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(parsed) ? (parsed as RecentTrip[]).filter((r) => r?.origin?.location && r?.destination?.location).slice(0, MAX_RECENTS) : [];
  } catch {
    return [];
  }
}

export function saveRecents(items: RecentTrip[], store: Storage | null = storage()): void {
  try {
    store?.setItem(RECENTS_KEY, JSON.stringify(items.slice(0, MAX_RECENTS)));
  } catch {
    // Private mode or full storage: recents are a convenience only.
  }
}

/** Puts a trip first and drops older copies of the same trip. */
export function addRecent(list: RecentTrip[], trip: Omit<RecentTrip, 'at'>, at = Date.now()): RecentTrip[] {
  const same = (r: RecentTrip) => r.origin.id === trip.origin.id && r.destination.id === trip.destination.id && r.vehicleId === trip.vehicleId;
  return [{ ...trip, at }, ...list.filter((r) => !same(r))].slice(0, MAX_RECENTS);
}

/** Distinct places from recent trips (GPS fixes excluded), for the place picker. */
export function recentPlaces(list: RecentTrip[], limit = 4): Place[] {
  const seen = new Set<string>();
  const out: Place[] = [];
  for (const r of list) {
    for (const p of [r.origin, r.destination]) {
      const key = `${p.location.lat.toFixed(3)},${p.location.lng.toFixed(3)}`;
      if (!seen.has(key) && p.kind !== 'gps') {
        seen.add(key);
        out.push(p);
      }
    }
  }
  return out.slice(0, limit);
}
