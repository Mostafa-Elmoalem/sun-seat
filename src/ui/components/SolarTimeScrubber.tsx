import type { TimelineStep } from '../../core/types/vehicle.ts';
import { COPY_DECK, type AppLanguage } from '../i18n/copy.ts';

/**
 * Finds timeline step indices where the sun switches between the left and right sides of the vehicle.
 */
export function findSunFlipIndices(timeline: TimelineStep[]): number[] {
  const flips: number[] = [];
  let lastLateralSide: 'left' | 'right' | null = null;

  for (let i = 0; i < timeline.length; i++) {
    const side = timeline[i]?.sunSide;
    if (side === 'left' || side === 'right') {
      if (lastLateralSide && lastLateralSide !== side) {
        flips.push(i);
      }
      lastLateralSide = side;
    }
  }
  return flips;
}

export interface SolarTimeScrubberProps {
  timeline: TimelineStep[];
  currentIndex: number;
  isScrubbing: boolean;
  onChange: (index: number) => void;
  onResetToAverage: () => void;
  lang: AppLanguage;
}

export function SolarTimeScrubber({
  timeline,
  currentIndex,
  isScrubbing,
  onChange,
  onResetToAverage,
  lang
}: SolarTimeScrubberProps) {
  const copy = COPY_DECK[lang];

  if (timeline.length === 0) {
    return null;
  }

  const safeIndex = Math.min(Math.max(0, currentIndex), timeline.length - 1);
  const currentStep = timeline[safeIndex]!;
  const firstStep = timeline[0]!;
  const lastStep = timeline[timeline.length - 1]!;
  const flipIndices = findSunFlipIndices(timeline);

  const isAllNight = timeline.every((t) => t.isNight);

  const sunSideDescriptionAr =
    currentStep.sunSide === 'right'
      ? '☀️ الشمس ضاربة في الجنب اليمين دلوقتي'
      : currentStep.sunSide === 'left'
      ? '☀️ الشمس ضاربة في الجنب الشمال دلوقتي'
      : currentStep.sunSide === 'front'
      ? '☀️ الشمس في وش العربية'
      : currentStep.sunSide === 'rear'
      ? '☀️ الشمس في ضهر العربية'
      : '🌙 مفيش شمس مباشرة';

  const sunSideDescriptionEn =
    currentStep.sunSide === 'right'
      ? '☀️ Sun is hitting the RIGHT side now'
      : currentStep.sunSide === 'left'
      ? '☀️ Sun is hitting the LEFT side now'
      : currentStep.sunSide === 'front'
      ? '☀️ Sun is ahead of the vehicle'
      : currentStep.sunSide === 'rear'
      ? '☀️ Sun is behind the vehicle'
      : '🌙 No direct side sun';

  return (
    <div className="bento-card" data-testid="solar-time-scrubber">
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '8px',
          marginBottom: '8px',
          flexWrap: 'wrap'
        }}
      >
        <span style={{ fontSize: '14px', fontWeight: 800, color: '#0F172A' }}>
          {copy.scrubber_title}
        </span>
        <span
          data-testid="scrubber-current-time"
          style={{
            fontSize: '14px',
            fontWeight: 900,
            color: '#92400E',
            background: '#FEF3C7',
            padding: '2px 10px',
            borderRadius: '999px',
            border: '1px solid #F59E0B'
          }}
        >
          {currentStep.timeCairoFormatted}
        </span>
      </div>

      {/* Range Slider */}
      <div style={{ padding: '6px 0' }}>
        <input
          type="range"
          data-testid="scrubber-range-input"
          aria-label={copy.scrubber_title}
          min={0}
          max={Math.max(0, timeline.length - 1)}
          value={safeIndex}
          disabled={isAllNight && timeline.length <= 1}
          onChange={(e) => onChange(Number(e.target.value))}
          className="solar-range-input"
        />
      </div>

      {/* Start / Current / Arrival Time Labels */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          fontSize: '12px',
          fontWeight: 700,
          color: '#475569',
          marginTop: '4px'
        }}
      >
        <span>
          {lang === 'ar' ? 'الانطلاق: ' : 'Start: '}
          {firstStep.timeCairoFormatted}
        </span>
        <span>
          +{currentStep.minuteOffset} {lang === 'ar' ? 'دقيقة' : 'min'}
        </span>
        <span>
          {lang === 'ar' ? 'الوصول: ' : 'Arrival: '}
          {lastStep.timeCairoFormatted}
        </span>
      </div>

      {/* Live Angle & Side Telemetry */}
      <div
        style={{
          marginTop: '10px',
          padding: '8px 12px',
          borderRadius: '12px',
          background: '#F8FAFC',
          border: '1px solid #E2E8F0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '8px',
          fontSize: '12px',
          fontWeight: 700
        }}
      >
        <span style={{ color: '#0F172A' }}>
          {lang === 'ar' ? sunSideDescriptionAr : sunSideDescriptionEn}
        </span>
        <span style={{ color: '#475569' }}>
          {lang === 'ar'
            ? `ارتفاع الشمس: ${currentStep.solarElevationDeg}° | السمت: ${currentStep.solarAzimuthDeg}°`
            : `Elevation: ${currentStep.solarElevationDeg}° | Azimuth: ${currentStep.solarAzimuthDeg}°`}
        </span>
      </div>

      {/* Mid-Trip Sun Flip Alert if applicable */}
      {flipIndices.length > 0 && (
        <div
          data-testid="scrubber-flip-alert"
          style={{
            marginTop: '8px',
            padding: '6px 10px',
            borderRadius: '10px',
            background: '#FEF3C7',
            color: '#92400E',
            fontSize: '12px',
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '6px'
          }}
        >
          <span>{copy.scrubber_flip_alert}</span>
          <button
            type="button"
            onClick={() => onChange(flipIndices[0]!)}
            style={{
              padding: '2px 8px',
              borderRadius: '999px',
              background: '#92400E',
              color: '#FFFFFF',
              border: 'none',
              fontSize: '11px',
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            {timeline[flipIndices[0]!]?.timeCairoFormatted}
          </button>
        </div>
      )}

      {/* Reset to Full-Trip Average Button when scrubbing */}
      {isScrubbing && (
        <button
          type="button"
          data-testid="scrubber-reset-average-btn"
          onClick={onResetToAverage}
          className="touch-target"
          style={{
            marginTop: '8px',
            width: '100%',
            minHeight: '42px',
            fontSize: '13px',
            fontWeight: 700,
            background: '#EFF6FF',
            color: '#0369A1',
            border: '1px solid #BAE6FD'
          }}
        >
          ↺ {copy.scrubber_average_btn}
        </button>
      )}
    </div>
  );
}
