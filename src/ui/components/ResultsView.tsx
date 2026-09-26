import { useState, useMemo, lazy, Suspense, Component, type ReactNode } from 'react';
import {
  useTripStore,
  calculateInstantSeatExposure,
  serializeTripToQuery
} from '../store/trip-store.ts';
import { defaultVehicleRepository } from '../../core/vehicles/vehicle-repository.ts';
import { COPY_DECK, type AppLanguage } from '../i18n/copy.ts';
import { HeroVerdictCard } from './HeroVerdictCard.tsx';
import { SeatHeatmap2D } from './SeatHeatmap2D.tsx';
import { SolarTimeScrubber } from './SolarTimeScrubber.tsx';
import { EducationalDrawer } from './EducationalDrawer.tsx';
import { WeatherBadge } from './WeatherBadge.tsx';
import { ShareModal } from './ShareModal.tsx';
import { formatCairoTime } from '../../core/astronomy/timezone.ts';

const LazyVehicleCanvas = lazy(() => import('../three/VehicleCanvas.tsx'));

interface ErrorBoundaryProps {
  lang: AppLanguage;
  onFallbackTo2D: () => void;
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

export class ThreeChunkErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  override render() {
    if (this.state.hasError) {
      const { lang, onFallbackTo2D } = this.props;
      return (
        <div
          data-testid="three-offline-fallback-banner"
          className="bento-card"
          style={{
            textAlign: 'center',
            padding: '20px 16px',
            background: '#FEF3C7',
            border: '1.5px solid #F59E0B',
            color: '#92400E'
          }}
        >
          <div style={{ fontSize: '28px', marginBottom: '6px' }}>⚡💺</div>
          <h3 style={{ fontSize: '15px', fontWeight: 800, marginBottom: '6px' }}>
            {lang === 'ar'
              ? 'تعذر تحميل المجسم ثلاثي الأبعاد بدون شبكة حالياً'
              : 'Could not load 3D model while offline'}
          </h3>
          <button
            type="button"
            onClick={onFallbackTo2D}
            className="touch-target"
            style={{
              minHeight: '48px',
              padding: '8px 16px',
              background: '#0F172A',
              color: '#FFFFFF',
              borderRadius: '12px',
              border: 'none',
              fontWeight: 800
            }}
          >
            {lang === 'ar' ? '💺 عرض مخطط الكراسي 2.5D' : '💺 Show 2.5D Seat Map'}
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export function ResultsView() {
  const {
    lang,
    origin,
    destination,
    vehicleId,
    departureDateUtc,
    route,
    verdict,
    weather,
    isCalculating,
    selectedSeatId,
    scrubIndex,
    isScrubbing,
    activeTab,
    isDrawerOpen,
    isSharedLinkVisit,
    selectSeat,
    setScrubIndex,
    resetScrubToAverage,
    setActiveTab,
    setDrawerOpen,
    goToInput
  } = useTripStore();

  const copy = COPY_DECK[lang];
  const [shareToast, setShareToast] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);

  const vehicle = useMemo(
    () => defaultVehicleRepository.getProfile(vehicleId),
    [vehicleId]
  );

  const currentStep = useMemo(() => {
    if (!verdict || verdict.timeline.length === 0) return undefined;
    const idx = Math.min(Math.max(0, scrubIndex), verdict.timeline.length - 1);
    return verdict.timeline[idx];
  }, [verdict, scrubIndex]);

  const activeSeatsExposure = useMemo(() => {
    if (!verdict) return [];
    if (isScrubbing && currentStep) {
      return calculateInstantSeatExposure(vehicle, currentStep);
    }
    return verdict.seatsExposure;
  }, [verdict, isScrubbing, currentStep, vehicle]);

  const shareUrl = useMemo(() => {
    if (!origin || !destination) return '';
    const query = serializeTripToQuery({
      originId: origin.id,
      destinationId: destination.id,
      vehicleId: vehicle.id,
      departureDateUtc,
      lang
    });
    return typeof window !== 'undefined'
      ? `${window.location.origin}${window.location.pathname}${query}`
      : query;
  }, [origin, destination, vehicle.id, departureDateUtc, lang]);

  const handleShareClick = async () => {
    if (!origin || !destination) return;
    setIsShareModalOpen(true);

    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(shareUrl);
      } catch {
        // Ignore clipboard error
      }
    }
    setShareToast(true);
    setTimeout(() => setShareToast(false), 3000);
  };

  const originLabel = origin
    ? lang === 'ar'
      ? origin.nameAr.replace('موقف ', '').split(' (')[0]
      : origin.nameEn.split(' (')[0]
    : '';
  const destLabel = destination
    ? lang === 'ar'
      ? destination.nameAr.replace('موقف ', '').split(' (')[0]
      : destination.nameEn.split(' (')[0]
    : '';

  return (
    <main data-testid="results-screen" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      {/* Results Sub-Header Bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '8px'
        }}
      >
        <button
          type="button"
          data-testid="back-to-input-btn"
          onClick={goToInput}
          className="touch-target"
          style={{
            minHeight: '48px',
            padding: '6px 12px',
            background: '#FFFFFF',
            border: '1.5px solid #CBD5E1',
            color: '#0F172A',
            fontSize: '14px',
            fontWeight: 800
          }}
        >
          {copy.btn_edit_trip}
        </button>

        <div
          data-testid="trip-route-summary"
          style={{
            fontSize: '14px',
            fontWeight: 800,
            color: '#0F172A',
            textAlign: 'center',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap'
          }}
        >
          {originLabel} ➔ {destLabel}
        </div>

        <button
          type="button"
          data-testid="share-trip-btn"
          onClick={() => {
            void handleShareClick();
          }}
          className="touch-target"
          style={{
            minHeight: '48px',
            padding: '6px 12px',
            background: '#EEF2FF',
            border: '1.5px solid #6366F1',
            color: '#312E81',
            fontSize: '14px',
            fontWeight: 800
          }}
        >
          {copy.btn_share}
        </button>
      </div>

      {shareToast && (
        <div
          role="status"
          data-testid="share-toast"
          style={{
            padding: '8px 12px',
            borderRadius: '12px',
            background: '#0F172A',
            color: '#FFFFFF',
            fontSize: '13px',
            fontWeight: 700,
            textAlign: 'center'
          }}
        >
          {copy.share_copied_toast}
        </div>
      )}

      {/* 1. HERO VERDICT CARD FIRST (Above the fold at 360x800 in both AR and EN - Q2) */}
      <HeroVerdictCard
        verdict={verdict}
        lang={lang}
        isApproximate={route?.isApproximate ?? false}
        isLoading={isCalculating}
      />

      {/* Non-blocking Weather & Cloud Cover Context Badge (Story 5.2 AC-3) */}
      <WeatherBadge weather={weather} lang={lang} />

      {/* Responsive 2-Column Bento Grid on Tablet/Desktop */}
      {verdict && (
        <div className="bento-results-grid" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {/* View Switcher: 2.5D Seat Map vs See it in 3D */}
            <div
              role="tablist"
              aria-label={lang === 'ar' ? 'طريقة العرض' : 'View mode'}
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '8px',
                background: '#E2E8F0',
                padding: '4px',
                borderRadius: '16px'
              }}
            >
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === '2d'}
                data-testid="view-tab-2d"
                onClick={() => setActiveTab('2d')}
                className="touch-target"
                style={{
                  minHeight: '48px',
                  borderRadius: '12px',
                  border: 'none',
                  background: activeTab === '2d' ? '#FFFFFF' : 'transparent',
                  color: '#0F172A',
                  fontWeight: 800,
                  fontSize: '14px',
                  boxShadow: activeTab === '2d' ? '0 2px 8px rgba(15,23,42,0.08)' : 'none'
                }}
              >
                {copy.tab_seats_2d}
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === '3d'}
                data-testid="view-tab-3d"
                onClick={() => setActiveTab('3d')}
                className="touch-target"
                style={{
                  minHeight: '48px',
                  borderRadius: '12px',
                  border: 'none',
                  background: activeTab === '3d' ? '#FFFFFF' : 'transparent',
                  color: '#0F172A',
                  fontWeight: 800,
                  fontSize: '14px',
                  boxShadow: activeTab === '3d' ? '0 2px 8px rgba(15,23,42,0.08)' : 'none'
                }}
              >
                {copy.tab_model_3d}
              </button>
            </div>

            {activeTab === '2d' ? (
              <SeatHeatmap2D
                vehicle={vehicle}
                seatsExposure={activeSeatsExposure}
                bestSeatIds={verdict.bestSeatIds}
                selectedSeatId={selectedSeatId}
                onSelectSeat={selectSeat}
                currentTimelineStep={currentStep}
                isScrubbing={isScrubbing}
                lang={lang}
              />
            ) : (
              <ThreeChunkErrorBoundary
                lang={lang}
                onFallbackTo2D={() => setActiveTab('2d')}
              >
                <Suspense
                  fallback={
                    <div
                      data-testid="three-loading-skeleton"
                      className="bento-card"
                      style={{
                        textAlign: 'center',
                        padding: '36px 16px',
                        background: '#0F172A',
                        color: '#E2E8F0',
                        fontSize: '14px',
                        fontWeight: 700
                      }}
                    >
                      ⏳ {lang === 'ar' ? 'جاري تحميل المجسم ثلاثي الأبعاد...' : 'Loading 3D scene...'}
                    </div>
                  }
                >
                  {currentStep && (
                    <LazyVehicleCanvas
                      vehicle={vehicle}
                      verdict={verdict}
                      currentStep={currentStep}
                      scrubIndex={scrubIndex}
                      onScrubChange={setScrubIndex}
                      onFallbackTo2D={() => setActiveTab('2d')}
                      selectedSeatId={selectedSeatId}
                      onSelectSeat={selectSeat}
                      lang={lang}
                    />
                  )}
                </Suspense>
              </ThreeChunkErrorBoundary>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {/* Interactive 60fps Solar Time Scrubber (Story 4.3 AC-1) */}
            <SolarTimeScrubber
              timeline={verdict.timeline}
              currentIndex={scrubIndex}
              isScrubbing={isScrubbing}
              onChange={setScrubIndex}
              onResetToAverage={resetScrubToAverage}
              lang={lang}
            />

            {/* Geography One-Liner & Educational Drawer (Story 4.3 AC-2) */}
            <EducationalDrawer
              verdict={verdict}
              isOpen={isDrawerOpen}
              onToggle={() => setDrawerOpen(!isDrawerOpen)}
              lang={lang}
            />

            {isSharedLinkVisit && (
              <button
                type="button"
                data-testid="shared-link-calc-yours-btn"
                onClick={goToInput}
                className="btn-primary-cta"
              >
                {copy.btn_calc_yours}
              </button>
            )}
          </div>
        </div>
      )}

      {verdict && origin && destination && (
        <ShareModal
          isOpen={isShareModalOpen}
          onClose={() => setIsShareModalOpen(false)}
          originName={lang === 'ar' ? origin.nameAr : origin.nameEn}
          destinationName={lang === 'ar' ? destination.nameAr : destination.nameEn}
          vehicleName={lang === 'ar' ? vehicle.nameAr : vehicle.nameEn}
          departureTimeFormatted={formatCairoTime(departureDateUtc, 'time')}
          verdict={verdict}
          shareUrl={shareUrl}
          lang={lang}
        />
      )}
    </main>
  );
}
