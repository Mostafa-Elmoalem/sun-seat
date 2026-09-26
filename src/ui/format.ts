import { CAIRO_TIMEZONE, cairoTimeToUtc } from '../core/astronomy/timezone.ts';
import type { AppLanguage } from './i18n/copy.ts';

const partsFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: CAIRO_TIMEZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23'
});

export interface CairoParts {
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  y: number;
  m: number;
  d: number;
  hh: number;
  mm: number;
}

export function cairoParts(date: Date): CairoParts {
  const map: Record<string, string> = {};
  for (const p of partsFormatter.formatToParts(date)) if (p.type !== 'literal') map[p.type] = p.value;
  const y = Number(map.year);
  const m = Number(map.month);
  const d = Number(map.day);
  const hh = Number(map.hour) % 24;
  const mm = Number(map.minute);
  return {
    date: `${map.year}-${map.month}-${map.day}`,
    time: `${String(hh).padStart(2, '0')}:${map.minute}`,
    y,
    m,
    d,
    hh,
    mm
  };
}

/** Builds a UTC instant from a Cairo wall-clock date and time (handles DST). */
export function fromCairo(date: string, time: string): Date | null {
  const [y, m, d] = date.split('-').map(Number);
  const [hh, mm] = time.split(':').map(Number);
  if (!y || !m || !d || hh === undefined || mm === undefined || Number.isNaN(hh) || Number.isNaN(mm)) return null;
  return cairoTimeToUtc(y, m, d, hh, mm);
}

const timeFmt = {
  ar: new Intl.DateTimeFormat('ar-EG-u-nu-latn', { timeZone: CAIRO_TIMEZONE, hour: 'numeric', minute: '2-digit', hour12: true }),
  en: new Intl.DateTimeFormat('en-GB', { timeZone: CAIRO_TIMEZONE, hour: 'numeric', minute: '2-digit', hour12: true })
};

const dayFmt = {
  ar: new Intl.DateTimeFormat('ar-EG-u-nu-latn', { timeZone: CAIRO_TIMEZONE, weekday: 'long', day: 'numeric', month: 'long' }),
  en: new Intl.DateTimeFormat('en-GB', { timeZone: CAIRO_TIMEZONE, weekday: 'short', day: 'numeric', month: 'short' })
};

export function formatTime(date: Date | number, lang: AppLanguage): string {
  return timeFmt[lang].format(date);
}

/** "النهارده" / "بكرة" / "السبت 3 أكتوبر" in Cairo time. */
export function formatDay(date: Date, lang: AppLanguage, now = new Date()): string {
  const a = cairoParts(date).date;
  const today = cairoParts(now).date;
  const tomorrow = cairoParts(new Date(now.getTime() + 86_400_000)).date;
  if (a === today) return lang === 'ar' ? 'النهارده' : 'Today';
  if (a === tomorrow) return lang === 'ar' ? 'بكرة' : 'Tomorrow';
  return dayFmt[lang].format(date);
}
