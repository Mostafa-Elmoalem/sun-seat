import { useMemo, type ReactElement } from 'react';
import type { DecodedRoute } from '../../core/types/routes.ts';
import type { TimelineStep, TripExposureVerdict } from '../../core/types/vehicle.ts';
import type { Place } from '../../core/types/places.ts';
import { COPY, compassName, type AppLanguage } from '../i18n/copy.ts';
import { formatTime } from '../format.ts';
import { IconInfo } from './Icons.tsx';

/**
 * The route inked on the page's own graph paper, north up, with a protractor at
 * the moment being inspected: the road heading, the sun bearing, and the angle
 * between them, which is the whole calculation in one figure.
 */

const W = 340;
const H = 250;
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

  // Focus: the inspected minute, or the middle of the daylight part of the trip.
  const focus = useMemo(() => {
    if (step) return step;
    const day = verdict.timeline.filter((t) => !t.isNight);
    return day[Math.floor(day.length / 2)] ?? verdict.timeline[Math.floor(verdict.timeline.length / 2)] ?? null;
  }, [step, verdict]);

  const start = route.coordinates[0];
  const end = route.coordinates[route.coordinates.length - 1];
  const [sx, sy] = start ? geo.project(start[0], start[1]) : [0, 0];
  const [ex, ey] = end ? geo.project(end[0], end[1]) : [0, 0];

  let protractor: ReactElement | null = null;
  if (focus) {
    const [fx, fy] = geo.project(focus.location.lat, focus.location.lng);
    const R = 40;
    const toXY = (bearing: number, r: number): [number, number] => {
      const b = (bearing * Math.PI) / 180;
      return [fx + Math.sin(b) * r, fy - Math.cos(b) * r];
    };
    const [hx, hy] = toXY(focus.headingDeg, R + 6);
    const sunUp = !focus.isNight;
    const [ox, oy] = toXY(focus.solarAzimuthDeg, R + 26);
    const [ix, iy] = toXY(focus.solarAzimuthDeg, R - 2);
    const rel = focus.relativeAngleDeg > 180 ? focus.relativeAngleDeg - 360 : focus.relativeAngleDeg;
    const arcR = R * 0.62;
    const [ax0, ay0] = toXY(focus.headingDeg, arcR);
    const [ax1, ay1] = toXY(focus.headingDeg + rel, arcR);
    const [lx, ly] = toXY(focus.headingDeg + rel / 2, arcR + 13);
    const ticks = Array.from({ length: 24 }, (_, i) => i * 15);

    protractor = (
      <g>
        <circle cx={fx} cy={fy} r={R} fill="rgba(232,237,249,0.72)" stroke="#3d55a8" strokeWidth="1.2" />
        {ticks.map((t) => {
          const [a, b] = toXY(t, R);
          const [c2, d2] = toXY(t, R - (t % 90 === 0 ? 8 : 4));
          return <line key={t} x1={a} y1={b} x2={c2} y2={d2} stroke="#3d55a8" strokeWidth="1" />;
        })}
        {/* Road heading */}
        <line x1={fx} y1={fy} x2={hx} y2={hy} stroke="#1b2f7c" strokeWidth="2.6" markerEnd="url(#head-arrow)" />
        {sunUp && (
          <>
            <line x1={ox} y1={oy} x2={ix} y2={iy} stroke="#f5b800" strokeWidth="2.6" strokeLinecap="round" />
            <circle cx={ox} cy={oy} r="9" fill="#ffe03a" stroke="#f5b800" strokeWidth="1.8" />
            <path
              d={`M ${ax0} ${ay0} A ${arcR} ${arcR} 0 0 ${rel > 0 ? 1 : 0} ${ax1} ${ay1}`}
              fill="none"
              stroke="#cc1f37"
              strokeWidth="1.8"
            />
            <text x={lx} y={ly + 4} textAnchor="middle" fontSize="11" fontWeight="700" fill="#cc1f37">
              {Math.abs(Math.round(rel))}°
            </text>
          </>
        )}
        <circle cx={fx} cy={fy} r="3.5" fill="#1b2f7c" />
      </g>
    );
  }

  return (
    <section className="block" data-testid="route-figure">
      <div className="block-head">
        <h2 className="block-title">{c.routeFigure}</h2>
        {focus && <span className="block-aside">{formatTime(focus.timeMs, lang)}</span>}
      </div>
      <figure className="figure">
        <svg viewBox={`0 0 ${W} ${H}`} direction="ltr" role="img" aria-label={`${shortName(origin, lang)} ${lang === 'ar' ? 'إلى' : 'to'} ${shortName(destination, lang)}`}>
          <defs>
            <marker id="head-arrow" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="6" markerHeight="6" orient="auto">
              <path d="M0 0 10 5 0 10z" fill="#1b2f7c" />
            </marker>
          </defs>
          {/* North arrow */}
          <g transform={`translate(${W - 22} 30)`}>
            <path d="M0 -16 L6 6 L0 2 L-6 6 Z" fill="#1b2f7c" />
            <text x="0" y="20" textAnchor="middle" fontSize="11" fontWeight="700" fill="#1b2f7c">
              {c.north}
            </text>
          </g>
          <path
            d={geo.d}
            fill="none"
            stroke="#1b2f7c"
            strokeWidth="3"
            strokeLinejoin="round"
            strokeLinecap="round"
            strokeDasharray={route.isApproximate ? '6 6' : undefined}
            pathLength={route.isApproximate ? undefined : 1}
            style={route.isApproximate ? undefined : { strokeDasharray: 1, animation: 'ink-draw 900ms cubic-bezier(0.16,1,0.3,1) both' }}
          />
          <circle cx={sx} cy={sy} r="6" fill="#fbfcfe" stroke="#1b2f7c" strokeWidth="2.5" />
          <circle cx={ex} cy={ey} r="6" fill="#1b2f7c" />
          <text x={sx} y={sy - 12} textAnchor="middle" fontSize="12" fontWeight="600" fill="#1d2126" paintOrder="stroke" stroke="#fbfcfe" strokeWidth="4">
            {shortName(origin, lang)}
          </text>
          <text x={ex} y={ey + 22} textAnchor="middle" fontSize="12" fontWeight="600" fill="#1d2126" paintOrder="stroke" stroke="#fbfcfe" strokeWidth="4">
            {shortName(destination, lang)}
          </text>
          {protractor}
        </svg>
        <figcaption className="figure-caption">
          <span className={`source-tag${route.isApproximate ? ' is-approx' : ''}`} data-testid="route-source" data-source={route.source}>
            <IconInfo />
            {c.source[route.source]}
          </span>
          <br />
          {c.routeCaption(route.totalDistanceKm.toFixed(0), compassName(verdict.meanHeadingDeg, lang))}{' '}
          {lang === 'ar'
            ? 'السهم الأزرق اتجاه الطريق، والأصفر اتجاه الشمس، والزاوية الحمرا بينهم هي اللي بتحدد الشمس هتضرب أنهي جنب.'
            : 'Blue is the road heading, yellow is the sun, and the red angle between them decides which side gets it.'}
        </figcaption>
      </figure>
    </section>
  );
}
