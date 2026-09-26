/**
 * Vehicle profile and exposure engine types.
 */

export interface SeatPosition {
  /** Lateral offset in meters from vehicle centerline: negative = LEFT (driver side), positive = RIGHT (door side) */
  x: number;
  /** Longitudinal offset in meters from front bumper: positive towards rear */
  y: number;
  /** Vertical height in meters of passenger head/torso from ground */
  z: number;
}

export interface VehicleSeat {
  id: number;
  labelAr: string;
  labelEn: string;
  row: number;
  col: number;
  side: 'left' | 'right' | 'middle';
  isWindow: boolean;
  position: SeatPosition;
}

export interface VehicleWindow {
  id: string;
  side: 'left' | 'right' | 'front' | 'rear';
  /** Range along longitudinal axis Y in meters [yStart, yEnd] */
  yStart: number;
  yEnd: number;
  /** Height bounds along vertical axis Z in meters [zBottom, zTop] */
  zBottom: number;
  zTop: number;
}

export interface VehicleDimensions {
  lengthM: number;
  widthM: number;
  heightM: number;
  roofOverhangM: number;
}

export interface VehicleProfile {
  id: string;
  nameAr: string;
  nameEn: string;
  type: 'microbus' | 'bus' | 'custom';
  totalSeats: number;
  speedFactor: number;
  stopOverheadMin: number;
  hasCurtains: boolean;
  dimensions: VehicleDimensions;
  windows: VehicleWindow[];
  seats: VehicleSeat[];
}

export interface SeatExposure {
  seatId: number;
  score: number; // 0 = complete shade / cool, 100 = full direct blazing sun
  sunMinutes: number;
  shadePercentage: number; // 100 - score
  side: 'left' | 'right' | 'middle';
  isWindow: boolean;
}

export interface SideShadePercentages {
  leftShade: number; // 0 - 100%
  rightShade: number; // 0 - 100%
  leftSun: number;
  rightSun: number;
}

export interface TimelineStep {
  minuteOffset: number;
  timeCairoFormatted: string;
  location: { lat: number; lng: number };
  headingDeg: number;
  solarAzimuthDeg: number;
  solarElevationDeg: number;
  relativeAngleDeg: number; // 0 = front, 90 = right, 180 = rear, 270 = left
  sunSide: 'left' | 'right' | 'front' | 'rear' | 'none';
  isNight: boolean;
  isHighNoon: boolean;
}

export type ConfidenceLevel = 'HIGH' | 'MEDIUM' | 'LOW';

export interface TripSensitivityResult {
  confidence: ConfidenceLevel;
  verdictStable: boolean;
  explanationAr: string;
  scenarios: {
    name: string;
    leftShade: number;
    rightShade: number;
    recommendedSide: 'left' | 'right' | 'either';
  }[];
}

export interface TripExposureVerdict {
  status: 'CLEAR' | 'LEANING' | 'TIE' | 'DOES_NOT_MATTER' | 'NIGHT';
  recommendedSide: 'left' | 'right' | 'either';
  bestSeatIds: number[];
  worstSeatIds: number[];
  sidePercentages: SideShadePercentages;
  seatsExposure: SeatExposure[];
  timeline: TimelineStep[];
  sensitivity: TripSensitivityResult;
  headlineAr: string;
  subheadlineAr: string;
  geographyReasonAr: string;
}
