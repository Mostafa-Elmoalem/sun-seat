import type { ProcessedRoute } from '../types/routes.ts';
import type {
  VehicleProfile,
  VehicleSeat,
  VehicleWindow,
  TripExposureVerdict,
  SeatExposure,
  TimelineStep,
  SideShadePercentages,
  TripSensitivityResult,
  ConfidenceLevel
} from '../types/vehicle.ts';
import { calculateSunPosition } from '../astronomy/noaa-solar.ts';
import { formatCairoTime } from '../astronomy/timezone.ts';

/**
 * Pure TypeScript deterministic exposure calculation engine.
 */

interface Point {
  lat: number;
  lng: number;
}

/**
 * Interpolates coordinate and heading along route segments at distance dKm.
 */
function interpolateRoutePosition(
  route: ProcessedRoute,
  dKm: number
): { location: Point; headingDeg: number } {
  if (route.segments.length === 0) {
    return {
      location: { lat: 30.0, lng: 31.0 },
      headingDeg: 0
    };
  }

  let accumulatedDist = 0;
  for (const seg of route.segments) {
    if (accumulatedDist + seg.distanceKm >= dKm || seg === route.segments[route.segments.length - 1]) {
      const segFraction = seg.distanceKm > 0 ? Math.min(1, Math.max(0, (dKm - accumulatedDist) / seg.distanceKm)) : 0;
      const lat = seg.startLat + segFraction * (seg.endLat - seg.startLat);
      const lng = seg.startLng + segFraction * (seg.endLng - seg.startLng);
      return {
        location: { lat, lng },
        headingDeg: seg.bearingDeg
      };
    }
    accumulatedDist += seg.distanceKm;
  }

  const last = route.segments[route.segments.length - 1]!;
  return {
    location: { lat: last.endLat, lng: last.endLng },
    headingDeg: last.bearingDeg
  };
}

/**
 * Calculates sun vector in vehicle frame:
 * x: right (+x) / left (-x)
 * y: front (+y) / rear (-y)
 * z: up (+z)
 */
export function calculateSunVector(
  solarAzimuthDeg: number,
  solarElevationDeg: number,
  vehicleHeadingDeg: number
) {
  const relativeAngleDeg = (solarAzimuthDeg - vehicleHeadingDeg + 360) % 360;
  const alphaRad = (solarElevationDeg * Math.PI) / 180;
  const relRad = (relativeAngleDeg * Math.PI) / 180;

  return {
    relativeAngleDeg,
    ux: Math.cos(alphaRad) * Math.sin(relRad), // + = sun on right, - = sun on left
    uy: Math.cos(alphaRad) * Math.cos(relRad), // + = sun in front, - = sun behind
    uz: Math.sin(alphaRad)                    // + = sun up
  };
}

/**
 * Checks if a ray from seat position towards the sun penetrates windows without hitting roof.
 */
function calculateSeatStepExposure(
  seat: VehicleSeat,
  vehicle: VehicleProfile,
  windowsBySide: {
    left: VehicleWindow[];
    right: VehicleWindow[];
    front: VehicleWindow[];
    rear: VehicleWindow[];
  },
  ux: number,
  uy: number,
  uz: number,
  solarElevationDeg: number
): number {
  if (solarElevationDeg <= 0) return 0; // Sun below horizon

  // High noon overhead sun protection (>68°)
  if (solarElevationDeg > 68) {
    return 0;
  }

  const seatPos = seat.position;
  const halfWidth = vehicle.dimensions.widthM / 2;

  let passesWindow = false;
  let lateralExposureFactor = 0;

  if (ux > 0.05) {
    // Sun on the right side (+x)
    // Distance from passenger shoulder/torso to right glass
    const distToRightGlass = Math.max(0.15, halfWidth - seatPos.x);
    const tWall = distToRightGlass / ux;
    // Check if sun ray hits passenger torso/head through the window
    const zEffective = seatPos.z - 0.2 + tWall * uz * 0.35;
    const yIntersect = seatPos.y + tWall * uy * 0.35;

    for (let i = 0; i < windowsBySide.right.length; i++) {
      const win = windowsBySide.right[i]!;
      if (
        yIntersect >= win.yStart - 0.25 &&
        yIntersect <= win.yEnd + 0.25 &&
        zEffective >= win.zBottom &&
        zEffective <= win.zTop
      ) {
        passesWindow = true;
        // Right seats get direct hit; middle seats get partial; left seats are far from right glass
        lateralExposureFactor = seat.side === 'right' ? 1.0 : seat.side === 'middle' ? 0.35 : 0.05;
        break;
      }
    }
  } else if (ux < -0.05) {
    // Sun on the left side (-x)
    const distToLeftGlass = Math.max(0.15, seatPos.x - (-halfWidth));
    const tWall = distToLeftGlass / (-ux);
    const zEffective = seatPos.z - 0.2 + tWall * uz * 0.35;
    const yIntersect = seatPos.y + tWall * uy * 0.35;

    for (let i = 0; i < windowsBySide.left.length; i++) {
      const win = windowsBySide.left[i]!;
      if (
        yIntersect >= win.yStart - 0.25 &&
        yIntersect <= win.yEnd + 0.25 &&
        zEffective >= win.zBottom &&
        zEffective <= win.zTop
      ) {
        passesWindow = true;
        lateralExposureFactor = seat.side === 'left' ? 1.0 : seat.side === 'middle' ? 0.35 : 0.05;
        break;
      }
    }
  }

  // Front / Rear windows check
  if (!passesWindow) {
    if (uy > 0.5 && seat.row === 0) {
      passesWindow = true;
      lateralExposureFactor = 0.6;
    } else if (uy < -0.5 && seat.row >= 3) {
      passesWindow = true;
      lateralExposureFactor = 0.5;
    }
  }

  if (!passesWindow) return 0;

  const windowBonus = seat.isWindow ? 1.0 : 0.6;
  // Normalize lateral sun projection into [0, 100] exposure score
  const sideProjection = Math.min(1.0, Math.abs(ux) * 1.35 + 0.2);
  return Math.min(100, Math.max(0, sideProjection * lateralExposureFactor * windowBonus * 100));
}

function groupWindowsBySide(vehicle: VehicleProfile) {
  return {
    left: vehicle.windows.filter((w) => w.side === 'left'),
    right: vehicle.windows.filter((w) => w.side === 'right'),
    front: vehicle.windows.filter((w) => w.side === 'front'),
    rear: vehicle.windows.filter((w) => w.side === 'rear')
  };
}

/**
 * Runs single exposure calculation pass for a trip.
 */
function runExposurePass(
  route: ProcessedRoute,
  departureDateUtc: Date,
  vehicle: VehicleProfile,
  speedMultiplier: number = 1.0,
  includeTimelineDetails: boolean = true
): {
  totalMinutes: number;
  timeline: TimelineStep[];
  seatScores: Map<number, number>;
  sideShade: SideShadePercentages;
  nightMinutes: number;
  highNoonMinutes: number;
} {
  const totalMinutes = Math.max(
    1,
    Math.round(route.totalDurationMin * vehicle.speedFactor * speedMultiplier) + vehicle.stopOverheadMin
  );

  const windowsBySide = groupWindowsBySide(vehicle);
  const timeline: TimelineStep[] = [];
  const seatScoreSum = new Map<number, number>();
  for (let i = 0; i < vehicle.seats.length; i++) {
    seatScoreSum.set(vehicle.seats[i]!.id, 0);
  }

  let nightMinutes = 0;
  let highNoonMinutes = 0;

  for (let m = 0; m < totalMinutes; m++) {
    const fraction = m / totalMinutes;
    const dKm = route.totalDistanceKm * fraction;
    const { location, headingDeg } = interpolateRoutePosition(route, dKm);

    const stepTimeUtc = new Date(departureDateUtc.getTime() + m * 60 * 1000);
    const sun = calculateSunPosition(location.lat, location.lng, stepTimeUtc);
    const { relativeAngleDeg, ux, uy, uz } = calculateSunVector(sun.azimuth, sun.elevation, headingDeg);

    const isNight = sun.elevation <= 0;
    const isHighNoon = sun.elevation > 68;

    if (isNight) nightMinutes++;
    if (isHighNoon) highNoonMinutes++;

    if (includeTimelineDetails) {
      let sunSide: 'left' | 'right' | 'front' | 'rear' | 'none' = 'none';
      if (isNight) {
        sunSide = 'none';
      } else if (relativeAngleDeg >= 345 || relativeAngleDeg < 15) {
        sunSide = 'front';
      } else if (relativeAngleDeg >= 165 && relativeAngleDeg < 195) {
        sunSide = 'rear';
      } else if (relativeAngleDeg >= 15 && relativeAngleDeg < 165) {
        sunSide = 'right';
      } else {
        sunSide = 'left';
      }

      timeline.push({
        minuteOffset: m,
        timeCairoFormatted: formatCairoTime(stepTimeUtc, 'time'),
        location,
        headingDeg: Math.round(headingDeg),
        solarAzimuthDeg: Math.round(sun.azimuth),
        solarElevationDeg: Math.round(sun.elevation * 10) / 10,
        relativeAngleDeg: Math.round(relativeAngleDeg),
        sunSide,
        isNight,
        isHighNoon
      });
    }

    if (!isNight && !isHighNoon) {
      for (let s = 0; s < vehicle.seats.length; s++) {
        const seat = vehicle.seats[s]!;
        const stepExposure = calculateSeatStepExposure(seat, vehicle, windowsBySide, ux, uy, uz, sun.elevation);
        if (stepExposure > 0) {
          seatScoreSum.set(seat.id, (seatScoreSum.get(seat.id) || 0) + stepExposure);
        }
      }
    }
  }

  const seatScores = new Map<number, number>();
  let leftShadeSum = 0;
  let leftCount = 0;
  let rightShadeSum = 0;
  let rightCount = 0;

  for (let s = 0; s < vehicle.seats.length; s++) {
    const seat = vehicle.seats[s]!;
    const rawScore = (seatScoreSum.get(seat.id) || 0) / totalMinutes;
    const score = Math.round(Math.min(100, Math.max(0, rawScore)));
    seatScores.set(seat.id, score);

    const shade = 100 - score;
    if (seat.side === 'left') {
      leftShadeSum += shade;
      leftCount++;
    } else if (seat.side === 'right') {
      rightShadeSum += shade;
      rightCount++;
    }
  }

  const leftShade = leftCount > 0 ? Math.round(leftShadeSum / leftCount) : 50;
  const rightShade = rightCount > 0 ? Math.round(rightShadeSum / rightCount) : 50;

  return {
    totalMinutes,
    timeline,
    seatScores,
    sideShade: {
      leftShade,
      rightShade,
      leftSun: 100 - leftShade,
      rightSun: 100 - rightShade
    },
    nightMinutes,
    highNoonMinutes
  };
}

/**
 * Performs sensitivity analysis across ±30 min departure time and ±20% speed variations.
 */
export function analyzeTripSensitivity(
  route: ProcessedRoute,
  departureDateUtc: Date,
  vehicle: VehicleProfile,
  baselineLeftShade: number,
  baselineRightShade: number
): TripSensitivityResult {
  const scenariosConfig = [
    { name: 'انطلاق مبكر (-30 د)', deltaMin: -30, speedMult: 1.0 },
    { name: 'انطلاق متأخر (+30 د)', deltaMin: 30, speedMult: 1.0 },
    { name: 'زحمة بطيئة (-20% سرعة)', deltaMin: 0, speedMult: 1.2 },
    { name: 'طريق سريع (+20% سرعة)', deltaMin: 0, speedMult: 0.8 }
  ];

  const baselineRecommended =
    baselineLeftShade > baselineRightShade + 5
      ? 'left'
      : baselineRightShade > baselineLeftShade + 5
      ? 'right'
      : 'either';

  let stableCount = 0;
  const scenarios: TripSensitivityResult['scenarios'] = [];

  for (let i = 0; i < scenariosConfig.length; i++) {
    const sc = scenariosConfig[i]!;
    const testDate = new Date(departureDateUtc.getTime() + sc.deltaMin * 60 * 1000);
    const result = runExposurePass(route, testDate, vehicle, sc.speedMult, false);
    const rec =
      result.sideShade.leftShade > result.sideShade.rightShade + 5
        ? 'left'
        : result.sideShade.rightShade > result.sideShade.leftShade + 5
        ? 'right'
        : 'either';

    if (rec === baselineRecommended || baselineRecommended === 'either') {
      stableCount++;
    }

    scenarios.push({
      name: sc.name,
      leftShade: result.sideShade.leftShade,
      rightShade: result.sideShade.rightShade,
      recommendedSide: rec
    });
  }

  const diff = Math.abs(baselineLeftShade - baselineRightShade);
  let confidence: ConfidenceLevel = 'LOW';
  let explanationAr = 'درجة الثقة متوسطة لتأثر النتيجة بزمن الرحلة';

  if (stableCount === 4 && diff >= 15) {
    confidence = 'HIGH';
    explanationAr = 'درجة الثقة عالية جداً: النتيجة ثابتة حتى لو الطريق اتأخر أو اتغيرت السرعة';
  } else if (stableCount >= 3 && diff >= 8) {
    confidence = 'MEDIUM';
    explanationAr = 'درجة الثقة جيدة: الجانب الموصى به مستقر في أغلب ظروف الطريق';
  } else {
    confidence = 'LOW';
    explanationAr = 'درجة الثقة منخفضة: تقارب شديد في الشمس بين الجانبين أو تغير وقت الرحلة يقلب النتيجة';
  }

  return {
    confidence,
    verdictStable: stableCount >= 3,
    explanationAr,
    scenarios
  };
}

/**
 * Master Trip Exposure Calculator
 */
export function calculateTripExposure(
  route: ProcessedRoute,
  departureDateUtc: Date,
  vehicle: VehicleProfile
): TripExposureVerdict {
  const baseResult = runExposurePass(route, departureDateUtc, vehicle, 1.0, true);
  const { sideShade, seatScores, timeline, totalMinutes, nightMinutes, highNoonMinutes } = baseResult;

  // Check night condition:
  if (nightMinutes === totalMinutes) {
    const seatsExposure: SeatExposure[] = vehicle.seats.map((s) => ({
      seatId: s.id,
      score: 0,
      sunMinutes: 0,
      shadePercentage: 100,
      side: s.side,
      isWindow: s.isWindow
    }));

    return {
      status: 'NIGHT',
      recommendedSide: 'either',
      bestSeatIds: vehicle.seats.map((s) => s.id),
      worstSeatIds: [],
      sidePercentages: { leftShade: 100, rightShade: 100, leftSun: 0, rightSun: 0 },
      seatsExposure,
      timeline,
      sensitivity: {
        confidence: 'HIGH',
        verdictStable: true,
        explanationAr: 'الرحلة بالكامل بعد غروب الشمس، مفيش أي شمس مباشرة في أي كرسي.',
        scenarios: []
      },
      headlineAr: 'الرحلة بالليل! مفيش شمس في أي كرسي',
      subheadlineAr: 'كل الكراسي ضل 100%، اقعد في المكان اللي يريحك.',
      geographyReasonAr: 'الرحلة بالكامل تتم بعد غروب الشمس في خط العرض المصري.'
    };
  }

  // Check high noon condition (>70% of trip has elevation > 68°):
  if (highNoonMinutes / totalMinutes >= 0.7) {
    const seatsExposure: SeatExposure[] = vehicle.seats.map((s) => ({
      seatId: s.id,
      score: 10,
      sunMinutes: 0,
      shadePercentage: 90,
      side: s.side,
      isWindow: s.isWindow
    }));

    return {
      status: 'DOES_NOT_MATTER',
      recommendedSide: 'either',
      bestSeatIds: vehicle.seats.filter((s) => !s.isWindow).map((s) => s.id),
      worstSeatIds: vehicle.seats.filter((s) => s.isWindow).map((s) => s.id),
      sidePercentages: { leftShade: 90, rightShade: 90, leftSun: 10, rightSun: 10 },
      seatsExposure,
      timeline,
      sensitivity: {
        confidence: 'MEDIUM',
        verdictStable: true,
        explanationAr: 'الشمس عمودية تقريباً فوق سقف العربية، الفرق بين اليمين والشمال لا يذكر.',
        scenarios: []
      },
      headlineAr: 'الشمس فوق سقف العربية (مش فارقة)',
      subheadlineAr: 'الارتفاع العالي للشمس يجعله محجوباً بالسقف عن معظم المقاعد.',
      geographyReasonAr: 'زاوية ارتفاع الشمس تفوق 68 درجة في الظهيرة الصيفية، مما يحجبها سقف المركبة.'
    };
  }

  const sensitivity = analyzeTripSensitivity(
    route,
    departureDateUtc,
    vehicle,
    sideShade.leftShade,
    sideShade.rightShade
  );

  const diff = sideShade.leftShade - sideShade.rightShade;
  let status: TripExposureVerdict['status'] = 'CLEAR';
  let recommendedSide: 'left' | 'right' | 'either' = 'either';
  let headlineAr = '';
  let subheadlineAr = '';

  if (Math.abs(diff) < 10) {
    status = 'TIE';
    recommendedSide = 'either';
    headlineAr = 'مش فارقة! الشمس متساوية تقريباً على الجنبين';
    subheadlineAr = `الشمال ${sideShade.leftShade}% ضل واليمين ${sideShade.rightShade}% ضل (فرق ${Math.abs(diff)}% بس)`;
  } else if (diff >= 20) {
    status = 'CLEAR';
    recommendedSide = 'left';
    headlineAr = '🏆 اقعد شمال (أبرد جنب بفارق واضح)';
    subheadlineAr = `الجنب الشمال فيه ${sideShade.leftShade}% ضل مقارنة بـ ${sideShade.rightShade}% في اليمين`;
  } else if (diff > 0) {
    status = 'LEANING';
    recommendedSide = 'left';
    headlineAr = 'يميل للشمال (الجنب الشمال أفضل نسبياً)';
    subheadlineAr = `الجنب الشمال فيه ${sideShade.leftShade}% ضل مقابل ${sideShade.rightShade}% في اليمين`;
  } else if (diff <= -20) {
    status = 'CLEAR';
    recommendedSide = 'right';
    headlineAr = '🏆 اقعد يمين (أبرد جنب بفارق واضح)';
    subheadlineAr = `الجنب اليمين فيه ${sideShade.rightShade}% ضل مقارنة بـ ${sideShade.leftShade}% في الشمال`;
  } else {
    status = 'LEANING';
    recommendedSide = 'right';
    headlineAr = 'يميل لليمين (الجنب اليمين أفضل نسبياً)';
    subheadlineAr = `الجنب اليمين فيه ${sideShade.rightShade}% ضل مقابل ${sideShade.leftShade}% في الشمال`;
  }

  const seatsExposure: SeatExposure[] = vehicle.seats.map((s) => {
    const score = seatScores.get(s.id) || 0;
    return {
      seatId: s.id,
      score,
      sunMinutes: Math.round((score / 100) * totalMinutes),
      shadePercentage: 100 - score,
      side: s.side,
      isWindow: s.isWindow
    };
  });

  const sortedSeats = [...seatsExposure].sort((a, b) => {
    if (a.score !== b.score) return a.score - b.score;
    if (a.side === recommendedSide && b.side !== recommendedSide) return -1;
    if (b.side === recommendedSide && a.side !== recommendedSide) return 1;
    return a.seatId - b.seatId;
  });
  const bestSeatIds = sortedSeats.slice(0, 4).map((s) => s.seatId);
  const worstSeatIds = sortedSeats.slice(-4).map((s) => s.seatId);

  // Geography explanation
  const avgHeading = Math.round(
    timeline.reduce((acc, t) => acc + t.headingDeg, 0) / Math.max(1, timeline.length)
  );
  const avgAzimuth = Math.round(
    timeline.reduce((acc, t) => acc + t.solarAzimuthDeg, 0) / Math.max(1, timeline.length)
  );

  const geographyReasonAr = `اتجاه طريق الرحلة حوالي ${avgHeading}°، وموقع الشمس الفلكي يتركز حول زاوية ${avgAzimuth}°، مما يجعل أشعة الشمس تسقط بشكل أساسي على الجانب ${
    recommendedSide === 'left' ? 'الأيمن' : recommendedSide === 'right' ? 'الأيسر' : 'المتعادل'
  }.`;

  return {
    status,
    recommendedSide,
    bestSeatIds,
    worstSeatIds,
    sidePercentages: sideShade,
    seatsExposure,
    timeline,
    sensitivity,
    headlineAr,
    subheadlineAr,
    geographyReasonAr
  };
}
