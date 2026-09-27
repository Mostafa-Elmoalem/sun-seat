import { useMemo, useState } from 'react';
import type { Place } from '../../../core/types/places.ts';
import { useTripStore } from '../../hooks/use-trip-store.ts';
import { fromNow, tomorrowSameTime } from '../../../app/trip/departure.ts';
import { recentPlaces as distinctRecentPlaces } from '../../../app/trip/recents.ts';
import { COPY, GPS_NAMING, type AppLanguage } from '../../i18n/copy.ts';
import { cairoParts, fromCairo, formatDay, formatTime } from '../../format.ts';
import { PlacePicker } from './PlacePicker.tsx';
import { BusSilhouette, IconInfo, IconLocate, IconSwap, IconTripArrow, MicrobusSilhouette } from '../../shared/Icons.tsx';
import { locateMe } from '../../../app/trip/locate-me.ts';

function PlaceLine({
  tag,
  place,
  placeholder,
  lang,
  invalid,
  onOpen,
  testId
}: {
  tag: string;
  place: Place | null;
  placeholder: string;
  lang: AppLanguage;
  invalid: boolean;
  onOpen: () => void;
  testId: string;
}) {
  const name = place ? (lang === 'ar' ? place.nameAr : place.nameEn) : placeholder;
  const context = place ? (lang === 'ar' ? place.contextAr : place.contextEn ?? place.contextAr) : undefined;
  return (
    <button type="button" className="line-field" onClick={onOpen} aria-invalid={invalid} data-testid={testId}>
      <span className="line-field-tag">{tag}</span>
      <span className="line-field-body">
        <span className={`line-field-value${place ? '' : ' is-empty'}`}>{name}</span>
        {context ? <span className="line-field-context">{context}</span> : null}
      </span>
    </button>
  );
}

export function TripForm() {
  const s = useTripStore();
  const c = COPY[s.lang];
  const [picker, setPicker] = useState<'from' | 'to' | null>(null);
  const [swapTurns, setSwapTurns] = useState(0);
  const [gps, setGps] = useState<'idle' | 'locating' | 'denied'>('idle');
  const useMyLocation = () => {
    setGps('locating');
    locateMe(GPS_NAMING).then(
      (p) => {
        s.setOrigin(p);
        setGps('idle');
      },
      () => setGps('denied')
    );
  };

  const parts = cairoParts(s.departure);
  const recentPlaces = useMemo(() => distinctRecentPlaces(s.recents), [s.recents]);
  const shiftFromNow = (minutes: number) => s.setDeparture(fromNow(minutes));
  const tomorrow = () => s.setDeparture(tomorrowSameTime(s.departure));

  const errorText = s.error === 'MISSING' ? c.errMissing : s.error === 'SAME' ? c.errSame : null;

  return (
    <main className="trip-form" data-testid="home-input-screen">
      {s.recents.length > 0 && (
        <section className="recents" aria-label={c.recents}>
          <p className="section-label">{c.recents}</p>
          <div className="pill-row">
            {s.recents.map((r) => (
              <button
                key={`${r.origin.id}-${r.destination.id}-${r.at}`}
                type="button"
                className="pill"
                onClick={() => void s.applyRecent(r)}
                data-testid="recent-trip"
              >
                {(s.lang === 'ar' ? r.origin.nameAr : r.origin.nameEn).replace(/^موقف /, '')}{' '}
                <IconTripArrow rtl={s.lang === 'ar'} />{' '}
                {(s.lang === 'ar' ? r.destination.nameAr : r.destination.nameEn).replace(/^موقف /, '')}
              </button>
            ))}
          </div>
        </section>
      )}

      <section className="places" aria-label={`${c.from} / ${c.to}`}>
        <PlaceLine
          tag={c.from}
          place={s.origin}
          placeholder={c.fromPlaceholder}
          lang={s.lang}
          invalid={s.error !== null && !s.origin}
          onOpen={() => setPicker('from')}
          testId="origin-field"
        />
        <PlaceLine
          tag={c.to}
          place={s.destination}
          placeholder={c.toPlaceholder}
          lang={s.lang}
          invalid={s.error === 'SAME' || (s.error !== null && !s.destination)}
          onOpen={() => setPicker('to')}
          testId="destination-field"
        />
        <button
          type="button"
          className="swap-btn"
          aria-label={c.swap}
          onClick={() => {
            s.swap();
            setSwapTurns((t) => t + 1);
          }}
          style={{ rotate: `${swapTurns * 180}deg` }}
          data-testid="swap-btn"
        >
          <IconSwap />
        </button>
      </section>

      {s.origin?.kind !== 'gps' && (
        <button type="button" className="btn btn-outline locate-btn" onClick={useMyLocation} disabled={gps === 'locating'} data-testid="locate-btn">
          <IconLocate />
          {gps === 'locating' ? c.locating : c.useMyLocation}
        </button>
      )}
      {gps === 'denied' && <p className="locate-error" role="alert">{c.gpsDenied}</p>}

      <section className="date-line" aria-label={c.when}>
        <p className="section-label">{c.when}</p>
        <div className="date-row">
          <label className="ink-input">
            <span className="ink-input-label">{c.date}</span>
            <span className="ink-input-value">{formatDay(s.departure, s.lang)}</span>
            <input
              type="date"
              value={parts.date}
              onChange={(e) => {
                const next = fromCairo(e.target.value, parts.time);
                if (next) s.setDeparture(next);
              }}
              data-testid="date-input"
              aria-label={c.date}
            />
          </label>
          <label className="ink-input">
            <span className="ink-input-label">{c.time}</span>
            <span className="ink-input-value">{formatTime(s.departure, s.lang)}</span>
            <input
              type="time"
              value={parts.time}
              onChange={(e) => {
                const next = fromCairo(parts.date, e.target.value);
                if (next) s.setDeparture(next);
              }}
              data-testid="time-input"
              aria-label={c.time}
            />
          </label>
        </div>
        <div className="pill-grid">
          <button type="button" className="pill" aria-pressed={s.isNow} onClick={s.setNow} data-testid="time-now">
            {c.now}
          </button>
          <button type="button" className="pill" aria-pressed={false} onClick={() => shiftFromNow(30)} data-testid="time-plus-30">
            {c.in30}
          </button>
          <button type="button" className="pill" aria-pressed={false} onClick={tomorrow} data-testid="time-tomorrow">
            {c.tomorrow}
          </button>
        </div>
      </section>

      <section aria-label={c.vehicle}>
        <p className="section-label">{c.vehicle}</p>
        <div className="vehicle-choice" role="radiogroup" aria-label={c.vehicle}>
          <button
            type="button"
            role="radio"
            aria-checked={s.vehicleId === 'microbus-14'}
            className="vehicle-option"
            onClick={() => s.setVehicle('microbus-14')}
            data-testid="vehicle-microbus"
          >
            <MicrobusSilhouette />
            <span className="vehicle-option-name">{c.microbus}</span>
            <span className="vehicle-option-seats">{c.microbusSeats}</span>
          </button>
          <button
            type="button"
            role="radio"
            aria-checked={s.vehicleId === 'bus-49'}
            className="vehicle-option"
            onClick={() => s.setVehicle('bus-49')}
            data-testid="vehicle-bus"
          >
            <BusSilhouette />
            <span className="vehicle-option-name">{c.bus}</span>
            <span className="vehicle-option-seats">{c.busSeats}</span>
          </button>
        </div>
      </section>

      {errorText && (
        <p className="form-error" role="alert" data-testid="form-error">
          <IconInfo />
          {errorText}
        </p>
      )}

      <button
        type="button"
        className="cta"
        disabled={s.calculating}
        onClick={() => void s.calculate()}
        data-testid="calculate-btn"
      >
        {s.calculating ? c.ctaBusy : c.cta}
      </button>

      {picker && (
        <PlacePicker
          field={picker}
          lang={s.lang}
          recentPlaces={recentPlaces}
          onClose={() => setPicker(null)}
          onPick={(p) => {
            if (picker === 'from') s.setOrigin(p);
            else s.setDestination(p);
            setPicker(null);
          }}
        />
      )}
    </main>
  );
}
