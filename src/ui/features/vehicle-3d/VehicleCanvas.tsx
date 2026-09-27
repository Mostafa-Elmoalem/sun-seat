import { useEffect, useMemo, useRef, useState } from 'react';
import type { TimelineStep, TripExposureVerdict, VehicleProfile } from '../../../core/types/vehicle.ts';
import { calculateSunVector } from '../../../core/exposure/exposure-calculator.ts';
import { calculateSunPosition } from '../../../core/astronomy/noaa-solar.ts';
import { COPY, type AppLanguage } from '../../i18n/copy.ts';
import { formatTime, cairoParts, fromCairo } from '../../format.ts';
import { IconPause, IconPlay } from '../../shared/Icons.tsx';
import { VehicleScene, type SunState, type ViewMode } from './VehicleScene.ts';
import { defaultFocusIndex } from '../../../app/result/focus.ts';
import { EGYPT_MICROBUS_14, loadShell } from '../../../../packages/egypt-microbus/src/index.ts';

/** The microbus body, cut at build time (scripts/build-microbus-shell.mts). */
const SHELL_URL = '/models/egypt-microbus-shell.bin';

export interface VehicleCanvasProps {
  vehicle: VehicleProfile;
  verdict: TripExposureVerdict;
  scrubIndex: number | null;
  onScrub: (i: number | null) => void;
  selectedSeatId: number | null;
  lang: AppLanguage;
  /** Written on the card behind the microbus windshield. */
  destinationName?: string | null;
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
  return {
    ux,
    uy,
    uz,
    elevationDeg: step.solarElevationDeg,
    northRelativeDeg: (360 - step.headingDeg) % 360,
    path
  };
}

function isLowEnd(): boolean {
  const nav = navigator as Navigator & { deviceMemory?: number };
  return (nav.hardwareConcurrency ?? 4) <= 4 || (nav.deviceMemory ?? 4) <= 3;
}

export default function VehicleCanvas({ vehicle, verdict, scrubIndex, onScrub, selectedSeatId, lang, destinationName }: VehicleCanvasProps) {
  const c = COPY[lang];
  const slotRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<VehicleScene | null>(null);
  const [failed, setFailed] = useState(false);
  const [ready, setReady] = useState(false);
  const [view, setView] = useState<ViewMode>('top');
  const [playing, setPlaying] = useState(false);

  const focusIndex = useMemo(() => defaultFocusIndex(verdict), [verdict]);
  const index = scrubIndex ?? focusIndex;
  const step = verdict.timeline[Math.min(index, verdict.timeline.length - 1)];

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
        const shell = vehicle.id === 'microbus-14' ? await loadShell(EGYPT_MICROBUS_14, SHELL_URL) : null;
        // Let the answer paint first, then build the scene.
        await new Promise<void>((resolve) => requestAnimationFrame(() => setTimeout(resolve, 0)));
        if (cancelled) return;
        sceneRef.current = new VehicleScene(slot, vehicle, { lowEnd: isLowEnd(), lang, shell, destination: destinationName ?? null });
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
  }, [vehicle, lang, destinationName]);

  useEffect(() => {
    if (step) sceneRef.current?.setSun(sunStateFor(step));
  }, [step, ready]);

  useEffect(() => {
    sceneRef.current?.setSelectedSeat(selectedSeatId);
  }, [selectedSeatId, vehicle, ready]);

  useEffect(() => {
    sceneRef.current?.setBestSeats(verdict.status === 'NIGHT' || verdict.status === 'DOES_NOT_MATTER' ? [] : verdict.bestSeatIds);
  }, [verdict, vehicle, ready]);

  useEffect(() => {
    sceneRef.current?.setView(view);
  }, [view, vehicle, ready]);

  // Play the trip: sweep the timeline in about 12 seconds.
  useEffect(() => {
    if (!playing) return;
    const total = verdict.timeline.length;
    const stepMs = Math.max(30, 12_000 / Math.max(1, total));
    let i = scrubIndex ?? 0;
    const timer = setInterval(() => {
      i += 1;
      if (i >= total) {
        setPlaying(false);
        return;
      }
      onScrub(i);
    }, stepMs);
    return () => clearInterval(timer);
    // scrubIndex is read once at start on purpose; the interval owns the playhead after that.
  }, [playing, verdict, onScrub]);

  if (failed) {
    return (
      <div className="three-placeholder" data-testid="three-failed">
        <p>{c.threeFailed}</p>
      </div>
    );
  }

  return (
    <div data-testid="three-view">
      <div className="three-slot" ref={slotRef}>
        {step && (
          <div className="three-overlay">
            <span className="three-badge" data-testid="three-time">
              {formatTime(step.timeMs, lang)} · {c.dir[step.sunSide]}
            </span>
          </div>
        )}
      </div>
      <div className="three-toolbar">
        {(['top', 'outside', 'seat'] as const).map((v) => (
          <button key={v} type="button" className="pill" aria-pressed={view === v} onClick={() => setView(v)} data-testid={`three-view-${v}`}>
            {c.threeViews[v]}
          </button>
        ))}
        <button
          type="button"
          className="pill"
          aria-pressed={playing}
          onClick={() => {
            if (!playing && (scrubIndex ?? 0) >= verdict.timeline.length - 1) onScrub(0);
            setPlaying((p) => !p);
          }}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
          data-testid="three-play"
        >
          {playing ? <IconPause /> : <IconPlay />}
          {playing ? c.threePause : c.threePlay}
        </button>
      </div>
    </div>
  );
}
