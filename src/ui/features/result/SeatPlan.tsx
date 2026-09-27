import { useMemo } from 'react';
import type { TripExposureVerdict, VehicleProfile, VehicleSeat, TimelineStep } from '../../../core/types/vehicle.ts';
import { calculateSunVector, seatSunlightAtStep } from '../../../core/exposure/exposure-calculator.ts';
import { COPY, formatDuration, sideName, type AppLanguage } from '../../i18n/copy.ts';
import { formatTime } from '../../format.ts';

/**
 * Plan view of the vehicle, front at the top, driver side on the left, door on the right.
 * Never mirrored: this SVG is always laid out left to right.
 *
 * Sun is drawn the way it is taught in the notebook: highlighter fill for any sun,
 * plus graphite hatching whose density grows with the amount, so the map still reads
 * on a washed-out screen in direct sunlight.
 */

interface Layout {
  width: number;
  height: number;
  body: { x: number; y: number; w: number; h: number; r: number };
  seat: { w: number; h: number };
  place: (s: VehicleSeat) => { x: number; y: number };
  driver: { x: number; y: number };
  door: { y0: number; y1: number };
  windshieldY: number;
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
    driver: { x: cols[0]!, y: rowY[0]! },
    door: { y0: 138, y1: 214 },
    windshieldY: 52
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
    place: (s) => (s.row === 12 ? { x: backX[s.col] ?? 150, y: rowY(12) + 4 } : { x: colX[s.col] ?? 150, y: rowY(s.row) }),
    driver: { x: 70, y: 76 },
    door: { y0: 50, y1: 104 },
    windshieldY: 46
  };
}

function sunLevel(fraction: number): 0 | 1 | 2 | 3 {
  if (fraction < 0.04) return 0;
  if (fraction < 0.2) return 1;
  if (fraction < 0.45) return 2;
  return 3;
}

const FILL = ['#fbfcfe', '#fff4b8', '#ffe766', '#ffd21f'];

export interface SeatPlanProps {
  vehicle: VehicleProfile;
  verdict: TripExposureVerdict;
  step: TimelineStep | null;
  selectedSeatId: number | null;
  onSelect: (id: number) => void;
  lang: AppLanguage;
}

export function SeatPlan({ vehicle, verdict, step, selectedSeatId, onSelect, lang }: SeatPlanProps) {
  const c = COPY[lang];
  const L = vehicle.type === 'bus' ? busLayout() : microbusLayout();
  const live = useMemo(() => (step ? seatSunlightAtStep(vehicle, step) : null), [vehicle, step]);
  const minutesById = useMemo(() => new Map(verdict.seatsExposure.map((e) => [e.seatId, e.sunMinutes])), [verdict]);
  const best = new Set(verdict.status === 'NIGHT' ? [] : verdict.bestSeatIds);

  const fractionOf = (id: number) =>
    live ? live.get(id) ?? 0 : Math.min(1, (minutesById.get(id) ?? 0) / Math.max(1, verdict.tripMinutes));

  // Where to draw the sun around the vehicle: the live step, or the side that got the most sun.
  const sunAngle = useMemo(() => {
    if (step) {
      if (step.isNight) return null;
      return calculateSunVector(step.solarAzimuthDeg, step.solarElevationDeg, step.headingDeg).relativeAngleDeg;
    }
    if (verdict.status === 'NIGHT' || verdict.status === 'DOES_NOT_MATTER') return null;
    const { leftSunMinutes: l, rightSunMinutes: r } = verdict.sides;
    if (Math.abs(l - r) < 2) return null;
    return l > r ? 270 : 90;
  }, [step, verdict]);

  const cx = L.width / 2;
  const cy = L.body.y + L.body.h / 2;
  const { w: sw, h: sh } = L.seat;

  const selected = vehicle.seats.find((s) => s.id === selectedSeatId) ?? null;
  const selectedMinutes = selected ? minutesById.get(selected.id) ?? 0 : 0;

  return (
    <div className="block" data-testid="seat-plan">
      <div className="block-head">
        <h2 className="block-title">{c.seatPlan}</h2>
        <span className="block-aside">{step ? c.seatPlanLive(formatTime(step.timeMs, lang)) : c.seatPlanTotal}</span>
      </div>

      <div className="seat-plan">
        <svg viewBox={`-52 -46 ${L.width + 104} ${L.height + 80}`} direction="ltr" role="group" aria-label={c.seatPlanHint}>
          <defs>
            {[1, 2, 3].map((lvl) => (
              <pattern key={lvl} id={`hatch-${lvl}`} width={[0, 9, 6, 4][lvl]} height={[0, 9, 6, 4][lvl]} patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                <line x1="0" y1="0" x2="0" y2={[0, 9, 6, 4][lvl]} stroke="#6b4d00" strokeWidth={lvl === 3 ? 1.3 : 1} opacity={0.55} />
              </pattern>
            ))}
            <marker id="ray-head" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
              <path d="M0 0 10 5 0 10z" fill="#f5b800" />
            </marker>
          </defs>

          {/* Body */}
          <rect x={L.body.x} y={L.body.y} width={L.body.w} height={L.body.h} rx={L.body.r} fill="#fbfcfe" stroke="#1b2f7c" strokeWidth="2.5" />
          {/* Windshield */}
          <path
            d={`M ${L.body.x + 22} ${L.windshieldY} Q ${cx} ${L.windshieldY - 16} ${L.body.x + L.body.w - 22} ${L.windshieldY}`}
            fill="none"
            stroke="#8f98a4"
            strokeWidth="5"
            strokeLinecap="round"
          />
          {/* Door gap on the right side */}
          <line x1={L.body.x + L.body.w} y1={L.door.y0} x2={L.body.x + L.body.w} y2={L.door.y1} stroke="#fbfcfe" strokeWidth="5" />
          <line x1={L.body.x + L.body.w + 5} y1={L.door.y0} x2={L.body.x + L.body.w + 5} y2={L.door.y1} stroke="#1b2f7c" strokeWidth="2" strokeDasharray="5 4" />

          {/* Side labels */}
          <text x={cx} y={L.body.y - 22} textAnchor="middle" fontSize="12" fontWeight="600" fill="#555c66">
            {c.front}
          </text>
          {/* Side names sit level above each flank so they read without tilting the head. */}
          <text x={L.body.x - 4} y={L.body.y - 22} textAnchor="start" fontSize="13" fontWeight="700" fill="#1b2f7c">
            {sideName('left', lang)}
          </text>
          <text x={L.body.x + L.body.w + 4} y={L.body.y - 22} textAnchor="end" fontSize="13" fontWeight="700" fill="#1b2f7c">
            {sideName('right', lang)}
          </text>
          <path d={`M ${L.body.x + 6} ${L.body.y - 16} v 10`} stroke="#1b2f7c" strokeWidth="1.5" />
          <path d={`M ${L.body.x + L.body.w - 6} ${L.body.y - 16} v 10`} stroke="#1b2f7c" strokeWidth="1.5" />

          {/* Driver */}
          <g aria-hidden="true">
            <rect x={L.driver.x - sw / 2} y={L.driver.y - sh / 2} width={sw} height={sh} rx="9" fill="#e8edf9" stroke="#8f98a4" strokeWidth="1.5" />
            <circle cx={L.driver.x} cy={L.driver.y - sh / 2 - 9} r="7" fill="none" stroke="#8f98a4" strokeWidth="2" />
            <text x={L.driver.x} y={L.driver.y + 5} textAnchor="middle" fontSize="12" fontWeight="600" fill="#555c66">
              {c.driver}
            </text>
          </g>

          {/* Seats */}
          {vehicle.seats.map((seat) => {
            const p = L.place(seat);
            const f = fractionOf(seat.id);
            const lvl = sunLevel(f);
            const isBest = best.has(seat.id);
            const isSelected = seat.id === selectedSeatId;
            const minutes = minutesById.get(seat.id) ?? 0;
            const label = `${c.seat} ${seat.id}، ${lang === 'ar' ? seat.labelAr : seat.labelEn}، ${
              minutes > 0 ? c.seatSunMinutes(formatDuration(minutes, lang)) : c.seatNoSun
            }`;
            return (
              <g
                key={seat.id}
                className="seat"
                role="button"
                tabIndex={0}
                aria-label={label}
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
                {/* Seat back */}
                <rect x={p.x - sw / 2 + 4} y={p.y + sh / 2 - 8} width={sw - 8} height="5" rx="2.5" fill={isSelected ? '#1b2f7c' : '#8f98a4'} opacity={0.7} />
                <text x={p.x} y={p.y + (vehicle.type === 'bus' ? 2 : -2)} textAnchor="middle" fontSize={vehicle.type === 'bus' ? 15 : 19} fontWeight="700" fill="#1b2f7c">
                  {seat.id}
                </text>
                {!live && vehicle.type !== 'bus' && (
                  <text x={p.x} y={p.y + 16} textAnchor="middle" fontSize="11.5" fontWeight="600" fill={lvl > 0 ? '#5a4100' : '#555c66'}>
                    {minutes > 0 ? (lang === 'ar' ? `${minutes} د` : `${minutes}m`) : lang === 'ar' ? 'ضل' : 'shade'}
                  </text>
                )}
                {isBest && (
                  <path
                    pathLength={1}
                    className="best-ring"
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
      </div>

      <div className="legend" aria-hidden="true">
        <span className="legend-item">
          <span className="legend-swatch is-sun" />
          {c.legendSun}
        </span>
        <span className="legend-item">
          <span className="legend-swatch is-some" />
          {c.legendSome}
        </span>
        <span className="legend-item">
          <span className="legend-swatch" />
          {c.legendShade}
        </span>
      </div>

      {selected && (
        <div className="seat-detail" data-testid="seat-detail">
          <span className="seat-detail-num">{selected.id}</span>
          <span className="seat-detail-title">
            {lang === 'ar' ? selected.labelAr : selected.labelEn}
            {best.has(selected.id) ? ` · ${c.bestSeats}` : ''}
          </span>
          <span className="seat-detail-text">
            {selectedMinutes > 0 ? c.seatSunMinutes(formatDuration(selectedMinutes, lang)) : c.seatNoSun}
            {' · '}
            {selected.isWindow ? c.seatWindow : c.seatInner}
          </span>
        </div>
      )}
      <p className="hint">{c.seatPlanHint}</p>
    </div>
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
  const rays = [-26, 0, 26].map((off) => {
    const x0 = sx + px * off - dx * 16;
    const y0 = sy + py * off - dy * 16;
    return { x0, y0, x1: x0 - dx * 30, y1: y0 - dy * 30 };
  });
  return (
    <g aria-hidden="true">
      {rays.map((r, i) => (
        <line key={i} x1={r.x0} y1={r.y0} x2={r.x1} y2={r.y1} stroke="#f5b800" strokeWidth="2.4" strokeLinecap="round" markerEnd="url(#ray-head)" />
      ))}
      <circle cx={sx} cy={sy} r="13" fill="#ffe03a" stroke="#f5b800" strokeWidth="2" />
    </g>
  );
}
