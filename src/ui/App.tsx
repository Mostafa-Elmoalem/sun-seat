import { useEffect, useState } from 'react';
import { useTripStore } from './store/trip-store.ts';
import { COPY_DECK } from './i18n/copy.ts';
import { HomeView } from './components/HomeView.tsx';
import { ResultsView } from './components/ResultsView.tsx';
import { useNetworkStatus } from './hooks/use-network-status.ts';
import { registerServiceWorker } from '../adapters/pwa-register.ts';

export function App() {
  const { lang, activeScreen, setLang, hydrateFromQuery } = useTripStore();
  const copy = COPY_DECK[lang];
  const { isOffline, saveData } = useNetworkStatus();
  const [swUpdateAction, setSwUpdateAction] = useState<(() => void) | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    registerServiceWorker((activateUpdate) => {
      setSwUpdateAction(() => activateUpdate);
    });

    if (window.location.search) {
      void hydrateFromQuery(window.location.search);
    }
  }, [hydrateFromQuery]);

  return (
    <div
      dir={lang === 'ar' ? 'rtl' : 'ltr'}
      lang={lang}
      className="app-shell"
      data-testid="app-shell"
    >
      {/* Compact 52px Top App Header */}
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          minHeight: '48px',
          padding: '4px 6px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span
            aria-hidden="true"
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #F59E0B 0%, #0EA5E9 100%)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '20px',
              boxShadow: '0 4px 10px rgba(245, 158, 11, 0.25)'
            }}
          >
            ☀️
          </span>
          <span
            style={{
              fontSize: '20px',
              fontWeight: 900,
              color: '#0F172A',
              letterSpacing: '-0.02em'
            }}
          >
            {copy.app_title}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {isOffline && (
            <span
              data-testid="offline-status-badge"
              style={{
                fontSize: '11px',
                fontWeight: 800,
                padding: '4px 10px',
                borderRadius: '999px',
                background: '#FEF3C7',
                color: '#92400E',
                border: '1px solid #F59E0B'
              }}
            >
              {copy.offline_badge}
            </span>
          )}

          {!isOffline && saveData && (
            <span
              data-testid="savedata-status-badge"
              style={{
                fontSize: '11px',
                fontWeight: 800,
                padding: '4px 10px',
                borderRadius: '999px',
                background: '#E0F2FE',
                color: '#0369A1',
                border: '1px solid #0EA5E9'
              }}
            >
              {lang === 'ar' ? 'توفير بيانات ⚡' : 'Save-Data ⚡'}
            </span>
          )}

          <button
            type="button"
            data-testid="lang-toggle-btn"
            onClick={() => setLang(lang === 'ar' ? 'en' : 'ar')}
            className="touch-target"
            aria-label={lang === 'ar' ? 'Switch to English' : 'التبديل للعربية'}
            style={{
              minHeight: '48px',
              minWidth: '48px',
              padding: '0 12px',
              borderRadius: '12px',
              background: '#FFFFFF',
              border: '1.5px solid #CBD5E1',
              color: '#0F172A',
              fontSize: '13px',
              fontWeight: 800
            }}
          >
            {lang === 'ar' ? 'EN' : 'عربي'}
          </button>
        </div>
      </header>

      {/* Non-intrusive Service Worker Update Toast (Story 5.1 AC-3) */}
      {swUpdateAction && (
        <div
          role="status"
          data-testid="sw-update-toast"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '8px',
            padding: '8px 12px',
            borderRadius: '12px',
            background: '#0F172A',
            color: '#FFFFFF',
            fontSize: '12px',
            fontWeight: 700
          }}
        >
          <span>
            {lang === 'ar' ? '✨ تحديث جديد متاح للتطبيق' : '✨ New version available'}
          </span>
          <button
            type="button"
            onClick={() => swUpdateAction()}
            style={{
              padding: '4px 10px',
              borderRadius: '8px',
              border: 'none',
              background: '#0EA5E9',
              color: '#FFFFFF',
              fontWeight: 800,
              cursor: 'pointer'
            }}
          >
            {lang === 'ar' ? 'تحديث' : 'Update'}
          </button>
        </div>
      )}

      {activeScreen === 'input' ? <HomeView /> : <ResultsView />}
    </div>
  );
}
