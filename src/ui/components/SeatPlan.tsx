import { useMemo, type ReactElement } from 'react';
import type { EndWindow, SeatExposure, SideWindow, TimelineStep, TripExposureVerdict, VehicleProfile, VehicleSeat } from '../../core/types/vehicle.ts';
import { calculateSunVector, MILD_SUN, seatSunlightAtStep, STRONG_SUN } from '../../core/exposure/exposure-calculator.ts';
import { COPY, formatDuration, type AppLanguage } from '../i18n/copy.ts';

/**
 * The vehicle from above as a lattice: front at the top, the driver side on the left,
 * the door on the right, never mirrored. Every seat is a lattice cell; the sun falls
 * into it as lit lattice dots whose number is the amount of sun (hot for proper sun,
 * pale for light sun, ghost for shade). The best seats glow white in the whole-trip view.
 */

const COLOR = {
  floor: '#13343a',
  frame: '#2a5a60',
  glass: '#86bcc0',
  cell: '#183d43',
  cellEdge: '#2a5a60',
  ghost: '#21494f',
  ghostOnWhite: '#dde3e0',
  best: '#fbfbf8',
  bestInk: '#123e44',
  number: '#eef3f1',
  dim: '#a9c0bd',
  sun: '#ffb52e',
  sunLight: '#ffe0a0',
  sunLightOnWhite: '#f5c566',
  ring: '#eef3f1'
};

interface Dots {
  cols: number;
  rows: number;
  r: number;
  dx: number;
  dy: number;
  top: number;
}

interface Layout {
  view: { x: number; y: number; w: number; h: number };
  body: { x: number; y: number; w: number; h: number; r: number };
  cell: { w: number; h: number; r: number };
  dots: Dots;
  number: { size: number; y: number };
  minutes: boolean;
  colX: (s: VehicleSeat) => number;
  yOf: (vehicleY: number) => number;
  xOf: (vehicleX: number) => number;
}

function microbusLayout(v: VehicleProfile): Layout {
  const bodyX = 24;
  const bodyW = 252;
  const cols = [70, 150, 230];
  const yOf = (y: number) => 104 + (y - 0.95) * 92;
  return {
    view: { x: -46, y: -8, w: 392, h: 548 },
    body: { x: bodyX, y: 34, w: bodyW, h: Math.max(yOf(v.dimensions.rearWallY) + 30, 490) - 34, r: 34 },
    cell: { w: 64, h: 62, r: 12 },
    dots: { cols: 4, rows: 2, r: 5.2, dx: 13, dy: 12, top: 10 },
    number: { size: 19, y: -8 },
    minutes: true,
    colX: (s) => cols[s.col] ?? 150,
    yOf,
    xOf: (x: number) => bodyX + bodyW / 2 + (x / v.dimensions.widthM) * bodyW
  };
}

function busLayout(v: VehicleProfile): Layout {
  const bodyX = 22;
  const bodyW = 256;
  const colX = [56, 104, 196, 244];
  const backX = [56, 103, 150, 197, 244];
  const yOf = (y: number) => 46 + (y - 0.12) * 55.6;
  return {
    view: { x: -40, y: -8, w: 380, h: 760 },
    body: { x: bodyX, y: 30, w: bodyW, h: yOf(v.dimensions.rearWallY) - 30 + 12, r: 26 },
    cell: { w: 42, h: 40, r: 9 },
    dots: { cols: 3, rows: 2, r: 3.6, dx: 10, dy: 9, top: 5 },
    number: { size: 13, y: -6 },
    minutes: false,
    colX: (s) => (s.row === 12 ? backX[s.col] ?? 150 : colX[s.col] ?? 150),
    yOf,
    xOf: (x: number) => bodyX + bodyW / 2 + (x / v.dimensions.widthM) * bodyW
  };
}

function rhombus(cx: number, cy: number, r: number): string {
  return `M${cx.toFixed(1)} ${(cy - r).toFixed(1)}L${(cx + r).toFixed(1)} ${cy.toFixed(1)}L${cx.toFixed(1)} ${(cy + r).toFixed(1)}L${(cx - r).toFixed(1)} ${cy.toFixed(1)}Z`;
}

/** Lit dots for one seat: how many are proper sun and how many light sun. */
export function seatDots(total: number, exposure: SeatExposure | undefined, tripMinutes: number, momentLit: number | null): { strong: number; light: number } {
  if (momentLit !== null) {
    if (momentLit < MILD_SUN) return { strong: 0, light: 0 };
    const n = Math.max(1, Math.min(total, Math.round(total * Math.min(1, momentLit / 0.6))));
    return momentLit >= STRONG_SUN ? { strong: n, light: 0 } : { strong: 0, light: n };
  }
  if (!exposure) return { strong: 0, light: 0 };
  const trip = Math.max(1, tripMinutes);
  const strong = exposure.strongMinutes > 0 ? Math.max(1, Math.round((total * exposure.strongMinutes) / trip)) : 0;
  const light = exposure.mildMinutes > 0 ? Math.max(1, Math.round((total * exposure.mildMinutes) / trip)) : 0;
  const s = Math.min(total, strong);
  return { strong: s, light: Math.min(total - s, light) };
}

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
  const L = vehicle.type === 'bus' ? busLayout(vehicle) : microbusLayout(vehicle);
  const live = useMemo(() => (step ? seatSunlightAtStep(vehicle, step) : null), [vehicle, step]);
  const exposureById = useMemo(() => new Map(verdict.seatsExposure.map((e) => [e.seatId, e])), [verdict]);
  const whole = step === null;
  const best = new Set(verdict.seatAdvice && verdict.status !== 'NIGHT' ? verdict.bestSeatIds : []);
  const { body, cell, dots } = L;
  const cx = body.x + body.w / 2;
  const cy = body.y + body.h / 2;

  // Where the sun stands around the vehicle: the moment's bearing, or the side (or end) that took the most.
  const sunAngle = useMemo(() => {
    if (step) return step.isNight ? null : calculateSunVector(step.solarAzimuthDeg, step.solarElevationDeg, step.headingDeg).relativeAngleDeg;
    if (verdict.status === 'NIGHT') return null;
    if ((verdict.status === 'CLEAR' || verdict.status === 'LEANING') && verdict.recommendedSide !== 'either') {
      return verdict.recommendedSide === 'right' ? 270 : 90;
    }
    if (verdict.endAdvice === 'avoid-back') return 180;
    if (verdict.endAdvice === 'avoid-front') return 0;
    return null;
  }, [step, verdict]);

  const rows = vehicle.seats.map((s) => s.row);
  const endRow = whole && verdict.endAdvice ? (verdict.endAdvice === 'avoid-back' ? Math.max(...rows) : Math.min(...rows)) : null;
  const endSeats = endRow === null ? [] : vehicle.seats.filter((s) => s.row === endRow);

  let bloomIndex = 0;
  const seatNodes: ReactElement[] = vehicle.seats.map((seat) => {
    const x = L.colX(seat);
    const y = L.yOf(seat.position.y);
    const exposure = exposureById.get(seat.id);
    const momentLit = live ? live.get(seat.id) ?? 0 : null;
    const total = dots.cols * dots.rows;
    const lit = seatDots(total, exposure, verdict.tripMinutes, momentLit);
    const isBest = whole && best.has(seat.id);
    const isSelected = seat.id === selectedSeatId;

    // Dots fill from the seat's own window flank inwards.
    const positions: { x: number; y: number; order: number }[] = [];
    for (let r = 0; r < dots.rows; r++) {
      for (let k = 0; k < dots.cols; k++) {
        const px = x + (k - (dots.cols - 1) / 2) * dots.dx;
        const py = y + dots.top + r * dots.dy;
        const fromLeft = k;
        const fromRight = dots.cols - 1 - k;
        const fromCenter = Math.abs(k - (dots.cols - 1) / 2);
        const order = (seat.side === 'left' ? fromLeft : seat.side === 'right' ? fromRight : fromCenter) * dots.rows + r;
        positions.push({ x: px, y: py, order });
      }
    }
    positions.sort((a, b) => a.order - b.order);

    const strongMin = exposure?.strongMinutes ?? 0;
    const lightMin = exposure?.mildMinutes ?? 0;
    const sunText =
      strongMin + lightMin === 0
        ? c.seatNoSun
        : [strongMin > 0 ? c.seatStrong(formatDuration(strongMin, lang)) : null, lightMin > 0 ? c.seatLight(formatDuration(lightMin, lang)) : null].filter(Boolean).join('، ');
    const label = `${c.seat} ${seat.id}، ${lang === 'ar' ? seat.labelAr : seat.labelEn}، ${sunText}`;

    return (
      <g
        key={seat.id}
        className="plan-seat"
        role="button"
        tabIndex={0}
        aria-label={label}
        aria-pressed={isSelected}
        data-testid={`seat-${seat.id}`}
        data-sun={lit.strong > 0 ? 'strong' : lit.light > 0 ? 'light' : 'none'}
        onClick={() => onSelect(seat.id)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onSelect(seat.id);
          }
        }}
      >
        {isSelected && (
          <rect x={x - cell.w / 2 - 5} y={y - cell.h / 2 - 5} width={cell.w + 10} height={cell.h + 10} rx={cell.r + 4} fill="none" stroke={COLOR.ring} strokeWidth="2.5" />
        )}
        <rect
          className="plan-cell"
          x={x - cell.w / 2}
          y={y - cell.h / 2}
          width={cell.w}
          height={cell.h}
          rx={cell.r}
          fill={isBest ? COLOR.best : COLOR.cell}
          stroke={isBest ? COLOR.best : !whole && best.has(seat.id) ? COLOR.dim : COLOR.cellEdge}
          strokeWidth={!whole && best.has(seat.id) ? 2 : 1.5}
        />
        <text x={x} y={y + L.number.y} textAnchor="middle" fontSize={L.number.size} fontWeight="700" fill={isBest ? COLOR.bestInk : COLOR.number}>
          {seat.id}
        </text>
        {positions.map((p, i) => {
          const kind = i < lit.strong ? 'strong' : i < lit.strong + lit.light ? 'light' : 'ghost';
          const fill = kind === 'strong' ? COLOR.sun : kind === 'light' ? (isBest ? COLOR.sunLightOnWhite : COLOR.sunLight) : isBest ? COLOR.ghostOnWhite : COLOR.ghost;
          const bloom = whole && kind !== 'ghost';
          const delay = bloom ? Math.min(560, bloomIndex++ * 14) : 0;
          return <path key={i} d={rhombus(p.x, p.y, dots.r)} fill={fill} className={bloom ? 'dot-lit' : undefined} style={bloom ? ({ '--d': `${delay}ms` } as React.CSSProperties) : undefined} />;
        })}
        {L.minutes && whole && (
          <text x={x} y={y + cell.h / 2 + 15} textAnchor="middle" fontSize="12" fontWeight="600" fill={COLOR.dim}>
            {strongMin + lightMin > 0 ? c.minutesShort(strongMin + lightMin) : c.legendShade}
          </text>
        )}
      </g>
    );
  });

  // Glass along the flanks, the windshield and the rear window: where light can come in.
  const glass = vehicle.windows.map((w) => {
    if (w.side === 'left' || w.side === 'right') {
      const sw = w as SideWindow;
      const gx = w.side === 'left' ? body.x : body.x + body.w;
      return <line key={w.id} x1={gx} y1={L.yOf(sw.yStart)} x2={gx} y2={L.yOf(sw.yEnd)} stroke={COLOR.glass} strokeWidth="4" strokeLinecap="round" />;
    }
    const ew = w as EndWindow;
    const gy = w.side === 'front' ? body.y + 6 : body.y + body.h - 6;
    return <line key={w.id} x1={L.xOf(ew.xStart)} y1={gy} x2={L.xOf(ew.xEnd)} y2={gy} stroke={COLOR.glass} strokeWidth="4" strokeLinecap="round" />;
  });

  // The driver sits in the first column of the front row.
  const dx = L.colX({ col: 0, row: 0 } as VehicleSeat);
  const dy = L.yOf(vehicle.driver.y);

  return (
    <svg
      className="plan-svg"
      viewBox={`${L.view.x} ${L.view.y} ${L.view.w} ${L.view.h}`}
      direction="ltr"
      role="group"
      aria-label={c.seatsLabel}
      data-testid="seat-plan"
      data-view={whole ? 'trip' : 'moment'}
    >
      {/* Side names, level above each flank */}
      <text x={body.x} y={body.y - 14} textAnchor="start" fontSize="13.5" fontWeight="700" fill={COLOR.number}>
        {c.sideDriver}
      </text>
      <text x={body.x + body.w} y={body.y - 14} textAnchor="end" fontSize="13.5" fontWeight="700" fill={COLOR.number}>
        {c.sideDoor}
      </text>

      {/* Body, floor and glass */}
      <rect x={body.x} y={body.y} width={body.w} height={body.h} rx={body.r} fill={COLOR.floor} stroke={COLOR.frame} strokeWidth="2" />
      {glass}
      {/* Sliding door */}
      {vehicle.type === 'microbus' && (
        <line x1={body.x + body.w + 7} y1={L.yOf(1.37)} x2={body.x + body.w + 7} y2={L.yOf(2.38)} stroke={COLOR.dim} strokeWidth="2" strokeDasharray="5 4" />
      )}

      {/* Driver */}
      <g aria-hidden="true">
        <rect x={dx - cell.w / 2} y={dy - cell.h / 2} width={cell.w} height={cell.h} rx={cell.r} fill="none" stroke={COLOR.frame} strokeWidth="1.5" strokeDasharray="4 4" />
        <circle cx={dx} cy={dy - cell.h * 0.12} r={cell.w * 0.16} fill="none" stroke={COLOR.dim} strokeWidth="2" />
        <text x={dx} y={dy + cell.h * 0.3} textAnchor="middle" fontSize={L.number.size * 0.62} fontWeight="600" fill={COLOR.dim}>
          {c.driver}
        </text>
      </g>

      {/* The end that takes the sun (whole trip only) */}
      {endSeats.length > 0 && (
        <rect
          x={Math.min(...endSeats.map((s) => L.colX(s))) - cell.w / 2 - 9}
          y={L.yOf(endSeats[0]!.position.y) - cell.h / 2 - 9}
          width={Math.max(...endSeats.map((s) => L.colX(s))) - Math.min(...endSeats.map((s) => L.colX(s))) + cell.w + 18}
          height={cell.h + 18 + (L.minutes ? 12 : 0)}
          rx={cell.r + 6}
          fill="none"
          stroke={COLOR.sun}
          strokeWidth="2"
          strokeDasharray="6 5"
          data-testid="end-advice-mark"
        />
      )}

      {seatNodes}

      {sunAngle !== null && <SunMarker angle={sunAngle} cx={cx} cy={cy} rx={body.w / 2 + 26} ry={body.h / 2 + 18} />}
    </svg>
  );
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
      {[-18, 0, 18].map((off) => {
        const x0 = sx + px * off - dx * 17;
        const y0 = sy + py * off - dy * 17;
        return <line key={off} x1={x0} y1={y0} x2={x0 - dx * 14} y2={y0 - dy * 14} stroke={COLOR.sun} strokeWidth="3" strokeLinecap="round" />;
      })}
      <path d={rhombus(sx, sy, 13)} fill={COLOR.sun} />
      <path d={rhombus(sx, sy, 5.5)} fill="#fff3d9" />
    </g>
  );
}

/** One line about the chosen seat, under the plan. */
export function SeatDetail({ vehicle, verdict, step, seatId, lang }: { vehicle: VehicleProfile; verdict: TripExposureVerdict; step: TimelineStep | null; seatId: number | null; lang: AppLanguage }) {
  const c = COPY[lang];
  const seat = vehicle.seats.find((s) => s.id === seatId);
  const live = useMemo(() => (step ? seatSunlightAtStep(vehicle, step) : null), [vehicle, step]);
  if (!seat) return null;
  const e = verdict.seatsExposure.find((x) => x.seatId === seat.id);
  let sub: ReactElement;
  if (live) {
    const f = live.get(seat.id) ?? 0;
    const kind = f >= STRONG_SUN ? 'strong' : f >= MILD_SUN ? 'light' : 'none';
    sub = <span className={kind === 'strong' ? 'is-strong' : kind === 'light' ? 'is-light' : undefined}>{c.seatNow[kind]}</span>;
  } else if (!e || e.strongMinutes + e.mildMinutes === 0) {
    sub = <span>{c.seatNoSun}</span>;
  } else {
    sub = (
      <>
        {e.strongMinutes > 0 && <span className="is-strong">{c.seatStrong(formatDuration(e.strongMinutes, lang))}</span>}
        {e.strongMinutes > 0 && e.mildMinutes > 0 && ' · '}
        {e.mildMinutes > 0 && <span className="is-light">{c.seatLight(formatDuration(e.mildMinutes, lang))}</span>}
      </>
    );
  }
  return (
    <div className="seat-detail" data-testid="seat-detail">
      <span className="seat-detail-num">{seat.id}</span>
      <span className="seat-detail-text">
        <span className="seat-detail-title">
          {lang === 'ar' ? seat.labelAr : seat.labelEn}
          {verdict.seatAdvice && verdict.bestSeatIds.includes(seat.id) ? ` · ${c.bestSeats}` : ''}
        </span>
        <span className="seat-detail-sub">{sub}</span>
      </span>
    </div>
  );
}

/** Legend swatches: the three states of a lattice opening. */
export function PlanLegend({ lang }: { lang: AppLanguage }) {
  const c = COPY[lang];
  const item = (fill: string, text: string) => (
    <span className="legend-item">
      <svg viewBox="0 0 12 12" aria-hidden="true">
        <path d={rhombus(6, 6, 5.5)} fill={fill} />
      </svg>
      {text}
    </span>
  );
  return (
    <div className="legend" aria-hidden="true">
      {item(COLOR.sun, c.legendStrong)}
      {item(COLOR.sunLight, c.legendLight)}
      {item('#3a6268', c.legendShade)}
    </div>
  );
}
