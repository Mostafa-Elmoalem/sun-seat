import { useStore } from 'zustand';
import { createStore } from 'zustand/vanilla';
import type { Place } from '../../core/types/places.ts';
import type { DecodedRoute } from '../../core/types/routes.ts';
import type {
  VehicleProfile,
  TripExposureVerdict,
  SeatExposure,
  TimelineStep
} from '../../core/types/vehicle.ts';
import type { AppLanguage } from '../i18n/copy.ts';
import { defaultPlacesRepository } from '../../adapters/places-repository.ts';
import { defaultRoutesRepository } from '../../adapters/routes-repository.ts';
import { defaultVehicleRepository } from '../../core/vehicles/vehicle-repository.ts';
import {
  calculateTripExposure,
  calculateSunVector
} from '../../core/exposure/exposure-calculator.ts';
import {
  defaultWeatherService,
  type WeatherData
} from '../../adapters/weather-service.ts';

export interface RecentTripItem {
  id: string;
  originId: string;
  originNameAr: string;
  originNameEn: string;
  destinationId: string;
  destinationNameAr: string;
  destinationNameEn: string;
  vehicleId: string;
  timestamp: number;
}

export interface SerializedTripParams {
  originId: string;
  destinationId: string;
  vehicleId: string;
  departureDateUtc: Date;
  lang?: AppLanguage;
}

const RECENT_TRIPS_STORAGE_KEY = 'sun_seat_recent_trips_v1';

/**
 * Rounds any Date to the nearest 5-minute mark (0 seconds, 0 ms).
 */
export function roundToNearestFiveMinutes(date: Date): Date {
  const stepMs = 5 * 60 * 1000;
  return new Date(Math.round(date.getTime() / stepMs) * stepMs);
}

/**
 * Serializes trip parameters into a privacy-safe URL query string (no personal data).
 */
export function serializeTripToQuery(params: SerializedTripParams): string {
  const searchParams = new URLSearchParams();
  searchParams.set('from', params.originId);
  searchParams.set('to', params.destinationId);
  searchParams.set('v', params.vehicleId);
  searchParams.set('t', String(Math.floor(params.departureDateUtc.getTime() / 60000)));
  if (params.lang && params.lang !== 'ar') {
    searchParams.set('lang', params.lang);
  }
  return `?${searchParams.toString()}`;
}

/**
 * Parses URL query string back into trip parameters if valid.
 */
export function parseTripFromQuery(queryString: string): SerializedTripParams | null {
  const clean = queryString.startsWith('?') ? queryString.slice(1) : queryString;
  if (!clean) return null;

  const params = new URLSearchParams(clean);
  const fromId = params.get('from');
  const toId = params.get('to');
  if (!fromId || !toId) return null;

  const origin = defaultPlacesRepository.getById(fromId);
  const destination = defaultPlacesRepository.getById(toId);
  if (!origin || !destination) return null;

  const vehicleId = params.get('v') || 'microbus-14';
  const tRaw = params.get('t');
  let departureDateUtc = roundToNearestFiveMinutes(new Date());

  if (tRaw) {
    const asNum = Number(tRaw);
    if (!Number.isNaN(asNum) && asNum > 1000000) {
      departureDateUtc = new Date(asNum * 60000);
    } else {
      const parsedIso = new Date(tRaw);
      if (!Number.isNaN(parsedIso.getTime())) {
        departureDateUtc = parsedIso;
      }
    }
  }

  const langParam = params.get('lang');
  const lang: AppLanguage = langParam === 'en' ? 'en' : 'ar';

  return {
    originId: origin.id,
    destinationId: destination.id,
    vehicleId,
    departureDateUtc,
    lang
  };
}

/**
 * Computes instantaneous per-seat exposure at a single timeline step in < 0.2ms
 * to power 60fps real-time scrubbing on the 2.5D Seat Heatmap.
 */
export function calculateInstantSeatExposure(
  vehicle: VehicleProfile,
  step: TimelineStep
): SeatExposure[] {
  if (step.isNight || step.solarElevationDeg <= 0 || step.isHighNoon || step.solarElevationDeg > 68) {
    const shadePct = step.isNight || step.solarElevationDeg <= 0 ? 100 : 90;
    return vehicle.seats.map((seat) => ({
      seatId: seat.id,
      score: 100 - shadePct,
      sunMinutes: 0,
      shadePercentage: shadePct,
      side: seat.side,
      isWindow: seat.isWindow
    }));
  }

  const { ux, uy } = calculateSunVector(
    step.solarAzimuthDeg,
    step.solarElevationDeg,
    step.headingDeg
  );

  return vehicle.seats.map((seat) => {
    let factor = 0;
    if (ux > 0.05) {
      factor = seat.side === 'right' ? 1.0 : seat.side === 'middle' ? 0.35 : 0.05;
    } else if (ux < -0.05) {
      factor = seat.side === 'left' ? 1.0 : seat.side === 'middle' ? 0.35 : 0.05;
    } else if (uy > 0.5 && seat.row === 0) {
      factor = 0.6;
    } else if (uy < -0.5 && seat.row >= 3) {
      factor = 0.5;
    }

    const windowBonus = seat.isWindow ? 1.0 : 0.6;
    const sideProjection = Math.min(1.0, Math.abs(ux) * 1.35 + 0.2);
    const score = Math.round(Math.min(100, Math.max(0, sideProjection * factor * windowBonus * 100)));

    return {
      seatId: seat.id,
      score,
      sunMinutes: score > 40 ? 1 : 0,
      shadePercentage: 100 - score,
      side: seat.side,
      isWindow: seat.isWindow
    };
  });
}

function loadRecentTripsFromStorage(): RecentTripItem[] {
  try {
    if (typeof localStorage === 'undefined') return [];
    const raw = localStorage.getItem(RECENT_TRIPS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.slice(0, 4) : [];
  } catch {
    return [];
  }
}

function saveRecentTripsToStorage(items: RecentTripItem[]): void {
  try {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(RECENT_TRIPS_STORAGE_KEY, JSON.stringify(items.slice(0, 4)));
  } catch {
    // Ignore storage quota errors
  }
}

export type TripErrorCode = 'SAME_PLACE' | 'MISSING_PLACES' | 'ROUTE_ERROR' | null;

export interface TripStoreState {
  lang: AppLanguage;
  activeScreen: 'input' | 'results';
  origin: Place | null;
  destination: Place | null;
  vehicleId: string;
  departureDateUtc: Date;
  isNowMode: boolean;
  swapCount: number;
  isCalculating: boolean;
  errorCode: TripErrorCode;
  route: DecodedRoute | null;
  verdict: TripExposureVerdict | null;
  weather: WeatherData | null;
  selectedSeatId: number | null;
  scrubIndex: number;
  isScrubbing: boolean;
  activeTab: '2d' | '3d';
  isDrawerOpen: boolean;
  isSharedLinkVisit: boolean;
  recentTrips: RecentTripItem[];

  setLang: (lang: AppLanguage) => void;
  setOrigin: (place: Place | null) => void;
  setDestination: (place: Place | null) => void;
  swapPlaces: () => void;
  setVehicleId: (id: string) => void;
  setDepartureDateUtc: (date: Date) => void;
  setDepartureNow: () => void;
  addMinutesToDeparture: (minutes: number) => void;
  calculateTrip: () => Promise<void>;
  applyRecentTrip: (item: RecentTripItem) => Promise<void>;
  hydrateFromQuery: (queryString: string) => Promise<boolean>;
  selectSeat: (seatId: number | null) => void;
  setScrubIndex: (index: number) => void;
  resetScrubToAverage: () => void;
  setActiveTab: (tab: '2d' | '3d') => void;
  setDrawerOpen: (open: boolean) => void;
  goToInput: () => void;
  resetStore: () => void;
}

const tripStoreApi = createStore<TripStoreState>((set, get) => ({
  lang: 'ar',
  activeScreen: 'input',
  origin: defaultPlacesRepository.getById('cairo-abboud') ?? null,
  destination: defaultPlacesRepository.getById('alex-moharam-bek') ?? null,
  vehicleId: 'microbus-14',
  departureDateUtc: roundToNearestFiveMinutes(new Date()),
  isNowMode: true,
  swapCount: 0,
  isCalculating: false,
  errorCode: null,
  route: null,
  verdict: null,
  weather: null,
  selectedSeatId: null,
  scrubIndex: 0,
  isScrubbing: false,
  activeTab: '2d',
  isDrawerOpen: false,
  isSharedLinkVisit: false,
  recentTrips: loadRecentTripsFromStorage(),

  setLang: (lang) => {
    set({ lang });
    if (typeof document !== 'undefined') {
      document.documentElement.lang = lang;
      document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    }
  },

  setOrigin: (origin) => set({ origin, errorCode: null }),

  setDestination: (destination) => set({ destination, errorCode: null }),

  swapPlaces: () => {
    const { origin, destination, swapCount } = get();
    set({
      origin: destination,
      destination: origin,
      swapCount: swapCount + 1,
      errorCode: null
    });
  },

  setVehicleId: (vehicleId) => set({ vehicleId }),

  setDepartureDateUtc: (date) => set({ departureDateUtc: date, isNowMode: false }),

  setDepartureNow: () =>
    set({
      departureDateUtc: roundToNearestFiveMinutes(new Date()),
      isNowMode: true
    }),

  addMinutesToDeparture: (minutes) => {
    const current = get().departureDateUtc;
    set({
      departureDateUtc: new Date(current.getTime() + minutes * 60 * 1000),
      isNowMode: false
    });
  },

  calculateTrip: async () => {
    const { origin, destination, vehicleId, departureDateUtc, lang, recentTrips } = get();

    if (!origin || !destination) {
      set({ errorCode: 'MISSING_PLACES' });
      return;
    }

    if (origin.id === destination.id) {
      set({ errorCode: 'SAME_PLACE', verdict: null });
      return;
    }

    set({ isCalculating: true, errorCode: null });

    try {
      const route = await defaultRoutesRepository.getRoute(origin, destination);
      const vehicle = defaultVehicleRepository.getProfile(vehicleId);
      const verdict = calculateTripExposure(route, departureDateUtc, vehicle);

      const newRecent: RecentTripItem = {
        id: `${origin.id}-${destination.id}-${vehicle.id}`,
        originId: origin.id,
        originNameAr: origin.nameAr,
        originNameEn: origin.nameEn,
        destinationId: destination.id,
        destinationNameAr: destination.nameAr,
        destinationNameEn: destination.nameEn,
        vehicleId: vehicle.id,
        timestamp: Date.now()
      };

      const updatedRecent = [
        newRecent,
        ...recentTrips.filter((r) => !(r.originId === origin.id && r.destinationId === destination.id))
      ].slice(0, 4);

      saveRecentTripsToStorage(updatedRecent);

      const bestFirstSeat = verdict.bestSeatIds[0] ?? 1;

      set({
        route,
        verdict,
        weather: null,
        activeScreen: 'results',
        isCalculating: false,
        selectedSeatId: bestFirstSeat,
        scrubIndex: 0,
        isScrubbing: false,
        recentTrips: updatedRecent
      });

      // Non-blocking background weather lookup (Story 5.2 AC-1 & Q3)
      void defaultWeatherService
        .getTripWeather(origin.location.lat, origin.location.lng, departureDateUtc)
        .then((weatherData) => {
          if (weatherData) {
            set({ weather: weatherData });
          }
        });

      if (typeof window !== 'undefined' && window.history?.replaceState) {
        const query = serializeTripToQuery({
          originId: origin.id,
          destinationId: destination.id,
          vehicleId: vehicle.id,
          departureDateUtc,
          lang
        });
        window.history.replaceState(null, '', query);
      }
    } catch {
      set({ isCalculating: false, errorCode: 'ROUTE_ERROR' });
    }
  },

  applyRecentTrip: async (item) => {
    const origin = defaultPlacesRepository.getById(item.originId);
    const destination = defaultPlacesRepository.getById(item.destinationId);
    if (!origin || !destination) return;

    set({
      origin,
      destination,
      vehicleId: item.vehicleId,
      departureDateUtc: roundToNearestFiveMinutes(new Date()),
      isNowMode: true,
      errorCode: null
    });

    await get().calculateTrip();
  },

  hydrateFromQuery: async (queryString) => {
    const parsed = parseTripFromQuery(queryString);
    if (!parsed) return false;

    const origin = defaultPlacesRepository.getById(parsed.originId);
    const destination = defaultPlacesRepository.getById(parsed.destinationId);
    if (!origin || !destination) return false;

    set({
      origin,
      destination,
      vehicleId: parsed.vehicleId,
      departureDateUtc: parsed.departureDateUtc,
      isNowMode: false,
      lang: parsed.lang ?? 'ar',
      isSharedLinkVisit: true,
      errorCode: null
    });

    await get().calculateTrip();
    return true;
  },

  selectSeat: (selectedSeatId) => set({ selectedSeatId }),

  setScrubIndex: (scrubIndex) => set({ scrubIndex, isScrubbing: true }),

  resetScrubToAverage: () => set({ isScrubbing: false, scrubIndex: 0 }),

  setActiveTab: (activeTab) => set({ activeTab }),

  setDrawerOpen: (isDrawerOpen) => set({ isDrawerOpen }),

  goToInput: () => {
    set({ activeScreen: 'input', isDrawerOpen: false });
    if (typeof window !== 'undefined' && window.history?.replaceState) {
      window.history.replaceState(null, '', window.location.pathname);
    }
  },

  resetStore: () => {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(RECENT_TRIPS_STORAGE_KEY);
    }
    set({
      lang: 'ar',
      activeScreen: 'input',
      origin: defaultPlacesRepository.getById('cairo-abboud') ?? null,
      destination: defaultPlacesRepository.getById('alex-moharam-bek') ?? null,
      vehicleId: 'microbus-14',
      departureDateUtc: roundToNearestFiveMinutes(new Date()),
      isNowMode: true,
      swapCount: 0,
      isCalculating: false,
      errorCode: null,
      route: null,
      verdict: null,
      weather: null,
      selectedSeatId: null,
      scrubIndex: 0,
      isScrubbing: false,
      activeTab: '2d',
      isDrawerOpen: false,
      isSharedLinkVisit: false,
      recentTrips: []
    });
  }
}));

tripStoreApi.getInitialState = () => tripStoreApi.getState();

export const useTripStore = Object.assign(
  () => useStore(tripStoreApi),
  tripStoreApi
);


