/**
 * Honest Output Policy Rules for sun exposure.
 * Evaluates whether sun recommendations are meaningful or if edge states apply
 * (e.g. total night, overhead midday sun, or practical tie).
 */

export interface SegmentSunSample {
  elevation: number;
  relativeAngle: number;
}

export type HonestRuleResult =
  | { type: 'NIGHT'; textAr: string; descriptionEn: string }
  | { type: 'OVERHEAD_SUN'; textAr: string; descriptionEn: string }
  | { type: 'TIE'; textAr: string; descriptionEn: string }
  | { type: 'DETERMINISTIC'; winner: 'left' | 'right'; diff: number };

/**
 * Evaluates honest output rules given samples and side shade percentages.
 * 
 * @param samples Array of sun elevation and relative angle across the trip
 * @param leftShade Percentage of shade on left side [0, 100]
 * @param rightShade Percentage of shade on right side [0, 100]
 */
export function evaluateHonestRules(
  samples: SegmentSunSample[],
  leftShade: number,
  rightShade: number
): HonestRuleResult {
  if (samples.length === 0) {
    return {
      type: 'NIGHT',
      textAr: 'مفيش شمس.. اركب في أي حتة براحتك 🌙',
      descriptionEn: 'No trip samples provided'
    };
  }

  // 1. All night check: Sun is below the horizon for all samples
  const isAllNight = samples.every((s) => s.elevation <= 0);
  if (isAllNight) {
    return {
      type: 'NIGHT',
      textAr: 'مفيش شمس.. اركب في أي حتة براحتك 🌙',
      descriptionEn: 'Sun is below horizon for the entire trip'
    };
  }

  // 2. High overhead sun check: Elevation > 68 degrees for >= 70% of duration
  const highSunCount = samples.filter((s) => s.elevation > 68).length;
  if (highSunCount / samples.length >= 0.7) {
    return {
      type: 'OVERHEAD_SUN',
      textAr: 'الشمس فوق راسك بالظبط.. السقف حاميك ومش فارق الجنب ☀️',
      descriptionEn: 'Sun is directly overhead; vehicle roof shields both sides'
    };
  }

  // 3. Tie check: Difference between sides is below 10%
  const diff = Math.abs(leftShade - rightShade);
  if (diff < 10) {
    return {
      type: 'TIE',
      textAr: 'الجنبين زي بعض تقريباً.. اركب اللي يعجبك ⚖️',
      descriptionEn: 'Both sides have nearly identical shade coverage'
    };
  }

  // 4. Deterministic recommendation
  return {
    type: 'DETERMINISTIC',
    winner: leftShade >= rightShade ? 'left' : 'right',
    diff
  };
}
