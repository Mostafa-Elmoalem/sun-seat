import type { SolarPosition } from '../types/solar.ts';

/**
 * Solar position calculations based on standard NOAA Solar Calculator algorithms
 * (derived from Jean Meeus' Astronomical Algorithms).
 * 
 * Units and Conventions:
 * - Latitude: Decimal degrees, positive North [-90, +90]
 * - Longitude: Decimal degrees, positive East [-180, +180]
 * - Time: UTC Date object (pure, no hidden Date.now(), no DOM dependency)
 * - Azimuth: Degrees clockwise from True North [0, 360) (0° = North, 90° = East, 180° = South, 270° = West)
 * - Elevation: Degrees above horizon [-90, +90] (negative indicates sun is below horizon / night)
 * 
 * Accuracy: Within 0.02° of NOAA reference tables.
 */

function deg2rad(deg: number): number {
  return (deg * Math.PI) / 180;
}

function rad2deg(rad: number): number {
  return (rad * 180) / Math.PI;
}

/**
 * Calculates Julian Day from a UTC Date.
 */
export function getJulianDay(date: Date): number {
  let year = date.getUTCFullYear();
  let month = date.getUTCMonth() + 1; // 1-12
  const day = date.getUTCDate();
  const hour = date.getUTCHours() + 
    date.getUTCMinutes() / 60 + 
    date.getUTCSeconds() / 3600 + 
    date.getUTCMilliseconds() / 3600000;

  if (month <= 2) {
    year -= 1;
    month += 12;
  }

  const a = Math.floor(year / 100);
  const b = 2 - a + Math.floor(a / 4);

  return (
    Math.floor(365.25 * (year + 4716)) +
    Math.floor(30.6001 * (month + 1)) +
    day +
    b -
    1524.5 +
    hour / 24
  );
}

/**
 * Computes solar position for a given geographic point and UTC timestamp.
 * 
 * @param latitude Decimal degrees North
 * @param longitude Decimal degrees East
 * @param utcDate Date object representing the exact UTC moment
 * @returns SolarPosition { azimuth, elevation, zenith, declination }
 */
export function calculateSunPosition(
  latitude: number,
  longitude: number,
  utcDate: Date
): SolarPosition {
  const jd = getJulianDay(utcDate);
  const t = (jd - 2451545.0) / 36525.0; // Julian centuries since J2000.0

  // Geometric Mean Longitude of Sun (degrees)
  let l0 = (280.46646 + t * (36000.76983 + t * 0.0003032)) % 360;
  if (l0 < 0) l0 += 360;

  // Geometric Mean Anomaly of Sun (degrees)
  const m = 357.52911 + t * (35999.05029 - 0.0001537 * t);
  const mRad = deg2rad(m);

  // Eccentricity of Earth's orbit
  const e = 0.016708634 - t * (0.000042037 + 0.0000001267 * t);

  // Sun Equation of Center (degrees)
  const c =
    Math.sin(mRad) * (1.914602 - t * (0.004817 + 0.000014 * t)) +
    Math.sin(2 * mRad) * (0.019993 - 0.000101 * t) +
    Math.sin(3 * mRad) * 0.000289;

  // Sun True Longitude & Apparent Longitude (degrees)
  const trueLong = l0 + c;
  const omega = 125.04 - 1934.136 * t;
  const lambda = trueLong - 0.00569 - 0.00478 * Math.sin(deg2rad(omega));

  // Mean Obliquity of the Ecliptic (degrees)
  const seconds = 21.448 - t * (46.815 + t * (0.00059 - t * 0.001813));
  const obliq0 = 23 + (26 + seconds / 60) / 60;
  const obliq = obliq0 + 0.00256 * Math.cos(deg2rad(omega));

  // Sun Declination (degrees)
  const sinDec = Math.sin(deg2rad(obliq)) * Math.sin(deg2rad(lambda));
  const declination = rad2deg(Math.asin(sinDec));

  // Equation of Time (minutes)
  const y = Math.pow(Math.tan(deg2rad(obliq) / 2), 2);
  const l0Rad = deg2rad(l0);
  const eqTime =
    4 *
    rad2deg(
      y * Math.sin(2 * l0Rad) -
        2 * e * Math.sin(mRad) +
        4 * e * y * Math.sin(mRad) * Math.cos(2 * l0Rad) -
        0.5 * y * y * Math.sin(4 * l0Rad) -
        1.25 * e * e * Math.sin(2 * mRad)
    );

  // Solar Time Fix and True Solar Time (minutes)
  const utcHours =
    utcDate.getUTCHours() +
    utcDate.getUTCMinutes() / 60 +
    utcDate.getUTCSeconds() / 3600 +
    utcDate.getUTCMilliseconds() / 3600000;

  let trueSolarTime = (utcHours * 60 + eqTime + 4 * longitude) % 1440;
  if (trueSolarTime < 0) trueSolarTime += 1440;

  // Solar Hour Angle (degrees) [-180, +180]
  let hourAngle = trueSolarTime / 4 - 180;
  if (hourAngle < -180) hourAngle += 360;

  // Solar Zenith Angle (degrees)
  const latRad = deg2rad(latitude);
  const decRad = deg2rad(declination);
  const haRad = deg2rad(hourAngle);

  let cosZenith =
    Math.sin(latRad) * Math.sin(decRad) +
    Math.cos(latRad) * Math.cos(decRad) * Math.cos(haRad);
  cosZenith = Math.max(-1, Math.min(1, cosZenith));

  const zenith = rad2deg(Math.acos(cosZenith));
  let elevation = 90 - zenith;

  // Atmospheric Refraction Correction (only when sun is near or above horizon)
  if (elevation > -0.575) {
    const r =
      1.02 /
      Math.tan(deg2rad(elevation + 10.3 / (elevation + 5.11))) /
      60;
    elevation += r;
  }

  // Solar Azimuth Angle (degrees clockwise from North)
  let azimuth: number;
  const sinZenith = Math.sin(deg2rad(zenith));

  if (Math.abs(sinZenith) < 1e-6) {
    azimuth = 180;
  } else {
    let cosAzimuth =
      (Math.sin(latRad) * Math.cos(deg2rad(zenith)) - Math.sin(decRad)) /
      (Math.cos(latRad) * sinZenith);
    cosAzimuth = Math.max(-1, Math.min(1, cosAzimuth));

    const gamma = rad2deg(Math.acos(cosAzimuth));
    if (hourAngle > 0) {
      azimuth = (gamma + 180) % 360;
    } else {
      azimuth = (540 - gamma) % 360;
    }
  }

  return {
    azimuth: Number(azimuth.toFixed(4)),
    elevation: Number(elevation.toFixed(4)),
    zenith: Number(zenith.toFixed(4)),
    declination: Number(declination.toFixed(4))
  };
}
