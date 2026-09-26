import {
  formatWeatherBadgeCopy,
  type WeatherData
} from '../../adapters/weather-service.ts';
import type { AppLanguage } from '../i18n/copy.ts';

export interface WeatherBadgeProps {
  weather: WeatherData | null;
  lang: AppLanguage;
}

export function WeatherBadge({ weather, lang }: WeatherBadgeProps) {
  if (!weather) return null;

  const copyText = formatWeatherBadgeCopy(weather, lang);
  const isOvercast = weather.condition === 'OVERCAST' || weather.cloudCoverPct > 75;

  return (
    <div
      data-testid="weather-badge"
      role="status"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '8px',
        padding: '8px 12px',
        borderRadius: '12px',
        background: isOvercast ? '#F0F9FF' : '#FFFBEB',
        border: isOvercast ? '1.5px solid #0EA5E9' : '1.5px solid #F59E0B',
        color: isOvercast ? '#0369A1' : '#92400E',
        fontSize: '12px',
        fontWeight: 800
      }}
    >
      <span>{copyText}</span>
    </div>
  );
}
