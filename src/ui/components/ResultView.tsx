import { Component, lazy, Suspense, useMemo, useState, type ReactNode } from 'react';
import { useTripStore } from '../store/trip-store.ts';
import { defaultVehicleRepository } from '../../core/vehicles/vehicle-repository.ts';
import { COPY, verdictHeadline, type AppLanguage } from '../i18n/copy.ts';
import { formatDay, formatTime } from '../format.ts';
import { SideComparison, Verdict } from './Verdict.tsx';
import { defaultFocusIndex } from '../focus.ts';
import { SeatPlan } from './SeatPlan.tsx';
import { TripRuler } from './TripRuler.tsx';
import { RouteFigure } from './RouteFigure.tsx';
import { HowItWorks } from './HowItWorks.tsx';
import { IconChevronDown, IconCube, IconEdit, IconShare, IconTripArrow } from './Icons.tsx';

const VehicleCanvas = lazy(() => import('../three/VehicleCanvas.tsx'));

class ThreeBoundary extends Component<{ fallback: ReactNode; children: ReactNode }, { failed: boolean }> {
  override state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  override render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

function short(name: string): string {
  return name.replace(/^موقف /, '').replace(/\s*\(.*\)$/, '');
}

export function ResultView({ onToast }: { onToast: (text: string) => void }) {
  const s = useTripStore();
  const c = COPY[s.lang];
  const lang: AppLanguage = s.lang;
  const [show3d, setShow3d] = useState(false);
  const vehicle = useMemo(() => defaultVehicleRepository.getProfile(s.vehicleId), [s.vehicleId]);
  const { verdict, route, origin, destination } = s;
  if (!verdict || !route || !origin || !destination) return null;

  const step = s.scrubIndex !== null ? verdict.timeline[Math.min(s.scrubIndex, verdict.timeline.length - 1)] ?? null : null;
  const focusIndex = defaultFocusIndex(verdict);
  const shownStep = step ?? verdict.timeline[focusIndex] ?? null;
  const from = short(lang === 'ar' ? origin.nameAr : origin.nameEn);
  const to = short(lang === 'ar' ? destination.nameAr : destination.nameEn);

  const share = async () => {
    const head = verdictHeadline(verdict.status, verdict.recommendedSide, lang);
    const text = c.shareText(`${head.lead}${head.mark}${head.tail}`, from, to);
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title: c.brand, text, url });
        return;
      }
      await navigator.clipboard.writeText(`${text} ${url}`);
      onToast(c.copied);
    } catch {
      // The user closed the share sheet; nothing to do.
    }
  };

  const bestLine =
    verdict.status !== 'NIGHT' && verdict.status !== 'DOES_NOT_MATTER' && verdict.bestSeatIds.length > 0
      ? `${c.bestSeats}: ${verdict.bestSeatIds.join(lang === 'ar' ? '، ' : ', ')}`
      : null;

  return (
    <main className="result-grid" data-testid="results-screen">
      <div className="result-col">
        <div className="result-bar">
          <button type="button" className="icon-btn" onClick={s.goToInput} data-testid="edit-trip">
            <IconEdit />
            {c.edit}
          </button>
          <div className="trip-summary" data-testid="trip-summary">
            <p className="trip-summary-route">
              {from} <IconTripArrow rtl={lang === 'ar'} /> {to}
            </p>
            <p className="trip-summary-time">
              {formatDay(s.departure, lang)} · {formatTime(s.departure, lang)} · {vehicle.type === 'bus' ? c.bus : c.microbus}
            </p>
          </div>
          <button type="button" className="icon-btn" onClick={() => void share()} data-testid="share-btn">
            <IconShare />
            {c.share}
          </button>
        </div>

        <Verdict verdict={verdict} lang={lang} />

        {bestLine && (
          <p className="teacher-note" data-testid="best-seats">
            {bestLine}
          </p>
        )}

        <SeatPlan vehicle={vehicle} verdict={verdict} step={step} selectedSeatId={s.selectedSeatId} onSelect={s.selectSeat} lang={lang} />

        <SideComparison verdict={verdict} vehicle={vehicle} weather={s.weather} lang={lang} />
      </div>

      <div className="result-col">
        <TripRuler verdict={verdict} scrubIndex={s.scrubIndex} focusIndex={focusIndex} onScrub={s.setScrub} lang={lang} />

        <RouteFigure route={route} verdict={verdict} step={shownStep} origin={origin} destination={destination} lang={lang} />

        <section className="block" data-testid="three-block">
          <div className="block-head">
            <h2 className="block-title">{c.threeTitle}</h2>
          </div>
          <div className="figure">
            {show3d ? (
              <ThreeBoundary fallback={<div className="three-placeholder"><p>{c.threeFailed}</p></div>}>
                <Suspense
                  fallback={
                    <div className="sketching" data-testid="three-loading">
                      <svg width="120" height="48" viewBox="0 0 120 48" aria-hidden="true">
                        <path pathLength={1} d="M6 36V16c0-3 2-5 5-5h66c5 0 9 2 12 5l12 10c2 2 3 4 3 6v4H6Z" />
                      </svg>
                      {c.threeLoading}
                    </div>
                  }
                >
                  <VehicleCanvas
                    vehicle={vehicle}
                    verdict={verdict}
                    scrubIndex={s.scrubIndex}
                    onScrub={s.setScrub}
                    selectedSeatId={s.selectedSeatId}
                    lang={lang}
                  />
                </Suspense>
              </ThreeBoundary>
            ) : (
              <div className="three-placeholder">
                <IconCube style={{ width: 40, height: 40, color: 'var(--ink)' }} />
                <p>
                  {lang === 'ar'
                    ? `شوف الشمس بتدخل من أنهي شباك وبتقع على أنهي كرسي، ومن كرسي رقم ${s.selectedSeatId ?? verdict.bestSeatIds[0] ?? 1} بالظبط.`
                    : `See which window the sun comes through and which seats it lands on, including from seat ${s.selectedSeatId ?? verdict.bestSeatIds[0] ?? 1}.`}
                </p>
                <button type="button" className="cta cta-secondary" style={{ maxWidth: 280 }} onClick={() => setShow3d(true)} data-testid="open-3d">
                  {c.threeLoad}
                </button>
                <p className="hint">{c.threeCost}</p>
              </div>
            )}
          </div>
        </section>

        <details className="more" data-testid="how-it-works">
          <summary>
            {c.howTitle}
            <IconChevronDown />
          </summary>
          <HowItWorks verdict={verdict} route={route} lang={lang} />
        </details>

        {s.fromSharedLink && (
          <button type="button" className="cta" onClick={s.goToInput} data-testid="calc-yours">
            {c.calcYours}
          </button>
        )}
      </div>
    </main>
  );
}
