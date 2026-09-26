/**
 * Timezone utilities for Egypt (Africa/Cairo).
 * Uses native Intl API (0 KB external dependency).
 * Accurately handles Egyptian Standard Time (UTC+2) and Egyptian Daylight Saving Time (UTC+3).
 */

export const CAIRO_TIMEZONE = 'Africa/Cairo';

/**
 * Returns the timezone offset in hours for Cairo at a given UTC date.
 * (e.g., +2 in winter, +3 in summer).
 */
export function getCairoOffsetHours(utcDate: Date): number {
  // Format the given date in Africa/Cairo and UTC, then find difference in hours
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: CAIRO_TIMEZONE,
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
    hour12: false
  });

  const parts = formatter.formatToParts(utcDate);
  const partMap: Record<string, number> = {};
  for (const part of parts) {
    if (part.type !== 'literal') {
      partMap[part.type] = parseInt(part.value, 10);
    }
  }

  // Construct as local time components interpreted in UTC
  const cairoLocalAsUtc = Date.UTC(
    partMap['year'] ?? utcDate.getUTCFullYear(),
    (partMap['month'] ?? 1) - 1,
    partMap['day'] ?? utcDate.getUTCDate(),
    (partMap['hour'] ?? 0) % 24,
    partMap['minute'] ?? 0,
    partMap['second'] ?? 0
  );

  const diffMs = cairoLocalAsUtc - utcDate.getTime();
  return Math.round(diffMs / (60 * 60 * 1000));
}

/**
 * Creates a UTC Date given Cairo local date components.
 * 
 * @param year e.g. 2026
 * @param month 1-indexed (1 = Jan, 12 = Dec)
 * @param day 1-31
 * @param hour 0-23
 * @param minute 0-59
 * @param second 0-59 (default 0)
 */
export function cairoTimeToUtc(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number = 0,
  second: number = 0
): Date {
  // Initial estimate assuming UTC+2
  const approxUtc = new Date(Date.UTC(year, month - 1, day, hour - 2, minute, second));
  const offsetHours = getCairoOffsetHours(approxUtc);
  
  // Refined exact UTC instant
  const exactUtc = new Date(Date.UTC(year, month - 1, day, hour - offsetHours, minute, second));
  
  // Double-check in case offset crossed DST boundary during the adjustment
  const verifiedOffset = getCairoOffsetHours(exactUtc);
  if (verifiedOffset !== offsetHours) {
    return new Date(Date.UTC(year, month - 1, day, hour - verifiedOffset, minute, second));
  }
  
  return exactUtc;
}

const cairoTimeFormatter = new Intl.DateTimeFormat('ar-EG-u-nu-latn', {
  timeZone: CAIRO_TIMEZONE,
  hour: '2-digit',
  minute: '2-digit',
  hour12: true
});

const cairoFullFormatter = new Intl.DateTimeFormat('ar-EG-u-nu-latn', {
  timeZone: CAIRO_TIMEZONE,
  year: 'numeric',
  month: 'short',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hour12: true
});

/**
 * Formats a UTC date into Cairo local time strings.
 */
export function formatCairoTime(utcDate: Date, format: 'time' | 'full' = 'time'): string {
  if (format === 'time') {
    return cairoTimeFormatter.format(utcDate);
  }
  return cairoFullFormatter.format(utcDate);
}

