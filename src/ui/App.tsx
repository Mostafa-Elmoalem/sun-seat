import { useEffect, useState } from 'react';
import { tripStore, warmPlaces } from '../app/trip/trip-store.ts';
import { useTripStore } from './hooks/use-trip-store.ts';
import { COPY } from './i18n/copy.ts';
import { TripForm } from './features/trip-form/TripForm.tsx';
import { ResultView } from './features/result/ResultView.tsx';
import { BrandMark, IconOffline } from './shared/Icons.tsx';
import { useNetworkStatus } from './hooks/use-network-status.ts';
import { registerServiceWorker } from '../adapters/pwa-register.ts';

export function App() {
  const lang = useTripStore((s) => s.lang);
  const screen = useTripStore((s) => s.screen);
  const setLang = useTripStore((s) => s.setLang);
  const hydrateFromQuery = useTripStore((s) => s.hydrateFromQuery);
  const c = COPY[lang];
  const { isOffline } = useNetworkStatus();
  const [toast, setToast] = useState<string | null>(null);
  const [update, setUpdate] = useState<(() => void) | null>(null);

  useEffect(() => {
    if (import.meta.env.PROD) registerServiceWorker((activate) => setUpdate(() => activate));
    if (window.location.search) void hydrateFromQuery(window.location.search);
    warmPlaces();
    // Phone back button on the result screen: return to the form.
    const onPop = () => {
      if (!window.location.search && tripStore.getState().screen === 'result') tripStore.setState({ screen: 'input', scrubIndex: null });
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, [hydrateFromQuery]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3200);
    return () => clearTimeout(t);
  }, [toast]);

  return (
    <div className={`page${screen === 'result' ? ' page-wide' : ''}`} dir={lang === 'ar' ? 'rtl' : 'ltr'} lang={lang === 'ar' ? 'ar-EG' : 'en'} data-testid="app-shell">
      <header className="topbar">
        <div className="brand">
          <BrandMark />
          <span>{c.brand}</span>
        </div>
        <div className="topbar-actions">
          {isOffline && (
            <span className="chip-status" data-testid="offline-badge">
              <IconOffline style={{ width: 16, height: 16 }} />
              {c.offline}
            </span>
          )}
          <button
            type="button"
            className="btn btn-outline"
            onClick={() => setLang(lang === 'ar' ? 'en' : 'ar')}
            aria-label={c.langToggleLabel}
            data-testid="lang-toggle"
          >
            {c.langToggle}
          </button>
        </div>
      </header>

      {screen === 'input' ? (
        <>
          <p className="intro" dangerouslySetInnerHTML={{ __html: c.intro }} />
          <TripForm />
        </>
      ) : (
        <ResultView onToast={setToast} />
      )}

      <footer className="footer">
        {lang === 'ar'
          ? 'مكان الشمس محسوب على موبايلك. الأماكن والطرق من © OpenStreetMap. مش بنحفظ مكانك.'
          : 'Sun position is computed on your phone. Places and roads © OpenStreetMap. Your location is never stored.'}
      </footer>

      {toast && (
        <div className="toast" role="status">
          <span>{toast}</span>
        </div>
      )}
      {update && (
        <div className="toast" role="status" data-testid="update-toast">
          <span>{c.newVersion}</span>
          <button type="button" onClick={() => update()}>
            {c.update}
          </button>
        </div>
      )}
    </div>
  );
}
