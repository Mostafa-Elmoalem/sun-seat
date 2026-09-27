/** Departure time rules shared by the form, the store and share links. */

const FIVE_MINUTES = 5 * 60_000;
const DAY = 86_400_000;

export function roundToFiveMinutes(date: Date): Date {
  return new Date(Math.round(date.getTime() / FIVE_MINUTES) * FIVE_MINUTES);
}

/** "In 30 minutes" and friends, from the moment of the tap. */
export function fromNow(minutes: number, now = new Date()): Date {
  return roundToFiveMinutes(new Date(now.getTime() + minutes * 60_000));
}

/**
 * "Tomorrow": the same clock time one day later. A departure that is already in the
 * past or within the next hour counts from now, so "tomorrow" never lands in the past.
 */
export function tomorrowSameTime(departure: Date, now = new Date()): Date {
  const base = departure.getTime() < now.getTime() + 3600_000 ? now : departure;
  return roundToFiveMinutes(new Date(base.getTime() + DAY));
}
