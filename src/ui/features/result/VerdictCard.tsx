import { useMemo } from 'react';
import type { TripExposureVerdict, VehicleProfile } from '../../../core/types/vehicle.ts';
import type { WeatherData } from '../../../adapters/weather-service.ts';
import { presentVerdict } from '../../../app/result/verdict-model.ts';
import { COPY, verdictHeadline, type AppLanguage } from '../../i18n/copy.ts';
import { reasonText } from '../../i18n/verdict-text.ts';
import { IconInfo, SunDot } from '../../shared/Icons.tsx';

/** The teacher's red ring around the answer. Crisp geometry, slightly open at the end. */
function Ring() {
  return (
    <svg className="verdict-mark-ring" viewBox="0 0 100 40" preserveAspectRatio="none" aria-hidden="true">
      <path pathLength={1} d="M 58 3.5 C 84 2.5, 99 10, 98 21 C 97 33, 70 38.5, 44 37.5 C 17 36.5, 1.5 30, 2.5 19 C 3.5 8.5, 25 2, 54 2.8 C 66 3.2, 76 5.5, 83 8.5" />
    </svg>
  );
}

export interface VerdictCardProps {
  verdict: TripExposureVerdict;
  vehicle: VehicleProfile;
  weather: WeatherData | null;
  selectedSeatId: number | null;
  onSelectSeat: (id: number) => void;
  lang: AppLanguage;
}

/** The answer, read first: the verdict circled in red, one line of why, what to avoid, and the seats to take. */
export function VerdictCard({ verdict, vehicle, weather, selectedSeatId, onSelectSeat, lang }: VerdictCardProps) {
  const c = COPY[lang];
  const model = useMemo(() => presentVerdict(verdict, vehicle), [verdict, vehicle]);
  const head = verdictHeadline(model.status, model.side, lang);

  return (
    <section className="verdict" aria-live="polite" data-testid="verdict" data-status={model.status} data-side={model.side} data-end={model.endAdvice ?? 'none'}>
      <h1 className="verdict-title" data-testid="verdict-title">
        {head.lead}
        <span className="verdict-mark">
          {head.mark}
          <Ring />
        </span>
        {head.tail}
      </h1>
      <p className="verdict-sub" dangerouslySetInnerHTML={{ __html: reasonText(model.reason, lang) }} />

      {model.endAdvice && (
        <div className="end-advice" data-testid="end-advice">
          <SunDot />
          <div>
            <p className="end-advice-title">{c.endAdvice[model.endAdvice]}</p>
            <p className="end-advice-why">{c.endAdviceWhy[model.endAdvice]}</p>
          </div>
        </div>
      )}

      {weather && weather.cloudCoverPct >= 35 && model.status !== 'NIGHT' && (
        <p className="verdict-note">
          <IconInfo />
          <span>{c.weatherCloudy(Math.round(weather.cloudCoverPct))}</span>
        </p>
      )}
      {model.curtainsCaveat && (
        <p className="verdict-note">
          <IconInfo />
          <span>{c.busCurtains}</span>
        </p>
      )}

      {model.bestSeats.length > 0 && (
        <div className="best-seats" data-testid="best-seats">
          <span className="best-seats-label">{c.bestSeats}</span>
          {model.bestSeats.map((id) => (
            <button
              key={id}
              type="button"
              className="seat-chip"
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
