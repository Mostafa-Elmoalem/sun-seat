import React from 'react';
import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  computeSceneLightingFromStep,
  mapSeatExposureTo3DColor,
  getCameraPresetTransform,
  getAdaptiveQualityConfig,
  SceneResourceTracker
} from '../../src/ui/three/SunOrbitScene.ts';
import { buildVehicle3DMeshData } from '../../src/ui/three/VehicleModel.ts';
import VehicleCanvas from '../../src/ui/three/VehicleCanvas.tsx';
import { defaultVehicleRepository } from '../../src/core/vehicles/vehicle-repository.ts';
import { calculateTripExposure } from '../../src/core/exposure/exposure-calculator.ts';
import { cairoTimeToUtc } from '../../src/core/astronomy/timezone.ts';
import { DESIGN_TOKENS } from '../../src/ui/styles/tokens.ts';
import type { ProcessedRoute } from '../../src/core/types/routes.ts';

function createNorthRoute(): ProcessedRoute {
  return {
    totalDistanceKm: 111,
    totalDurationMin: 60,
    isApproximate: false,
    segments: [
      {
        startLat: 30.0,
        startLng: 31.0,
        endLat: 31.0,
        endLng: 31.0,
        bearingDeg: 0,
        distanceKm: 111,
        durationMin: 60
      }
    ]
  };
}

describe('3D Sun-in-the-Vehicle Scene, Lighting, Fallback & Memory Disposal (Story 6.1)', () => {
  const microbus = defaultVehicleRepository.getProfile('microbus-14');
  const bus = defaultVehicleRepository.getProfile('bus-49');

  it('Q2: Golden Test 1 (heading North at 8:00 AM June) places directional light on +X (right) and casts sun patches on right-side seats', () => {
    const routeNorth = createNorthRoute();
    const departureUtc = cairoTimeToUtc(2026, 6, 15, 8, 0);
    const verdict = calculateTripExposure(routeNorth, departureUtc, microbus);

    const step0 = verdict.timeline[0]!;
    const lighting = computeSceneLightingFromStep(step0, microbus);

    // Sun is in the East (+x in vehicle frame when heading due North)
    expect(lighting.sunDirection.x).toBeGreaterThan(0.3);
    expect(lighting.sunPosition3D[0]).toBeGreaterThan(0);
    expect(lighting.sunnySide).toBe('right');

    // Sun patches must fall on right-side seats (e.g. seats 2, 5, 8, 11, 14) and NOT on left window seats (3, 6, 9, 12)
    expect(lighting.seatSunPatchIntensity.get(5)).toBeGreaterThan(0.5);
    expect(lighting.seatSunPatchIntensity.get(3)).toBeLessThan(0.15);
  });

  it('Constraints: maps seat exposure scores to the exact same color legend as the 2D heatmap', () => {
    const shadedColor = mapSeatExposureTo3DColor(85); // 85% shade
    const moderateColor = mapSeatExposureTo3DColor(55); // 55% shade
    const sunnyColor = mapSeatExposureTo3DColor(25); // 25% shade

    expect(shadedColor.strokeHex).toBe(DESIGN_TOKENS.shadePrimary);
    expect(sunnyColor.strokeHex).toBe(DESIGN_TOKENS.sunPrimary);
    expect(moderateColor.strokeHex).toBe('#94A3B8');
  });

  it('Constraints: builds low-poly 3D mesh data for both microbus-14 and bus-49 with 3D orientation labels ("قدام", "شمال", "يمين")', () => {
    const microbusMesh = buildVehicle3DMeshData(microbus);
    expect(microbusMesh.seatBoxes.length).toBe(14);
    expect(microbusMesh.orientationLabels.frontAr).toContain('قدام');
    expect(microbusMesh.orientationLabels.leftAr).toContain('شمال');
    expect(microbusMesh.orientationLabels.rightAr).toContain('يمين');

    const busMesh = buildVehicle3DMeshData(bus);
    expect(busMesh.seatBoxes.length).toBe(49);
  });

  it('Constraints: provides camera presets (orbit, top, inside from recommended seat) and adaptive quality config', () => {
    const orbitCam = getCameraPresetTransform('orbit', microbus, 'left');
    const topCam = getCameraPresetTransform('top', microbus, 'left');
    const insideCam = getCameraPresetTransform('inside', microbus, 'left');

    expect(topCam.pitchDeg).toBeGreaterThan(75);
    expect(insideCam.isInterior).toBe(true);
    expect(insideCam.targetSeatSide).toBe('left');
    expect(orbitCam.distance).toBeGreaterThan(insideCam.distance);

    const weakDeviceQuality = getAdaptiveQualityConfig({ hardwareConcurrency: 2, devicePixelRatio: 3, prefersReducedMotion: false });
    expect(weakDeviceQuality.pixelRatio).toBeLessThanOrEqual(1.25);
    expect(weakDeviceQuality.shadowMapSize).toBe(512);

    const strongDeviceQuality = getAdaptiveQualityConfig({ hardwareConcurrency: 8, devicePixelRatio: 2, prefersReducedMotion: false });
    expect(strongDeviceQuality.pixelRatio).toBe(2);
    expect(strongDeviceQuality.shadowMapSize).toBe(1024);
  });

  it('Q4: falls back gracefully with a friendly message when WebGL is unavailable', () => {
    const routeNorth = createNorthRoute();
    const verdict = calculateTripExposure(routeNorth, cairoTimeToUtc(2026, 6, 15, 8, 0), microbus);

    const html = renderToStaticMarkup(
      React.createElement(VehicleCanvas, {
        vehicle: microbus,
        verdict,
        currentStep: verdict.timeline[0]!,
        scrubIndex: 0,
        onScrubChange: () => {},
        onFallbackTo2D: () => {},
        forceWebGLUnavailable: true,
        lang: 'ar'
      })
    );

    expect(html).toContain('data-testid="webgl-fallback-banner"');
    expect(html).toContain('مخطط الكراسي');
  });

  it('Q5: disposes all geometries, materials, buffers, and shaders with zero memory leak across 10 open/close cycles', () => {
    const tracker = new SceneResourceTracker();

    for (let cycle = 0; cycle < 10; cycle++) {
      tracker.allocateCycleResources(microbus.totalSeats);
      expect(tracker.getActiveResourceCount()).toBeGreaterThan(0);
      tracker.disposeAll();
      expect(tracker.getActiveResourceCount()).toBe(0);
    }

    expect(tracker.getTotalDisposedCycles()).toBe(10);
    expect(tracker.getActiveResourceCount()).toBe(0);
  });
});
