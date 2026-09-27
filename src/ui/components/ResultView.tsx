import { Component, lazy, Suspense, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useTripStore } from '../store/trip-store.ts';
import { defaultVehicleRepository } from '../../core/vehicles/vehicle-repository.ts';
import type { TripExposureVerdict, VehicleProfile } from '../../core/types/vehicle.ts';
import { COPY, verdictHeadline, type AppLanguage } from '../i18n/copy.ts';
import { formatDay, formatTime } from '../format.ts';
import { Answer } from './Verdict.tsx';
import { defaultFocusIndex } from '../focus.ts';
import { PlanLegend, SeatDetail, SeatPlan } from './SeatPlan.tsx';
import { TripStrip } from './TripStrip.tsx';
import { HowItWorks } from './HowItWorks.tsx';
import { IconChevronDown, IconClose, IconEdit, IconShare, IconTripArrow } from './Icons.tsx';

const VehicleCanvas = lazy(() => import('../three/VehicleCanvas.tsx'));

/** Download size of the 3D view (three.js chunk plus the microbus body), shown before a manual load. */
const THREE_KB = 250;

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

/** A lattice row whose openings light up in turn: the 3D is on its way. */
function LoadingLattice() {
  return (
    <svg className="loading-lattice" width="150" height="20" viewBox="0 0 150 20" aria-hidden="true">
      {Array.from({ length: 9 }, (_, i) => (
        <rect key={i} x={i * 16 + 3} y="3" width="10" height="10" rx="1.5" transform={`rotate(45 ${i * 16 + 8} 8)`} style={{ '--i': i } as React.CSSProperties} />
      ))}
    </svg>
  );
}

function wantsManual3d(): boolean {
  const conn = (navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } }).connection;
  return !!conn?.saveData || /(^|-)2g$/.test(conn?.effectiveType ?? '');
}

/**
 * The 3D view renders after the answer: it starts loading once the page is idle,
 * or on request when the rider saves data or is on a 2G connection.
 */
function ThreeStage(props: {
  vehicle: VehicleProfile;
  verdict: TripExposureVerdict;
  scrubIndex: number | null;
  selectedSeatId: number | null;
  lang: AppLanguage;
  destinationName: string;
}) {
  const c = COPY[props.lang];
  const [show, setShow] = useState(false);
  const [manual] = useState(wantsManual3d);

  useEffect(() => {
    if (manual) return;
    const w = window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number; cancelIdleCallback?: (id: number) => void };
    if (w.requestIdleCallback) {
      const id = w.requestIdleCallback(() => setShow(true), { timeout: 1500 });
      return () => w.cancelIdleCallback?.(id);
    }
    const t = setTimeout(() => setShow(true), 700);
    return () => clearTimeout(t);
  }, [manual]);

  const poster = (loading: boolean) => (
    <div className="three-poster" data-testid={loading ? 'three-loading' : 'three-manual'}>
      {loading ? (
        <>
          <LoadingLattice />
          <span>{c.threeLoading}</span>
        </>
      ) : (
        <>
          <button type="button" className="cta" onClick={() => setShow(true)} data-testid="open-3d">
            {c.threeLoad}
          </button>
          <span>{c.threeCost(THREE_KB)}</span>
        </>
      )}
    </div>
  );

  if (!show) return poster(!manual);
  return (
    <ThreeBoundary fallback={<div className="three-poster">{c.threeFailed}</div>}>
      <Suspense fallback={poster(true)}>
        <VehicleCanvas
          vehicle={props.vehicle}
          verdict={props.verdict}
          scrubIndex={props.scrubIndex}
          selectedSeatId={props.selectedSeatId}
          lang={props.lang}
          destinationName={props.destinationName}
        />
      </Suspense>
    </ThreeBoundary>
  );
}

export function ResultView({ onToast }: { onToast: (text: string) => void }) {
  const s = useTripStore();
  const c = COPY[s.lang];
  const lang: AppLanguage = s.lang;
  const vehicle = useMemo(() => defaultVehicleRepository.getProfile(s.vehicleId), [s.vehicleId]);
  const [playing, setPlaying] = useState(false);
  const { verdict, route, origin, destination, scrubIndex, setScrub } = s;

  // Play the trip: sweep the timeline in about 12 seconds; every picture follows.
  useEffect(() => {
    if (!playing || !verdict) return;
    const total = verdict.timeline.length;
    const stepMs = Math.max(30, 12_000 / Math.max(1, total));
    let i = scrubIndex ?? -1;
    if (i >= total - 1) i = -1;
    const timer = setInterval(() => {
      i += 1;
      if (i >= total) {
        setPlaying(false);
        return;
      }
      setScrub(i);
    }, stepMs);
    return () => clearInterval(timer);
    // The interval owns the playhead once started; scrubIndex is read only at the start.
  }, [playing, verdict, setScrub]);

  if (!verdict || !route || !origin || !destination) return null;

  const step = scrubIndex !== null ? verdict.timeline[Math.min(scrubIndex, verdict.timeline.length - 1)] ?? null : null;
  const shownStep = step ?? verdict.timeline[defaultFocusIndex(verdict)] ?? null;
  const from = short(lang === 'ar' ? origin.nameAr : origin.nameEn);
  const to = short(lang === 'ar' ? destination.nameAr : destination.nameEn);
  const planKey = `${verdict.timeline[0]?.timeMs ?? 0}-${verdict.tripMinutes}-${vehicle.id}`;

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
      // The rider closed the share sheet; nothing to do.
    }
  };

  const backToTrip = () => {
    setPlaying(false);
    setScrub(null);
  };

  return (
    <main className="result" data-testid="results-screen">
      <div className="result-bar">
        <button type="button" className="btn-quiet" onClick={s.goToInput} data-testid="edit-trip">
          <IconEdit />
          {c.edit}
        </button>
        <div className="trip-summary" data-testid="trip-summary">
          <p className="trip-summary-route">
            <span>{from}</span>
            <IconTripArrow rtl={lang === 'ar'} />
            <span>{to}</span>
          </p>
          <p className="trip-summary-meta">
            {formatDay(s.departure, lang)} · {formatTime(s.departure, lang)} · {vehicle.type === 'bus' ? c.bus : c.microbus}
          </p>
        </div>
        <button type="button" className="btn-quiet" onClick={() => void share()} aria-label={c.share} data-testid="share-btn">
          <IconShare />
        </button>
      </div>

      <div className="result-grid">
        <Answer verdict={verdict} vehicle={vehicle} weather={s.weather} selectedSeatId={s.selectedSeatId} onSelectSeat={s.selectSeat} lang={lang} />

        <section className="window plan-window" aria-label={c.seatsLabel}>
          <div className="window-head">
            {step ? (
              <span className="state" data-testid="plan-state" data-view="moment">
                {c.atTime(formatTime(step.timeMs, lang))}
                <button type="button" className="state-reset" onClick={backToTrip} aria-label={c.backToTrip} data-testid="ruler-reset">
                  <IconClose />
                </button>
              </span>
            ) : (
              <span className="state is-whole" data-testid="plan-state" data-view="trip">
                {c.wholeTrip}
              </span>
            )}
            <PlanLegend lang={lang} />
          </div>
          <SeatPlan key={planKey} vehicle={vehicle} verdict={verdict} step={step} selectedSeatId={s.selectedSeatId} onSelect={s.selectSeat} lang={lang} />
          <SeatDetail vehicle={vehicle} verdict={verdict} step={step} seatId={s.selectedSeatId} lang={lang} />
          <TripStrip
            vehicle={vehicle}
            verdict={verdict}
            scrubIndex={scrubIndex}
            onScrub={(i) => {
              setPlaying(false);
              setScrub(i);
            }}
            playing={playing}
            onTogglePlay={() => setPlaying((p) => !p)}
            lang={lang}
          />
        </section>

        <section className="window three-window" aria-label={c.threeLabel} data-testid="three-block">
          <ThreeStage vehicle={vehicle} verdict={verdict} scrubIndex={scrubIndex} selectedSeatId={s.selectedSeatId} lang={lang} destinationName={to} />
        </section>

        <details className="details" data-testid="how-it-works">
          <summary>
            {c.howTitle}
            <IconChevronDown />
          </summary>
          <HowItWorks verdict={verdict} vehicle={vehicle} route={route} step={shownStep} origin={origin} destination={destination} lang={lang} />
        </details>

        <div className="again">
          {s.fromSharedLink ? (
            <button type="button" className="cta" onClick={s.goToInput} data-testid="calc-yours">
              {c.calcYours}
            </button>
          ) : (
            <button type="button" className="cta cta-secondary" onClick={s.goToInput} data-testid="calc-another">
              {c.another}
            </button>
          )}
        </div>
      </div>
    </main>
  );
}
