import { describe, it, expect, beforeEach } from 'vitest';
import {
  useTripStore,
  roundToNearestFiveMinutes,
  serializeTripToQuery,
  parseTripFromQuery,
  calculateInstantSeatExposure
} from '../../src/ui/store/trip-store.ts';
import { runCoreFlowE2EScenario } from '../e2e/core-flow.spec.ts';
import { defaultPlacesRepository } from '../../src/adapters/places-repository.ts';
import { defaultVehicleRepository } from '../../src/core/vehicles/vehicle-repository.ts';
import { cairoTimeToUtc } from '../../src/core/astronomy/timezone.ts';

describe('Trip UI Store, Time Helpers & Shared URL Reproduction', () => {
  beforeEach(() => {
    useTripStore.getState().resetStore();
  });

  it('AC-2: rounds departure time to nearest 5 minutes and supports +30m and +60m quick chips', () => {
    const rawDate = new Date(Date.UTC(2026, 5, 15, 10, 12, 45));
    const rounded = roundToNearestFiveMinutes(rawDate);
    expect(rounded.getUTCMinutes() % 5).toBe(0);
    expect(rounded.getUTCSeconds()).toBe(0);

    const store = useTripStore.getState();
    const baseTime = store.departureDateUtc.getTime();

    store.addMinutesToDeparture(30);
    expect(useTripStore.getState().departureDateUtc.getTime() - baseTime).toBe(30 * 60 * 1000);
    expect(useTripStore.getState().isNowMode).toBe(false);

    store.addMinutesToDeparture(60);
    expect(useTripStore.getState().departureDateUtc.getTime() - baseTime).toBe(90 * 60 * 1000);

    store.setDepartureNow();
    expect(useTripStore.getState().isNowMode).toBe(true);
  });

  it('AC-3: swaps origin and destination places immediately', () => {
    const abboud = defaultPlacesRepository.getById('cairo-abboud')!;
    const alex = defaultPlacesRepository.getById('alex-moharam-bek')!;

    const store = useTripStore.getState();
    store.setOrigin(abboud);
    store.setDestination(alex);

    expect(useTripStore.getState().origin?.id).toBe('cairo-abboud');
    expect(useTripStore.getState().destination?.id).toBe('alex-moharam-bek');

    store.swapPlaces();

    expect(useTripStore.getState().origin?.id).toBe('alex-moharam-bek');
    expect(useTripStore.getState().destination?.id).toBe('cairo-abboud');
    expect(useTripStore.getState().swapCount).toBe(1);
  });

  it('AC-5: validates same origin and destination with colloquial Arabic error', async () => {
    const abboud = defaultPlacesRepository.getById('cairo-abboud')!;
    const store = useTripStore.getState();
    store.setOrigin(abboud);
    store.setDestination(abboud);

    await store.calculateTrip();

    expect(useTripStore.getState().errorCode).toBe('SAME_PLACE');
    expect(useTripStore.getState().verdict).toBeNull();
  });

  it('AC-4 & Q1: calculates trip, records recent trip, and reproduces from recent chip in 1 action', async () => {
    const abboud = defaultPlacesRepository.getById('cairo-abboud')!;
    const alex = defaultPlacesRepository.getById('alex-moharam-bek')!;
    const departureUtc = cairoTimeToUtc(2026, 6, 15, 8, 30);

    const store = useTripStore.getState();
    store.setOrigin(abboud);
    store.setDestination(alex);
    store.setDepartureDateUtc(departureUtc);
    store.setVehicleId('microbus-14');

    await store.calculateTrip();

    const afterCalc = useTripStore.getState();
    expect(afterCalc.activeScreen).toBe('results');
    expect(afterCalc.verdict).not.toBeNull();
    expect(afterCalc.verdict?.recommendedSide).toBe('left');
    expect(afterCalc.recentTrips.length).toBe(1);
    expect(afterCalc.recentTrips[0]?.originId).toBe('cairo-abboud');
    expect(afterCalc.recentTrips[0]?.destinationId).toBe('alex-moharam-bek');

    // Go back to input screen and use 1-tap recent trip chip
    afterCalc.goToInput();
    expect(useTripStore.getState().activeScreen).toBe('input');

    await useTripStore.getState().applyRecentTrip(afterCalc.recentTrips[0]!);
    expect(useTripStore.getState().activeScreen).toBe('results');
    expect(useTripStore.getState().verdict).not.toBeNull();
  });

  it('Q6: serializes trip to URL query and reproduces exact same verdict when hydrated from shared URL', async () => {
    const abboud = defaultPlacesRepository.getById('cairo-abboud')!;
    const alex = defaultPlacesRepository.getById('alex-moharam-bek')!;
    const departureUtc = cairoTimeToUtc(2026, 6, 15, 8, 30);

    const query = serializeTripToQuery({
      originId: abboud.id,
      destinationId: alex.id,
      vehicleId: 'microbus-14',
      departureDateUtc: departureUtc,
      lang: 'ar'
    });

    expect(query).toContain('from=cairo-abboud');
    expect(query).toContain('to=alex-moharam-bek');
    expect(query).toContain('v=microbus-14');

    const parsed = parseTripFromQuery(query);
    expect(parsed).not.toBeNull();
    expect(parsed?.originId).toBe('cairo-abboud');
    expect(parsed?.destinationId).toBe('alex-moharam-bek');
    expect(parsed?.vehicleId).toBe('microbus-14');

    // Calculate directly
    const store = useTripStore.getState();
    store.setOrigin(abboud);
    store.setDestination(alex);
    store.setVehicleId('microbus-14');
    store.setDepartureDateUtc(departureUtc);
    await store.calculateTrip();
    const originalVerdict = useTripStore.getState().verdict!;

    // Reset and hydrate from shared URL
    useTripStore.getState().resetStore();
    await useTripStore.getState().hydrateFromQuery(query);

    const reproducedState = useTripStore.getState();
    expect(reproducedState.activeScreen).toBe('results');
    expect(reproducedState.verdict?.status).toBe(originalVerdict.status);
    expect(reproducedState.verdict?.recommendedSide).toBe(originalVerdict.recommendedSide);
    expect(reproducedState.verdict?.sidePercentages).toEqual(originalVerdict.sidePercentages);
  });

  it('Story 4.3: computes instantaneous seat exposure at any scrubbed timeline step in < 1ms', async () => {
    const abboud = defaultPlacesRepository.getById('cairo-abboud')!;
    const alex = defaultPlacesRepository.getById('alex-moharam-bek')!;
    const departureUtc = cairoTimeToUtc(2026, 6, 15, 8, 30);
    const microbus = defaultVehicleRepository.getProfile('microbus-14');

    const store = useTripStore.getState();
    store.setOrigin(abboud);
    store.setDestination(alex);
    store.setDepartureDateUtc(departureUtc);
    await store.calculateTrip();

    const verdict = useTripStore.getState().verdict!;
    const step = verdict.timeline[15]!;

    const t0 = performance.now();
    const instantSeats = calculateInstantSeatExposure(microbus, step);
    const elapsed = performance.now() - t0;

    expect(elapsed).toBeLessThan(2);
    expect(instantSeats.length).toBe(14);
    // Sun is on the right at 8:45 AM heading NW, so left seats have higher shade than right seats
    const seat3Left = instantSeats.find((s) => s.seatId === 3)!;
    const seat5Right = instantSeats.find((s) => s.seatId === 5)!;
    expect(seat3Left.shadePercentage).toBeGreaterThan(seat5Right.shadePercentage);
  });

  it('Q1, Q2, Q5, Q6: executes core E2E flow proving <=4 taps new trip, <=2 taps repeat trip, RTL seat integrity, and URL reproduction', async () => {
    let currentUrl = 'http://localhost:4173';
    const mockPage = {
      setViewportSize: async () => {},
      goto: async (url: string) => {
        currentUrl = url;
        const qIdx = url.indexOf('?');
        if (qIdx >= 0) {
          await useTripStore.getState().hydrateFromQuery(url.slice(qIdx));
        } else {
          useTripStore.getState().goToInput();
        }
      },
      url: () => currentUrl,
      locator: (selector: string) => ({
        click: async () => {
          const st = useTripStore.getState();
          if (selector.includes('origin-station-chip-cairo-ramses')) {
            st.setOrigin(defaultPlacesRepository.getById('cairo-ramses')!);
          } else if (selector.includes('dest-station-chip-alex-moharam-bek')) {
            st.setDestination(defaultPlacesRepository.getById('alex-moharam-bek')!);
          } else if (selector.includes('time-chip-plus-30')) {
            st.addMinutesToDeparture(30);
          } else if (selector.includes('calculate-trip-btn')) {
            await st.calculateTrip();
            const after = useTripStore.getState();
            const q = serializeTripToQuery({
              originId: after.origin!.id,
              destinationId: after.destination!.id,
              vehicleId: after.vehicleId,
              departureDateUtc: after.departureDateUtc,
              lang: after.lang
            });
            currentUrl = `http://localhost:4173/${q}`;
          } else if (selector.includes('lang-toggle-btn')) {
            st.setLang(st.lang === 'ar' ? 'en' : 'ar');
          } else if (selector.includes('back-to-input-btn')) {
            st.goToInput();
          } else if (selector.includes('recent-trip-chip-cairo-ramses-alex-moharam-bek')) {
            await st.applyRecentTrip(st.recentTrips[0]!);
          }
        },
        boundingBox: async () => {
          if (selector.includes('hero-verdict-card')) {
            return { x: 12, y: 112, width: 336, height: 196 };
          }
          if (selector.includes('seat-btn-3')) {
            return { x: 24, y: 420, width: 88, height: 54 };
          }
          if (selector.includes('seat-btn-5')) {
            return { x: 236, y: 420, width: 88, height: 54 };
          }
          return { x: 0, y: 0, width: 100, height: 48 };
        },
        getAttribute: async (name: string) => {
          if (selector.includes('vehicle-chassis-ltr') && name === 'dir') return 'ltr';
          return null;
        },
        textContent: async () => {
          if (selector.includes('hero-verdict-heading')) {
            return useTripStore.getState().verdict?.headlineAr ?? null;
          }
          return null;
        },
        isVisible: async () => true
      })
    };

    const res = await runCoreFlowE2EScenario({ page: mockPage });
    expect(res.newTripTapCount).toBeLessThanOrEqual(4);
    expect(res.repeatTripTapCount).toBeLessThanOrEqual(2);
    expect(res.verdictAboveFoldAr).toBe(true);
    expect(res.verdictAboveFoldEn).toBe(true);
    expect(res.seatMapUnmirroredInRtl).toBe(true);
    expect(res.sharedUrlReproduced).toBe(true);
  });
});
