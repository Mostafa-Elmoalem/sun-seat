/**
 * Vehicle geometry and exposure result types.
 *
 * Vehicle frame (used by the engine AND the 3D model, so they can never disagree):
 *   x: lateral meters from the centerline, negative = LEFT (driver side), positive = RIGHT (door side)
 *   y: longitudinal meters from the front bumper, increasing towards the rear
 *   z: meters above the ground
 */

export type Side = 'left' | 'right';
export type SeatSide = Side | 'middle';

export interface SeatPosition {
  x: number;
  y: number;
  /** Height of the seat cushion top above the ground. */
  z: number;
}

export interface VehicleSeat {
  id: number;
  labelAr: string;
  labelEn: string;
  row: number;
  col: number;
  side: SeatSide;
  isWindow: boolean;
  /** Folding jump seat next to the sliding door ("الكرسي القلاب"). */
  isJump?: boolean;
  /** Top of the backrest above the cushion top. Defaults: 0.6 m, or 0.44 m for a jump seat. */
  backHeight?: number;
  /** Defaults to true, except on jump seats. */
  hasHeadrest?: boolean;
  position: SeatPosition;
}

/** Glass on a side wall, spanning a y range. */
export interface SideWindow {
  id: string;
  side: Side;
  yStart: number;
  yEnd: number;
  zBottom: number;
  zTop: number;
}

/** Windshield or rear glass, spanning an x range on the front/rear wall. */
export interface EndWindow {
  id: string;
  side: 'front' | 'rear';
  xStart: number;
  xEnd: number;
  zBottom: number;
  zTop: number;
  /** A raked windshield: y of the glass at its bottom and top edges (the glass is the plane through both). */
  rake?: { yAtBottom: number; yAtTop: number };
}

export type VehicleWindow = SideWindow | EndWindow;

export interface VehicleDimensions {
  lengthM: number;
  widthM: number;
  heightM: number;
  /** Cabin floor height above the ground. */
  floorZ: number;
  /** Underside of the roof inside the cabin. */
  roofInnerZ: number;
  /** y of the windshield plane (cab-over vans sit right behind it). */
  frontWallY: number;
  /** y of the rear glass plane. */
  rearWallY: number;
  /** Side wall thickness; defaults to 6 cm. */
  wallThicknessM?: number;
}

export interface VehicleProfile {
  id: string;
  nameAr: string;
  nameEn: string;
  type: 'microbus' | 'bus' | 'custom';
  totalSeats: number;
  /** Multiplier on car travel time (microbuses stop, buses are slower on highways). */
  speedFactor: number;
  stopOverheadMin: number;
  hasCurtains: boolean;
  doorSide: Side;
  dimensions: VehicleDimensions;
  driver: SeatPosition;
  /** A dashboard across the cabin in front of the front row, if it matters for shade. */
  dashboard?: { yStart: number; yEnd: number; zTop: number };
  windows: VehicleWindow[];
  seats: VehicleSeat[];
}

export interface SeatExposure {
  seatId: number;
  /** Minutes of direct sun on the passenger, weighted by how much of the body is lit (the dose). */
  sunMinutes: number;
  /** Minutes of proper sun: a large share of the body lit (see STRONG_SUN). */
  strongMinutes: number;
  /** Minutes of light sun: noticeable, but only a small part of the body or through glass at a slant. */
  mildMinutes: number;
  /** Share of the trip in shade, 0 to 100. */
  shadePercentage: number;
  side: SeatSide;
  isWindow: boolean;
}

export interface SideSummary {
  /** Average sun minutes of the window seats on that side. */
  leftSunMinutes: number;
  rightSunMinutes: number;
  leftShade: number;
  rightShade: number;
}

export type SunDirection = 'left' | 'right' | 'front' | 'rear' | 'overhead' | 'none';

export interface TimelineStep {
  minuteOffset: number;
  /** Epoch ms of this step, so any UI can format it in Africa/Cairo. */
  timeMs: number;
  timeCairoFormatted: string;
  location: { lat: number; lng: number };
  headingDeg: number;
  solarAzimuthDeg: number;
  solarElevationDeg: number;
  /** Sun bearing relative to the vehicle nose: 0 = ahead, 90 = right, 180 = behind, 270 = left. */
  relativeAngleDeg: number;
  sunSide: SunDirection;
  isNight: boolean;
  /** Share of the trip completed, 0 to 1. */
  progress: number;
}

export type ConfidenceLevel = 'HIGH' | 'MEDIUM' | 'LOW';

export interface TripSensitivityResult {
  confidence: ConfidenceLevel;
  verdictStable: boolean;
  scenarios: {
    key: 'early' | 'late' | 'slow' | 'fast';
    leftSunMinutes: number;
    rightSunMinutes: number;
    recommendedSide: Side | 'either';
  }[];
}

/**
 * CLEAR: one side is clearly better.
 * LEANING: one side is better, but not by much.
 * TIE: both sides get similar sun (often because the sun switches sides mid-trip).
 * DOES_NOT_MATTER: the sun is too high, too low, or too brief to reach anyone for long.
 * NIGHT: the sun is down for the whole trip.
 */
export type VerdictStatus = 'CLEAR' | 'LEANING' | 'TIE' | 'DOES_NOT_MATTER' | 'NIGHT';

/**
 * Advice along the vehicle, independent of the side: the back bench takes the sun through
 * the rear glass when it is behind, the front row through the windshield when it is ahead.
 */
export type EndAdvice = 'avoid-back' | 'avoid-front' | null;

export interface SunSpan {
  side: SunDirection;
  startMinute: number;
  endMinute: number;
}

export interface TripExposureVerdict {
  status: VerdictStatus;
  recommendedSide: Side | 'either';
  endAdvice: EndAdvice;
  /** True when seats differ enough that naming the best ones is useful, whatever the side verdict. */
  seatAdvice: boolean;
  bestSeatIds: number[];
  worstSeatIds: number[];
  sides: SideSummary;
  seatsExposure: SeatExposure[];
  timeline: TimelineStep[];
  /** Consecutive stretches where the sun sits on one side of the vehicle. */
  spans: SunSpan[];
  sensitivity: TripSensitivityResult;
  tripMinutes: number;
  /** Circular mean heading of the route and of the sun while it is up, degrees from north. */
  meanHeadingDeg: number;
  meanSunAzimuthDeg: number | null;
}
