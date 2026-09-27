import type { TripExposureVerdict, SunDirection } from '../../../core/types/vehicle.ts';
import { COPY, formatDuration, type AppLanguage } from '../../i18n/copy.ts';
import { formatTime } from '../../format.ts';

/**
 * The trip as a ruler: time runs along it in reading direction, the driver-side
 * band sits above the axis and the door-side band below, highlighted wherever
 * the sun is on that side. Dragging the slider inspects any moment.
 */

const W = 340;
const H = 92;
const PAD = 14;
const AXIS_Y = 50;

const BAND_COLOR: Partial<Record<SunDirection, string>> = {
  left: '#ffe03a',
  right: '#ffe03a',
  front: '#fff4b8',
  rear: '#fff4b8',
  overhead: '#e8edf9'
};

function tickStep(total: number): number {
  if (total <= 45) return 5;
  if (total <= 120) return 15;
  if (total <= 300) return 30;
  return 60;
}

export function TripRuler({
  verdict,
  scrubIndex,
  focusIndex,
  onScrub,
  lang
}: {
  verdict: TripExposureVerdict;
  scrubIndex: number | null;
  /** The moment the route figure and 3D show when nothing is being inspected. */
  focusIndex: number;
  onScrub: (i: number | null) => void;
  lang: AppLanguage;
}) {
  const c = COPY[lang];
  const { timeline, tripMinutes, spans } = verdict;
  const rtl = lang === 'ar';
  const x = (minute: number) => {
    const t = Math.min(1, Math.max(0, minute / Math.max(1, tripMinutes)));
    return rtl ? W - PAD - t * (W - 2 * PAD) : PAD + t * (W - 2 * PAD);
  };
  const first = timeline[0];
  const last = timeline[timeline.length - 1];
  const shownIndex = Math.min(scrubIndex ?? focusIndex, timeline.length - 1);
  const current = timeline[shownIndex] ?? null;
  const step = tickStep(tripMinutes);

  const ticks: number[] = [];
  for (let m = 0; m <= tripMinutes; m += step) ticks.push(m);

  const readable = spans
    .filter((s) => s.side !== 'none' && s.endMinute - s.startMinute >= Math.max(4, tripMinutes * 0.04))
    .slice(0, 5);
  const timeAt = (minute: number) => (first ? formatTime(first.timeMs + minute * 60_000, lang) : '');

  return (
    <section className="block" data-testid="trip-ruler">
      <div className="block-head">
        <h2 className="block-title">{c.sunAlongTrip}</h2>
        <span className="block-aside">{formatDuration(tripMinutes, lang)}</span>
      </div>

      <div className="ruler">
        <div className="ruler-track">
        <svg viewBox={`0 0 ${W} ${H}`} aria-hidden="true" direction="ltr">
          {/* Night stretches: graphite wash */}
          {spans
            .filter((s) => s.side === 'none')
            .map((s, i) => (
              <rect key={`n${i}`} x={Math.min(x(s.startMinute), x(s.endMinute))} y={14} width={Math.abs(x(s.endMinute) - x(s.startMinute)) || 1} height={AXIS_Y + 18 - 14} fill="#e9edf3" />
            ))}
          {/* Driver side band (above) and door side band (below) */}
          {spans.map((s, i) => {
            const color = BAND_COLOR[s.side];
            if (!color) return null;
            const x0 = Math.min(x(s.startMinute), x(s.endMinute));
            const w = Math.max(1.5, Math.abs(x(s.endMinute) - x(s.startMinute)));
            if (s.side === 'left') return <rect key={i} x={x0} y={20} width={w} height={22} rx="2" fill={color} />;
            if (s.side === 'right') return <rect key={i} x={x0} y={AXIS_Y + 6} width={w} height={22} rx="2" fill={color} />;
            return <rect key={i} x={x0} y={AXIS_Y - 3} width={w} height={6} fill={color} />;
          })}
          <text x={rtl ? W - PAD : PAD} y={12} textAnchor={rtl ? 'end' : 'start'} fontSize="10.5" fontWeight="600" fill="#555c66">
            {c.sideDriver}
          </text>
          <text x={rtl ? W - PAD : PAD} y={H - 2} textAnchor={rtl ? 'end' : 'start'} fontSize="10.5" fontWeight="600" fill="#555c66">
            {c.sideDoor}
          </text>

          {/* Axis and ticks */}
          <line x1={PAD} y1={AXIS_Y} x2={W - PAD} y2={AXIS_Y} stroke="#1b2f7c" strokeWidth="1.8" />
          {ticks.map((m) => (
            <line key={m} x1={x(m)} y1={AXIS_Y - (m % (step * 2) === 0 ? 6 : 3)} x2={x(m)} y2={AXIS_Y + (m % (step * 2) === 0 ? 6 : 3)} stroke="#1b2f7c" strokeWidth="1.2" />
          ))}

          {current && (
            <g>
              <line x1={x(current.minuteOffset)} y1={16} x2={x(current.minuteOffset)} y2={AXIS_Y + 30} stroke="#cc1f37" strokeWidth="2" />
              <circle cx={x(current.minuteOffset)} cy={AXIS_Y} r="4.5" fill="#cc1f37" />
            </g>
          )}
        </svg>
        <input
          className="ruler-range"
          type="range"
          min={0}
          max={Math.max(0, timeline.length - 1)}
          value={shownIndex}
          onChange={(e) => onScrub(Number(e.target.value))}
          aria-label={c.rulerHint}
          aria-valuetext={current ? `${formatTime(current.timeMs, lang)}، ${c.dir[current.sunSide]}` : undefined}
          dir={rtl ? 'rtl' : 'ltr'}
          data-testid="ruler-range"
        />
        </div>
        <div className="ruler-now">
          <span>
            {c.departure} <b>{first ? formatTime(first.timeMs, lang) : ''}</b>
          </span>
          <span>
            {c.arrival} <b>{last ? formatTime(last.timeMs, lang) : ''}</b>
          </span>
        </div>
      </div>

      {current && (
        <p className="verdict-note" data-testid="ruler-current" style={{ marginTop: 0 }}>
          <span>
            <b style={{ color: 'var(--ink)' }}>{formatTime(current.timeMs, lang)}</b>
            {' · '}
            {c.dir[current.sunSide]}
            {current.isNight ? null : (
              <>
                {lang === 'ar' ? ' · ارتفاع الشمس ' : ' · sun '}
                <bdi dir="ltr" style={{ whiteSpace: 'nowrap' }}>{Math.round(current.solarElevationDeg)}°</bdi>
                {lang === 'ar' ? '' : ' high'}
              </>
            )}
          </span>
        </p>
      )}
      {scrubIndex === null && <p className="hint">{c.rulerHint}</p>}

      {readable.length > 0 && (
        <ul className="span-list">
          {readable.map((s, i) => (
            <li key={i}>
              <span className="span-dot" style={{ background: BAND_COLOR[s.side] ?? '#e9edf3', border: '1px solid #c99700' }} />
              <span>{c.spanOn(c.dir[s.side], timeAt(s.startMinute), timeAt(s.endMinute))}</span>
            </li>
          ))}
        </ul>
      )}

      {scrubIndex !== null && (
        <button type="button" className="pill" style={{ alignSelf: 'flex-start' }} onClick={() => onScrub(null)} data-testid="ruler-reset">
          {c.rulerAverage}
        </button>
      )}
    </section>
  );
}
