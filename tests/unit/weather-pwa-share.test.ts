import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  WeatherService,
  formatWeatherBadgeCopy,
  shouldSkipNetworkExtras
} from '../../src/adapters/weather-service.ts';
import {
  evictOldCacheEntries,
  PRECACHE_ASSETS
} from '../../src/adapters/pwa-register.ts';
import {
  generateShareCardCanvasData
} from '../../src/ui/components/ShareModal.tsx';
import { useTripStore } from '../../src/ui/store/trip-store.ts';
import { defaultPlacesRepository } from '../../src/adapters/places-repository.ts';
import { defaultRoutesRepository } from '../../src/adapters/routes-repository.ts';
import { cairoTimeToUtc } from '../../src/core/astronomy/timezone.ts';

describe('Session 12: Weather Adapter, PWA Offline, Weak Network & Share Card (Stories 5.1, 5.2, 7.1)', () => {
  beforeEach(() => {
    useTripStore.getState().resetStore();
    vi.restoreAllMocks();
  });

  it('Q1: Airplane mode (offline) with a cached route returns exact route and verdict immediately', async () => {
    const abboud = defaultPlacesRepository.getById('cairo-abboud')!;
    const alex = defaultPlacesRepository.getById('alex-moharam-bek')!;

    // Preload route into cache as if visited on first visit
    const repo = new defaultRoutesRepository.constructor([
      {
        routeId: 'cairo-abboud-alex-moharam-bek',
        originId: 'cairo-abboud',
        destinationId: 'alex-moharam-bek',
        distanceKm: 218.4,
        carDurationMin: 145,
        encodedPolyline: '_p~iF~ps|U_ulLnnqC_mqNvxq`@',
        isApproximate: false
      }
    ]);

    // Simulate complete offline failure on global fetch
    const failingFetch = vi.fn().mockRejectedValue(new Error('Failed to fetch (Offline)'));
    vi.stubGlobal('fetch', failingFetch);

    const route = await repo.getRoute(abboud, alex);
    expect(route.isApproximate).toBe(false);
    expect(route.totalDistanceKm).toBe(218.4);
  });

  it('Q2: Airplane mode (offline) with an uncached pair returns approximate Great Circle route with isApproximate=true and zero crash', async () => {
    const dokki = defaultPlacesRepository.getById('giza-dokki')!;
    const tanta = defaultPlacesRepository.getById('gharbia-tanta')!;

    // Simulate offline network failure
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network offline')));

    const store = useTripStore.getState();
    store.setOrigin(dokki);
    store.setDestination(tanta);
    store.setDepartureDateUtc(cairoTimeToUtc(2026, 6, 15, 9, 0));

    await store.calculateTrip();

    const state = useTripStore.getState();
    expect(state.verdict).not.toBeNull();
    expect(state.route?.isApproximate).toBe(true);
  });

  it('Q3: Weather API timeout or 500 error never blocks or delays the trip verdict', async () => {
    // Mock slow/hanging fetch that exceeds timeout
    const slowFetch = vi.fn().mockImplementation(
      (_url: string, init?: RequestInit) =>
        new Promise((_resolve, reject) => {
          if (init?.signal) {
            init.signal.addEventListener('abort', () => {
              reject(new Error('AbortError: Timed out'));
            });
          }
        })
    );

    const weatherService = new WeatherService({ timeoutMs: 40, fetchImpl: slowFetch as unknown as typeof fetch });
    const t0 = performance.now();
    const res = await weatherService.getTripWeather(30.05, 31.25, new Date());
    const elapsed = performance.now() - t0;

    expect(res).toBeNull();
    expect(elapsed).toBeLessThan(200);
  });

  it('Story 5.2 AC-3: WeatherService parses cloud cover, caches per location+hour, and generates colloquial Arabic copy', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        hourly: {
          time: ['2026-06-15T08:00', '2026-06-15T09:00'],
          cloudcover: [82, 78],
          uv_index: [6.5, 7.2]
        }
      })
    });

    const weatherService = new WeatherService({
      timeoutMs: 1500,
      fetchImpl: mockFetch as unknown as typeof fetch
    });

    const targetDate = new Date('2026-06-15T08:00:00Z');
    const first = await weatherService.getTripWeather(30.0832, 31.2588, targetDate);
    expect(first).not.toBeNull();
    expect(first?.cloudCoverPct).toBe(82);
    expect(first?.condition).toBe('OVERCAST');

    const copyAr = formatWeatherBadgeCopy(first!, 'ar');
    expect(copyAr).toContain('غيم');

    // Second call for same location & hour must hit cache without calling fetch again
    const second = await weatherService.getTripWeather(30.0832, 31.2588, targetDate);
    expect(second?.cloudCoverPct).toBe(82);
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('Q6: Save-Data mode and 2G connection hints skip weather fetching and 3D preloading', () => {
    expect(shouldSkipNetworkExtras({ saveData: true, effectiveType: '4g', offline: false })).toBe(true);
    expect(shouldSkipNetworkExtras({ saveData: false, effectiveType: 'slow-2g', offline: false })).toBe(true);
    expect(shouldSkipNetworkExtras({ saveData: false, effectiveType: '2g', offline: false })).toBe(true);
    expect(shouldSkipNetworkExtras({ saveData: false, effectiveType: '4g', offline: true })).toBe(true);
    expect(shouldSkipNetworkExtras({ saveData: false, effectiveType: '4g', offline: false })).toBe(false);
  });

  it('Story 5.1: defines precache assets list and evicts oldest cache entries beyond maxEntries budget', () => {
    expect(PRECACHE_ASSETS).toContain('/data/places.json');
    expect(PRECACHE_ASSETS).toContain('/manifest.webmanifest');

    const keys = ['r1', 'r2', 'r3', 'r4', 'r5'];
    const toDelete = evictOldCacheEntries(keys, 3);
    expect(toDelete).toEqual(['r1', 'r2']);
  });

  it('Story 7.1: generates dual-format (1080x1920 Story & 1200x630 Feed) share card descriptor in < 50ms with zero external deps', async () => {
    const abboud = defaultPlacesRepository.getById('cairo-abboud')!;
    const alex = defaultPlacesRepository.getById('alex-moharam-bek')!;
    const store = useTripStore.getState();
    store.setOrigin(abboud);
    store.setDestination(alex);
    store.setDepartureDateUtc(cairoTimeToUtc(2026, 6, 15, 8, 30));
    await store.calculateTrip();

    const verdict = useTripStore.getState().verdict!;
    const t0 = performance.now();
    const storyCard = generateShareCardCanvasData({
      format: 'story',
      originName: abboud.nameAr,
      destinationName: alex.nameAr,
      vehicleName: 'ميكروباص 14 راكب',
      departureTimeFormatted: '08:30 ص',
      verdict,
      lang: 'ar'
    });
    const feedCard = generateShareCardCanvasData({
      format: 'feed',
      originName: abboud.nameAr,
      destinationName: alex.nameAr,
      vehicleName: 'ميكروباص 14 راكب',
      departureTimeFormatted: '08:30 ص',
      verdict,
      lang: 'ar'
    });
    const elapsed = performance.now() - t0;

    expect(elapsed).toBeLessThan(50);
    expect(storyCard.width).toBe(1080);
    expect(storyCard.height).toBe(1920);
    expect(storyCard.headlineText).toContain('اقعد شمال');
    expect(feedCard.width).toBe(1200);
    expect(feedCard.height).toBe(630);
  });
});
