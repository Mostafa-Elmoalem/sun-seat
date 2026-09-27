import type { SeatExposure, Side, TripExposureVerdict, VehicleProfile } from '../../core/types/vehicle.ts';
import type { WeatherData } from '../../adapters/weather-service.ts';
import { COPY, formatDuration, otherSide, sideName, verdictHeadline, type AppLanguage } from '../i18n/copy.ts';
import { formatTime } from '../format.ts';
import { calculateSunPosition } from '../../core/astronomy/noaa-solar.ts';
import { IconInfo, SunGlyph } from './Icons.tsx';

/** Night trips: when does the sun come up after departure (searched in 5 minute steps, 14 hours ahead). */
function sunriseText(verdict: TripExposureVerdict, lang: AppLanguage): string {
  const first = verdict.timeline[0];
  if (!first) return '';
  for (let m = 5; m <= 14 * 60; m += 5) {
    const t = first.timeMs + m * 60_000;
    if (calculateSunPosition(first.location.lat, first.location.lng, new Date(t)).elevation > 0) return formatTime(t, lang);
  }
  return '';
}

function subline(verdict: TripExposureVerdict, lang: AppLanguage): string {
  const c = COPY[lang];
  const { status, recommendedSide, sides } = verdict;
  if ((status === 'CLEAR' || status === 'LEANING') && recommendedSide !== 'either') {
    const sunny = otherSide(recommendedSide);
    const sunnyMin = sunny === 'left' ? sides.leftSunMinutes : sides.rightSunMinutes;
    const goodMin = recommendedSide === 'left' ? sides.leftSunMinutes : sides.rightSunMinutes;
    return c.subSides(sideName(sunny, lang), formatDuration(sunnyMin, lang), sideName(recommendedSide, lang), formatDuration(goodMin, lang));
  }
  if (status === 'TIE') {
    const lateral = verdict.spans.filter((s) => (s.side === 'left' || s.side === 'right') && s.endMinute - s.startMinute >= 10);
    const first = lateral[0];
    const switched = first ? lateral.find((s) => s.side !== first.side) : undefined;
    return first && switched
      ? c.subTieSwitch(sideName(first.side as Side, lang), formatDuration(switched.startMinute - first.startMinute, lang), sideName(switched.side as Side, lang))
      : c.subTie(formatDuration(Math.max(sides.leftSunMinutes, sides.rightSunMinutes), lang));
  }
  if (status === 'DOES_NOT_MATTER') {
    const overhead = verdict.timeline.filter((t) => t.sunSide === 'overhead').length;
    return overhead > verdict.timeline.length * 0.3 ? c.subNoMatterHigh : c.subNoMatterLow;
  }
  return c.subNight(sunriseText(verdict, lang));
}

/** The answer, read first: the verdict, one line of why, what to avoid, and the best seats. */
export function Answer({
  verdict,
  vehicle,
  weather,
  selectedSeatId,
  onSelectSeat,
  lang
}: {
  verdict: TripExposureVerdict;
  vehicle: VehicleProfile;
  weather: WeatherData | null;
  selectedSeatId: number | null;
  onSelectSeat: (id: number) => void;
  lang: AppLanguage;
}) {
  const c = COPY[lang];
  const { status, recommendedSide, endAdvice } = verdict;
  const head = verdictHeadline(status, recommendedSide, lang);
  const showSeats = verdict.seatAdvice && verdict.bestSeatIds.length > 0;

  return (
    <section className="answer" aria-live="polite" data-testid="verdict" data-status={status} data-side={recommendedSide} data-end={endAdvice ?? 'none'}>
      <h1 className="verdict-title" data-testid="verdict-title">
        {head.lead}
        <span className="verdict-mark">{head.mark}</span>
        {head.tail}
      </h1>
      <p className="verdict-sub" dangerouslySetInnerHTML={{ __html: subline(verdict, lang) }} />

      {endAdvice && (
        <div className="end-advice" data-testid="end-advice">
          <SunGlyph />
          <div>
            <p className="end-advice-title">{c.endAdvice[endAdvice]}</p>
            <p className="end-advice-why">{c.endAdviceWhy[endAdvice]}</p>
          </div>
        </div>
      )}

      {weather && weather.cloudCoverPct >= 35 && status !== 'NIGHT' && (
        <p className="note">
          <IconInfo />
          <span>{c.weatherCloudy(Math.round(weather.cloudCoverPct))}</span>
        </p>
      )}
      {vehicle.hasCurtains && (status === 'CLEAR' || status === 'LEANING') && (
        <p className="note">
          <IconInfo />
          <span>{c.busCurtains}</span>
        </p>
      )}

      {showSeats && (
        <div className="best" data-testid="best-seats">
          <span className="best-label">{c.bestSeats}</span>
          {verdict.bestSeatIds.map((id) => (
            <button
              key={id}
              type="button"
              className="seat-badge"
              aria-pressed={selectedSeatId === id}
              aria-label={`${c.seat} ${id}`}
              onClick={() => onSelectSeat(id)}
              data-testid={`best-seat-${id}`}
            >
              {id}
            </button>
          ))}
        </div>
      )}
    </section>
  );
}

/** Window-seat average per side, split into proper sun and light sun. */
export function SideBars({ verdict, vehicle, lang }: { verdict: TripExposureVerdict; vehicle: VehicleProfile; lang: AppLanguage }) {
  const c = COPY[lang];
  const bySeat = new Map(verdict.seatsExposure.map((e) => [e.seatId, e]));
  const average = (side: Side) => {
    const list = vehicle.seats.filter((s) => s.isWindow && s.side === side).map((s) => bySeat.get(s.id)).filter((e): e is SeatExposure => !!e);
    const n = Math.max(1, list.length);
    return {
      strong: list.reduce((a, e) => a + e.strongMinutes, 0) / n,
      light: list.reduce((a, e) => a + e.mildMinutes, 0) / n
    };
  };
  const scale = Math.max(1, verdict.tripMinutes);
  return (
    <div className="side-bars" data-testid="side-comparison">
      <h3>{c.sidesTitle}</h3>
      {(['left', 'right'] as const).map((side) => {
        const { strong, light } = average(side);
        return (
          <div key={side} className="side-bar" data-testid={`side-${side}`}>
            <span className="side-bar-name">{side === 'left' ? c.sideDriverShort : c.sideDoorShort}</span>
            <span className="side-bar-track" aria-hidden="true">
              <span className="side-bar-strong" style={{ width: `${Math.min(100, (strong / scale) * 100)}%` }} />
              <span className="side-bar-light" style={{ width: `${Math.min(100, (light / scale) * 100)}%` }} />
            </span>
            <span className="side-bar-mins">{formatDuration(strong + light, lang)}</span>
          </div>
        );
      })}
      <p className="caption">
        {c.sidesCaption} · {formatDuration(verdict.tripMinutes, lang)}
      </p>
    </div>
  );
}
