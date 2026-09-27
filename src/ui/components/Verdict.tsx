import type { TripExposureVerdict, VehicleProfile } from '../../core/types/vehicle.ts';
import type { WeatherData } from '../../adapters/weather-service.ts';
import { COPY, formatDuration, otherSide, sideName, verdictHeadline, type AppLanguage } from '../i18n/copy.ts';
import { formatTime } from '../format.ts';
import { calculateSunPosition } from '../../core/astronomy/noaa-solar.ts';
import { IconInfo } from './Icons.tsx';

/** A hand-drawn ellipse, the teacher's red ring around the answer. Crisp geometry, slightly open at the end. */
function Ring() {
  return (
    <svg className="verdict-mark-ring" viewBox="0 0 100 40" preserveAspectRatio="none" aria-hidden="true">
      <path pathLength={1} d="M 58 3.5 C 84 2.5, 99 10, 98 21 C 97 33, 70 38.5, 44 37.5 C 17 36.5, 1.5 30, 2.5 19 C 3.5 8.5, 25 2, 54 2.8 C 66 3.2, 76 5.5, 83 8.5" />
    </svg>
  );
}

/** Night trips: when does the sun come up after departure (searched in 5 minute steps, 14 hours ahead). */
function sunriseText(verdict: TripExposureVerdict, lang: AppLanguage): string {
  const first = verdict.timeline[0];
  if (!first) return '';
  for (let m = 5; m <= 14 * 60; m += 5) {
    const t = first.timeMs + m * 60_000;
    if (calculateSunPosition(first.location.lat, first.location.lng, new Date(t)).elevation > 0) {
      return formatTime(t, lang);
    }
  }
  return '';
}

/** The answer: the headline circled in red and one sentence of why. */
export function Verdict({ verdict, lang }: { verdict: TripExposureVerdict; lang: AppLanguage }) {
  const c = COPY[lang];
  const { status, recommendedSide, sides, tripMinutes } = verdict;
  const head = verdictHeadline(status, recommendedSide, lang);
  const trip = formatDuration(tripMinutes, lang);

  let sub = '';
  if ((status === 'CLEAR' || status === 'LEANING') && recommendedSide !== 'either') {
    const sunny = otherSide(recommendedSide);
    const sunnyMin = sunny === 'left' ? sides.leftSunMinutes : sides.rightSunMinutes;
    const goodMin = recommendedSide === 'left' ? sides.leftSunMinutes : sides.rightSunMinutes;
    sub = c.subClear(sideName(sunny, lang), formatDuration(sunnyMin, lang), sideName(recommendedSide, lang), formatDuration(goodMin, lang), trip);
  } else if (status === 'TIE') {
    const lateral = verdict.spans.filter((s) => (s.side === 'left' || s.side === 'right') && s.endMinute - s.startMinute >= 10);
    const firstSpan = lateral[0];
    const switched = firstSpan ? lateral.find((s) => s.side !== firstSpan.side) : undefined;
    sub =
      firstSpan && switched
        ? c.subTieSwitch(
            sideName(firstSpan.side as 'left' | 'right', lang),
            formatDuration(switched.startMinute - firstSpan.startMinute, lang),
            sideName(switched.side as 'left' | 'right', lang)
          )
        : c.subTie(formatDuration(Math.max(sides.leftSunMinutes, sides.rightSunMinutes), lang));
  } else if (status === 'DOES_NOT_MATTER') {
    const overhead = verdict.timeline.filter((t) => t.sunSide === 'overhead').length;
    sub = overhead > verdict.timeline.length * 0.3 ? c.subNoMatterHigh : c.subNoMatterLow;
  } else {
    sub = c.subNight(sunriseText(verdict, lang));
  }


  return (
    <section className="verdict" aria-live="polite" data-testid="verdict" data-status={status} data-side={recommendedSide}>
      <h1 className="verdict-title" data-testid="verdict-title">
        {head.lead}
        <span className="verdict-mark">
          {head.mark}
          <Ring />
        </span>
        {head.tail}
      </h1>
      <p className="verdict-sub" dangerouslySetInnerHTML={{ __html: sub }} />

    </section>
  );
}

/** Sun minutes per side, measured against the trip, plus the honest caveats. */
export function SideComparison({
  verdict,
  vehicle,
  weather,
  lang
}: {
  verdict: TripExposureVerdict;
  vehicle: VehicleProfile;
  weather: WeatherData | null;
  lang: AppLanguage;
}) {
  const c = COPY[lang];
  const { status, recommendedSide, sides, tripMinutes } = verdict;
  if (status === 'NIGHT') return null;
  const showConfidence = verdict.sensitivity.scenarios.length > 0;
  const scale = Math.max(tripMinutes, sides.leftSunMinutes, sides.rightSunMinutes, 1);
  const firstTime = verdict.timeline[0];
  const lastTime = verdict.timeline[verdict.timeline.length - 1];
  const span = `${firstTime ? formatTime(firstTime.timeMs, lang) : ''} ${lang === 'ar' ? 'لـ' : 'to'} ${lastTime ? formatTime(lastTime.timeMs, lang) : ''}`;

  return (
    <section className="block" data-testid="side-comparison">
      <div className="sides" aria-label={lang === 'ar' ? 'الشمس على كل جنب' : 'Sun on each side'}>
        {(['left', 'right'] as const).map((side) => {
          const minutes = side === 'left' ? sides.leftSunMinutes : sides.rightSunMinutes;
          return (
            <div key={side} className={`side-row${recommendedSide === side ? ' is-best' : ''}`} data-testid={`side-${side}`}>
              <span className="side-row-name">{sideName(side, lang)}</span>
              <span className="side-row-track" aria-hidden="true">
                <span className="side-row-fill" style={{ width: `${Math.min(100, (minutes / scale) * 100)}%` }} />
              </span>
              <span className="side-row-mins">{formatDuration(minutes, lang)}</span>
            </div>
          );
        })}
        <p className="hint">
          {lang === 'ar'
            ? `متوسط دقايق الشمس على كرسي الشباك في كل جنب، من ${span}.`
            : `Average minutes of sun on a window seat on each side, ${span}.`}
        </p>
      </div>

      {showConfidence && (
        <p className="verdict-note" data-testid="confidence">
          <IconInfo />
          <span>{c.confidence[verdict.sensitivity.confidence]}</span>
        </p>
      )}
      {weather && weather.cloudCoverPct >= 35 && (
        <p className="verdict-note">
          <IconInfo />
          <span>{c.weatherCloudy(Math.round(weather.cloudCoverPct))}</span>
        </p>
      )}
      {vehicle.hasCurtains && (status === 'CLEAR' || status === 'LEANING') && (
        <p className="verdict-note">
          <IconInfo />
          <span>{c.busCurtains}</span>
        </p>
      )}
    </section>
  );
}
