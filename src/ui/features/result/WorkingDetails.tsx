import type { SeatExposure, Side, TripExposureVerdict, VehicleProfile } from '../../../core/types/vehicle.ts';
import { COPY, formatDuration, sideName, type AppLanguage } from '../../i18n/copy.ts';
import { IconChevronDown, IconInfo } from '../../shared/Icons.tsx';

/** Average window seat on one side: minutes of proper sun and of light sun. */
function sideAverage(verdict: TripExposureVerdict, vehicle: VehicleProfile, side: Side): { strong: number; light: number } {
  const bySeat = new Map(verdict.seatsExposure.map((e) => [e.seatId, e]));
  const list = vehicle.seats.filter((s) => s.isWindow && s.side === side).map((s) => bySeat.get(s.id)).filter((e): e is SeatExposure => !!e);
  const n = Math.max(1, list.length);
  return { strong: list.reduce((a, e) => a + e.strongMinutes, 0) / n, light: list.reduce((a, e) => a + e.mildMinutes, 0) / n };
}

/** The working, folded away: each side's sun, how sure we are, and the method. */
export function WorkingDetails({ verdict, vehicle, lang }: { verdict: TripExposureVerdict; vehicle: VehicleProfile; lang: AppLanguage }) {
  const c = COPY[lang];
  const scenarios = verdict.sensitivity.scenarios;
  const scale = Math.max(1, verdict.tripMinutes);
  const rec = (side: Side | 'either') => (side === 'either' ? c.either : sideName(side, lang));

  return (
    <details className="more" data-testid="how-it-works">
      <summary>
        {c.howTitle}
        <IconChevronDown />
      </summary>
      <div className="more-body">
        {verdict.status !== 'NIGHT' && (
          <div data-testid="side-comparison">
            <h3>{c.sidesTitle}</h3>
            <div className="sides">
              {(['left', 'right'] as const).map((side) => {
                const { strong, light } = sideAverage(verdict, vehicle, side);
                return (
                  <div key={side} className="side-row" data-testid={`side-${side}`}>
                    <span className="side-row-name">{side === 'left' ? c.driver : c.door}</span>
                    <span className="side-row-track" aria-hidden="true">
                      <span className="side-row-strong" style={{ width: `${Math.min(100, (strong / scale) * 100)}%` }} />
                      <span className="side-row-light" style={{ width: `${Math.min(100, (light / scale) * 100)}%` }} />
                    </span>
                    <span className="side-row-mins">{formatDuration(strong + light, lang)}</span>
                  </div>
                );
              })}
              <p className="hint">
                {c.sidesCaption} · {formatDuration(verdict.tripMinutes, lang)}
              </p>
            </div>
          </div>
        )}

        {scenarios.length > 0 && (
          <div>
            <h3>{c.sensitivityTitle}</h3>
            <p className="verdict-note" data-testid="confidence" style={{ marginTop: 0, marginBottom: 8 }}>
              <IconInfo />
              <span>{c.confidence[verdict.sensitivity.confidence]}</span>
            </p>
            <table className="scenario-table" data-testid="scenarios">
              <thead>
                <tr>
                  <th>{lang === 'ar' ? 'الحالة' : 'Case'}</th>
                  <th>{c.driver}</th>
                  <th>{c.door}</th>
                  <th>{lang === 'ar' ? 'اقعد' : 'Sit'}</th>
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
          <h3>{c.methodTitle}</h3>
          <ol className="steps">
            {c.how.map((line, i) => (
              <li key={i}>
                <span>{line}</span>
              </li>
            ))}
          </ol>
          <p className="hint" style={{ marginTop: 10 }}>
            {c.howAssume}
          </p>
          <p className="hint">{c.osm}</p>
        </div>
      </div>
    </details>
  );
}
