/**
 * Egyptian 14-seat microbus: geometry as plain data.
 *
 * This file has NO three.js import on purpose, so any engine (for example a
 * sun-exposure calculator) can read the exact same numbers the 3D model is built
 * from, without pulling a renderer into its bundle.
 *
 * Vehicle frame, in meters:
 *   x: lateral, 0 on the centerline, negative = LEFT (driver side), positive = RIGHT (door side)
 *   y: longitudinal, 0 at the front bumper, increasing towards the rear
 *   z: height above the ground
 *
 * The vehicle: the Chinese Toyota HiAce H100 family that fills Egyptian microbus
 * terminals (King Long / Golden Dragon, Jinbei Haise, Foton View), standard roof,
 * left-hand drive, one sliding door on the right.
 *  - Overall size and wheelbase: Golden Dragon 14-seat spec sheet (4,980 x 1,700 x 1,970 mm,
 *    wheelbase 2,590 mm).
 *  - Side silhouette, front and rear profile: measured from the vertices of "Toyota Hiace 1995"
 *    by elenaisakova248 (Sketchfab, CC BY 4.0), a hand-made H100 with correct proportions, then
 *    lengthened by 0.51 m between the front doors and the rear axle to the 4.98 m body.
 *  - Seat layout: confirmed by the product owner (2 up front, 3 benches of 3 with a folding
 *    jump seat on the door side, a back bench of 3). The back bench sits against the rear
 *    door and its short backrest ends about at the bottom edge of the rear glass, with no
 *    headrests, so riders there lean their shoulders on the door (owner, September 2026).
 *    The three benches in front of it are spaced evenly between the front row and the back bench.
 */

export type Side = 'left' | 'right';

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

/** Glass in a side wall: a y range and a z range on the plane x = +-width/2. */
export interface SideWindowSpec {
  id: string;
  side: Side;
  yStart: number;
  yEnd: number;
  zBottom: number;
  zTop: number;
}

/**
 * Windshield or rear glass: an x range and a z range. A raked windshield also
 * gives the y of the glass at its bottom and top edge; the glass is the plane
 * through those two lines.
 */
export interface EndWindowSpec {
  id: string;
  side: 'front' | 'rear';
  xStart: number;
  xEnd: number;
  zBottom: number;
  zTop: number;
  rake?: { yAtBottom: number; yAtTop: number };
}

export type WindowSpec = SideWindowSpec | EndWindowSpec;

export interface SeatSpec {
  /** 1 to 14 for passengers. */
  id: number;
  row: number;
  col: number;
  side: Side | 'middle';
  isWindow: boolean;
  /** Folding jump seat beside the aisle on the door side (short back, no headrest). */
  isJump: boolean;
  /** A grab rail across the top back of this seat, for the row behind. */
  hasRail: boolean;
  /** Height of the top of the backrest above the cushion top. */
  backHeight: number;
  hasHeadrest: boolean;
  /** x, y: center of the seat; z: height of the TOP of the cushion. */
  position: Vec3;
}

export interface MicrobusSpec {
  id: string;
  dimensions: {
    lengthM: number;
    widthM: number;
    heightM: number;
    /** Cabin floor height above the ground. */
    floorZ: number;
    /** Underside of the roof inside the cabin. */
    roofInnerZ: number;
    /** y of the front bulkhead for anything that is not the (raked) windshield. */
    frontWallY: number;
    /** y of the rear glass plane. */
    rearWallY: number;
  };
  body: {
    /** Side silhouette, clockwise from the underbody at the front, as [y, z] points. */
    sideProfile: [number, number][];
    /** Indices of sideProfile points kept sharp when the outline is smoothed. */
    creases: number[];
    /** Radius of the rounded edges between the flanks and the roof, nose and tail. */
    edgeRadius: number;
    /** Thickness of the body shell walls. */
    wallThickness: number;
    /** Top of the skirt painted in the livery color. */
    skirtTopZ: number;
    /** Belt line: bottom edge of the side glass. */
    beltZ: number;
  };
  wheels: {
    frontAxleY: number;
    rearAxleY: number;
    radius: number;
    width: number;
    /** Distance from the centerline to the middle of each tire. */
    halfTrack: number;
    archRadius: number;
  };
  doors: {
    front: { yStart: number; yEnd: number };
    sliding: { side: Side; yStart: number; yEnd: number };
  };
  driver: Vec3;
  /** The dashboard across the cabin: it shades the front row's knees and laps. */
  dashboard: { yStart: number; yEnd: number; zTop: number };
  windows: WindowSpec[];
  seats: SeatSpec[];
}

/**
 * Seat geometry that can cast shade. The 3D seats are built from these numbers and
 * a sun-exposure engine should use the same boxes as occluders.
 * Offsets are relative to the seat position (y grows towards the rear, z up from the cushion top).
 */
export const SEAT_SHAPE = {
  cushion: { width: 0.44, depth: 0.46, height: 0.11 },
  back: { width: 0.44, y0: 0.15, y1: 0.26, height: 0.6 },
  jumpBack: { width: 0.38, height: 0.44 },
  headrest: { width: 0.26, y0: 0.16, y1: 0.25, z0: 0.62, z1: 0.8 },
  rail: { radius: 0.013, length: 0.34, y: 0.29, z: 0.56 }
} as const;

const L = 4.98;
const W = 1.7;
const CUSHION = 0.96;
const FRONT_CUSHION = 1.0;
const BELT = 1.14;
const GLASS_TOP = 1.78;
const REAR_WALL_Y = 4.93;
const REAR_GLASS_BOTTOM = 1.18;
/** The back bench leans on the rear door: its backrest ends 5 cm short of the door plane (door trim). */
const BACK_BENCH_Y = REAR_WALL_Y - SEAT_SHAPE.back.y1 - 0.05;
/** Front row over the engine, then three benches 0.88 m apart up to the back bench. */
const ROW_Y = [0.95, ...[3, 2, 1].map((k) => Number((BACK_BENCH_Y - k * 0.88).toFixed(3))), BACK_BENCH_Y];
const COMMUTER = { backHeight: SEAT_SHAPE.back.height, hasHeadrest: true } as const;
const JUMP = { backHeight: SEAT_SHAPE.jumpBack.height, hasHeadrest: false } as const;
/** The back bench backrest ends about at the bottom edge of the rear glass. */
const BENCH = { backHeight: Number((REAR_GLASS_BOTTOM + 0.03 - CUSHION).toFixed(3)), hasHeadrest: false } as const;

function passengerSeats(): SeatSpec[] {
  const seats: SeatSpec[] = [
    { id: 1, row: 0, col: 1, side: 'middle', isWindow: false, isJump: false, hasRail: true, ...COMMUTER, position: { x: 0, y: ROW_Y[0]!, z: FRONT_CUSHION } },
    { id: 2, row: 0, col: 2, side: 'right', isWindow: true, isJump: false, hasRail: true, ...COMMUTER, position: { x: 0.46, y: ROW_Y[0]!, z: FRONT_CUSHION } }
  ];
  let id = 3;
  for (let row = 1; row <= 3; row++) {
    const y = ROW_Y[row]!;
    seats.push({ id: id++, row, col: 0, side: 'left', isWindow: true, isJump: false, hasRail: true, ...COMMUTER, position: { x: -0.52, y, z: CUSHION } });
    seats.push({ id: id++, row, col: 1, side: 'middle', isWindow: false, isJump: false, hasRail: true, ...COMMUTER, position: { x: -0.08, y, z: CUSHION } });
    seats.push({ id: id++, row, col: 2, side: 'right', isWindow: true, isJump: true, hasRail: false, ...JUMP, position: { x: 0.5, y, z: CUSHION } });
  }
  const back = ROW_Y[4]!;
  seats.push({ id: id++, row: 4, col: 0, side: 'left', isWindow: true, isJump: false, hasRail: false, ...BENCH, position: { x: -0.5, y: back, z: CUSHION } });
  seats.push({ id: id++, row: 4, col: 1, side: 'middle', isWindow: false, isJump: false, hasRail: false, ...BENCH, position: { x: 0, y: back, z: CUSHION } });
  seats.push({ id: id++, row: 4, col: 2, side: 'right', isWindow: true, isJump: false, hasRail: false, ...BENCH, position: { x: 0.5, y: back, z: CUSHION } });
  return seats;
}

function side(sideName: Side, spans: [number, number][], first = 0): SideWindowSpec[] {
  return spans.map(([yStart, yEnd], i) => ({ id: `${sideName}-${first + i}`, side: sideName, yStart, yEnd, zBottom: BELT, zTop: GLASS_TOP }));
}

export const EGYPT_MICROBUS_14: MicrobusSpec = {
  id: 'egypt-microbus-h100-14',
  dimensions: {
    lengthM: L,
    widthM: W,
    heightM: 1.955,
    floorZ: 0.55,
    roofInnerZ: 1.86,
    frontWallY: 0.45,
    rearWallY: REAR_WALL_Y
  },
  body: {
    sideProfile: [
      [0.1, 0.34],
      [0.055, 0.4],
      [0.045, 0.62],
      [0.055, 0.82],
      [0.075, 0.965],
      [0.13, 1.08],
      [0.22, 1.16],
      [0.37, 1.195],
      [0.82, 1.852],
      [0.97, 1.893],
      [1.11, 1.919],
      [1.26, 1.942],
      [1.45, 1.955],
      [4.4, 1.955],
      [4.52, 1.944],
      [4.64, 1.905],
      [4.76, 1.835],
      [4.86, 1.74],
      [4.93, 1.6],
      [4.965, 1.42],
      [4.975, 0.42],
      [4.94, 0.34]
    ],
    creases: [0, 7, 20, 21],
    edgeRadius: 0.07,
    wallThickness: 0.045,
    skirtTopZ: 0.6,
    beltZ: BELT
  },
  wheels: {
    frontAxleY: 1.08,
    rearAxleY: 3.67,
    radius: 0.315,
    width: 0.195,
    halfTrack: 0.72,
    archRadius: 0.4
  },
  doors: {
    front: { yStart: 0.46, yEnd: 1.34 },
    sliding: { side: 'right', yStart: 1.37, yEnd: 2.38 }
  },
  driver: { x: -0.45, y: ROW_Y[0]!, z: FRONT_CUSHION },
  dashboard: { yStart: 0.45, yEnd: 0.75, zTop: 1.18 },
  windows: [
    { id: 'windshield', side: 'front', xStart: -0.7, xEnd: 0.7, zBottom: 1.24, zTop: 1.81, rake: { yAtBottom: 0.42, yAtTop: 0.8 } },
    { id: 'rear-glass', side: 'rear', xStart: -0.62, xEnd: 0.62, zBottom: REAR_GLASS_BOTTOM, zTop: 1.7 },
    ...side('left', [[0.66, 1.28]]),
    ...side('left', [[1.4, 2.45], [2.55, 3.6], [3.7, 4.55]], 1),
    ...side('right', [[0.66, 1.28]]),
    // The sliding door window, then the fixed windows behind it.
    ...side('right', [[1.42, 2.32], [2.45, 3.55], [3.65, 4.55]], 1)
  ],
  seats: passengerSeats()
};

/** Converts a point in the vehicle frame to three.js world axes (Y up, nose towards -Z, right towards +X). */
export function toThreeAxes(spec: MicrobusSpec, p: Vec3): [number, number, number] {
  return [p.x, p.z, p.y - spec.dimensions.lengthM / 2];
}
