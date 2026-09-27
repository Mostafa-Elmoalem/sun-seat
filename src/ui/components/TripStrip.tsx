import { useMemo } from 'react';
import type { TripExposureVerdict, VehicleProfile } from '../../core/types/vehicle.ts';
import { calculateSunVector, getCabin, MILD_SUN, STRONG_SUN } from '../../core/exposure/exposure-calculator.ts';
import { seatSunlight, toVehicleFrame } from '../../core/exposure/seat-rays.ts';
import { COPY, type AppLanguage } from '../i18n/copy.ts';
import { formatTime } from '../format.ts';
import { IconPause, IconPlay } from './Icons.tsx';

/**
 * The trip as two lattice rows under the plan: the driver side above, the door side
 * below, time running in reading direction. An opening is lit where the sun reaches
 * that side's window seats at that time (hot for proper sun, pale for light sun).
 * Dragging anywhere on it moves the moment every picture shows.
 */

const W = 320;
const H = 64;
const LABEL = 46;
const ROW_Y = [18, 44];
const MAX_SLICES = 40;

export function TripStrip({
  vehicle,
  verdict,
  scrubIndex,
  onScrub,
  playing,
  onTogglePlay,
  lang
}: {
  vehicle: VehicleProfile;
  verdict: TripExposureVerdict;
  scrubIndex: number | null;
  onScrub: (i: number | null) => void;
  playing: boolean;
  onTogglePlay: () => void;
  lang: AppLanguage;
}) {
  const c = COPY[lang];
  const rtl = lang === 'ar';
  const { timeline, tripMinutes } = verdict;

  // Average sunlight on each side's window seats at every step (-1 at night).
  const perStep = useMemo(() => {
    const cabin = getCabin(vehicle);
    const left = vehicle.seats.filter((s) => s.isWindow && s.side === 'left').map((s) => s.id);
    const right = vehicle.seats.filter((s) => s.isWindow && s.side === 'right').map((s) => s.id);
    return timeline.map((step) => {
      if (step.isNight) return { l: -1, r: -1 };
      const { ux, uy, uz } = calculateSunVector(step.solarAzimuthDeg, step.solarElevationDeg, step.headingDeg);
      const d = toVehicleFrame(ux, uy, uz);
      const avg = (ids: number[]) => ids.reduce((a, id) => a + seatSunlight(cabin, id, d, step.solarElevationDeg), 0) / Math.max(1, ids.length);
      return { l: avg(left), r: avg(right) };
    });
  }, [vehicle, timeline]);

  const slices = Math.max(1, Math.min(MAX_SLICES, timeline.length - 1));
  const cells = useMemo(() => {
    const out: { l: number; r: number }[] = [];
    const n = Math.max(1, timeline.length - 1);
    for (let k = 0; k < slices; k++) {
      const i0 = Math.floor((k * n) / slices);
      const i1 = Math.max(i0 + 1, Math.floor(((k + 1) * n) / slices));
      const part = perStep.slice(i0, i1);
      const day = part.filter((p) => p.l >= 0);
      out.push(day.length === 0 ? { l: -1, r: -1 } : { l: day.reduce((a, p) => a + p.l, 0) / day.length, r: day.reduce((a, p) => a + p.r, 0) / day.length });
    }
    return out;
  }, [perStep, slices, timeline.length]);

  const x0 = rtl ? 6 : LABEL;
  const x1 = rtl ? W - LABEL : W - 6;
  const pitch = (x1 - x0) / slices;
  const r = Math.min(5.2, pitch / 2 - 0.7);
  const xAt = (t: number) => (rtl ? x1 - t * (x1 - x0) : x0 + t * (x1 - x0));
  const fill = (v: number) => (v < 0 ? '#122d32' : v >= STRONG_SUN ? '#ffb52e' : v >= MILD_SUN ? '#ffe0a0' : '#21494f');

  const first = timeline[0];
  const last = timeline[timeline.length - 1];
  const current = scrubIndex !== null ? timeline[Math.min(scrubIndex, timeline.length - 1)] ?? null : null;
  const headX = current ? xAt(current.minuteOffset / Math.max(1, tripMinutes)) : null;

  return (
    <div className="strip" data-testid="trip-ruler">
      <div className="strip-head">
        <span className="strip-hint">{c.stripLabel}</span>
        <button type="button" className="play" aria-pressed={playing} onClick={onTogglePlay} data-testid="three-play">
          {playing ? <IconPause /> : <IconPlay />}
          {playing ? c.threePause : c.threePlay}
        </button>
      </div>
      <div className="strip-track">
        <svg viewBox={`0 0 ${W} ${H}`} aria-hidden="true" direction="ltr">
          <text x={rtl ? W - 2 : 2} y={ROW_Y[0]! + 4} textAnchor={rtl ? 'end' : 'start'} fontSize="11.5" fontWeight="600" fill="#a9c0bd">
            {c.sideDriverShort}
          </text>
          <text x={rtl ? W - 2 : 2} y={ROW_Y[1]! + 4} textAnchor={rtl ? 'end' : 'start'} fontSize="11.5" fontWeight="600" fill="#a9c0bd">
            {c.sideDoorShort}
          </text>
          {cells.map((cell, k) => {
            const cx = xAt((k + 0.5) / slices);
            return (
              <g key={k}>
                <path d={`M${cx} ${ROW_Y[0]! - r}L${cx + r} ${ROW_Y[0]}L${cx} ${ROW_Y[0]! + r}L${cx - r} ${ROW_Y[0]}Z`} fill={fill(cell.l)} />
                <path d={`M${cx} ${ROW_Y[1]! - r}L${cx + r} ${ROW_Y[1]}L${cx} ${ROW_Y[1]! + r}L${cx - r} ${ROW_Y[1]}Z`} fill={fill(cell.r)} />
              </g>
            );
          })}
          {headX !== null && (
            <g>
              <line x1={headX} y1={4} x2={headX} y2={H - 4} stroke="#eef3f1" strokeWidth="2.5" strokeLinecap="round" />
              <circle cx={headX} cy={(ROW_Y[0]! + ROW_Y[1]!) / 2} r="5.5" fill="#eef3f1" />
            </g>
          )}
        </svg>
        <input
          className="strip-range"
          type="range"
          min={0}
          max={Math.max(0, timeline.length - 1)}
          value={scrubIndex ?? 0}
          onChange={(e) => onScrub(Number(e.target.value))}
          aria-label={c.stripLabel}
          aria-valuetext={current ? `${formatTime(current.timeMs, lang)}، ${c.dir[current.sunSide]}` : c.wholeTrip}
          dir={rtl ? 'rtl' : 'ltr'}
          data-testid="ruler-range"
        />
      </div>
      <div className="strip-times">
        <span>
          {c.departure} <b>{first ? formatTime(first.timeMs, lang) : ''}</b>
        </span>
        <span>
          {c.arrival} <b>{last ? formatTime(last.timeMs, lang) : ''}</b>
        </span>
      </div>
      {current && (
        <p className="strip-now" data-testid="ruler-current">
          {c.dir[current.sunSide]}
          {!current.isNight && (
            <>
              {' · '}
              <bdi dir="ltr">{Math.round(current.solarElevationDeg)}°</bdi>
            </>
          )}
        </p>
      )}
    </div>
  );
}
