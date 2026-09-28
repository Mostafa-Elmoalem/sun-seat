import { useEffect, useRef, useState } from 'react';
import type { TimelineStep, TripExposureVerdict, VehicleProfile } from '../../../core/types/vehicle.ts';
import { calculateSunVector } from '../../../core/exposure/exposure-calculator.ts';
import { calculateSunPosition } from '../../../core/astronomy/noaa-solar.ts';
import { COPY, type AppLanguage } from '../../i18n/copy.ts';
import { cairoParts, fromCairo } from '../../format.ts';
import { SegmentedControl } from '../../shared/SegmentedControl.tsx';
import { VehicleScene, type SunState, type ViewMode } from './VehicleScene.ts';
import { EGYPT_MICROBUS_14, loadShell } from '../../../../packages/egypt-microbus/src/index.ts';
import { SHELL_URL } from './assets.ts';

export interface VehicleCanvasProps {
  vehicle: VehicleProfile;
  verdict: TripExposureVerdict;
  /** The moment the scene shows: the sun direction for that minute of the trip. */
  step: TimelineStep | null;
  selectedSeatId: number | null;
  lang: AppLanguage;
  /** Written on the card behind the microbus windshield. */
  destinationName?: string | null;
  /** False while another picture is showing: the scene stays built but stops drawing. */
  active?: boolean;
}

function sunStateFor(step: TimelineStep): SunState {
  const { ux, uy, uz } = calculateSunVector(step.solarAzimuthDeg, step.solarElevationDeg, step.headingDeg);
  const day = cairoParts(new Date(step.timeMs)).date;
  const path: [number, number, number][] = [];
  for (let minutes = 4 * 60; minutes <= 20 * 60; minutes += 12) {
    const t = fromCairo(day, `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`);
    if (!t) continue;
    const pos = calculateSunPosition(step.location.lat, step.location.lng, t);
    if (pos.elevation < -2) continue;
    const v = calculateSunVector(pos.azimuth, pos.elevation, step.headingDeg);
    path.push([v.ux, v.uy, v.uz]);
  }
  return { ux, uy, uz, elevationDeg: step.solarElevationDeg, path };
}

/**
 * Phones and tablets (a coarse pointer) and weak computers get the light scene: no
 * reflection map, no clearcoat, softer shadows and fewer pixels. Shader compilation and
 * the reflection map are what make the first frame slow on a phone.
 */
function wantsLightScene(): boolean {
  const nav = navigator as Navigator & { deviceMemory?: number };
  const coarse = typeof window.matchMedia === 'function' && window.matchMedia('(pointer: coarse)').matches;
  return coarse || (nav.hardwareConcurrency ?? 4) <= 4 || (nav.deviceMemory ?? 4) <= 3;
}

/** The destination card behind the windshield is hand-written in Ruq'ah, loaded only for the 3D. */
async function loadCardFont(): Promise<void> {
  if (typeof FontFace === 'undefined' || !document.fonts) return;
  try {
    const face = new FontFace('Aref Ruqaa', "url('/fonts/aref-ruqaa-arabic-700.woff2') format('woff2')", { weight: '700' });
    document.fonts.add(face);
    await Promise.race([face.load(), new Promise((resolve) => setTimeout(resolve, 1200))]);
  } catch {
    // Without the font the card falls back to the UI face; nothing else depends on it.
  }
}

export default function VehicleCanvas({ vehicle, verdict, step, selectedSeatId, lang, destinationName, active = true }: VehicleCanvasProps) {
  const c = COPY[lang];
  const slotRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<VehicleScene | null>(null);
  const [failed, setFailed] = useState(false);
  const [ready, setReady] = useState(false);
  const [view, setView] = useState<ViewMode>('top');

  useEffect(() => {
    const slot = slotRef.current;
    if (!slot) return;
    let cancelled = false;
    setReady(false);
    (async () => {
      try {
        const probe = document.createElement('canvas');
        if (!probe.getContext('webgl2') && !probe.getContext('webgl')) throw new Error('no webgl');
        // The finished body is a small download; cutting it on the phone would block for seconds.
        const [shell] = await Promise.all([vehicle.id === 'microbus-14' ? loadShell(EGYPT_MICROBUS_14, SHELL_URL) : null, loadCardFont()]);
        // Let the answer paint first, then build the scene.
        await new Promise<void>((resolve) => requestAnimationFrame(() => setTimeout(resolve, 0)));
        if (cancelled) return;
        const scene = new VehicleScene(slot, vehicle, { lowEnd: wantsLightScene(), shell, destination: destinationName ?? null });
        sceneRef.current = scene;
        await scene.prepare();
        if (cancelled) return;
        setReady(true);
      } catch {
        if (!cancelled) setFailed(true);
      }
    })();
    return () => {
      cancelled = true;
      sceneRef.current?.dispose();
      sceneRef.current = null;
    };
  }, [vehicle, destinationName]);

  useEffect(() => {
    if (step) sceneRef.current?.setSun(sunStateFor(step));
  }, [step, ready]);

  useEffect(() => {
    sceneRef.current?.setSelectedSeat(selectedSeatId);
  }, [selectedSeatId, vehicle, ready]);

  useEffect(() => {
    sceneRef.current?.setBestSeats(verdict.seatAdvice && verdict.status !== 'NIGHT' ? verdict.bestSeatIds : []);
  }, [verdict, vehicle, ready]);

  useEffect(() => {
    sceneRef.current?.setView(view);
  }, [view, vehicle, ready]);

  useEffect(() => {
    sceneRef.current?.setActive(active);
  }, [active, ready]);

  if (failed) {
    return (
      <div className="three-poster" data-testid="three-failed">
        <p>{c.threeFailed}</p>
      </div>
    );
  }

  return (
    <div className="three-slot" ref={slotRef} data-testid="three-view">
      {!ready && (
        <div className="three-poster sketching" data-testid="three-loading" style={{ position: 'absolute', inset: 0 }}>
          <svg width="120" height="48" viewBox="0 0 120 48" aria-hidden="true">
            <path pathLength={1} d="M6 36V16c0-3 2-5 5-5h66c5 0 9 2 12 5l12 10c2 2 3 4 3 6v4H6Z" />
          </svg>
          {c.threeLoadingShort}
        </div>
      )}
      <SegmentedControl
        className="three-views"
        compact
        label={c.tabVehicle}
        value={view}
        onChange={setView}
        segments={(['top', 'outside', 'seat'] as const).map((v) => ({ id: v, label: c.threeViews[v], testId: `three-view-${v}` }))}
      />
    </div>
  );
}
