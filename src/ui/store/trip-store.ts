import { useStore } from 'zustand';
import { createStore } from 'zustand/vanilla';
import type { Place } from '../../core/types/places.ts';
import type { DecodedRoute } from '../../core/types/routes.ts';
import type { TripExposureVerdict } from '../../core/types/vehicle.ts';
import type { AppLanguage } from '../i18n/copy.ts';
import { defaultPlacesRepository } from '../../adapters/places-repository.ts';
import { defaultRoutesRepository } from '../../adapters/routes-repository.ts';
import { defaultVehicleRepository } from '../../core/vehicles/vehicle-repository.ts';
import { calculateTripExposure } from '../../core/exposure/exposure-calculator.ts';
import { defaultWeatherService, type WeatherData } from '../../adapters/weather-service.ts';
import { getHubById } from '../../data/hubs.ts';

const RECENTS_KEY = 'sun_seat_recent_v2';
const MAX_RECENTS = 4;

export interface RecentTrip {
  origin: Place;
  destination: Place;
  vehicleId: string;
  at: number;
}

export function roundToFiveMinutes(date: Date): Date {
  const step = 5 * 60_000;
  return new Date(Math.round(date.getTime() / step) * step);
}

/* ---------- Share links ----------
 * Hubs travel by id (?f=cairo-abboud). Anything else travels as rounded
 * coordinates plus a display name (?f=@30.106,31.254~الدقي). GPS points are
 * rounded to 2 decimals (about 1 km) so a shared link never pins a home.
 */
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

export interface TripQuery {
  origin: Place;
  destination: Place;
  vehicleId: string;
  departure: Date;
  lang: AppLanguage;
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
  const departure =
    Number.isFinite(minutes) && minutes > 20_000_000 ? new Date(minutes * 60_000) : roundToFiveMinutes(new Date());
  const vehicleId = defaultVehicleRepository.getProfile(p.get('v') ?? 'microbus-14').id;
  return { origin, destination, vehicleId, departure, lang: p.get('lang') === 'en' ? 'en' : 'ar' };
}

function loadRecents(): RecentTrip[] {
  try {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(RECENTS_KEY) : null;
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(parsed) ? (parsed as RecentTrip[]).filter((r) => r?.origin?.location && r?.destination?.location).slice(0, MAX_RECENTS) : [];
  } catch {
    return [];
  }
}

function saveRecents(items: RecentTrip[]): void {
  try {
    localStorage.setItem(RECENTS_KEY, JSON.stringify(items.slice(0, MAX_RECENTS)));
  } catch {
    // Private mode or full storage: recents are a convenience only.
  }
}

export type TripError = 'MISSING' | 'SAME' | null;

export interface TripState {
  lang: AppLanguage;
  screen: 'input' | 'result';
  origin: Place | null;
  destination: Place | null;
  vehicleId: string;
  departure: Date;
  isNow: boolean;
  calculating: boolean;
  error: TripError;
  route: DecodedRoute | null;
  verdict: TripExposureVerdict | null;
  weather: WeatherData | null;
  /** Timeline index being inspected, or null for the whole-trip totals. */
  scrubIndex: number | null;
  selectedSeatId: number | null;
  recents: RecentTrip[];
  fromSharedLink: boolean;

  setLang: (lang: AppLanguage) => void;
  setOrigin: (p: Place | null) => void;
  setDestination: (p: Place | null) => void;
  swap: () => void;
  setVehicle: (id: string) => void;
  setDeparture: (d: Date) => void;
  setNow: () => void;
  calculate: () => Promise<void>;
  applyRecent: (r: RecentTrip) => Promise<void>;
  hydrateFromQuery: (search: string) => Promise<boolean>;
  setScrub: (i: number | null) => void;
  selectSeat: (id: number | null) => void;
  goToInput: () => void;
}

function applyDocumentLang(lang: AppLanguage): void {
  if (typeof document === 'undefined') return;
  document.documentElement.lang = lang === 'ar' ? 'ar-EG' : 'en';
  document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
}

export const tripStore = createStore<TripState>((set, get) => ({
  lang: 'ar',
  screen: 'input',
  origin: null,
  destination: null,
  vehicleId: 'microbus-14',
  departure: roundToFiveMinutes(new Date()),
  isNow: true,
  calculating: false,
  error: null,
  route: null,
  verdict: null,
  weather: null,
  scrubIndex: null,
  selectedSeatId: null,
  recents: loadRecents(),
  fromSharedLink: false,

  setLang: (lang) => {
    set({ lang });
    applyDocumentLang(lang);
  },
  setOrigin: (origin) => set({ origin, error: null }),
  setDestination: (destination) => set({ destination, error: null }),
  swap: () => set((s) => ({ origin: s.destination, destination: s.origin, error: null })),
  setVehicle: (vehicleId) => set({ vehicleId }),
  setDeparture: (departure) => set({ departure, isNow: false }),
  setNow: () => set({ departure: roundToFiveMinutes(new Date()), isNow: true }),

  calculate: async () => {
    const { origin, destination, vehicleId, lang } = get();
    if (!origin || !destination) return set({ error: 'MISSING' });
    const sameSpot =
      origin.id === destination.id ||
      (Math.abs(origin.location.lat - destination.location.lat) < 0.002 &&
        Math.abs(origin.location.lng - destination.location.lng) < 0.002);
    if (sameSpot) return set({ error: 'SAME' });

    // "Now" means the moment the rider taps, not when the page was opened.
    const departure = get().isNow ? roundToFiveMinutes(new Date()) : get().departure;
    set({ calculating: true, error: null, departure });

    const route = await defaultRoutesRepository.getRoute(origin, destination);
    const vehicle = defaultVehicleRepository.getProfile(vehicleId);
    const verdict = calculateTripExposure(route, departure, vehicle);

    const recents = [
      { origin, destination, vehicleId, at: Date.now() },
      ...get().recents.filter(
        (r) => !(r.origin.id === origin.id && r.destination.id === destination.id && r.vehicleId === vehicleId)
      )
    ].slice(0, MAX_RECENTS);
    saveRecents(recents);

    set({
      route,
      verdict,
      weather: null,
      screen: 'result',
      calculating: false,
      scrubIndex: null,
      selectedSeatId: verdict.bestSeatIds[0] ?? null,
      recents
    });

    if (typeof window !== 'undefined') {
      window.history.replaceState(null, '', serializeTripToQuery({ origin, destination, vehicleId, departure, lang }));
      window.scrollTo({ top: 0 });
    }

    void defaultWeatherService.getTripWeather(origin.location.lat, origin.location.lng, departure).then((weather) => {
      if (weather && get().verdict === verdict) set({ weather });
    });
  },

  applyRecent: async (r) => {
    set({ origin: r.origin, destination: r.destination, vehicleId: r.vehicleId, isNow: true, error: null });
    await get().calculate();
  },

  hydrateFromQuery: async (search) => {
    const q = parseTripFromQuery(search);
    if (!q) return false;
    set({
      origin: q.origin,
      destination: q.destination,
      vehicleId: q.vehicleId,
      departure: q.departure,
      isNow: false,
      fromSharedLink: true
    });
    get().setLang(q.lang);
    await get().calculate();
    return true;
  },

  setScrub: (scrubIndex) => set({ scrubIndex }),
  selectSeat: (selectedSeatId) => set({ selectedSeatId }),
  goToInput: () => {
    set({ screen: 'input', scrubIndex: null });
    if (typeof window !== 'undefined') window.history.replaceState(null, '', window.location.pathname);
  }
}));

export function useTripStore(): TripState;
export function useTripStore<T>(selector: (s: TripState) => T): T;
export function useTripStore<T>(selector?: (s: TripState) => T) {
  return useStore(tripStore, selector ?? ((s) => s as unknown as T));
}

/** Kick off the gazetteer download once the first screen is idle. */
export function warmPlaces(): void {
  const start = () => void defaultPlacesRepository.loadGazetteer();
  if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
    (window as Window & { requestIdleCallback: (cb: () => void) => void }).requestIdleCallback(start);
  } else {
    setTimeout(start, 1200);
  }
}
