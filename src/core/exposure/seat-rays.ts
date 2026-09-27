import type { EndWindow, VehicleProfile, VehicleSeat, VehicleWindow } from '../types/vehicle.ts';
import { SEAT_SHAPE } from '../../../packages/egypt-microbus/src/spec.ts';

/**
 * Ray geometry inside the vehicle.
 *
 * Every passenger is three boxes (thighs, torso, head with neck) and six points on
 * the skin: lap, both shoulders, face, nape and upper back. From each point we cast
 * a ray towards the sun and ask where it leaves the cabin:
 *   through glass      -> that point is in direct sun (weakened by the glass at a slant)
 *   through the roof   -> shaded (this is why a high noon sun does not matter)
 *   through a panel    -> shaded
 *   through a person   -> shaded (microbuses leave full, so neighbors block; so does
 *                         your own body: your face shades your nape from a sun ahead)
 *   through a seat     -> shaded (backrests and headrests, at their real heights)
 *   under the dash     -> shaded (the front row's knees)
 * No thresholds or fudge factors: high sun, low sun, windshield glare, sun on your back
 * through the rear glass and middle-seat shelter all fall out of the same geometry the
 * 3D view draws.
 */

export { SEAT_SHAPE };

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

interface Box {
  x0: number;
  x1: number;
  y0: number;
  y1: number;
  z0: number;
  z1: number;
}

export type BodyPart = 'lap' | 'leftShoulder' | 'rightShoulder' | 'face' | 'nape' | 'upperBack';

interface SamplePoint extends Vec3 {
  part: BodyPart;
  weight: number;
  /** Pressed against the backrest: never in the sun. */
  covered: boolean;
}

export interface CabinModel {
  vehicle: VehicleProfile;
  halfWidthInner: number;
  seatSamples: Map<number, SamplePoint[]>;
  /** Everything that can stand between a point and the glass: people and seats. */
  blockers: Box[];
  leftWindows: VehicleWindow[];
  rightWindows: VehicleWindow[];
  frontWindows: EndWindow[];
  rearWindows: EndWindow[];
  /** The raked windshield, if the vehicle has one: its plane is the front boundary of the cabin. */
  rakedFront: (EndWindow & { rake: { yAtBottom: number; yAtTop: number } }) | null;
}

const DEFAULT_WALL_THICKNESS = 0.06;
const EPS = 1e-6;

/**
 * A seated adult, relative to the seat position (x across, y towards the rear, z above
 * the cushion top). Sizes are those of an average adult sitting upright.
 */
const BODY = {
  thighs: { x: 0.2, y0: -0.46, y1: -0.1, z0: 0, z1: 0.15 },
  torso: { x: 0.2, y0: -0.1, y1: 0.14, z0: 0, z1: 0.6 },
  head: { x: 0.09, y0: -0.1, y1: 0.08, z0: 0.6, z1: 0.86 }
} as const;

/** Skin points, each just outside the body box it belongs to, and the share of the body it stands for. */
const SAMPLES: { part: BodyPart; x: number; y: number; z: number; weight: number }[] = [
  { part: 'lap', x: 0, y: -0.28, z: 0.16, weight: 0.22 },
  { part: 'leftShoulder', x: -0.21, y: -0.02, z: 0.45, weight: 0.12 },
  { part: 'rightShoulder', x: 0.21, y: -0.02, z: 0.45, weight: 0.12 },
  { part: 'face', x: 0, y: -0.11, z: 0.74, weight: 0.2 },
  { part: 'nape', x: 0, y: 0.09, z: 0.64, weight: 0.16 },
  { part: 'upperBack', x: 0, y: 0.145, z: 0.5, weight: 0.18 }
];

function backHeightOf(seat: Pick<VehicleSeat, 'isJump' | 'backHeight'>): number {
  return seat.backHeight ?? (seat.isJump ? SEAT_SHAPE.jumpBack.height : SEAT_SHAPE.back.height);
}

function hasHeadrest(seat: Pick<VehicleSeat, 'isJump' | 'hasHeadrest'>): boolean {
  return seat.hasHeadrest ?? !seat.isJump;
}

function samplePointsFor(seat: VehicleSeat): SamplePoint[] {
  const { x, y, z } = seat.position;
  const back = backHeightOf(seat);
  return SAMPLES.map((s) => ({
    part: s.part,
    x: x + s.x,
    y: y + s.y,
    z: z + s.z,
    weight: s.weight,
    // The upper back rests against the backrest whenever the backrest reaches it.
    covered: s.part === 'upperBack' && back >= s.z + 0.02
  }));
}

function bodyBoxes(p: Vec3): Box[] {
  return Object.values(BODY).map((b) => ({
    x0: p.x - b.x,
    x1: p.x + b.x,
    y0: p.y + b.y0,
    y1: p.y + b.y1,
    z0: p.z + b.z0,
    z1: p.z + b.z1
  }));
}

/** Backrest and, where fitted, headrest: the same boxes the 3D seats are built from. */
export function seatShadeBoxes(seat: Pick<VehicleSeat, 'position' | 'isJump' | 'backHeight' | 'hasHeadrest'>): Box[] {
  const { x, y, z } = seat.position;
  const hw = (seat.isJump ? SEAT_SHAPE.jumpBack.width : SEAT_SHAPE.back.width) / 2;
  const boxes: Box[] = [{ x0: x - hw, x1: x + hw, y0: y + SEAT_SHAPE.back.y0, y1: y + SEAT_SHAPE.back.y1, z0: z, z1: z + backHeightOf(seat) }];
  if (hasHeadrest(seat)) {
    const h = SEAT_SHAPE.headrest;
    boxes.push({ x0: x - h.width / 2, x1: x + h.width / 2, y0: y + h.y0, y1: y + h.y1, z0: z + h.z0, z1: z + h.z1 });
  }
  return boxes;
}

function isEnd(w: VehicleWindow): w is EndWindow {
  return w.side === 'front' || w.side === 'rear';
}

export function buildCabinModel(vehicle: VehicleProfile): CabinModel {
  const seatSamples = new Map<number, SamplePoint[]>();
  for (const seat of vehicle.seats) seatSamples.set(seat.id, samplePointsFor(seat));
  const frontWindows = vehicle.windows.filter((w): w is EndWindow => isEnd(w) && w.side === 'front');
  const raked = frontWindows.find((w) => w.rake);
  const halfWidthInner = vehicle.dimensions.widthM / 2 - (vehicle.dimensions.wallThicknessM ?? DEFAULT_WALL_THICKNESS);
  const dash = vehicle.dashboard;

  return {
    vehicle,
    halfWidthInner,
    seatSamples,
    blockers: [
      ...bodyBoxes(vehicle.driver),
      ...vehicle.seats.flatMap((s) => bodyBoxes(s.position)),
      ...seatShadeBoxes({ position: vehicle.driver }),
      ...vehicle.seats.flatMap(seatShadeBoxes),
      ...(dash ? [{ x0: -halfWidthInner, x1: halfWidthInner, y0: dash.yStart, y1: dash.yEnd, z0: vehicle.dimensions.floorZ, z1: dash.zTop }] : [])
    ],
    leftWindows: vehicle.windows.filter((w) => w.side === 'left'),
    rightWindows: vehicle.windows.filter((w) => w.side === 'right'),
    frontWindows,
    rearWindows: vehicle.windows.filter((w): w is EndWindow => isEnd(w) && w.side === 'rear'),
    rakedFront: raked?.rake ? (raked as CabinModel['rakedFront']) : null
  };
}

/**
 * Converts the engine's sun vector (ux right, uy ahead, uz up) into the vehicle
 * frame, where y grows towards the rear.
 */
export function toVehicleFrame(ux: number, uy: number, uz: number): Vec3 {
  return { x: ux, y: -uy, z: uz };
}

/** Slab test: does the segment P + t*d, t in (0, tMax), pass through the box? */
function rayHitsBox(p: Vec3, d: Vec3, tMax: number, b: Box): boolean {
  let t0 = 1e-4;
  let t1 = tMax;

  if (Math.abs(d.x) < EPS) {
    if (p.x < b.x0 || p.x > b.x1) return false;
  } else {
    let a = (b.x0 - p.x) / d.x;
    let c = (b.x1 - p.x) / d.x;
    if (a > c) [a, c] = [c, a];
    t0 = Math.max(t0, a);
    t1 = Math.min(t1, c);
    if (t0 > t1) return false;
  }
  if (Math.abs(d.y) < EPS) {
    if (p.y < b.y0 || p.y > b.y1) return false;
  } else {
    let a = (b.y0 - p.y) / d.y;
    let c = (b.y1 - p.y) / d.y;
    if (a > c) [a, c] = [c, a];
    t0 = Math.max(t0, a);
    t1 = Math.min(t1, c);
    if (t0 > t1) return false;
  }
  if (Math.abs(d.z) < EPS) {
    if (p.z < b.z0 || p.z > b.z1) return false;
  } else {
    let a = (b.z0 - p.z) / d.z;
    let c = (b.z1 - p.z) / d.z;
    if (a > c) [a, c] = [c, a];
    t0 = Math.max(t0, a);
    t1 = Math.min(t1, c);
    if (t0 > t1) return false;
  }
  return true;
}

/** Fresnel (Schlick) transmission through two glass surfaces, normalized to 1 at normal incidence. */
function glassTransmission(cosIncidence: number): number {
  const r0 = 0.04;
  const r = r0 + (1 - r0) * Math.pow(1 - Math.min(1, Math.max(0, cosIncidence)), 5);
  const t = 1 - r;
  return (t * t) / ((1 - r0) * (1 - r0));
}

function insideSide(w: VehicleWindow, y: number, z: number): boolean {
  return 'yStart' in w && y >= w.yStart && y <= w.yEnd && z >= w.zBottom && z <= w.zTop;
}

function insideEnd(w: EndWindow, x: number, z: number): boolean {
  return x >= w.xStart && x <= w.xEnd && z >= w.zBottom && z <= w.zTop;
}

/**
 * Light reaching one point on the skin, 0 (shaded) to 1 (full sun through clear glass
 * at normal incidence). `d` must point from the cabin towards the sun.
 */
export function pointSunlight(cabin: CabinModel, p: Vec3, d: Vec3): number {
  if (d.z <= 0) return 0;
  const { dimensions } = cabin.vehicle;
  const hw = cabin.halfWidthInner;

  let tSide = Infinity;
  if (d.x > EPS) tSide = (hw - p.x) / d.x;
  else if (d.x < -EPS) tSide = (-hw - p.x) / d.x;

  // Front boundary: the plane of a raked windshield, or the upright front wall.
  let tFront = Infinity;
  let frontSlope = 0;
  const raked = cabin.rakedFront;
  if (raked) {
    // Glass plane: y = yAtBottom + (z - zBottom) * k.
    frontSlope = (raked.rake.yAtTop - raked.rake.yAtBottom) / (raked.zTop - raked.zBottom);
    const denom = d.y - frontSlope * d.z;
    if (denom < -EPS) tFront = (raked.rake.yAtBottom + (p.z - raked.zBottom) * frontSlope - p.y) / denom;
  } else if (d.y < -EPS) {
    tFront = (dimensions.frontWallY - p.y) / d.y;
  }
  const tRear = d.y > EPS ? (dimensions.rearWallY - p.y) / d.y : Infinity;
  const tRoof = (dimensions.roofInnerZ - p.z) / d.z;
  const tExit = Math.min(tSide, tFront, tRear, tRoof);
  if (!(tExit > 0) || tExit === tRoof) return 0;

  const ex = p.x + tExit * d.x;
  const ey = p.y + tExit * d.y;
  const ez = p.z + tExit * d.z;

  let transmission = 0;
  if (tExit === tSide) {
    const windows = d.x > 0 ? cabin.rightWindows : cabin.leftWindows;
    if (!windows.some((w) => insideSide(w, ey, ez))) return 0;
    transmission = glassTransmission(Math.abs(d.x));
  } else if (tExit === tFront) {
    if (!cabin.frontWindows.some((w) => insideEnd(w, ex, ez))) return 0;
    // Normal of the (possibly raked) glass: (0, 1, -k) normalized.
    transmission = glassTransmission(Math.abs(d.y - frontSlope * d.z) / Math.hypot(1, frontSlope));
  } else {
    if (!cabin.rearWindows.some((w) => insideEnd(w, ex, ez))) return 0;
    transmission = glassTransmission(Math.abs(d.y));
  }

  // Cheap bounds of the ray inside the cabin, to skip boxes it cannot touch.
  const minX = Math.min(p.x, ex);
  const maxX = Math.max(p.x, ex);
  const minY = Math.min(p.y, ey);
  const maxY = Math.max(p.y, ey);
  const maxZ = Math.max(p.z, ez);

  for (const b of cabin.blockers) {
    if (b.x1 < minX || b.x0 > maxX || b.y1 < minY || b.y0 > maxY || b.z1 < p.z || b.z0 > maxZ) continue;
    if (rayHitsBox(p, d, tExit, b)) return 0;
  }
  return transmission;
}

/**
 * Near the horizon, buildings, trees and haze absorb most direct light.
 * Ramp from 0 at the horizon to full strength at 4 degrees.
 */
export function horizonFactor(elevationDeg: number): number {
  if (elevationDeg <= 0) return 0;
  return Math.min(1, elevationDeg / 4);
}

/** Share of one passenger's body in direct sun right now, 0 to 1. */
export function seatSunlight(cabin: CabinModel, seatId: number, d: Vec3, elevationDeg: number): number {
  const ramp = horizonFactor(elevationDeg);
  if (ramp === 0) return 0;
  const samples = cabin.seatSamples.get(seatId);
  if (!samples) return 0;
  let lit = 0;
  for (const s of samples) {
    if (!s.covered) lit += s.weight * pointSunlight(cabin, s, d);
  }
  return Math.min(1, lit * ramp);
}

/** Which body parts of one passenger are in direct sun right now (for explanations). */
export function litBodyParts(cabin: CabinModel, seatId: number, d: Vec3, elevationDeg: number): BodyPart[] {
  if (horizonFactor(elevationDeg) === 0) return [];
  return (cabin.seatSamples.get(seatId) ?? []).filter((s) => !s.covered && pointSunlight(cabin, s, d) > 0.2).map((s) => s.part);
}
