import type { TripExposureVerdict } from '../../core/types/vehicle.ts';
import { COPY_DECK, type AppLanguage } from '../i18n/copy.ts';

/**
 * Computes WCAG 2.1 relative luminance and contrast ratio between two hex colors.
 */
function hexToLuminance(hex: string): number {
  const clean = hex.replace('#', '');
  const r = parseInt(clean.slice(0, 2), 16) / 255;
  const g = parseInt(clean.slice(2, 4), 16) / 255;
  const b = parseInt(clean.slice(4, 6), 16) / 255;

  const toLinear = (c: number) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
}

export function calculateContrastRatio(hex1: string, hex2: string): number {
  const l1 = hexToLuminance(hex1);
  const l2 = hexToLuminance(hex2);
  const brightest = Math.max(l1, l2);
  const darkest = Math.min(l1, l2);
  return Number(((brightest + 0.05) / (darkest + 0.05)).toFixed(2));
}

export interface HeroVerdictCardProps {
  verdict: TripExposureVerdict | null;
  lang: AppLanguage;
  isApproximate?: boolean;
  isLoading?: boolean;
}

export function HeroVerdictCard({
  verdict,
  lang,
  isApproximate = false,
  isLoading = false
}: HeroVerdictCardProps) {
  const copy = COPY_DECK[lang];

  if (isLoading || !verdict) {
    return (
      <section
        aria-live="polite"
        aria-busy="true"
        data-testid="verdict-loading-skeleton"
        className="bento-card"
        style={{ minHeight: '148px', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '10px' }}
      >
        <div style={{ height: '36px', width: '68%', background: '#E2E8F0', borderRadius: '10px' }} />
        <div style={{ height: '18px', width: '85%', background: '#F1F5F9', borderRadius: '8px' }} />
        <div style={{ height: '24px', width: '100%', background: '#E2E8F0', borderRadius: '999px' }} />
      </section>
    );
  }

  const { status, recommendedSide, sidePercentages, sensitivity } = verdict;
  const isNight = status === 'NIGHT';

  let heroHeadline = '';
  let subHeadline = '';

  if (status === 'NIGHT') {
    heroHeadline = copy.verdict_night;
    subHeadline =
      lang === 'ar'
        ? 'كل الكراسي ضل 100% طول السكة، اقعد في المكان اللي يريحك.'
        : '100% shade across all seats after sunset.';
  } else if (status === 'DOES_NOT_MATTER') {
    heroHeadline = copy.verdict_noon;
    subHeadline =
      lang === 'ar'
        ? 'الشمس عمودية فوق سقف العربية ومش ضاربة في الشبابيك الجانبية.'
        : 'High overhead sun (>68°); the vehicle roof shields both sides.';
  } else if (status === 'TIE') {
    heroHeadline = copy.verdict_tie;
    subHeadline =
      lang === 'ar'
        ? `الشمال ${sidePercentages.leftShade}% ضل واليمين ${sidePercentages.rightShade}% ضل`
        : `Left side ${sidePercentages.leftShade}% shade vs Right side ${sidePercentages.rightShade}% shade`;
  } else if (status === 'LEANING') {
    heroHeadline = recommendedSide === 'left' ? copy.verdict_leaning_left : copy.verdict_leaning_right;
    const winShade = recommendedSide === 'left' ? sidePercentages.leftShade : sidePercentages.rightShade;
    const otherShade = recommendedSide === 'left' ? sidePercentages.rightShade : sidePercentages.leftShade;
    subHeadline =
      lang === 'ar'
        ? `الجنب ${recommendedSide === 'left' ? 'الشمال' : 'اليمين'} فيه ${winShade}% ضل مقابل ${otherShade}% في التاني`
        : `${recommendedSide === 'left' ? 'Left' : 'Right'} side has ${winShade}% shade vs ${otherShade}% on the other`;
  } else {
    // CLEAR
    heroHeadline = recommendedSide === 'left' ? copy.verdict_left : copy.verdict_right;
    const winShade = recommendedSide === 'left' ? sidePercentages.leftShade : sidePercentages.rightShade;
    const otherShade = recommendedSide === 'left' ? sidePercentages.rightShade : sidePercentages.leftShade;
    subHeadline =
      lang === 'ar'
        ? `الجنب ${recommendedSide === 'left' ? 'الشمال' : 'اليمين'} فيه ${winShade}% ضل مقابل ${otherShade}% في التاني`
        : `${recommendedSide === 'left' ? 'Left' : 'Right'} side gets ${winShade}% shade (${otherShade}% on the opposite side)`;
  }

  const confidenceLabel =
    sensitivity.confidence === 'HIGH'
      ? copy.confidence_high
      : sensitivity.confidence === 'MEDIUM'
      ? copy.confidence_med
      : copy.confidence_low;

  const cardVariantClass = isNight
    ? 'bento-card bento-card-night'
    : status === 'CLEAR' || status === 'LEANING'
    ? 'bento-card bento-card-shade-hero'
    : 'bento-card bento-card-sun-hero';

  return (
    <section
      aria-live="polite"
      data-testid="hero-verdict-card"
      data-verdict-status={status}
      className={cardVariantClass}
      style={{ padding: '14px 16px' }}
    >
      {/* Top Status & Confidence Badges */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '6px',
          marginBottom: '6px'
        }}
      >
        <span
          data-testid="confidence-badge"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            fontSize: '12px',
            fontWeight: 700,
            padding: '3px 10px',
            borderRadius: '999px',
            background: isNight ? 'rgba(255,255,255,0.15)' : '#E0F2FE',
            color: isNight ? '#E0E7FF' : '#075985'
          }}
        >
          🛡️ {confidenceLabel}
        </span>

        {isApproximate && (
          <span
            data-testid="approx-route-badge"
            style={{
              fontSize: '11px',
              fontWeight: 700,
              padding: '2px 8px',
              borderRadius: '999px',
              background: '#FEF3C7',
              color: '#92400E',
              border: '1px solid #F59E0B'
            }}
          >
            🧭 {copy.approx_route_badge}
          </span>
        )}
      </div>

      {/* 36px Hero Verdict Heading (17.45:1 contrast ratio on white card) */}
      <h1
        data-testid="hero-verdict-heading"
        className="hero-verdict-title"
        style={{ marginBottom: '6px' }}
      >
        {heroHeadline}
      </h1>

      <p
        data-testid="hero-verdict-subheadline"
        style={{
          fontSize: '15px',
          fontWeight: 600,
          color: isNight ? '#E2E8F0' : '#334155',
          marginBottom: '12px'
        }}
      >
        {subHeadline}
      </p>

      {/* Side Percentages Comparison Bar */}
      <div
        data-testid="side-percentages-bar"
        style={{
          background: isNight ? 'rgba(15, 23, 42, 0.45)' : '#F8FAFC',
          borderRadius: '14px',
          padding: '10px 12px',
          border: isNight ? '1px solid rgba(255,255,255,0.12)' : '1px solid #E2E8F0'
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: '13px',
            fontWeight: 800,
            marginBottom: '6px'
          }}
        >
          <span style={{ color: isNight ? '#38BDF8' : '#0369A1' }}>
            {recommendedSide === 'left' ? '🏆 ' : '🛡️ '}
            {copy.left_side_label}: {sidePercentages.leftShade}% {copy.shade_word}
          </span>
          <span style={{ color: isNight ? '#FBBF24' : '#0369A1' }}>
            {recommendedSide === 'right' ? '🏆 ' : '🛡️ '}
            {copy.right_side_label}: {sidePercentages.rightShade}% {copy.shade_word}
          </span>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '8px'
          }}
        >
          {/* Left Side Meter */}
          <div
            style={{
              height: '10px',
              background: '#FEF3C7',
              borderRadius: '999px',
              overflow: 'hidden',
              border: '1px solid rgba(15,23,42,0.08)'
            }}
          >
            <div
              style={{
                width: `${sidePercentages.leftShade}%`,
                height: '100%',
                background: '#0EA5E9',
                borderRadius: '999px',
                transition: 'width 0.3s ease'
              }}
            />
          </div>

          {/* Right Side Meter */}
          <div
            style={{
              height: '10px',
              background: '#FEF3C7',
              borderRadius: '999px',
              overflow: 'hidden',
              border: '1px solid rgba(15,23,42,0.08)'
            }}
          >
            <div
              style={{
                width: `${sidePercentages.rightShade}%`,
                height: '100%',
                background: '#0EA5E9',
                borderRadius: '999px',
                transition: 'width 0.3s ease'
              }}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
