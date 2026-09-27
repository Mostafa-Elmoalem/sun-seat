import { useMemo } from 'react';
import { useTripStore } from '../../hooks/use-trip-store.ts';
import { defaultVehicleRepository } from '../../../core/vehicles/vehicle-repository.ts';
import { COPY, type AppLanguage } from '../../i18n/copy.ts';
import { ResultBar } from './ResultBar.tsx';
import { VerdictCard } from './VerdictCard.tsx';
import { ResultStage } from './ResultStage.tsx';
import { WorkingDetails } from './WorkingDetails.tsx';

function short(name: string): string {
  return name.replace(/^موقف /, '').replace(/\s*\(.*\)$/, '');
}

/** The result screen: the answer first, then the stage with its time bar, then the working. */
export function ResultView({ onToast }: { onToast: (text: string) => void }) {
  const s = useTripStore();
  const c = COPY[s.lang];
  const lang: AppLanguage = s.lang;
  const vehicle = useMemo(() => defaultVehicleRepository.getProfile(s.vehicleId), [s.vehicleId]);
  const { verdict, route, origin, destination } = s;
  if (!verdict || !route || !origin || !destination) return null;

  const from = short(lang === 'ar' ? origin.nameAr : origin.nameEn);
  const to = short(lang === 'ar' ? destination.nameAr : destination.nameEn);

  return (
    <main className="result-grid" data-testid="results-screen">
      <ResultBar from={from} to={to} departure={s.departure} vehicle={vehicle} verdict={verdict} onEdit={s.goToInput} onToast={onToast} lang={lang} />

      <VerdictCard verdict={verdict} vehicle={vehicle} weather={s.weather} selectedSeatId={s.selectedSeatId} onSelectSeat={s.selectSeat} lang={lang} />

      <ResultStage
        vehicle={vehicle}
        verdict={verdict}
        route={route}
        origin={origin}
        destination={destination}
        destinationName={to}
        scrubIndex={s.scrubIndex}
        onScrub={s.setScrub}
        selectedSeatId={s.selectedSeatId}
        onSelectSeat={s.selectSeat}
        lang={lang}
      />

      <WorkingDetails verdict={verdict} vehicle={vehicle} lang={lang} />

      {s.fromSharedLink ? (
        <button type="button" className="cta" onClick={s.goToInput} data-testid="calc-yours">
          {c.calcYours}
        </button>
      ) : (
        <button type="button" className="cta cta-secondary" onClick={s.goToInput} data-testid="calc-another">
          {c.another}
        </button>
      )}
    </main>
  );
}
