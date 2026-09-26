import type { VehicleProfile, VehicleSeat, VehicleWindow } from '../types/vehicle.ts';

/**
 * Ray geometry inside the vehicle.
 *
 * For every passenger we cast rays from a few body points (lap, both shoulders,
 * head) towards the sun and ask where each ray leaves the cabin:
 *   through glass      -> that body point is in direct sun
 *   through the roof   -> shaded (this is why a high noon sun does not matter)
 *   through a panel    -> shaded
 *   through a person   -> shaded (microbuses leave full, so neighbors block)
 * No thresholds or fudge factors: high sun, low sun, windshield glare and
 * middle-seat shelter all fall out of the same geometry the 3D view draws.
 */

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
  /** Seat id of the passenger this box belongs to, 0 for the driver, -1 for seatbacks. */
  owner: number;
}

interface SamplePoint extends Vec3 {
  weight: number;
}

export interface CabinModel {
  vehicle: VehicleProfile;
  halfWidthInner: number;
  seatSamples: Map<number, SamplePoint[]>;
  occupants: Box[];
  seatbacks: Box[];
  leftWindows: VehicleWindow[];
  rightWindows: VehicleWindow[];
  frontWindows: VehicleWindow[];
  rearWindows: VehicleWindow[];
}

const WALL_THICKNESS = 0.06;
const EPS = 1e-6;

function samplePointsFor(seat: VehicleSeat): SamplePoint[] {
  const { x, y, z } = seat.position;
  return [
    { x, y: y - 0.22, z: z + 0.12, weight: 0.3 }, // lap and thighs
    { x: x - 0.14, y: y - 0.02, z: z + 0.45, weight: 0.2 }, // left shoulder and arm
    { x: x + 0.14, y: y - 0.02, z: z + 0.45, weight: 0.2 }, // right shoulder and arm
    { x, y: y + 0.02, z: z + 0.72, weight: 0.3 } // head and face
  ];
}

function occupantBox(x: number, y: number, z: number, owner: number): Box {
  return { x0: x - 0.21, x1: x + 0.21, y0: y - 0.32, y1: y + 0.14, z0: z, z1: z + 0.82, owner };
}

function seatbackBox(seat: VehicleSeat): Box {
  const { x, y, z } = seat.position;
  return { x0: x - 0.24, x1: x + 0.24, y0: y + 0.14, y1: y + 0.24, z0: z, z1: z + 0.7, owner: -1 };
}

export function buildCabinModel(vehicle: VehicleProfile): CabinModel {
  const seatSamples = new Map<number, SamplePoint[]>();
  for (const seat of vehicle.seats) seatSamples.set(seat.id, samplePointsFor(seat));

  return {
    vehicle,
    halfWidthInner: vehicle.dimensions.widthM / 2 - WALL_THICKNESS,
    seatSamples,
    occupants: [
      occupantBox(vehicle.driver.x, vehicle.driver.y, vehicle.driver.z, 0),
      ...vehicle.seats.map((s) => occupantBox(s.position.x, s.position.y, s.position.z, s.id))
    ],
    seatbacks: vehicle.seats.map(seatbackBox),
    leftWindows: vehicle.windows.filter((w) => w.side === 'left'),
    rightWindows: vehicle.windows.filter((w) => w.side === 'right'),
    frontWindows: vehicle.windows.filter((w) => w.side === 'front'),
    rearWindows: vehicle.windows.filter((w) => w.side === 'rear')
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

function insideEnd(w: VehicleWindow, x: number, z: number): boolean {
  return 'xStart' in w && x >= w.xStart && x <= w.xEnd && z >= w.zBottom && z <= w.zTop;
}

/**
 * Light reaching one body point, 0 (shaded) to 1 (full sun through clear glass
 * at normal incidence). `d` must point from the cabin towards the sun.
 */
export function pointSunlight(cabin: CabinModel, p: Vec3, d: Vec3, selfSeatId: number): number {
  if (d.z <= 0) return 0;
  const { dimensions } = cabin.vehicle;
  const hw = cabin.halfWidthInner;

  let tSide = Infinity;
  if (d.x > EPS) tSide = (hw - p.x) / d.x;
  else if (d.x < -EPS) tSide = (-hw - p.x) / d.x;

  let tEnd = Infinity;
  if (d.y < -EPS) tEnd = (dimensions.frontWallY - p.y) / d.y;
  else if (d.y > EPS) tEnd = (dimensions.rearWallY - p.y) / d.y;

  const tRoof = (dimensions.roofInnerZ - p.z) / d.z;
  const tExit = Math.min(tSide, tEnd, tRoof);
  if (!(tExit > 0) || tExit === tRoof) return 0;

  const ex = p.x + tExit * d.x;
  const ey = p.y + tExit * d.y;
  const ez = p.z + tExit * d.z;

  let transmission = 0;
  if (tExit === tSide) {
    const windows = d.x > 0 ? cabin.rightWindows : cabin.leftWindows;
    if (!windows.some((w) => insideSide(w, ey, ez))) return 0;
    transmission = glassTransmission(Math.abs(d.x));
  } else {
    const windows = d.y < 0 ? cabin.frontWindows : cabin.rearWindows;
    if (!windows.some((w) => insideEnd(w, ex, ez))) return 0;
    transmission = glassTransmission(Math.abs(d.y));
  }

  // Cheap bounds of the ray inside the cabin, to skip boxes it cannot touch.
  const minX = Math.min(p.x, ex);
  const maxX = Math.max(p.x, ex);
  const minY = Math.min(p.y, ey);
  const maxY = Math.max(p.y, ey);

  for (const b of cabin.occupants) {
    if (b.owner === selfSeatId) continue;
    if (b.x1 < minX || b.x0 > maxX || b.y1 < minY || b.y0 > maxY) continue;
    if (rayHitsBox(p, d, tExit, b)) return 0;
  }
  for (const b of cabin.seatbacks) {
    if (b.x1 < minX || b.x0 > maxX || b.y1 < minY || b.y0 > maxY) continue;
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
    lit += s.weight * pointSunlight(cabin, s, d, seatId);
  }
  return Math.min(1, lit * ramp);
}
