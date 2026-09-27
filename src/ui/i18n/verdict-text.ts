import type { VerdictReason } from '../../app/result/verdict-model.ts';
import { COPY, formatDuration, sideName, type AppLanguage } from './copy.ts';
import { formatTime } from '../format.ts';

/** The one-line reason under the verdict, in the rider's language (numbers in <b>). */
export function reasonText(reason: VerdictReason, lang: AppLanguage): string {
  const c = COPY[lang];
  const d = (minutes: number) => formatDuration(minutes, lang);
  switch (reason.kind) {
    case 'sides':
      return c.subSides(sideName(reason.sunny, lang), d(reason.sunnyMinutes), sideName(reason.good, lang), d(reason.goodMinutes));
    case 'switch':
      return c.subTieSwitch(sideName(reason.first, lang), d(reason.firstForMinutes), sideName(reason.second, lang));
    case 'tie':
      return c.subTie(d(reason.minutes));
    case 'sunHigh':
      return c.subNoMatterHigh;
    case 'sunAheadOrBehind':
      return c.subNoMatterLow;
    case 'night':
      return c.subNight(reason.sunriseMs !== null ? formatTime(reason.sunriseMs, lang) : '');
  }
}
