import type { TripExposureVerdict } from '../../core/types/vehicle.ts';
import { COPY_DECK, type AppLanguage } from '../i18n/copy.ts';

export interface EducationalDrawerProps {
  verdict: TripExposureVerdict;
  isOpen: boolean;
  onToggle: () => void;
  lang: AppLanguage;
}

export function EducationalDrawer({
  verdict,
  isOpen,
  onToggle,
  lang
}: EducationalDrawerProps) {
  const copy = COPY_DECK[lang];

  const avgHeading =
    verdict.timeline.length > 0
      ? Math.round(
          verdict.timeline.reduce((sum, s) => sum + s.headingDeg, 0) / verdict.timeline.length
        )
      : 0;
  const avgAzimuth =
    verdict.timeline.length > 0
      ? Math.round(
          verdict.timeline.reduce((sum, s) => sum + s.solarAzimuthDeg, 0) / verdict.timeline.length
        )
      : 180;
  const avgElevation =
    verdict.timeline.length > 0
      ? Math.round(
          verdict.timeline.reduce((sum, s) => sum + s.solarElevationDeg, 0) / verdict.timeline.length
        )
      : 45;

  // Compute SVG coordinates for heading arrow & sun orb on a 160x160 compass
  const center = 80;
  const radius = 56;
  const headingRad = ((avgHeading - 90) * Math.PI) / 180;
  const sunRad = ((avgAzimuth - 90) * Math.PI) / 180;

  const headingX = Number((center + radius * 0.72 * Math.cos(headingRad)).toFixed(1));
  const headingY = Number((center + radius * 0.72 * Math.sin(headingRad)).toFixed(1));
  const sunX = Number((center + radius * Math.cos(sunRad)).toFixed(1));
  const sunY = Number((center + radius * Math.sin(sunRad)).toFixed(1));

  return (
    <div className="bento-card" data-testid="educational-drawer-card">
      {/* One-line Geography Explanation (Always Visible) */}
      <p
        data-testid="geography-one-liner"
        style={{
          fontSize: '13px',
          fontWeight: 700,
          color: '#334155',
          marginBottom: '10px',
          lineHeight: 1.5
        }}
      >
        🧭 {verdict.geographyReasonAr}
      </p>

      {/* Collapsible Drawer Trigger (>= 48px touch target) */}
      <button
        type="button"
        data-testid="educational-drawer-toggle"
        aria-expanded={isOpen}
        onClick={onToggle}
        className="touch-target"
        style={{
          width: '100%',
          minHeight: '48px',
          justifyContent: 'space-between',
          padding: '8px 14px',
          background: '#F8FAFC',
          border: '1.5px solid #CBD5E1',
          color: '#0F172A',
          fontSize: '14px',
          fontWeight: 800
        }}
      >
        <span>{copy.drawer_trigger}</span>
        <span>{isOpen ? '▴' : '▾'}</span>
      </button>

      {/* Expandable Astronomy & Geography Drawer Content */}
      {isOpen && (
        <div
          data-testid="educational-drawer-content"
          style={{
            marginTop: '12px',
            paddingTop: '12px',
            borderTop: '1px solid #E2E8F0',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px'
          }}
        >
          <h2 style={{ fontSize: '16px', fontWeight: 800, color: '#0F172A' }}>
            {copy.drawer_title}
          </h2>

          {/* Spherical Solar Trajectory & Compass SVG */}
          <div
            dir="ltr"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '16px',
              background: '#F8FAFC',
              padding: '12px',
              borderRadius: '16px',
              border: '1px solid #E2E8F0',
              flexWrap: 'wrap'
            }}
          >
            <svg
              width="160"
              height="160"
              viewBox="0 0 160 160"
              role="img"
              aria-label="Solar Azimuth and Route Bearing Compass"
            >
              {/* Outer Compass Circle */}
              <circle
                cx={center}
                cy={center}
                r={radius}
                fill="#FFFFFF"
                stroke="#CBD5E1"
                strokeWidth="2"
              />
              {/* Solar Orbit Dashed Ring */}
              <circle
                cx={center}
                cy={center}
                r={radius * 0.72}
                fill="none"
                stroke="#E2E8F0"
                strokeDasharray="4 4"
              />
              {/* Cardinal Directions */}
              <text x="80" y="16" textAnchor="middle" fontSize="10" fontWeight="bold" fill="#475569">
                N (0°)
              </text>
              <text x="148" y="83" textAnchor="middle" fontSize="10" fontWeight="bold" fill="#475569">
                E
              </text>
              <text x="80" y="152" textAnchor="middle" fontSize="10" fontWeight="bold" fill="#475569">
                S
              </text>
              <text x="12" y="83" textAnchor="middle" fontSize="10" fontWeight="bold" fill="#475569">
                W
              </text>

              {/* Sun Ray to Vehicle Center */}
              <line
                x1={sunX}
                y1={sunY}
                x2={center}
                y2={center}
                stroke="#F59E0B"
                strokeWidth="2.5"
                strokeDasharray="3 3"
              />

              {/* Vehicle Heading Vector */}
              <line
                x1={center}
                y1={center}
                x2={headingX}
                y2={headingY}
                stroke="#0EA5E9"
                strokeWidth="3.5"
                strokeLinecap="round"
              />
              <circle cx={headingX} cy={headingY} r="4" fill="#0EA5E9" />

              {/* Center Vehicle Dot */}
              <circle cx={center} cy={center} r="6" fill="#0F172A" />

              {/* Sun Orb */}
              <circle cx={sunX} cy={sunY} r="10" fill="#FEF3C7" stroke="#F59E0B" strokeWidth="2" />
              <circle cx={sunX} cy={sunY} r="5" fill="#F59E0B" />
            </svg>

            <div style={{ fontSize: '12px', color: '#334155', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div>
                <strong style={{ color: '#0369A1' }}>● {lang === 'ar' ? 'زاوية الطريق:' : 'Route Bearing:'}</strong>{' '}
                <span>{avgHeading}°</span>
              </div>
              <div>
                <strong style={{ color: '#B45309' }}>☀️ {lang === 'ar' ? 'سمت الشمس:' : 'Sun Azimuth:'}</strong>{' '}
                <span>{avgAzimuth}°</span>
              </div>
              <div>
                <strong style={{ color: '#0F172A' }}>📐 {lang === 'ar' ? 'ارتفاع الشمس:' : 'Sun Elevation:'}</strong>{' '}
                <span>{avgElevation}°</span>
              </div>
            </div>
          </div>

          {/* 3-Step Colloquial Breakdown */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px', color: '#334155' }}>
            <div style={{ background: '#F8FAFC', padding: '10px', borderRadius: '12px' }}>
              <div style={{ fontWeight: 800, color: '#0F172A', marginBottom: '2px' }}>
                {copy.drawer_step1_title}
              </div>
              <div>
                {lang === 'ar'
                  ? `متوسط اتجاه سير المركبة على الطريق هو ${avgHeading}° بالنسبة للشمال الجغرافي.`
                  : `Average vehicle heading along the route polyline is ${avgHeading}° from True North.`}
              </div>
            </div>

            <div style={{ background: '#F8FAFC', padding: '10px', borderRadius: '12px' }}>
              <div style={{ fontWeight: 800, color: '#0F172A', marginBottom: '2px' }}>
                {copy.drawer_step2_title}
              </div>
              <div>
                {lang === 'ar'
                  ? `بحساب معادلات NOAA الفلكية لتوقيت القاهرة، زاوية سمت الشمس ${avgAzimuth}° بارتفاع ${avgElevation}°.`
                  : `Using NOAA solar equations for Africa/Cairo, sun azimuth averages ${avgAzimuth}° at ${avgElevation}° elevation.`}
              </div>
            </div>

            <div style={{ background: '#F8FAFC', padding: '10px', borderRadius: '12px' }}>
              <div style={{ fontWeight: 800, color: '#0F172A', marginBottom: '4px' }}>
                {copy.drawer_step3_title}
              </div>
              <div style={{ marginBottom: '6px' }}>{verdict.sensitivity.explanationAr}</div>
              {verdict.sensitivity.scenarios.length > 0 && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', fontSize: '11px' }}>
                  {verdict.sensitivity.scenarios.map((sc) => (
                    <div
                      key={sc.name}
                      style={{
                        background: '#FFFFFF',
                        padding: '6px 8px',
                        borderRadius: '8px',
                        border: '1px solid #E2E8F0'
                      }}
                    >
                      <div style={{ fontWeight: 700, color: '#0F172A' }}>{sc.name}</div>
                      <div style={{ color: '#0369A1', fontWeight: 700 }}>
                        {lang === 'ar' ? `شمال ${sc.leftShade}% | يمين ${sc.rightShade}%` : `L ${sc.leftShade}% | R ${sc.rightShade}%`}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* YouTube Video Link */}
          <a
            href="https://www.youtube.com/results?search_query=%D8%A7%D9%84%D8%AC%D8%BA%D8%B1%D8%A7%D9%81%D9%8A%D8%A7+%D8%A8%D8%AA%D9%86%D9%81%D8%B9+%D9%81%D9%8A+%D8%A7%D9%8A%D9%87"
            target="_blank"
            rel="noopener noreferrer"
            data-testid="youtube-video-link"
            className="touch-target"
            style={{
              width: '100%',
              minHeight: '48px',
              textDecoration: 'none',
              background: '#FEF2F2',
              color: '#991B1B',
              border: '1.5px solid #FCA5A5',
              fontWeight: 800,
              fontSize: '14px'
            }}
          >
            {copy.youtube_cta}
          </a>
        </div>
      )}
    </div>
  );
}
