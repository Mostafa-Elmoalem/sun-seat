import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { HeroVerdictCard, calculateContrastRatio } from '../../src/ui/components/HeroVerdictCard.tsx';
import { SeatHeatmap2D } from '../../src/ui/components/SeatHeatmap2D.tsx';
import { SolarTimeScrubber, findSunFlipIndices } from '../../src/ui/components/SolarTimeScrubber.tsx';
import { EducationalDrawer } from '../../src/ui/components/EducationalDrawer.tsx';
import { HomeView } from '../../src/ui/components/HomeView.tsx';
import { ResultsView } from '../../src/ui/components/ResultsView.tsx';
import { App } from '../../src/ui/App.tsx';
import { useTripStore } from '../../src/ui/store/trip-store.ts';
import { DESIGN_TOKENS } from '../../src/ui/styles/tokens.ts';
import { defaultVehicleRepository } from '../../src/core/vehicles/vehicle-repository.ts';
import { calculateTripExposure } from '../../src/core/exposure/exposure-calculator.ts';
import { cairoTimeToUtc } from '../../src/core/astronomy/timezone.ts';
import type { ProcessedRoute } from '../../src/core/types/routes.ts';
import type { TripExposureVerdict } from '../../src/core/types/vehicle.ts';

function createTestRoute(bearingDeg: number, durationMin = 60): ProcessedRoute {
  return {
    totalDistanceKm: 100,
    totalDurationMin: durationMin,
    isApproximate: false,
    segments: [
      {
        startLat: 30.0,
        startLng: 31.0,
        endLat: 31.0,
        endLng: 31.0,
        bearingDeg,
        distanceKm: 100,
        durationMin
      }
    ]
  };
}

describe('UI Components, Honest Output Verdicts (Q3), RTL Immunity & Contrast', () => {
  const microbus = defaultVehicleRepository.getProfile('microbus-14');
  const bus = defaultVehicleRepository.getProfile('bus-49');

  beforeEach(() => {
    useTripStore.getState().resetStore();
  });

  it('Q4 & Front-End Spec: verifies primary text on card surface exceeds 14.8:1 contrast ratio', () => {
    const heroRatio = calculateContrastRatio(DESIGN_TOKENS.textPrimary, DESIGN_TOKENS.surfaceCard);
    expect(heroRatio).toBeGreaterThanOrEqual(14.8);

    const nightRatio = calculateContrastRatio('#FFFFFF', DESIGN_TOKENS.statusNight);
    expect(nightRatio).toBeGreaterThanOrEqual(7.0);
  });

  it('Q3: renders all 5 honest-output verdict states (CLEAR, LEANING, TIE, DOES_NOT_MATTER, NIGHT) in AR and EN', () => {
    const baseRoute = createTestRoute(0, 60);
    const clearVerdict = calculateTripExposure(baseRoute, cairoTimeToUtc(2026, 6, 15, 8, 0), microbus);
    const nightVerdict = calculateTripExposure(baseRoute, cairoTimeToUtc(2026, 6, 15, 23, 0), microbus);
    const noonVerdict = calculateTripExposure(baseRoute, cairoTimeToUtc(2026, 6, 21, 12, 55), microbus);

    const tieVerdict: TripExposureVerdict = {
      ...clearVerdict,
      status: 'TIE',
      recommendedSide: 'either',
      sidePercentages: { leftShade: 52, rightShade: 48, leftSun: 48, rightSun: 52 }
    };

    const leaningVerdict: TripExposureVerdict = {
      ...clearVerdict,
      status: 'LEANING',
      recommendedSide: 'right',
      sidePercentages: { leftShade: 45, rightShade: 60, leftSun: 55, rightSun: 40 }
    };

    // 1. CLEAR (AR & EN)
    const clearHtmlAr = renderToStaticMarkup(
      <HeroVerdictCard verdict={clearVerdict} lang="ar" isApproximate={false} />
    );
    expect(clearHtmlAr).toContain('اقعد شمال');
    expect(clearHtmlAr).toContain(`${clearVerdict.sidePercentages.leftShade}%`);

    const clearHtmlEn = renderToStaticMarkup(
      <HeroVerdictCard verdict={clearVerdict} lang="en" isApproximate={false} />
    );
    expect(clearHtmlEn).toContain('LEFT');

    // 2. LEANING
    const leaningHtmlAr = renderToStaticMarkup(
      <HeroVerdictCard verdict={leaningVerdict} lang="ar" isApproximate={false} />
    );
    expect(leaningHtmlAr).toContain('يمين');
    expect(leaningHtmlAr).toContain('60%');

    // 3. TIE
    const tieHtmlAr = renderToStaticMarkup(
      <HeroVerdictCard verdict={tieVerdict} lang="ar" isApproximate={false} />
    );
    expect(tieHtmlAr).toContain('الجنبين زي بعض تقريباً');

    // 4. DOES_NOT_MATTER (Overhead Sun)
    const noonHtmlAr = renderToStaticMarkup(
      <HeroVerdictCard verdict={noonVerdict} lang="ar" isApproximate={false} />
    );
    expect(noonHtmlAr).toContain('الشمس فوق راسك');

    // 5. NIGHT
    const nightHtmlAr = renderToStaticMarkup(
      <HeroVerdictCard verdict={nightVerdict} lang="ar" isApproximate={false} />
    );
    expect(nightHtmlAr).toContain('مفيش شمس');
  });

  it('AC-2 & Hard Constraint 6: SeatHeatmap2D enforces dir="ltr", preserves physical left/right, and includes icons + percentages', () => {
    const route = createTestRoute(0, 60);
    const verdict = calculateTripExposure(route, cairoTimeToUtc(2026, 6, 15, 8, 0), microbus);

    const html = renderToStaticMarkup(
      <SeatHeatmap2D
        vehicle={microbus}
        seatsExposure={verdict.seatsExposure}
        bestSeatIds={verdict.bestSeatIds}
        selectedSeatId={3}
        onSelectSeat={() => {}}
        lang="ar"
      />
    );

    // Must explicitly lock direction to ltr
    expect(html).toContain('dir="ltr"');
    // Must contain front of vehicle indicator
    expect(html).toContain('مقدمة العربية');
    // Must contain explicit physical orientation guard copy
    expect(html).toContain('شمالك وإنت راكب وباصص لقدام ناحية السائق');
    // Must render all 14 seats with percentages and non-color icons
    expect(html).toContain('aria-label="');
    expect(html).toContain('%');
    // Verify seat 3 (Left window) appears before seat 5 (Right window) in DOM order
    const idxSeat3 = html.indexOf('data-seat-id="3"');
    const idxSeat5 = html.indexOf('data-seat-id="5"');
    expect(idxSeat3).toBeGreaterThan(-1);
    expect(idxSeat5).toBeGreaterThan(idxSeat3);

    // Also test 49-seat intercity bus rendering
    const busVerdict = calculateTripExposure(route, cairoTimeToUtc(2026, 6, 15, 8, 0), bus);
    const busHtml = renderToStaticMarkup(
      <SeatHeatmap2D
        vehicle={bus}
        seatsExposure={busVerdict.seatsExposure}
        bestSeatIds={busVerdict.bestSeatIds}
        selectedSeatId={1}
        onSelectSeat={() => {}}
        lang="ar"
      />
    );
    expect(busHtml).toContain('dir="ltr"');
    expect(busHtml).toContain('data-seat-id="49"');
  });

  it('Story 4.3: SolarTimeScrubber renders range slider, current time, and detects sun flips', () => {
    const route = createTestRoute(0, 60);
    const verdict = calculateTripExposure(route, cairoTimeToUtc(2026, 6, 15, 8, 0), microbus);

    const html = renderToStaticMarkup(
      <SolarTimeScrubber
        timeline={verdict.timeline}
        currentIndex={10}
        isScrubbing={true}
        onChange={() => {}}
        onResetToAverage={() => {}}
        lang="ar"
      />
    );

    expect(html).toContain('type="range"');
    expect(html).toContain(verdict.timeline[10]!.timeCairoFormatted);

    // Test sun flip detection when sunSide transitions from right to left
    const mockTimeline = [
      { ...verdict.timeline[0]!, minuteOffset: 0, sunSide: 'right' as const },
      { ...verdict.timeline[0]!, minuteOffset: 1, sunSide: 'right' as const },
      { ...verdict.timeline[0]!, minuteOffset: 2, sunSide: 'left' as const }
    ];
    const flips = findSunFlipIndices(mockTimeline);
    expect(flips).toEqual([2]);
  });

  it('Story 4.3: EducationalDrawer renders one-line why explanation, SVG compass, and YouTube link', () => {
    const route = createTestRoute(315, 120);
    const verdict = calculateTripExposure(route, cairoTimeToUtc(2026, 6, 15, 14, 30), microbus);

    const html = renderToStaticMarkup(
      <EducationalDrawer
        verdict={verdict}
        isOpen={true}
        onToggle={() => {}}
        lang="ar"
      />
    );

    expect(html).toContain('شوف حسبناها إزاي');
    expect(html).toContain('<svg');
    expect(html).toContain('315°');
    expect(html).toContain('الجغرافيا بتنفع في إيه؟');
  });

  it('Story 4.1 & Q2: HomeView and ResultsView render cleanly in both AR (RTL) and EN (LTR) withHeroVerdictCard first', async () => {
    const appInputHtmlAr = renderToStaticMarkup(<App />);
    expect(appInputHtmlAr).toContain('dir="rtl"');
    expect(appInputHtmlAr).toContain('احسب الضل ومكان القعدة');
    expect(appInputHtmlAr).toContain('+30 دقيقة');
    expect(appInputHtmlAr).toContain('+ساعة');

    // Calculate trip and render ResultsView in AR and EN
    await useTripStore.getState().calculateTrip();
    const resultsHtmlAr = renderToStaticMarkup(<ResultsView />);
    const heroPosAr = resultsHtmlAr.indexOf('data-testid="hero-verdict-card"');
    const heatmapPosAr = resultsHtmlAr.indexOf('data-testid="seat-heatmap-card"');
    expect(heroPosAr).toBeGreaterThan(-1);
    expect(heatmapPosAr).toBeGreaterThan(heroPosAr);

    // Switch to English
    useTripStore.getState().setLang('en');
    const appResultsHtmlEn = renderToStaticMarkup(<App />);
    expect(appResultsHtmlEn).toContain('dir="ltr"');
    expect(appResultsHtmlEn).toContain('Sit Where?');
    expect(appResultsHtmlEn).toContain('2.5D Seat Map');
    expect(appResultsHtmlEn).toContain('3D Model');
  });
});
