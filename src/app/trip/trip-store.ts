import { createStore } from 'zustand/vanilla';
import type { Place } from '../../core/types/places.ts';
import type { DecodedRoute } from '../../core/types/routes.ts';
import type { TripExposureVerdict } from '../../core/types/vehicle.ts';
import { defaultPlacesRepository } from '../../adapters/places-repository.ts';
import { defaultWeatherService, type WeatherData } from '../../adapters/weather-service.ts';
import { calculateTrip, validateTrip, type TripProblem } from './calculate-trip.ts';
import { roundToFiveMinutes } from './departure.ts';
import { addRecent, loadRecents, saveRecents, type RecentTrip } from './recents.ts';
import { parseTripFromQuery, serializeTripToQuery, type Language } from './share-link.ts';

/**
 * Application state for the whole app, framework free (React binds to it in
 * ui/hooks/use-trip-store.ts). Holds the trip being edited, the last result, and
 * what the rider is inspecting on it.
 */

export type { RecentTrip } from './recents.ts';
export type TripError = TripProblem | null;

export interface TripState {
  lang: Language;
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

  setLang: (lang: Language) => void;
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

function applyDocumentLang(lang: Language): void {
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
    const problem = validateTrip(origin, destination);
    if (problem || !origin || !destination) return set({ error: problem ?? 'MISSING' });

    // "Now" means the moment the rider taps, not when the page was opened.
    const departure = get().isNow ? roundToFiveMinutes(new Date()) : get().departure;
    const wasOnForm = get().screen === 'input';
    set({ calculating: true, error: null, departure });
    const { route, verdict } = await calculateTrip({ origin, destination, vehicleId, departure });
    const recents = addRecent(get().recents, { origin, destination, vehicleId });
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
      // Push a history entry so the phone's back button returns to the form instead of leaving the site.
      const url = serializeTripToQuery({ origin, destination, vehicleId, departure, lang });
      if (wasOnForm && !get().fromSharedLink) window.history.pushState({ screen: 'result' }, '', url);
      else window.history.replaceState({ screen: 'result' }, '', url);
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
    set({ origin: q.origin, destination: q.destination, vehicleId: q.vehicleId, departure: q.departure, isNow: false, fromSharedLink: true });
    get().setLang(q.lang);
    await get().calculate();
    return true;
  },

  setScrub: (scrubIndex) => set({ scrubIndex }),
  selectSeat: (selectedSeatId) => set({ selectedSeatId }),
  goToInput: () => {
    const shared = get().fromSharedLink;
    set({ screen: 'input', scrubIndex: null, fromSharedLink: false });
    if (typeof window === 'undefined') return;
    // A result we pushed: step back in history. A shared link landing: just clear the URL.
    if (!shared && window.history.state?.screen === 'result' && window.history.length > 1) window.history.back();
    else window.history.replaceState(null, '', window.location.pathname);
  }
}));

/** Kick off the gazetteer download once the first screen is idle. */
export function warmPlaces(): void {
  const start = () => void defaultPlacesRepository.loadGazetteer();
  if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
    (window as Window & { requestIdleCallback: (cb: () => void) => void }).requestIdleCallback(start);
  } else {
    setTimeout(start, 1200);
  }
}
