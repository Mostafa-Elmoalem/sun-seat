import { useMemo, useState } from 'react';
import type { Place } from '../../core/types/places.ts';
import { useTripStore, roundToFiveMinutes } from '../store/trip-store.ts';
import { COPY, type AppLanguage } from '../i18n/copy.ts';
import { cairoParts, fromCairo, formatDay, formatTime } from '../format.ts';
import { calculateSunPosition } from '../../core/astronomy/noaa-solar.ts';
import { PlacePicker } from './PlacePicker.tsx';
import { BusSilhouette, IconInfo, IconLocate, IconSwap, IconTripArrow, MicrobusSilhouette } from './Icons.tsx';
import { locateMe } from '../geo.ts';

const CAIRO = { lat: 30.0444, lng: 31.2357 };

function PlaceButton({
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
    <button type="button" className="place" onClick={onOpen} aria-invalid={invalid} data-testid={testId}>
      <span className="place-tag">{tag}</span>
      <span className={`place-value${place ? '' : ' is-empty'}`}>{name}</span>
      {context ? <span className="place-context">{context}</span> : null}
    </button>
  );
}

/** How high the sun stands at the chosen time: nine lattice openings, lit from the horizon up. */
function SunGauge({ departure, place, lang }: { departure: Date; place: Place | null; lang: AppLanguage }) {
  const c = COPY[lang];
  const at = place?.location ?? CAIRO;
  const elevation = calculateSunPosition(at.lat, at.lng, departure).elevation;
  const lit = elevation <= 0 ? 0 : Math.max(1, Math.min(9, Math.ceil(elevation / 10)));
  return (
    <div className="sun-gauge" data-testid="sun-gauge">
      <svg width="118" height="16" viewBox="0 0 118 16" aria-hidden="true" direction="ltr">
        {Array.from({ length: 9 }, (_, i) => {
          const cx = 7 + i * 13;
          return <path key={i} d={`M${cx} 1.5L${cx + 6.5} 8L${cx} 14.5L${cx - 6.5} 8Z`} fill={i < lit ? '#ffb52e' : '#d6dbd7'} />;
        })}
      </svg>
      <span>{elevation <= 0 ? c.sunDown : c.sunHeight(Math.round(elevation))}</span>
    </div>
  );
}

function openPicker(e: React.MouseEvent<HTMLInputElement>) {
  // Desktop browsers focus a segment of an invisible date or time input instead of opening it.
  try {
    e.currentTarget.showPicker?.();
  } catch {
    // Some browsers refuse showPicker outside a direct gesture; the native control still works.
  }
}

export function TripForm() {
  const s = useTripStore();
  const c = COPY[s.lang];
  const [picker, setPicker] = useState<'from' | 'to' | null>(null);
  const [swapTurns, setSwapTurns] = useState(0);
  const [gps, setGps] = useState<'idle' | 'locating' | 'denied'>('idle');
  const useMyLocation = () => {
    setGps('locating');
    locateMe().then(
      (p) => {
        s.setOrigin(p);
        setGps('idle');
      },
      () => setGps('denied')
    );
  };

  const parts = cairoParts(s.departure);
  const recentPlaces = useMemo(() => {
    const seen = new Set<string>();
    const out: Place[] = [];
    for (const r of s.recents) {
      for (const p of [r.origin, r.destination]) {
        const key = `${p.location.lat.toFixed(3)},${p.location.lng.toFixed(3)}`;
        if (!seen.has(key) && p.kind !== 'gps') {
          seen.add(key);
          out.push(p);
        }
      }
    }
    return out.slice(0, 4);
  }, [s.recents]);

  const shiftFromNow = (minutes: number) => s.setDeparture(roundToFiveMinutes(new Date(Date.now() + minutes * 60_000)));
  const tomorrowSameTime = () => {
    const base = s.departure.getTime() < Date.now() + 3600_000 ? new Date() : s.departure;
    s.setDeparture(roundToFiveMinutes(new Date(base.getTime() + 86_400_000)));
  };

  const errorText = s.error === 'MISSING' ? c.errMissing : s.error === 'SAME' ? c.errSame : null;
  const short = (name: string) => name.replace(/^موقف /, '');

  return (
    <main className="form" data-testid="home-input-screen">
      <p className="tagline">{c.tagline}</p>

      {s.recents.length > 0 && (
        <section className="recents" aria-label={c.recents}>
          <h2 className="label">{c.recents}</h2>
          <div className="chips">
            {s.recents.map((r) => (
              <button key={`${r.origin.id}-${r.destination.id}-${r.at}`} type="button" className="chip" onClick={() => void s.applyRecent(r)} data-testid="recent-trip">
                {short(s.lang === 'ar' ? r.origin.nameAr : r.origin.nameEn)}
                <IconTripArrow rtl={s.lang === 'ar'} />
                {short(s.lang === 'ar' ? r.destination.nameAr : r.destination.nameEn)}
              </button>
            ))}
          </div>
        </section>
      )}

      <section className="slab trip" aria-label={`${c.from} / ${c.to}`}>
        <span className="trip-rail" aria-hidden="true" />
        <div className="trip-row">
          <span className="trip-dot" aria-hidden="true" />
          <PlaceButton
            tag={c.from}
            place={s.origin}
            placeholder={c.fromPlaceholder}
            lang={s.lang}
            invalid={s.error !== null && !s.origin}
            onOpen={() => setPicker('from')}
            testId="origin-field"
          />
          {s.origin?.kind !== 'gps' && (
            <button type="button" className="locate" onClick={useMyLocation} disabled={gps === 'locating'} aria-label={c.useMyLocationLabel} data-testid="locate-btn">
              <IconLocate />
              {gps === 'locating' ? c.locating : c.useMyLocation}
            </button>
          )}
        </div>
        <div className="trip-divider">
          <button
            type="button"
            className="swap"
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
        </div>
        <div className="trip-row">
          <span className="trip-dot is-to" aria-hidden="true" />
          <PlaceButton
            tag={c.to}
            place={s.destination}
            placeholder={c.toPlaceholder}
            lang={s.lang}
            invalid={s.error === 'SAME' || (s.error !== null && !s.destination)}
            onOpen={() => setPicker('to')}
            testId="destination-field"
          />
        </div>
      </section>
      {gps === 'denied' && (
        <p className="field-error" role="alert">
          <IconInfo />
          {c.gpsDenied}
        </p>
      )}

      <section className="slab when" aria-label={c.when}>
        <h2 className="label">{c.when}</h2>
        <div className="when-row">
          <label className="when-field">
            <span className="label">{c.time}</span>
            <span className="when-big">{formatTime(s.departure, s.lang)}</span>
            <input
              className="overlay-input"
              type="time"
              value={parts.time}
              onClick={openPicker}
              onChange={(e) => {
                const next = fromCairo(parts.date, e.target.value);
                if (next) s.setDeparture(next);
              }}
              data-testid="time-input"
              aria-label={c.time}
            />
          </label>
          <label className="when-field">
            <span className="label">{c.date}</span>
            <span className="when-mid">{formatDay(s.departure, s.lang)}</span>
            <input
              className="overlay-input"
              type="date"
              value={parts.date}
              onClick={openPicker}
              onChange={(e) => {
                const next = fromCairo(e.target.value, parts.time);
                if (next) s.setDeparture(next);
              }}
              data-testid="date-input"
              aria-label={c.date}
            />
          </label>
        </div>
        <SunGauge departure={s.departure} place={s.origin} lang={s.lang} />
        <div className="chips chips-3">
          <button type="button" className="chip" aria-pressed={s.isNow} onClick={s.setNow} data-testid="time-now">
            {c.now}
          </button>
          <button type="button" className="chip" aria-pressed={false} onClick={() => shiftFromNow(30)} data-testid="time-plus-30">
            {c.in30}
          </button>
          <button type="button" className="chip" aria-pressed={false} onClick={tomorrowSameTime} data-testid="time-tomorrow">
            {c.tomorrow}
          </button>
        </div>
      </section>

      <section aria-label={c.vehicle}>
        <h2 className="label" style={{ marginBottom: 8 }}>
          {c.vehicle}
        </h2>
        <div className="vehicle" role="radiogroup" aria-label={c.vehicle}>
          <button
            type="button"
            role="radio"
            aria-checked={s.vehicleId === 'microbus-14'}
            className="vehicle-option"
            onClick={() => s.setVehicle('microbus-14')}
            data-testid="vehicle-microbus"
          >
            <MicrobusSilhouette />
            <span className="vehicle-name">{c.microbus}</span>
            <span className="vehicle-seats">{c.microbusSeats}</span>
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
            <span className="vehicle-name">{c.bus}</span>
            <span className="vehicle-seats">{c.busSeats}</span>
          </button>
        </div>
      </section>

      {errorText && (
        <p className="field-error" role="alert" data-testid="form-error">
          <IconInfo />
          {errorText}
        </p>
      )}

      <div className="cta-dock">
        <button type="button" className="cta" disabled={s.calculating} onClick={() => void s.calculate()} data-testid="calculate-btn">
          {s.calculating ? c.ctaBusy : c.cta}
        </button>
      </div>

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
