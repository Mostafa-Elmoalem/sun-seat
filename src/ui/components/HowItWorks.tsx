import type { DecodedRoute } from '../../core/types/routes.ts';
import type { TripExposureVerdict } from '../../core/types/vehicle.ts';
import { COPY, compassName, formatDuration, sideName, type AppLanguage } from '../i18n/copy.ts';

export function HowItWorks({ verdict, route, lang }: { verdict: TripExposureVerdict; route: DecodedRoute; lang: AppLanguage }) {
  const c = COPY[lang];
  const rec = (side: 'left' | 'right' | 'either') => (side === 'either' ? c.either : sideName(side, lang));

  return (
    <div className="more-body">
      <ol className="steps">
        {c.how.map((line, i) => (
          <li key={i}>
            <span>{line}</span>
          </li>
        ))}
      </ol>

      <p className="hint">
        {lang === 'ar'
          ? `في مشوارك: الطريق ${route.totalDistanceKm.toFixed(0)} كم رايح ناحية ${compassName(verdict.meanHeadingDeg, lang)} في المتوسط${
              verdict.meanSunAzimuthDeg !== null ? `، والشمس في ناحية ${compassName(verdict.meanSunAzimuthDeg, lang)} من السما` : ''
            }، والرحلة ${formatDuration(verdict.tripMinutes, lang)} بزحمة الميكروباص والوقفات.`
          : `Your trip: ${route.totalDistanceKm.toFixed(0)} km heading ${compassName(verdict.meanHeadingDeg, lang)} on average${
              verdict.meanSunAzimuthDeg !== null ? `, with the sun in the ${compassName(verdict.meanSunAzimuthDeg, lang)}` : ''
            }; ${formatDuration(verdict.tripMinutes, lang)} including stops.`}
      </p>
      <p className="hint">{c.howAssume}</p>

      {verdict.sensitivity.scenarios.length > 0 && (
        <div>
          <h3 className="block-title" style={{ fontSize: 16, marginBottom: 6 }}>
            {c.sensitivityTitle}
          </h3>
          <table className="scenario-table" data-testid="scenarios">
            <thead>
              <tr>
                <th>{lang === 'ar' ? 'الحالة' : 'Case'}</th>
                <th>{c.sideDriver}</th>
                <th>{c.sideDoor}</th>
                <th>{lang === 'ar' ? 'اقعد' : 'Sit'}</th>
              </tr>
            </thead>
            <tbody>
              {verdict.sensitivity.scenarios.map((sc) => (
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
      <p className="hint">{c.osm}</p>
    </div>
  );
}
