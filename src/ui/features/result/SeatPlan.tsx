import { useMemo } from 'react';
import type { TimelineStep, TripExposureVerdict, VehicleProfile, VehicleSeat } from '../../../core/types/vehicle.ts';
import { calculateSunVector } from '../../../core/exposure/exposure-calculator.ts';
import { seatStates, type SeatState } from '../../../app/result/seat-model.ts';
import { COPY, formatDuration, sideName, type AppLanguage } from '../../i18n/copy.ts';

/**
 * Plan view of the vehicle, front at the top, driver side on the left, door on the right.
 * Never mirrored: this SVG is always laid out left to right.
 *
 * Sun is drawn the way it is taught in the notebook: highlighter fill for any sun, plus
 * graphite hatching whose density grows with the amount, so it still reads on a washed-out
 * screen in direct sunlight. Best seats get the red ring, in the whole-trip view only.
 */

interface Layout {
  width: number;
  height: number;
  body: { x: number; y: number; w: number; h: number; r: number };
  seat: { w: number; h: number };
  place: (s: Pick<VehicleSeat, 'row' | 'col'>) => { x: number; y: number };
  door: { y0: number; y1: number };
  windshieldY: number;
  minutes: boolean;
}

function microbusLayout(): Layout {
  const cols = [70, 150, 230];
  const rowY = [96, 176, 248, 320, 400];
  return {
    width: 300,
    height: 470,
    body: { x: 26, y: 30, w: 248, h: 420, r: 34 },
    seat: { w: 64, h: 54 },
    place: (s) => ({ x: cols[s.col] ?? 150, y: rowY[s.row] ?? 96 }),
    door: { y0: 138, y1: 214 },
    windshieldY: 52,
    minutes: true
  };
}

function busLayout(): Layout {
  const colX = [56, 104, 196, 244];
  const backX = [56, 103, 150, 197, 244];
  const rowY = (row: number) => 132 + (row - 1) * 48;
  return {
    width: 300,
    height: 740,
    body: { x: 22, y: 30, w: 256, h: 692, r: 26 },
    seat: { w: 42, h: 40 },
    place: (s) => (s.row === 12 ? { x: backX[s.col] ?? 150, y: rowY(12) + 4 } : s.row === 0 ? { x: 70, y: 76 } : { x: colX[s.col] ?? 150, y: rowY(s.row) }),
    door: { y0: 50, y1: 104 },
    windshieldY: 46,
    minutes: false
  };
}

const FILL = ['#fbfcfe', '#fff4b8', '#ffe766', '#ffd21f'];
const HATCH = [0, 9, 6, 4];

export interface SeatPlanProps {
  vehicle: VehicleProfile;
  verdict: TripExposureVerdict;
  /** The inspected moment, or null for the whole trip. */
  step: TimelineStep | null;
  selectedSeatId: number | null;
  onSelect: (id: number) => void;
  lang: AppLanguage;
}

export function SeatPlan({ vehicle, verdict, step, selectedSeatId, onSelect, lang }: SeatPlanProps) {
  const c = COPY[lang];
  const L = vehicle.type === 'bus' ? busLayout() : microbusLayout();
  const states = useMemo(() => seatStates(verdict, vehicle, step), [verdict, vehicle, step]);
  const whole = step === null;
  const cx = L.width / 2;
  const cy = L.body.y + L.body.h / 2;
  const { w: sw, h: sh } = L.seat;

  // Where to draw the sun: the moment's bearing, or the side (or end) that took the most.
  const sunAngle = useMemo(() => {
    if (step) return step.isNight ? null : calculateSunVector(step.solarAzimuthDeg, step.solarElevationDeg, step.headingDeg).relativeAngleDeg;
    if (verdict.status === 'NIGHT') return null;
    if ((verdict.status === 'CLEAR' || verdict.status === 'LEANING') && verdict.recommendedSide !== 'either') return verdict.recommendedSide === 'right' ? 270 : 90;
    if (verdict.endAdvice === 'avoid-back') return 180;
    if (verdict.endAdvice === 'avoid-front') return 0;
    const { leftSunMinutes: l, rightSunMinutes: r } = verdict.sides;
    return Math.abs(l - r) < 2 ? null : l > r ? 270 : 90;
  }, [step, verdict]);

  // The row the sun takes from behind or ahead, marked in the whole-trip view.
  const rows = vehicle.seats.map((s) => s.row);
  const endRow = whole && verdict.endAdvice ? (verdict.endAdvice === 'avoid-back' ? Math.max(...rows) : Math.min(...rows)) : null;
  const endCells = endRow === null ? [] : vehicle.seats.filter((s) => s.row === endRow).map((s) => L.place(s));

  const seatLabel = (seat: VehicleSeat, state: SeatState | undefined) => {
    const strong = state?.strongMinutes ?? 0;
    const light = state?.lightMinutes ?? 0;
    const sun =
      strong + light === 0
        ? c.seatNoSun
        : [strong > 0 ? c.seatStrong(formatDuration(strong, lang)) : null, light > 0 ? c.seatLight(formatDuration(light, lang)) : null].filter(Boolean).join('، ');
    return `${c.seat} ${seat.id}، ${lang === 'ar' ? seat.labelAr : seat.labelEn}، ${sun}`;
  };

  return (
    <svg viewBox={`-52 -46 ${L.width + 104} ${L.height + 80}`} direction="ltr" preserveAspectRatio="xMidYMin meet" role="group" aria-label={c.seatPlan} data-view={whole ? 'trip' : 'moment'}>
      <defs>
        {[1, 2, 3].map((lvl) => (
          <pattern key={lvl} id={`hatch-${lvl}`} width={HATCH[lvl]} height={HATCH[lvl]} patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <line x1="0" y1="0" x2="0" y2={HATCH[lvl]} stroke="#6b4d00" strokeWidth={lvl === 3 ? 1.3 : 1} opacity={0.55} />
          </pattern>
        ))}
      </defs>

      {/* Body, windshield and door */}
      <rect x={L.body.x} y={L.body.y} width={L.body.w} height={L.body.h} rx={L.body.r} fill="#fbfcfe" stroke="#1b2f7c" strokeWidth="2.5" />
      <path d={`M ${L.body.x + 22} ${L.windshieldY} Q ${cx} ${L.windshieldY - 16} ${L.body.x + L.body.w - 22} ${L.windshieldY}`} fill="none" stroke="#8f98a4" strokeWidth="5" strokeLinecap="round" />
      <line x1={L.body.x + L.body.w} y1={L.door.y0} x2={L.body.x + L.body.w} y2={L.door.y1} stroke="#fbfcfe" strokeWidth="5" />
      <line x1={L.body.x + L.body.w + 5} y1={L.door.y0} x2={L.body.x + L.body.w + 5} y2={L.door.y1} stroke="#1b2f7c" strokeWidth="2" strokeDasharray="5 4" />

      {/* Side names sit level above each flank so they read without tilting the head. */}
      <text x={cx} y={L.body.y - 22} textAnchor="middle" fontSize="12" fontWeight="600" fill="#555c66">
        {c.front}
      </text>
      <text x={L.body.x - 4} y={L.body.y - 22} textAnchor="start" fontSize="13" fontWeight="700" fill="#1b2f7c">
        {sideName('left', lang)}
      </text>
      <text x={L.body.x + L.body.w + 4} y={L.body.y - 22} textAnchor="end" fontSize="13" fontWeight="700" fill="#1b2f7c">
        {sideName('right', lang)}
      </text>

      {/* Driver */}
      <g aria-hidden="true">
        {(() => {
          const d = L.place({ row: 0, col: 0 });
          return (
            <>
              <rect x={d.x - sw / 2} y={d.y - sh / 2} width={sw} height={sh} rx="9" fill="#e8edf9" stroke="#8f98a4" strokeWidth="1.5" />
              <text x={d.x} y={d.y + 5} textAnchor="middle" fontSize="12" fontWeight="600" fill="#555c66">
                {c.driver}
              </text>
            </>
          );
        })()}
      </g>

      {/* The end of the vehicle the sun reaches from behind or ahead */}
      {endCells.length > 0 && (
        <rect
          x={Math.min(...endCells.map((p) => p.x)) - sw / 2 - 10}
          y={endCells[0]!.y - sh / 2 - 10}
          width={Math.max(...endCells.map((p) => p.x)) - Math.min(...endCells.map((p) => p.x)) + sw + 20}
          height={sh + 20 + (L.minutes ? 4 : 0)}
          rx="16"
          fill="none"
          stroke="#f5b800"
          strokeWidth="2.5"
          strokeDasharray="7 5"
          data-testid="end-advice-mark"
        />
      )}

      {vehicle.seats.map((seat) => {
        const p = L.place(seat);
        const state = states.get(seat.id);
        const lvl = state?.level ?? 0;
        const isBest = whole && !!state?.isBest;
        const isSelected = seat.id === selectedSeatId;
        const minutes = (state?.strongMinutes ?? 0) + (state?.lightMinutes ?? 0);
        return (
          <g
            key={seat.id}
            className="seat"
            role="button"
            tabIndex={0}
            aria-label={seatLabel(seat, state)}
            aria-pressed={isSelected}
            data-testid={`seat-${seat.id}`}
            data-sun-level={lvl}
            onClick={() => onSelect(seat.id)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onSelect(seat.id);
              }
            }}
          >
            <rect
              className="seat-cushion"
              x={p.x - sw / 2}
              y={p.y - sh / 2}
              width={sw}
              height={sh}
              rx="9"
              fill={FILL[lvl]}
              stroke={isSelected ? '#1b2f7c' : lvl > 0 ? '#c99700' : '#9aa3ae'}
              strokeWidth={isSelected ? 3.2 : 1.6}
            />
            {lvl > 0 && <rect x={p.x - sw / 2} y={p.y - sh / 2} width={sw} height={sh} rx="9" fill={`url(#hatch-${lvl})`} pointerEvents="none" />}
            <rect x={p.x - sw / 2 + 4} y={p.y + sh / 2 - 8} width={sw - 8} height="5" rx="2.5" fill={isSelected ? '#1b2f7c' : '#8f98a4'} opacity={0.7} />
            <text x={p.x} y={p.y + (vehicle.type === 'bus' ? 2 : -2)} textAnchor="middle" fontSize={vehicle.type === 'bus' ? 15 : 19} fontWeight="700" fill="#1b2f7c">
              {seat.id}
            </text>
            {whole && L.minutes && (
              <text x={p.x} y={p.y + 16} textAnchor="middle" fontSize="11.5" fontWeight="600" fill={lvl > 0 ? '#5a4100' : '#555c66'}>
                {minutes > 0 ? c.minutesShort(minutes) : c.legendShade}
              </text>
            )}
            {isBest && (
              <path
                pathLength={1}
                d={ringPath(p.x, p.y, sw / 2 + 7, sh / 2 + 7)}
                fill="none"
                stroke="#cc1f37"
                strokeWidth="2.6"
                strokeLinecap="round"
                strokeDasharray="1"
                style={{ animation: 'ink-draw 600ms 400ms cubic-bezier(0.16,1,0.3,1) both' }}
              />
            )}
          </g>
        );
      })}

      {/* Sun and parallel rays, placed at the sun's bearing relative to the vehicle nose */}
      {sunAngle !== null && <SunMarker angle={sunAngle} cx={cx} cy={cy} rx={L.body.w / 2 + 34} ry={L.body.h / 2 + 34} />}
    </svg>
  );
}

function ringPath(x: number, y: number, rx: number, ry: number): string {
  // An ellipse that overshoots its start a little, like a pen ring.
  return `M ${x + rx * 0.2} ${y - ry} C ${x + rx * 1.15} ${y - ry}, ${x + rx * 1.1} ${y + ry}, ${x} ${y + ry} C ${x - rx * 1.12} ${y + ry}, ${x - rx * 1.1} ${y - ry * 1.02}, ${x + rx * 0.05} ${y - ry * 1.02} C ${x + rx * 0.45} ${y - ry * 1.02}, ${x + rx * 0.7} ${y - ry * 0.9}, ${x + rx * 0.85} ${y - ry * 0.75}`;
}

function SunMarker({ angle, cx, cy, rx, ry }: { angle: number; cx: number; cy: number; rx: number; ry: number }) {
  const rad = (angle * Math.PI) / 180;
  // Vehicle nose is up: ahead = -y, right = +x.
  const dx = Math.sin(rad);
  const dy = -Math.cos(rad);
  const sx = cx + dx * rx;
  const sy = cy + dy * ry;
  const px = -dy;
  const py = dx;
  return (
    <g aria-hidden="true" data-testid="plan-sun">
      {[-26, 0, 26].map((off) => {
        const x0 = sx + px * off - dx * 16;
        const y0 = sy + py * off - dy * 16;
        const x1 = x0 - dx * 30;
        const y1 = y0 - dy * 30;
        const head = 7;
        return (
          <g key={off}>
            <line x1={x0} y1={y0} x2={x1} y2={y1} stroke="#f5b800" strokeWidth="2.4" strokeLinecap="round" />
            <path d={`M ${x1} ${y1} L ${x1 + dx * head + px * head * 0.6} ${y1 + dy * head + py * head * 0.6} L ${x1 + dx * head - px * head * 0.6} ${y1 + dy * head - py * head * 0.6} Z`} fill="#f5b800" />
          </g>
        );
      })}
      <circle cx={sx} cy={sy} r="13" fill="#ffe03a" stroke="#f5b800" strokeWidth="2" />
    </g>
  );
}

/** The seat the rider picked, in one line under the plan. */
export function SeatDetail({ vehicle, verdict, step, seatId, lang }: { vehicle: VehicleProfile; verdict: TripExposureVerdict; step: TimelineStep | null; seatId: number | null; lang: AppLanguage }) {
  const c = COPY[lang];
  const states = useMemo(() => seatStates(verdict, vehicle, step), [verdict, vehicle, step]);
  const seat = vehicle.seats.find((s) => s.id === seatId);
  if (!seat) return null;
  const st = states.get(seat.id);
  const strong = st?.strongMinutes ?? 0;
  const light = st?.lightMinutes ?? 0;
  const text = step
    ? c.seatNow[st?.sun ?? 'none']
    : strong + light === 0
      ? c.seatNoSun
      : [strong > 0 ? c.seatStrong(formatDuration(strong, lang)) : null, light > 0 ? c.seatLight(formatDuration(light, lang)) : null].filter(Boolean).join(' · ');
  return (
    <div className="seat-detail" data-testid="seat-detail">
      <span className="seat-detail-num">{seat.id}</span>
      <span className="seat-detail-body">
        <span className="seat-detail-title">
          {lang === 'ar' ? seat.labelAr : seat.labelEn}
        </span>
        <span className="seat-detail-text">{text}</span>
      </span>
    </div>
  );
}

export function SeatLegend({ lang }: { lang: AppLanguage }) {
  const c = COPY[lang];
  return (
    <div className="legend" aria-hidden="true">
      <span className="legend-item">
        <span className="legend-swatch is-sun" />
        {c.legendSun}
      </span>
      <span className="legend-item">
        <span className="legend-swatch is-some" />
        {c.legendLight}
      </span>
      <span className="legend-item">
        <span className="legend-swatch" />
        {c.legendShade}
      </span>
    </div>
  );
}
