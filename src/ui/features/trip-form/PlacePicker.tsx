import { useEffect, useMemo, useRef, useState } from 'react';
import type { Place } from '../../../core/types/places.ts';
import { defaultPlacesRepository } from '../../../adapters/places-repository.ts';
import { normalizeArabic } from '../../../core/geometry/normalize-arabic.ts';
import { calculateDistanceKm } from '../../../core/geometry/bearing.ts';
import { COPY, GPS_NAMING, placeKindLabel, type AppLanguage } from '../../i18n/copy.ts';
import { IconBack, IconClose, IconLocate, IconSearch, PlaceKindIcon } from '../../shared/Icons.tsx';
import { locateMe } from '../../../app/trip/locate-me.ts';

interface PlacePickerProps {
  field: 'from' | 'to';
  lang: AppLanguage;
  recentPlaces: Place[];
  onPick: (place: Place) => void;
  onClose: () => void;
}

type OnlineState = { status: 'idle' | 'loading' | 'done'; results: Place[] };

function placeName(p: Place, lang: AppLanguage) {
  return lang === 'ar' ? p.nameAr : p.nameEn;
}

function placeContext(p: Place, lang: AppLanguage) {
  const context = lang === 'ar' ? p.contextAr : p.contextEn ?? p.contextAr;
  const kind = placeKindLabel(p.kind, lang);
  return context ? `${kind} · ${context}` : kind;
}

/** Online results often repeat a local one under an English name; same spot and kind counts as the same place. */
function isDuplicate(a: Place, list: Place[]): boolean {
  const n = normalizeArabic(a.nameAr);
  return list.some((b) => {
    const km = calculateDistanceKm(a.location.lat, a.location.lng, b.location.lat, b.location.lng);
    return (normalizeArabic(b.nameAr) === n && km < 2) || (km < 0.6 && b.kind === a.kind) || (b.nameEn.toLowerCase() === a.nameEn.toLowerCase() && km < 2);
  });
}

export function PlacePicker({ field, lang, recentPlaces, onPick, onClose }: PlacePickerProps) {
  const c = COPY[lang];
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState('');
  const [gazetteerReady, setGazetteerReady] = useState(defaultPlacesRepository.isGazetteerLoaded);
  const [online, setOnline] = useState<OnlineState>({ status: 'idle', results: [] });
  const [gps, setGps] = useState<'idle' | 'locating' | 'denied'>('idle');
  const isOffline = typeof navigator !== 'undefined' && navigator.onLine === false;

  useEffect(() => {
    inputRef.current?.focus();
    let alive = true;
    void defaultPlacesRepository.loadGazetteer().then(() => {
      if (alive) setGazetteerReady(defaultPlacesRepository.isGazetteerLoaded);
    });
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      alive = false;
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose]);

  const local = useMemo(
    () => (query.trim() ? defaultPlacesRepository.search(query, 8) : []),
    // gazetteerReady is a dependency so the search re-runs once the offline index lands
    [query, gazetteerReady]
  );

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2 || isOffline) {
      setOnline({ status: 'idle', results: [] });
      return;
    }
    const controller = new AbortController();
    setOnline((s) => ({ status: 'loading', results: s.results }));
    const timer = setTimeout(() => {
      void defaultPlacesRepository.searchOnline(q, lang, controller.signal).then((results) => {
        if (!controller.signal.aborted) setOnline({ status: 'done', results });
      });
    }, 350);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, lang, isOffline]);

  const onlineExtra = online.results.filter((p) => !isDuplicate(p, local)).slice(0, 8);

  const locate = () => {
    setGps('locating');
    locateMe(GPS_NAMING).then(onPick, () => setGps('denied'));
  };

  const firstResult = local[0] ?? onlineExtra[0];

  const row = (p: Place, key: string) => (
    <li key={key}>
      <button type="button" className="place-row" onClick={() => onPick(p)} data-testid="place-option">
        <span className="place-row-icon">
          <PlaceKindIcon kind={p.kind} />
        </span>
        <span>
          <span className="place-row-name">{placeName(p, lang)}</span>
          <br />
          <span className="place-row-context">{placeContext(p, lang)}</span>
        </span>
      </button>
    </li>
  );

  const hasQuery = query.trim().length > 0;
  const nothingFound = hasQuery && local.length === 0 && onlineExtra.length === 0 && online.status !== 'loading';

  return (
    <div className="sheet" role="dialog" aria-modal="true" aria-label={field === 'from' ? c.from : c.to}>
      <div className="sheet-panel">
        <div className="sheet-head">
          <button type="button" className="icon-btn" onClick={onClose} aria-label={c.back}>
            <IconBack />
          </button>
          <label className="visually-hidden" htmlFor="place-search">
            {field === 'from' ? c.from : c.to}
          </label>
          <input
            id="place-search"
            ref={inputRef}
            className="sheet-search"
            type="search"
            enterKeyHint="search"
            autoComplete="off"
            placeholder={field === 'from' ? c.searchPlaceholderFrom : c.searchPlaceholderTo}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && firstResult) onPick(firstResult);
            }}
            data-testid="place-search-input"
          />
          {hasQuery ? (
            <button type="button" className="icon-btn" onClick={() => setQuery('')} aria-label={c.clear}>
              <IconClose />
            </button>
          ) : (
            <span className="icon-btn" aria-hidden="true" style={{ color: 'var(--pencil)' }}>
              <IconSearch />
            </span>
          )}
        </div>

        <div className="sheet-body">
          {!hasQuery && (
            <>
              <ul style={{ listStyle: 'none' }}>
                <li>
                  <button type="button" className="place-row place-row-gps" onClick={locate} disabled={gps === 'locating'}>
                    <span className="place-row-icon">
                      <IconLocate />
                    </span>
                    <span>
                      <span className="place-row-name">{gps === 'locating' ? c.locating : c.myLocation}</span>
                      <br />
                      <span className="place-row-context">{gps === 'denied' ? c.gpsDenied : c.myLocationHint}</span>
                    </span>
                  </button>
                </li>
              </ul>

              {recentPlaces.length > 0 && (
                <>
                  <p className="sheet-group-label">{c.recents}</p>
                  <ul style={{ listStyle: 'none' }}>{recentPlaces.map((p, i) => row(p, `r-${i}-${p.id}`))}</ul>
                </>
              )}

              <p className="sheet-group-label">{c.popular}</p>
              <ul style={{ listStyle: 'none' }}>
                {defaultPlacesRepository.getPopular(10).map((p) => row(p, `pop-${p.id}`))}
              </ul>
            </>
          )}

          {hasQuery && (
            <>
              {isOffline && <p className="sheet-note">{c.offlineSearch}</p>}
              {local.length > 0 && (
                <>
                  <p className="sheet-group-label">{c.localResults}</p>
                  <ul style={{ listStyle: 'none' }}>{local.map((p) => row(p, `l-${p.id}`))}</ul>
                </>
              )}
              {(onlineExtra.length > 0 || online.status === 'loading') && (
                <>
                  <p className="sheet-group-label" aria-live="polite">
                    {online.status === 'loading' ? c.searchingOnline : c.onlineResults}
                  </p>
                  <ul style={{ listStyle: 'none' }}>{onlineExtra.map((p) => row(p, `o-${p.id}`))}</ul>
                </>
              )}
              {nothingFound && <p className="sheet-note">{c.noResults}</p>}
            </>
          )}
        </div>
        <p className="sheet-foot">{c.osm}</p>
      </div>
    </div>
  );
}
