/**
 * Solar position coordinates and angle conventions.
 * 
 * Conventions:
 * - azimuth: Degrees clockwise from True North (0° = North, 90° = East, 180° = South, 270° = West). Range: [0, 360).
 * - elevation: Degrees above geometric horizon (-90° to +90°). Negative values indicate night.
 * - zenith: Degrees from vertical (90° - elevation). Range: [0, 180].
 */
export interface SolarPosition {
  /** Azimuth angle in degrees clockwise from North [0, 360) */
  azimuth: number;
  /** Elevation angle in degrees above horizon [-90, +90] */
  elevation: number;
  /** Zenith angle in degrees [0, 180] */
  zenith: number;
  /** Solar declination angle in degrees [-23.5, +23.5] */
  declination: number;
}
