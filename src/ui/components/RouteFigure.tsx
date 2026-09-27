import { useMemo, type ReactElement } from 'react';
import type { DecodedRoute } from '../../core/types/routes.ts';
import type { TimelineStep, TripExposureVerdict } from '../../core/types/vehicle.ts';
import type { Place } from '../../core/types/places.ts';
import { COPY, compassName, type AppLanguage } from '../i18n/copy.ts';
import { formatTime } from '../format.ts';
import { IconInfo } from './Icons.tsx';

/**
 * The real road, north up, with a compass ring at the moment being shown: the road
 * heading, the sun's bearing and the angle between them, the whole calculation in one figure.
 */

const W = 340;
const H = 240;
const PAD = 34;

function shortName(p: Place, lang: AppLanguage): string {
  const name = lang === 'ar' ? p.nameAr : p.nameEn;
  return name.replace(/^موقف /, '').replace(/\s*\(.*\)$/, '');
}

export function RouteFigure({
  route,
  verdict,
  step,
  origin,
  destination,
  lang
}: {
  route: DecodedRoute;
  verdict: TripExposureVerdict;
  step: TimelineStep | null;
  origin: Place;
  destination: Place;
  lang: AppLanguage;
}) {
  const c = COPY[lang];

  const geo = useMemo(() => {
    const pts = route.coordinates;
    const lat0 = pts.reduce((a, p) => a + p[0], 0) / Math.max(1, pts.length);
    const k = Math.cos((lat0 * Math.PI) / 180);
    const xs = pts.map((p) => p[1] * k);
    const ys = pts.map((p) => -p[0]);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    const span = Math.max(maxX - minX, maxY - minY, 1e-6);
    const scale = Math.min((W - 2 * PAD) / Math.max(maxX - minX, span * 0.2), (H - 2 * PAD) / Math.max(maxY - minY, span * 0.2));
    const offX = (W - (maxX - minX) * scale) / 2;
    const offY = (H - (maxY - minY) * scale) / 2;
    const project = (lat: number, lng: number): [number, number] => [offX + (lng * k - minX) * scale, offY + (-lat - minY) * scale];
    const d = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${project(p[0], p[1]).map((v) => v.toFixed(1)).join(' ')}`).join(' ');
    return { project, d };
  }, [route]);

  const start = route.coordinates[0];
  const end = route.coordinates[route.coordinates.length - 1];
  const [sx, sy] = start ? geo.project(start[0], start[1]) : [0, 0];
  const [ex, ey] = end ? geo.project(end[0], end[1]) : [0, 0];

  let compass: ReactElement | null = null;
  if (step) {
    const [fx, fy] = geo.project(step.location.lat, step.location.lng);
    const R = 38;
    const toXY = (bearing: number, r: number): [number, number] => {
      const b = (bearing * Math.PI) / 180;
      return [fx + Math.sin(b) * r, fy - Math.cos(b) * r];
    };
    const [hx, hy] = toXY(step.headingDeg, R + 6);
    const [ox, oy] = toXY(step.solarAzimuthDeg, R + 24);
    const [ix, iy] = toXY(step.solarAzimuthDeg, R - 2);
    const rel = step.relativeAngleDeg > 180 ? step.relativeAngleDeg - 360 : step.relativeAngleDeg;
    const arcR = R * 0.62;
    const [ax0, ay0] = toXY(step.headingDeg, arcR);
    const [ax1, ay1] = toXY(step.headingDeg + rel, arcR);
    const [lx, ly] = toXY(step.headingDeg + rel / 2, arcR + 13);
    compass = (
      <g>
        <circle cx={fx} cy={fy} r={R} fill="rgba(227,236,234,0.85)" stroke="#3f7178" strokeWidth="1.2" />
        {Array.from({ length: 24 }, (_, i) => i * 15).map((t) => {
          const [a, b] = toXY(t, R);
          const [c2, d2] = toXY(t, R - (t % 90 === 0 ? 8 : 4));
          return <line key={t} x1={a} y1={b} x2={c2} y2={d2} stroke="#3f7178" strokeWidth="1" />;
        })}
        <line x1={fx} y1={fy} x2={hx} y2={hy} stroke="#123e44" strokeWidth="2.6" markerEnd="url(#head-arrow)" />
        {!step.isNight && (
          <>
            <line x1={ox} y1={oy} x2={ix} y2={iy} stroke="#ffb52e" strokeWidth="2.6" strokeLinecap="round" />
            <path d={`M${ox} ${oy - 10}L${ox + 10} ${oy}L${ox} ${oy + 10}L${ox - 10} ${oy}Z`} fill="#ffb52e" />
            <path d={`M ${ax0} ${ay0} A ${arcR} ${arcR} 0 0 ${rel > 0 ? 1 : 0} ${ax1} ${ay1}`} fill="none" stroke="#8a5a00" strokeWidth="1.8" />
            <text x={lx} y={ly + 4} textAnchor="middle" fontSize="11" fontWeight="700" fill="#8a5a00">
              {Math.abs(Math.round(rel))}°
            </text>
          </>
        )}
        <circle cx={fx} cy={fy} r="3.5" fill="#123e44" />
      </g>
    );
  }

  return (
    <figure className="route-figure" data-testid="route-figure">
      <svg viewBox={`0 0 ${W} ${H}`} direction="ltr" role="img" aria-label={`${c.routeFigure}: ${shortName(origin, lang)} ${lang === 'ar' ? 'إلى' : 'to'} ${shortName(destination, lang)}`}>
        <defs>
          <marker id="head-arrow" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="6" markerHeight="6" orient="auto">
            <path d="M0 0 10 5 0 10z" fill="#123e44" />
          </marker>
        </defs>
        <g transform={`translate(${W - 22} 30)`}>
          <path d="M0 -16 L6 6 L0 2 L-6 6 Z" fill="#123e44" />
          <text x="0" y="20" textAnchor="middle" fontSize="11" fontWeight="700" fill="#123e44">
            {c.north}
          </text>
        </g>
        <path
          d={geo.d}
          fill="none"
          stroke="#123e44"
          strokeWidth="3"
          strokeLinejoin="round"
          strokeLinecap="round"
          strokeDasharray={route.isApproximate ? '6 6' : undefined}
        />
        <circle cx={sx} cy={sy} r="6" fill="#fbfbf8" stroke="#123e44" strokeWidth="2.5" />
        <circle cx={ex} cy={ey} r="6" fill="#123e44" />
        <text x={sx} y={sy - 12} textAnchor="middle" fontSize="12" fontWeight="600" fill="#0e1a1c" paintOrder="stroke" stroke="#f2f3ef" strokeWidth="4">
          {shortName(origin, lang)}
        </text>
        <text x={ex} y={ey + 22} textAnchor="middle" fontSize="12" fontWeight="600" fill="#0e1a1c" paintOrder="stroke" stroke="#f2f3ef" strokeWidth="4">
          {shortName(destination, lang)}
        </text>
        {compass}
      </svg>
      <figcaption className="route-caption">
        <span className={`route-source${route.isApproximate ? ' is-approx' : ''}`} data-testid="route-source" data-source={route.source}>
          <IconInfo />
          {c.source[route.source]}
        </span>
        <br />
        {c.routeCaption(route.totalDistanceKm.toFixed(0), compassName(verdict.meanHeadingDeg, lang))}
        {step ? ` · ${formatTime(step.timeMs, lang)}` : ''}
      </figcaption>
    </figure>
  );
}
