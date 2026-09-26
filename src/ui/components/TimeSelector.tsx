import { useState } from 'react';
import { formatCairoTime, cairoTimeToUtc, CAIRO_TIMEZONE } from '../../core/astronomy/timezone.ts';
import { COPY_DECK, type AppLanguage } from '../i18n/copy.ts';

export interface TimeSelectorProps {
  departureDateUtc: Date;
  isNowMode: boolean;
  onSetNow: () => void;
  onAddMinutes: (minutes: number) => void;
  onChangeCustomDate: (dateUtc: Date) => void;
  lang: AppLanguage;
}

function getCairoDateTimeParts(utcDate: Date) {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: CAIRO_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
  const parts = formatter.formatToParts(utcDate);
  const map: Record<string, string> = {};
  for (const p of parts) {
    if (p.type !== 'literal') map[p.type] = p.value;
  }
  const year = map['year'] || '2026';
  const month = map['month'] || '06';
  const day = map['day'] || '15';
  const hour = map['hour'] === '24' ? '00' : map['hour'] || '08';
  const minute = map['minute'] || '00';
  return {
    dateStr: `${year}-${month}-${day}`,
    timeStr: `${hour}:${minute}`
  };
}

export function TimeSelector({
  departureDateUtc,
  isNowMode,
  onSetNow,
  onAddMinutes,
  onChangeCustomDate,
  lang
}: TimeSelectorProps) {
  const copy = COPY_DECK[lang];
  const [showCustomPicker, setShowCustomPicker] = useState(false);
  const formattedTime = formatCairoTime(departureDateUtc, 'time');
  const { dateStr, timeStr } = getCairoDateTimeParts(departureDateUtc);

  const handleDateOrTimeInput = (newDateStr: string, newTimeStr: string) => {
    const [y, m, d] = newDateStr.split('-').map(Number);
    const [hr, min] = newTimeStr.split(':').map(Number);
    if (!y || !m || !d || Number.isNaN(hr) || Number.isNaN(min)) return;
    const utc = cairoTimeToUtc(y, m, d, hr ?? 0, min ?? 0);
    onChangeCustomDate(utc);
  };

  return (
    <div className="bento-card" style={{ padding: '12px' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '8px',
          gap: '8px'
        }}
      >
        <span style={{ fontSize: '14px', fontWeight: 700, color: '#0F172A' }}>
          {copy.time_label}
        </span>
        <button
          type="button"
          data-testid="toggle-custom-time-btn"
          onClick={() => setShowCustomPicker((v) => !v)}
          style={{
            minHeight: '36px',
            padding: '4px 12px',
            borderRadius: '10px',
            background: '#FEF3C7',
            border: '1px solid #F59E0B',
            color: '#92400E',
            fontWeight: 800,
            fontSize: '14px',
            cursor: 'pointer'
          }}
        >
          {isNowMode ? `${copy.input_time_now} (${formattedTime})` : formattedTime} ▾
        </button>
      </div>

      {/* Quick 1-Tap Time Chips (AC-2: >= 48px touch targets) */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
        <button
          type="button"
          data-testid="time-chip-now"
          onClick={onSetNow}
          className="touch-target"
          style={{
            minHeight: '48px',
            fontSize: '14px',
            fontWeight: 700,
            background: isNowMode ? '#0F172A' : '#F8FAFC',
            color: isNowMode ? '#FFFFFF' : '#0F172A',
            border: `1.5px solid ${isNowMode ? '#0F172A' : '#CBD5E1'}`
          }}
        >
          {copy.input_time_now}
        </button>
        <button
          type="button"
          data-testid="time-chip-plus-30"
          onClick={() => onAddMinutes(30)}
          className="touch-target"
          style={{
            minHeight: '48px',
            fontSize: '14px',
            fontWeight: 700,
            background: '#F8FAFC',
            color: '#0F172A',
            border: '1.5px solid #CBD5E1'
          }}
        >
          {copy.chip_plus_30m}
        </button>
        <button
          type="button"
          data-testid="time-chip-plus-60"
          onClick={() => onAddMinutes(60)}
          className="touch-target"
          style={{
            minHeight: '48px',
            fontSize: '14px',
            fontWeight: 700,
            background: '#F8FAFC',
            color: '#0F172A',
            border: '1.5px solid #CBD5E1'
          }}
        >
          {copy.chip_plus_1h}
        </button>
      </div>

      {showCustomPicker && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '8px',
            marginTop: '10px',
            paddingTop: '10px',
            borderTop: '1px solid #E2E8F0'
          }}
        >
          <div>
            <label
              htmlFor="custom-date-input"
              style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}
            >
              {lang === 'ar' ? 'التاريخ (القاهرة)' : 'Date (Cairo)'}
            </label>
            <input
              id="custom-date-input"
              data-testid="custom-date-input"
              type="date"
              value={dateStr}
              onChange={(e) => handleDateOrTimeInput(e.target.value, timeStr)}
              style={{
                width: '100%',
                minHeight: '48px',
                padding: '6px 10px',
                borderRadius: '10px',
                border: '1px solid #CBD5E1',
                fontSize: '15px',
                fontWeight: 600
              }}
            />
          </div>
          <div>
            <label
              htmlFor="custom-time-input"
              style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}
            >
              {lang === 'ar' ? 'الساعة (القاهرة)' : 'Time (Cairo)'}
            </label>
            <input
              id="custom-time-input"
              data-testid="custom-time-input"
              type="time"
              value={timeStr}
              onChange={(e) => handleDateOrTimeInput(dateStr, e.target.value)}
              style={{
                width: '100%',
                minHeight: '48px',
                padding: '6px 10px',
                borderRadius: '10px',
                border: '1px solid #CBD5E1',
                fontSize: '15px',
                fontWeight: 600
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
