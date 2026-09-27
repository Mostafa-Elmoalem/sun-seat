import type { DecodedRoute } from '../../core/types/routes.ts';
import type { TimelineStep, TripExposureVerdict, VehicleProfile } from '../../core/types/vehicle.ts';
import type { Place } from '../../core/types/places.ts';
import { COPY, formatDuration, sideName, type AppLanguage } from '../i18n/copy.ts';
import { SideBars } from './Verdict.tsx';
import { RouteFigure } from './RouteFigure.tsx';
import { IconInfo } from './Icons.tsx';

/** The working, folded away: each side's sun, the road against the sun, how sure we are, and the method. */
export function HowItWorks({
  verdict,
  vehicle,
  route,
  step,
  origin,
  destination,
  lang
}: {
  verdict: TripExposureVerdict;
  vehicle: VehicleProfile;
  route: DecodedRoute;
  step: TimelineStep | null;
  origin: Place;
  destination: Place;
  lang: AppLanguage;
}) {
  const c = COPY[lang];
  const rec = (side: 'left' | 'right' | 'either') => (side === 'either' ? c.either : sideName(side, lang));
  const scenarios = verdict.sensitivity.scenarios;

  return (
    <div className="details-body">
      {verdict.status !== 'NIGHT' && <SideBars verdict={verdict} vehicle={vehicle} lang={lang} />}

      <div>
        <h3>{c.routeFigure}</h3>
        <RouteFigure route={route} verdict={verdict} step={step} origin={origin} destination={destination} lang={lang} />
      </div>

      {scenarios.length > 0 && (
        <div>
          <h3>{c.sensitivityTitle}</h3>
          <p className="note" data-testid="confidence" style={{ marginBottom: 8 }}>
            <IconInfo />
            <span>{c.confidence[verdict.sensitivity.confidence]}</span>
          </p>
          <table className="scenario-table" data-testid="scenarios">
            <thead>
              <tr>
                <th>{c.caseLabel}</th>
                <th>{c.sideDriverShort}</th>
                <th>{c.sideDoorShort}</th>
                <th>{c.sitLabel}</th>
              </tr>
            </thead>
            <tbody>
              {scenarios.map((sc) => (
                <tr key={sc.key}>
                  <td>{c.scenario[sc.key]}</td>
                  <td>{formatDuration(sc.leftSunMinutes, lang)}</td>
                  <td>{formatDuration(sc.rightSunMinutes, lang)}</td>
                  <td>{rec(sc.recommendedSide)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div>
        <h3>{c.howTitle}</h3>
        <ol className="method">
          {c.how.map((line, i) => (
            <li key={i}>{line}</li>
          ))}
        </ol>
        <p className="caption" style={{ marginTop: 10 }}>
          {c.howAssume}
        </p>
        <p className="caption">{c.osm}</p>
      </div>
    </div>
  );
}
