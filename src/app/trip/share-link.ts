import type { Place } from '../../core/types/places.ts';
import { defaultVehicleRepository } from '../../core/vehicles/vehicle-repository.ts';
import { getHubById } from '../../data/hubs.ts';
import { roundToFiveMinutes } from './departure.ts';

export type Language = 'ar' | 'en';

/**
 * Share links. Hubs travel by id (?f=cairo-abboud). Anything else travels as rounded
 * coordinates plus a display name (?f=@30.106,31.254~الدقي). GPS points are rounded to
 * 2 decimals (about 1 km) so a shared link never pins a home.
 */

export interface TripQuery {
  origin: Place;
  destination: Place;
  vehicleId: string;
  departure: Date;
  lang: Language;
}

function encodePlace(place: Place): string {
  if (getHubById(place.id)) return place.id;
  const decimals = place.kind === 'gps' ? 2 : 3;
  const name = place.kind === 'gps' ? place.contextAr ?? place.nameAr : place.nameAr;
  return `@${place.location.lat.toFixed(decimals)},${place.location.lng.toFixed(decimals)}~${name}`;
}

function decodePlace(raw: string | null): Place | null {
  if (!raw) return null;
  if (!raw.startsWith('@')) return getHubById(raw) ?? null;
  const [coords, ...nameParts] = raw.slice(1).split('~');
  const [latS, lngS] = (coords ?? '').split(',');
  const lat = Number(latS);
  const lng = Number(lngS);
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || lat < 21 || lat > 32.5 || lng < 24 || lng > 37.5) return null;
  const name = nameParts.join('~').trim().slice(0, 80) || `${lat.toFixed(3)}, ${lng.toFixed(3)}`;
  return { id: `p:${lat},${lng}`, nameAr: name, nameEn: name, location: { lat, lng }, kind: 'poi' };
}

export function serializeTripToQuery(q: TripQuery): string {
  const p = new URLSearchParams();
  p.set('f', encodePlace(q.origin));
  p.set('t', encodePlace(q.destination));
  p.set('v', q.vehicleId);
  p.set('d', String(Math.floor(q.departure.getTime() / 60_000)));
  if (q.lang !== 'ar') p.set('lang', q.lang);
  return `?${p.toString()}`;
}

export function parseTripFromQuery(search: string): TripQuery | null {
  const p = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search);
  const origin = decodePlace(p.get('f'));
  const destination = decodePlace(p.get('t'));
  if (!origin || !destination) return null;
  const minutes = Number(p.get('d'));
  const departure = Number.isFinite(minutes) && minutes > 20_000_000 ? new Date(minutes * 60_000) : roundToFiveMinutes(new Date());
  const vehicleId = defaultVehicleRepository.getProfile(p.get('v') ?? 'microbus-14').id;
  return { origin, destination, vehicleId, departure, lang: p.get('lang') === 'en' ? 'en' : 'ar' };
}
