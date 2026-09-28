import { Component, lazy, Suspense, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { DecodedRoute } from '../../../core/types/routes.ts';
import type { Place } from '../../../core/types/places.ts';
import type { TripExposureVerdict, VehicleProfile } from '../../../core/types/vehicle.ts';
import { defaultFocusIndex } from '../../../app/result/focus.ts';
import { COPY, type AppLanguage } from '../../i18n/copy.ts';
import { formatTime } from '../../format.ts';
import { SegmentedControl, type Segment } from '../../shared/SegmentedControl.tsx';
import { useMediaQuery } from '../../hooks/use-media-query.ts';
import { usePlayback } from '../../hooks/use-playback.ts';
import { useIdle } from '../../hooks/use-idle.ts';
import { useNetworkStatus } from '../../hooks/use-network-status.ts';
import { SeatDetail, SeatLegend, SeatPlan } from './SeatPlan.tsx';
import { RouteFigure } from './RouteFigure.tsx';
import { TimeBar } from './TimeBar.tsx';
import { SHELL_URL } from '../vehicle-3d/assets.ts';

/**
 * One stage for every picture of the trip and the single time bar that moves them.
 * Phones show one picture at a time under a segmented switch, so the picture and the
 * time bar fit one screen. From 760px the seats stay on screen and the switch, placed
 * right above the other picture, chooses between the 3D and the road.
 */

const loadVehicleCanvas = () => import('../vehicle-3d/VehicleCanvas.tsx');
const VehicleCanvas = lazy(loadVehicleCanvas);

type Tab = 'seats' | 'vehicle' | 'route';
type SidePane = Exclude<Tab, 'seats'>;

class ThreeBoundary extends Component<{ fallback: ReactNode; children: ReactNode }, { failed: boolean }> {
  override state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  override render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

function Sketching({ text }: { text: string }) {
  return (
    <div className="three-poster sketching" data-testid="three-loading">
      <svg width="120" height="48" viewBox="0 0 120 48" aria-hidden="true">
        <path pathLength={1} d="M6 36V16c0-3 2-5 5-5h66c5 0 9 2 12 5l12 10c2 2 3 4 3 6v4H6Z" />
      </svg>
      {text}
    </div>
  );
}

export interface ResultStageProps {
  vehicle: VehicleProfile;
  verdict: TripExposureVerdict;
  route: DecodedRoute;
  origin: Place;
  destination: Place;
  destinationName: string;
  scrubIndex: number | null;
  onScrub: (i: number | null) => void;
  selectedSeatId: number | null;
  onSelectSeat: (id: number) => void;
  lang: AppLanguage;
}

export function ResultStage(props: ResultStageProps) {
  const { vehicle, verdict, scrubIndex, onScrub, lang } = props;
  const c = COPY[lang];
  const wide = useMediaQuery('(min-width: 760px)');
  const { isLowBandwidth } = useNetworkStatus();
  const [tab, setTab] = useState<Tab>('seats');
  const [allow3d, setAllow3d] = useState(false);
  const stageRef = useRef<HTMLElement>(null);

  const timeline = verdict.timeline;
  const focusIndex = useMemo(() => defaultFocusIndex(verdict), [verdict]);
  const chosen = scrubIndex !== null ? timeline[Math.min(scrubIndex, timeline.length - 1)] ?? null : null;
  const moment = chosen ?? timeline[Math.min(focusIndex, timeline.length - 1)] ?? null;
  const playback = usePlayback(timeline.length, scrubIndex, onScrub);

  // Fetch the 3D code and the microbus body while the rider reads the answer, so the tab opens at once.
  useIdle(() => {
    void loadVehicleCanvas();
    if (vehicle.id === 'microbus-14') void fetch(SHELL_URL).catch(() => undefined);
  }, !isLowBandwidth);

  const sidePane: SidePane = tab === 'route' ? 'route' : 'vehicle';
  const showSeats = wide || tab === 'seats';
  const showSide = wide || tab !== 'seats';
  const vehicleVisible = showSide && sidePane === 'vehicle';
  // Once built, the 3D stays alive behind the other pictures (paused), so coming back is instant.
  const [vehicleBuilt, setVehicleBuilt] = useState(false);
  useEffect(() => {
    if (vehicleVisible) setVehicleBuilt(true);
  }, [vehicleVisible]);

  /** Keep the whole stage on screen when the rider switches pictures or plays the trip. */
  const reveal = () => {
    const el = stageRef.current;
    if (!el || typeof window === 'undefined') return;
    const r = el.getBoundingClientRect();
    if (r.top < 0 || r.bottom > window.innerHeight) {
      const smooth = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      el.scrollIntoView({ block: 'start', behavior: smooth ? 'smooth' : 'auto' });
    }
  };

  const choose = (t: Tab) => {
    setTab(t);
    reveal();
  };
  const sideSegments: Segment<SidePane>[] = [
    { id: 'vehicle', label: c.tabVehicle, testId: 'tab-vehicle' },
    { id: 'route', label: c.tabRoute, testId: 'tab-route' }
  ];
  const allSegments: Segment<Tab>[] = [{ id: 'seats', label: c.tabSeats, testId: 'tab-seats' }, ...sideSegments];
  const momentLabel = moment ? `${c.atTime(formatTime(moment.timeMs, lang))} · ${c.dir[moment.sunSide]}` : '';
  const auto3d = allow3d || !isLowBandwidth;
  // Decided once, when the 3D is first shown: a later dip in the network never tears a built scene down.
  useEffect(() => {
    if (vehicleVisible && auto3d && !allow3d) setAllow3d(true);
  }, [vehicleVisible, auto3d, allow3d]);

  return (
    <section ref={stageRef} className="stage" aria-label={c.stageLabel} data-testid="stage">
      {!wide && <SegmentedControl segments={allSegments} value={tab} onChange={choose} label={c.stageLabel} />}

      <div className="stage-panes">
        <div className="stage-col" hidden={!showSeats}>
          <div className="stage-pane pane-seats" data-testid="seat-plan">
            <div className="pane-head">
              <span className="pane-label" data-testid="plan-state" data-view={chosen ? 'moment' : 'trip'}>
                {chosen ? c.atTime(formatTime(chosen.timeMs, lang)) : c.wholeTrip}
              </span>
              {chosen && (
                <button type="button" className="btn btn-outline" onClick={() => onScrub(null)} aria-label={c.backToTrip} data-testid="ruler-reset">
                  {c.wholeTrip}
                </button>
              )}
            </div>
            <div className="plan-box">
              <SeatPlan vehicle={vehicle} verdict={verdict} step={chosen} selectedSeatId={props.selectedSeatId} onSelect={props.onSelectSeat} lang={lang} />
            </div>
            <div className="pane-foot">
              <SeatLegend lang={lang} />
              <SeatDetail vehicle={vehicle} verdict={verdict} step={chosen} seatId={props.selectedSeatId} lang={lang} />
            </div>
          </div>
        </div>

        <div className="stage-col" hidden={!showSide}>
          {wide && <SegmentedControl segments={sideSegments} value={sidePane} onChange={choose} label={c.stageLabel} compact />}
          <div className={`stage-pane pane-${sidePane}`} data-testid={sidePane === 'vehicle' ? 'three-block' : 'route-figure'}>
            <div className="pane-head">
              <span className="pane-label" data-testid="moment-label">
                {momentLabel}
              </span>
            </div>
            {(vehicleBuilt || vehicleVisible) && (
              <div className="pane-layer" hidden={!vehicleVisible}>
                <ThreeBoundary fallback={<div className="three-poster">{c.threeFailed}</div>}>
                  {auto3d ? (
                    <Suspense fallback={<Sketching text={c.threeLoadingShort} />}>
                      <VehicleCanvas
                        vehicle={vehicle}
                        verdict={verdict}
                        step={moment}
                        selectedSeatId={props.selectedSeatId}
                        lang={lang}
                        destinationName={props.destinationName}
                        active={vehicleVisible}
                      />
                    </Suspense>
                  ) : (
                    <div className="three-poster">
                      <button type="button" className="btn btn-outline" onClick={() => setAllow3d(true)} data-testid="open-3d">
                        {c.threeLoad}
                      </button>
                      <span>{c.threeCost}</span>
                    </div>
                  )}
                </ThreeBoundary>
              </div>
            )}
            {showSide && sidePane === 'route' && (
              <RouteFigure route={props.route} verdict={verdict} step={moment} origin={props.origin} destination={props.destination} lang={lang} />
            )}
          </div>
        </div>
      </div>

      <TimeBar
        vehicle={vehicle}
        verdict={verdict}
        scrubIndex={scrubIndex}
        focusIndex={focusIndex}
        onScrub={(i) => {
          playback.stop();
          onScrub(i);
        }}
        playing={playback.playing}
        onTogglePlay={() => {
          reveal();
          playback.toggle();
        }}
        lang={lang}
      />
    </section>
  );
}
