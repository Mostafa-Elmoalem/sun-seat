import type { ProcessedRoute } from '../types/routes.ts';
import type {
  VehicleProfile,
  TripExposureVerdict,
  SeatExposure,
  TimelineStep,
  TripSensitivityResult,
  ConfidenceLevel,
  EndAdvice,
  Side,
  SunDirection,
  SunSpan
} from '../types/vehicle.ts';
import { calculateSunPosition } from '../astronomy/noaa-solar.ts';
import { formatCairoTime } from '../astronomy/timezone.ts';
import { buildCabinModel, seatSunlight, toVehicleFrame, type CabinModel } from './seat-rays.ts';
import { classifyVerdict } from './honest-rules.ts';

/** At most this many simulation steps per trip; long trips use 2+ minute steps. */
const MAX_STEPS = 300;

/**
 * Share of the body in direct sun (after the glass) from which a rider notices it:
 * about one shoulder, or the lap through glass at a slant.
 */
export const MILD_SUN = 0.08;
/** From here it is proper sun: the face and a shoulder, the back and a shoulder, or more. */
export const STRONG_SUN = 0.25;
/**
 * In the seat ranking, each minute of noticeable sun counts this much on top of its dose,
 * so a seat that stays lightly lit for a long time never beats a seat that stays in shade.
 */
const DURATION_WEIGHT = 0.25;

interface Point {
  lat: number;
  lng: number;
}

function interpolateRoutePosition(route: ProcessedRoute, dKm: number): { location: Point; headingDeg: number } {
  const segs = route.segments;
  if (segs.length === 0) return { location: { lat: 30.0444, lng: 31.2357 }, headingDeg: 0 };

  let acc = 0;
  for (let i = 0; i < segs.length; i++) {
    const seg = segs[i]!;
    if (acc + seg.distanceKm >= dKm || i === segs.length - 1) {
      const f = seg.distanceKm > 0 ? Math.min(1, Math.max(0, (dKm - acc) / seg.distanceKm)) : 0;
      return {
        location: {
          lat: seg.startLat + f * (seg.endLat - seg.startLat),
          lng: seg.startLng + f * (seg.endLng - seg.startLng)
        },
        headingDeg: seg.bearingDeg
      };
    }
    acc += seg.distanceKm;
  }
  const last = segs[segs.length - 1]!;
  return { location: { lat: last.endLat, lng: last.endLng }, headingDeg: last.bearingDeg };
}

/**
 * Sun direction relative to the vehicle:
 *   ux: + right / - left, uy: + ahead / - behind, uz: + up
 */
export function calculateSunVector(solarAzimuthDeg: number, solarElevationDeg: number, vehicleHeadingDeg: number) {
  const relativeAngleDeg = (((solarAzimuthDeg - vehicleHeadingDeg) % 360) + 360) % 360;
  const alt = (solarElevationDeg * Math.PI) / 180;
  const rel = (relativeAngleDeg * Math.PI) / 180;
  return {
    relativeAngleDeg,
    ux: Math.cos(alt) * Math.sin(rel),
    uy: Math.cos(alt) * Math.cos(rel),
    uz: Math.sin(alt)
  };
}

export function classifySunDirection(relativeAngleDeg: number, elevationDeg: number): SunDirection {
  if (elevationDeg <= 0) return 'none';
  if (elevationDeg >= 72) return 'overhead';
  if (relativeAngleDeg >= 340 || relativeAngleDeg < 20) return 'front';
  if (relativeAngleDeg >= 160 && relativeAngleDeg < 200) return 'rear';
  return relativeAngleDeg < 180 ? 'right' : 'left';
}

/** Circular mean of angles in degrees, optionally weighted. Returns [0, 360). */
export function circularMeanDeg(angles: number[], weights?: number[]): number {
  let sx = 0;
  let sy = 0;
  angles.forEach((a, i) => {
    const w = weights ? weights[i] ?? 0 : 1;
    sx += w * Math.cos((a * Math.PI) / 180);
    sy += w * Math.sin((a * Math.PI) / 180);
  });
  const deg = (Math.atan2(sy, sx) * 180) / Math.PI;
  return (deg + 360) % 360;
}

const cabinCache = new WeakMap<VehicleProfile, CabinModel>();
export function getCabin(vehicle: VehicleProfile): CabinModel {
  let cabin = cabinCache.get(vehicle);
  if (!cabin) {
    cabin = buildCabinModel(vehicle);
    cabinCache.set(vehicle, cabin);
  }
  return cabin;
}

/** Per-seat share of the body in direct sun at one timeline step (0 to 1). */
export function seatSunlightAtStep(vehicle: VehicleProfile, step: TimelineStep): Map<number, number> {
  const out = new Map<number, number>();
  const cabin = getCabin(vehicle);
  const { ux, uy, uz } = calculateSunVector(step.solarAzimuthDeg, step.solarElevationDeg, step.headingDeg);
  const d = toVehicleFrame(ux, uy, uz);
  for (const seat of vehicle.seats) {
    out.set(seat.id, seatSunlight(cabin, seat.id, d, step.solarElevationDeg));
  }
  return out;
}

interface PassResult {
  tripMinutes: number;
  timeline: TimelineStep[];
  seatSunMinutes: Map<number, number>;
  seatStrongMinutes: Map<number, number>;
  seatMildMinutes: Map<number, number>;
  daylightMinutes: number;
  leftSunMinutes: number;
  rightSunMinutes: number;
}

function tripMinutesFor(route: ProcessedRoute, vehicle: VehicleProfile, speedMultiplier: number): number {
  return Math.max(1, Math.round(route.totalDurationMin * vehicle.speedFactor * speedMultiplier) + vehicle.stopOverheadMin);
}

function runPass(
  route: ProcessedRoute,
  departure: Date,
  vehicle: VehicleProfile,
  speedMultiplier: number,
  withTimeline: boolean
): PassResult {
  const tripMinutes = tripMinutesFor(route, vehicle, speedMultiplier);
  const stepMin = Math.max(1, Math.ceil(tripMinutes / MAX_STEPS));
  const cabin = getCabin(vehicle);
  const seatSunMinutes = new Map<number, number>(vehicle.seats.map((s) => [s.id, 0]));
  const seatStrongMinutes = new Map<number, number>(vehicle.seats.map((s) => [s.id, 0]));
  const seatMildMinutes = new Map<number, number>(vehicle.seats.map((s) => [s.id, 0]));
  const timeline: TimelineStep[] = [];
  let daylightMinutes = 0;

  // Each mark stands for the interval [m, next mark); the arrival mark only closes the timeline.
  const marks: number[] = [];
  for (let m = 0; m < tripMinutes; m += stepMin) marks.push(m);
  marks.push(tripMinutes);

  for (let i = 0; i < marks.length; i++) {
    const m = marks[i]!;
    const weight = i < marks.length - 1 ? marks[i + 1]! - m : 0;
    const progress = m / tripMinutes;
    const { location, headingDeg } = interpolateRoutePosition(route, route.totalDistanceKm * progress);
    const time = new Date(departure.getTime() + m * 60_000);
    const sun = calculateSunPosition(location.lat, location.lng, time);
    const { relativeAngleDeg, ux, uy, uz } = calculateSunVector(sun.azimuth, sun.elevation, headingDeg);

    if (sun.elevation > 0 && weight > 0) {
      daylightMinutes += weight;
      const d = toVehicleFrame(ux, uy, uz);
      for (const seat of vehicle.seats) {
        const lit = seatSunlight(cabin, seat.id, d, sun.elevation);
        if (lit > 0) seatSunMinutes.set(seat.id, seatSunMinutes.get(seat.id)! + lit * weight);
        if (lit >= STRONG_SUN) seatStrongMinutes.set(seat.id, seatStrongMinutes.get(seat.id)! + weight);
        else if (lit >= MILD_SUN) seatMildMinutes.set(seat.id, seatMildMinutes.get(seat.id)! + weight);
      }
    }

    if (withTimeline) {
      timeline.push({
        minuteOffset: m,
        timeMs: time.getTime(),
        timeCairoFormatted: formatCairoTime(time, 'time'),
        location,
        headingDeg: Math.round(headingDeg),
        solarAzimuthDeg: Math.round(sun.azimuth * 10) / 10,
        solarElevationDeg: Math.round(sun.elevation * 10) / 10,
        relativeAngleDeg: Math.round(relativeAngleDeg),
        sunSide: classifySunDirection(relativeAngleDeg, sun.elevation),
        isNight: sun.elevation <= 0,
        progress
      });
    }
  }

  const windowAvg = (side: Side) => {
    const seats = vehicle.seats.filter((s) => s.isWindow && s.side === side);
    if (seats.length === 0) return 0;
    return seats.reduce((acc, s) => acc + seatSunMinutes.get(s.id)!, 0) / seats.length;
  };

  return {
    tripMinutes,
    timeline,
    seatSunMinutes,
    seatStrongMinutes,
    seatMildMinutes,
    daylightMinutes,
    leftSunMinutes: windowAvg('left'),
    rightSunMinutes: windowAvg('right')
  };
}

/** Groups the timeline into stretches where the sun stays on one side; blips under 4 minutes are absorbed. */
export function buildSunSpans(timeline: TimelineStep[]): SunSpan[] {
  const spans: SunSpan[] = [];
  for (const step of timeline) {
    const last = spans[spans.length - 1];
    if (last && last.side === step.sunSide) {
      last.endMinute = step.minuteOffset;
    } else {
      spans.push({ side: step.sunSide, startMinute: step.minuteOffset, endMinute: step.minuteOffset });
    }
  }
  const merged: SunSpan[] = [];
  for (const span of spans) {
    const prev = merged[merged.length - 1];
    if (prev && span.endMinute - span.startMinute < 4 && span.side !== 'none') {
      prev.endMinute = span.endMinute;
    } else if (prev && prev.side === span.side) {
      prev.endMinute = span.endMinute;
    } else {
      merged.push({ ...span });
    }
  }
  return merged;
}

const SCENARIOS = [
  { key: 'early', deltaMin: -30, speed: 1 },
  { key: 'late', deltaMin: 30, speed: 1 },
  { key: 'slow', deltaMin: 0, speed: 1.25 },
  { key: 'fast', deltaMin: 0, speed: 0.8 }
] as const;

export function analyzeTripSensitivity(
  route: ProcessedRoute,
  departure: Date,
  vehicle: VehicleProfile,
  baselineSide: Side | 'either'
): TripSensitivityResult {
  const scenarios = SCENARIOS.map((sc) => {
    const pass = runPass(route, new Date(departure.getTime() + sc.deltaMin * 60_000), vehicle, sc.speed, false);
    const decision = classifyVerdict({
      leftSunMinutes: pass.leftSunMinutes,
      rightSunMinutes: pass.rightSunMinutes,
      tripMinutes: pass.tripMinutes,
      daylightMinutes: pass.daylightMinutes
    });
    return {
      key: sc.key,
      leftSunMinutes: Math.round(pass.leftSunMinutes),
      rightSunMinutes: Math.round(pass.rightSunMinutes),
      recommendedSide: decision.recommendedSide
    };
  });

  const agree = scenarios.filter((s) => s.recommendedSide === baselineSide).length;
  const confidence: ConfidenceLevel = agree === 4 ? 'HIGH' : agree >= 3 ? 'MEDIUM' : 'LOW';
  return { confidence, verdictStable: agree >= 3, scenarios };
}

/** Ranking score per seat: the sun dose plus a share of every minute the sun is noticeable. */
function seatScores(vehicle: VehicleProfile, pass: PassResult): Map<number, number> {
  return new Map(
    vehicle.seats.map((s) => [
      s.id,
      pass.seatSunMinutes.get(s.id)! + DURATION_WEIGHT * (pass.seatStrongMinutes.get(s.id)! + pass.seatMildMinutes.get(s.id)!)
    ])
  );
}

/**
 * Seats from best to worst. The score is rounded to whole minutes once, then compared
 * exactly, so the order is transitive; ties go to window seats, then the recommended side,
 * then the front, then the seat number.
 */
export function rankSeats(vehicle: VehicleProfile, score: Map<number, number>, recommendedSide: Side | 'either'): number[] {
  const key = (s: VehicleProfile['seats'][number]) => [
    Math.round(score.get(s.id) ?? 0),
    s.isWindow ? 0 : 1,
    s.side === recommendedSide ? 0 : 1,
    s.row,
    s.id
  ];
  return [...vehicle.seats]
    .map((s) => ({ id: s.id, k: key(s) }))
    .sort((a, b) => {
      for (let i = 0; i < a.k.length; i++) if (a.k[i] !== b.k[i]) return a.k[i]! - b.k[i]!;
      return 0;
    })
    .map((s) => s.id);
}

/** Does one end of the vehicle take clearly more sun than the rows in between? */
export function endAdviceFor(vehicle: VehicleProfile, score: Map<number, number>, tripMinutes: number): EndAdvice {
  const rows = vehicle.seats.map((s) => s.row);
  const first = Math.min(...rows);
  const last = Math.max(...rows);
  const avg = (keep: (row: number) => boolean) => {
    const list = vehicle.seats.filter((s) => keep(s.row)).map((s) => score.get(s.id) ?? 0);
    return list.length ? list.reduce((a, b) => a + b, 0) / list.length : 0;
  };
  const middle = avg((r) => r !== first && r !== last);
  const back = avg((r) => r === last) - middle;
  const front = avg((r) => r === first) - middle;
  const threshold = Math.max(5, 0.1 * tripMinutes);
  if (back >= threshold && back >= front) return 'avoid-back';
  if (front >= threshold) return 'avoid-front';
  return null;
}

export function calculateTripExposure(
  route: ProcessedRoute,
  departure: Date,
  vehicle: VehicleProfile
): TripExposureVerdict {
  const base = runPass(route, departure, vehicle, 1, true);
  const { tripMinutes, timeline, seatSunMinutes } = base;

  const decision = classifyVerdict({
    leftSunMinutes: base.leftSunMinutes,
    rightSunMinutes: base.rightSunMinutes,
    tripMinutes,
    daylightMinutes: base.daylightMinutes
  });

  const seatsExposure: SeatExposure[] = vehicle.seats.map((s) => {
    const sunMinutes = Math.round(seatSunMinutes.get(s.id)!);
    const strongMinutes = Math.round(base.seatStrongMinutes.get(s.id)!);
    const mildMinutes = Math.round(base.seatMildMinutes.get(s.id)!);
    return {
      seatId: s.id,
      sunMinutes,
      strongMinutes,
      mildMinutes,
      shadePercentage: Math.round(100 * Math.max(0, 1 - (strongMinutes + mildMinutes) / tripMinutes)),
      side: s.side,
      isWindow: s.isWindow
    };
  });

  const score = seatScores(vehicle, base);
  const ranked = rankSeats(vehicle, score, decision.recommendedSide);
  const spread = Math.max(...score.values()) - Math.min(...score.values());
  const seatAdvice =
    decision.status === 'CLEAR' || decision.status === 'LEANING' || (decision.status !== 'NIGHT' && spread >= Math.max(3, 0.08 * tripMinutes));

  const sensitivity =
    decision.status === 'NIGHT'
      ? { confidence: 'HIGH' as const, verdictStable: true, scenarios: [] }
      : analyzeTripSensitivity(route, departure, vehicle, decision.recommendedSide);

  const dayRows = timeline.filter((t) => !t.isNight);
  const shade = (sunMinutes: number) => Math.round(100 * Math.max(0, 1 - sunMinutes / tripMinutes));

  return {
    status: decision.status,
    recommendedSide: decision.recommendedSide,
    endAdvice: decision.status === 'NIGHT' ? null : endAdviceFor(vehicle, score, tripMinutes),
    seatAdvice,
    bestSeatIds: ranked.slice(0, 3),
    worstSeatIds: ranked.slice(-3).reverse(),
    sides: {
      leftSunMinutes: Math.round(base.leftSunMinutes),
      rightSunMinutes: Math.round(base.rightSunMinutes),
      leftShade: shade(base.leftSunMinutes),
      rightShade: shade(base.rightSunMinutes)
    },
    seatsExposure,
    timeline,
    spans: buildSunSpans(timeline),
    sensitivity,
    tripMinutes,
    meanHeadingDeg: Math.round(circularMeanDeg(timeline.map((t) => t.headingDeg))),
    meanSunAzimuthDeg: dayRows.length > 0 ? Math.round(circularMeanDeg(dayRows.map((t) => t.solarAzimuthDeg))) : null
  };
}
