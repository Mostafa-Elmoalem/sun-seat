import { useMemo, type CSSProperties } from 'react';
import type { TripExposureVerdict, VehicleProfile } from '../../../core/types/vehicle.ts';
import { bandLevel, timelineCells, type BandLevel } from '../../../app/result/timeline-model.ts';
import { COPY, type AppLanguage } from '../../i18n/copy.ts';
import { formatTime } from '../../format.ts';
import { IconPause, IconPlay } from '../../shared/Icons.tsx';

/**
 * The trip's time bar, right under the pictures it moves. Time runs in reading
 * direction; the driver-side band sits above the axis and the door-side band below,
 * in highlighter where the sun reaches that side's window seats (soft for light sun).
 * The red cursor is the moment the 3D and the road show; it turns solid when the
 * rider picks a moment, and the seat plan follows it.
 *
 * The drawing is 1000 units wide and stretches to any width; lines keep their stroke
 * and the cursor dot is HTML, so nothing distorts on a wide screen.
 */

const VB = 1000;
const H = 64;
const BAND = { driver: [6, 24], door: [40, 58] } as const;
const AXIS_Y = 32;

const BAND_FILL: Record<BandLevel, string> = {
  strong: '#ffe03a',
  light: '#fff4b8',
  none: 'transparent',
  night: '#e3e8ef'
};

function tickStep(total: number): number {
  if (total <= 45) return 5;
  if (total <= 120) return 15;
  if (total <= 300) return 30;
  return 60;
}

export interface TimeBarProps {
  vehicle: VehicleProfile;
  verdict: TripExposureVerdict;
  /** The rider's chosen moment, or null for the whole trip. */
  scrubIndex: number | null;
  /** The moment shown when nothing is chosen (the 3D and the road always show one). */
  focusIndex: number;
  onScrub: (i: number | null) => void;
  playing: boolean;
  onTogglePlay: () => void;
  lang: AppLanguage;
}

export function TimeBar({ vehicle, verdict, scrubIndex, focusIndex, onScrub, playing, onTogglePlay, lang }: TimeBarProps) {
  const c = COPY[lang];
  const rtl = lang === 'ar';
  const { timeline, tripMinutes } = verdict;
  const cells = useMemo(() => timelineCells(vehicle, verdict, 48), [vehicle, verdict]);

  /** Share of the trip at a minute, 0 at departure and 1 at arrival. */
  const share = (minute: number) => Math.min(1, Math.max(0, minute / Math.max(1, tripMinutes)));
  /** Drawing x of a minute: time runs the way the text reads. */
  const x = (minute: number) => (rtl ? VB * (1 - share(minute)) : VB * share(minute));
  const step = tickStep(tripMinutes);
  const ticks: number[] = [];
  for (let m = 0; m <= tripMinutes; m += step) ticks.push(m);

  const shownIndex = Math.min(scrubIndex ?? focusIndex, timeline.length - 1);
  const shown = timeline[shownIndex] ?? null;
  const chosen = scrubIndex !== null;
  const first = timeline[0];
  const last = timeline[timeline.length - 1];
  const dotStyle: CSSProperties | undefined = shown ? { insetInlineStart: `${share(shown.minuteOffset) * 100}%` } : undefined;

  return (
    <div className="timebar-wrap" data-testid="trip-ruler">
      <div className="timebar">
        <button type="button" className="btn btn-outline btn-round" aria-pressed={playing} aria-label={playing ? c.pause : c.play} onClick={onTogglePlay} data-testid="play-trip">
          {playing ? <IconPause /> : <IconPlay />}
        </button>
        <div className="timebar-lanes" aria-hidden="true">
          <span>{c.driver}</span>
          <span>{c.door}</span>
        </div>
        <div className="timebar-track">
          <svg viewBox={`0 0 ${VB} ${H}`} preserveAspectRatio="none" aria-hidden="true" direction="ltr">
            {cells.map((cell, i) => {
              const a = x(cell.startMinute);
              const b = x(cell.endMinute);
              const left = Math.min(a, b);
              const width = Math.max(1, Math.abs(b - a));
              return (
                <g key={i}>
                  <rect x={left} y={BAND.driver[0]} width={width} height={BAND.driver[1] - BAND.driver[0]} fill={BAND_FILL[bandLevel(cell.driver, cell.night)]} />
                  <rect x={left} y={BAND.door[0]} width={width} height={BAND.door[1] - BAND.door[0]} fill={BAND_FILL[bandLevel(cell.door, cell.night)]} />
                </g>
              );
            })}
            <line x1={0} y1={AXIS_Y} x2={VB} y2={AXIS_Y} stroke="#1b2f7c" strokeWidth="1.8" vectorEffect="non-scaling-stroke" />
            {ticks.map((m) => (
              <line
                key={m}
                x1={x(m)}
                y1={AXIS_Y - (m % (step * 2) === 0 ? 5 : 3)}
                x2={x(m)}
                y2={AXIS_Y + (m % (step * 2) === 0 ? 5 : 3)}
                stroke="#1b2f7c"
                strokeWidth="1.2"
                vectorEffect="non-scaling-stroke"
              />
            ))}
            {shown && (
              <line
                x1={x(shown.minuteOffset)}
                y1={2}
                x2={x(shown.minuteOffset)}
                y2={H - 2}
                stroke="#cc1f37"
                strokeWidth="2.2"
                strokeDasharray={chosen ? undefined : '4 3'}
                vectorEffect="non-scaling-stroke"
              />
            )}
          </svg>
          {shown && <span className={`timebar-dot${chosen ? ' is-chosen' : ''}`} style={dotStyle} aria-hidden="true" />}
          <input
            className="timebar-range"
            type="range"
            min={0}
            max={Math.max(0, timeline.length - 1)}
            value={shownIndex}
            onChange={(e) => onScrub(Number(e.target.value))}
            aria-label={c.timeBarLabel}
            aria-valuetext={shown ? `${formatTime(shown.timeMs, lang)}، ${c.dir[shown.sunSide]}` : undefined}
            dir={rtl ? 'rtl' : 'ltr'}
            data-testid="ruler-range"
          />
        </div>
      </div>
      <div className="timebar-foot">
        <span>
          {c.departure} <b>{first ? formatTime(first.timeMs, lang) : ''}</b>
        </span>
        <span>
          {c.arrival} <b>{last ? formatTime(last.timeMs, lang) : ''}</b>
        </span>
      </div>
    </div>
  );
}
