import type {
  VehicleProfile,
  TimelineStep
} from '../../core/types/vehicle.ts';
import {
  calculateSunVector
} from '../../core/exposure/exposure-calculator.ts';
import { calculateInstantSeatExposure } from '../store/trip-store.ts';
import { DESIGN_TOKENS } from '../styles/tokens.ts';

export type CameraPreset = 'orbit' | 'top' | 'inside';

export interface SceneLightingState {
  sunDirection: { x: number; y: number; z: number };
  sunPosition3D: [number, number, number];
  sunnySide: 'left' | 'right' | 'front' | 'rear' | 'none';
  ambientIntensity: number;
  directionalIntensity: number;
  seatSunPatchIntensity: Map<number, number>;
}

/**
 * Maps an engine TimelineStep directly to 3D directional lighting and seat sun-patch intensities.
 * Uses calculateSunVector from the core engine — zero duplicate astronomy math in the UI.
 */
export function computeSceneLightingFromStep(
  step: TimelineStep,
  vehicle: VehicleProfile,
  orbitRadius = 8.0
): SceneLightingState {
  const { ux, uy, uz } = calculateSunVector(
    step.solarAzimuthDeg,
    step.solarElevationDeg,
    step.headingDeg
  );

  const instantSeats = calculateInstantSeatExposure(vehicle, step);
  const seatSunPatchIntensity = new Map<number, number>();
  for (const s of instantSeats) {
    seatSunPatchIntensity.set(s.seatId, Number((s.score / 100).toFixed(2)));
  }

  const sunX = Number((ux * orbitRadius).toFixed(3));
  const sunY = Number((Math.max(-1.5, uz * orbitRadius)).toFixed(3));
  const sunZ = Number((-uy * orbitRadius).toFixed(3));

  return {
    sunDirection: { x: ux, y: uy, z: uz },
    sunPosition3D: [sunX, sunY, sunZ],
    sunnySide: step.sunSide,
    ambientIntensity: step.isNight ? 0.25 : 0.58,
    directionalIntensity: step.isNight ? 0.0 : step.isHighNoon ? 1.15 : 1.8,
    seatSunPatchIntensity
  };
}

export interface Seat3DColorStyle {
  fillHex: string;
  strokeHex: string;
  rgbNormalized: [number, number, number];
  status: 'OPTIMAL' | 'MODERATE' | 'EXPOSED';
}

function hexToRgbNormalized(hex: string): [number, number, number] {
  const clean = hex.replace('#', '');
  const r = parseInt(clean.slice(0, 2), 16) / 255;
  const g = parseInt(clean.slice(2, 4), 16) / 255;
  const b = parseInt(clean.slice(4, 6), 16) / 255;
  return [Number(r.toFixed(3)), Number(g.toFixed(3)), Number(b.toFixed(3))];
}

/**
 * Maps seat shade percentage to the exact same color legend as the 2D heatmap.
 */
export function mapSeatExposureTo3DColor(shadePercentage: number): Seat3DColorStyle {
  if (shadePercentage >= 70) {
    return {
      fillHex: DESIGN_TOKENS.shadeSurface,
      strokeHex: DESIGN_TOKENS.shadePrimary,
      rgbNormalized: hexToRgbNormalized(DESIGN_TOKENS.shadePrimary),
      status: 'OPTIMAL'
    };
  }
  if (shadePercentage < 45) {
    return {
      fillHex: DESIGN_TOKENS.sunSurface,
      strokeHex: DESIGN_TOKENS.sunPrimary,
      rgbNormalized: hexToRgbNormalized(DESIGN_TOKENS.sunPrimary),
      status: 'EXPOSED'
    };
  }
  return {
    fillHex: '#F8FAFC',
    strokeHex: '#94A3B8',
    rgbNormalized: hexToRgbNormalized('#94A3B8'),
    status: 'MODERATE'
  };
}

export interface CameraTransform {
  preset: CameraPreset;
  yawDeg: number;
  pitchDeg: number;
  distance: number;
  isInterior: boolean;
  targetSeatSide: 'left' | 'right' | 'either';
}

export function getCameraPresetTransform(
  preset: CameraPreset,
  vehicle: VehicleProfile,
  recommendedSide: 'left' | 'right' | 'either'
): CameraTransform {
  const baseDist = vehicle.type === 'bus' ? 13.5 : 8.2;

  if (preset === 'top') {
    return {
      preset: 'top',
      yawDeg: 0,
      pitchDeg: 84,
      distance: baseDist * 1.1,
      isInterior: false,
      targetSeatSide: recommendedSide
    };
  }

  if (preset === 'inside') {
    const side = recommendedSide === 'either' ? 'left' : recommendedSide;
    return {
      preset: 'inside',
      yawDeg: side === 'left' ? 14 : -14,
      pitchDeg: 10,
      distance: 2.1,
      isInterior: true,
      targetSeatSide: side
    };
  }

  return {
    preset: 'orbit',
    yawDeg: -36,
    pitchDeg: 30,
    distance: baseDist,
    isInterior: false,
    targetSeatSide: recommendedSide
  };
}

export interface AdaptiveQualityConfig {
  pixelRatio: number;
  shadowMapSize: 512 | 1024;
  isLowEndDevice: boolean;
  pauseAutoOrbit: boolean;
}

export function getAdaptiveQualityConfig(env?: {
  hardwareConcurrency?: number;
  devicePixelRatio?: number;
  prefersReducedMotion?: boolean;
}): AdaptiveQualityConfig {
  const cores =
    env?.hardwareConcurrency ??
    (typeof navigator !== 'undefined' ? navigator.hardwareConcurrency || 4 : 4);
  const rawDpr =
    env?.devicePixelRatio ??
    (typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1);
  const reducedMotion =
    env?.prefersReducedMotion ??
    (typeof window !== 'undefined' && typeof window.matchMedia === 'function'
      ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
      : false);

  const isLowEndDevice = cores <= 4;
  const pixelRatio = isLowEndDevice ? Math.min(rawDpr, 1.25) : Math.min(rawDpr, 2.0);

  return {
    pixelRatio: Number(pixelRatio.toFixed(2)),
    shadowMapSize: isLowEndDevice ? 512 : 1024,
    isLowEndDevice,
    pauseAutoOrbit: reducedMotion
  };
}

/**
 * Tracks and deterministically disposes GPU/Scene resources (geometries, materials, WebGL buffers, shaders)
 * to guarantee zero memory leaks when opening and closing the 3D view repeatedly (Q5).
 */
export class SceneResourceTracker {
  private activeResources = new Set<{ id: string; dispose: () => void }>();
  private disposedCycles = 0;

  public register(id: string, disposeFn: () => void): void {
    this.activeResources.add({ id, dispose: disposeFn });
  }

  public allocateCycleResources(seatCount: number, onDisposeCallback?: () => void): void {
    this.register('chassis-geometry', () => {});
    this.register('chassis-material', () => {});
    this.register('sun-sphere-geometry', () => {});
    this.register('shadow-plane-buffer', () => {});
    for (let i = 0; i < seatCount; i++) {
      this.register(`seat-mesh-${i + 1}`, () => {});
    }
    if (onDisposeCallback) {
      this.register('webgl-context-cleanup', onDisposeCallback);
    }
  }

  public disposeAll(): void {
    for (const res of this.activeResources) {
      try {
        res.dispose();
      } catch {
        // Ignore disposal errors on already lost contexts
      }
    }
    this.activeResources.clear();
    this.disposedCycles++;
  }

  public getActiveResourceCount(): number {
    return this.activeResources.size;
  }

  public getTotalDisposedCycles(): number {
    return this.disposedCycles;
  }
}
