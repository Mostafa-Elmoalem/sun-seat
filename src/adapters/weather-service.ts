import type { AppLanguage } from '../ui/i18n/copy.ts';

export type WeatherCondition = 'CLEAR' | 'PARTLY_CLOUDY' | 'OVERCAST';

export interface WeatherData {
  cloudCoverPct: number;
  uvIndex: number;
  condition: WeatherCondition;
  fetchedAt: number;
}

export interface NetworkConnectionHints {
  saveData?: boolean;
  effectiveType?: string;
  offline?: boolean;
}

export interface WeatherServiceOptions {
  timeoutMs?: number;
  fetchImpl?: typeof fetch;
}

const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes

/**
 * Inspects browser Network Information API & offline state to determine if
 * non-essential background network requests (Weather API, 3D preloading) should be skipped.
 */
export function shouldSkipNetworkExtras(hints?: NetworkConnectionHints): boolean {
  if (hints) {
    if (hints.offline) return true;
    if (hints.saveData) return true;
    if (hints.effectiveType === 'slow-2g' || hints.effectiveType === '2g') return true;
    return false;
  }

  if (typeof navigator === 'undefined') return false;
  if (navigator.onLine === false) return true;

  const navWithConn = navigator as Navigator & {
    connection?: {
      saveData?: boolean;
      effectiveType?: string;
    };
  };

  const conn = navWithConn.connection;
  if (!conn) return false;
  if (conn.saveData === true) return true;
  if (conn.effectiveType === 'slow-2g' || conn.effectiveType === '2g') return true;

  return false;
}

/**
 * Formats non-blocking colloquial Arabic / English weather badge copy (Story 5.2 AC-3).
 */
export function formatWeatherBadgeCopy(weather: WeatherData, lang: AppLanguage): string {
  const pct = Math.round(weather.cloudCoverPct);
  if (weather.condition === 'OVERCAST' || pct > 75) {
    return lang === 'ar'
      ? `☁️ الجو مغيم دلوقتي (${pct}% غيوم) — حرارة الشمس أخف على كل الكراسي`
      : `☁️ Heavy cloud cover (${pct}%) — sun heat is milder across all seats`;
  }

  if (weather.condition === 'PARTLY_CLOUDY' || pct >= 35) {
    return lang === 'ar'
      ? `⛅ غيوم جزئية (${pct}% غيم) — الجنب الضل لسه أضمن وأبرد`
      : `⛅ Partly cloudy (${pct}% cloud) — shaded side is still cooler`;
  }

  return lang === 'ar'
    ? `☀️ سما صافية (مؤشر UV ${weather.uvIndex.toFixed(1)}) — التزم بالجنب الضل`
    : `☀️ Clear sky (UV ${weather.uvIndex.toFixed(1)}) — stick to the shaded side`;
}

function classifyCondition(cloudCoverPct: number): WeatherCondition {
  if (cloudCoverPct > 75) return 'OVERCAST';
  if (cloudCoverPct >= 35) return 'PARTLY_CLOUDY';
  return 'CLEAR';
}

function toHourKey(dateUtc: Date): string {
  // YYYY-MM-DDTHH
  return dateUtc.toISOString().slice(0, 13);
}

export class WeatherService {
  private readonly timeoutMs: number;
  private readonly fetchImpl?: typeof fetch;
  private readonly cache = new Map<string, WeatherData>();

  constructor(options?: WeatherServiceOptions) {
    this.timeoutMs = options?.timeoutMs ?? 1500;
    this.fetchImpl = options?.fetchImpl;
  }

  /**
   * Non-blocking weather fetch with strict 1500ms timeout and location+hour caching.
   * Always resolves to `WeatherData | null` and never throws.
   */
  public async getTripWeather(
    lat: number,
    lng: number,
    dateUtc: Date,
    hints?: NetworkConnectionHints
  ): Promise<WeatherData | null> {
    if (shouldSkipNetworkExtras(hints)) {
      return null;
    }

    const hourPrefix = toHourKey(dateUtc);
    const cacheKey = `${lat.toFixed(2)}:${lng.toFixed(2)}:${hourPrefix}`;
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
      return cached;
    }

    const fetcher = this.fetchImpl ?? (typeof fetch !== 'undefined' ? fetch : undefined);
    if (!fetcher) return null;

    const controller = new AbortController();
    let timerId: ReturnType<typeof setTimeout> | undefined;

    const timeoutPromise = new Promise<null>((resolve) => {
      timerId = setTimeout(() => {
        controller.abort();
        resolve(null);
      }, this.timeoutMs);
    });

    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat.toFixed(4)}&longitude=${lng.toFixed(4)}&hourly=cloudcover,uv_index&forecast_days=2&timezone=UTC`;

    try {
      const fetchPromise = (async (): Promise<WeatherData | null> => {
        const response = await fetcher(url, {
          method: 'GET',
          signal: controller.signal
        });

        if (!response || !response.ok) return null;

        const data = (await response.json()) as {
          hourly?: {
            time?: string[];
            cloudcover?: number[];
            uv_index?: number[];
          };
        };

        const times = data?.hourly?.time;
        const clouds = data?.hourly?.cloudcover;
        const uvs = data?.hourly?.uv_index;

        if (!Array.isArray(clouds) || clouds.length === 0) {
          return null;
        }

        let idx = 0;
        if (Array.isArray(times)) {
          const foundIdx = times.findIndex((t) => typeof t === 'string' && t.startsWith(hourPrefix));
          if (foundIdx >= 0) {
            idx = foundIdx;
          }
        }

        const rawCloud = Number(clouds[idx] ?? clouds[0] ?? 0);
        const rawUv = Number(Array.isArray(uvs) ? (uvs[idx] ?? uvs[0] ?? 0) : 0);

        const cloudCoverPct = Math.min(100, Math.max(0, Number.isFinite(rawCloud) ? rawCloud : 0));
        const uvIndex = Math.max(0, Number.isFinite(rawUv) ? rawUv : 0);

        const result: WeatherData = {
          cloudCoverPct,
          uvIndex,
          condition: classifyCondition(cloudCoverPct),
          fetchedAt: Date.now()
        };

        this.cache.set(cacheKey, result);
        return result;
      })();

      return await Promise.race([fetchPromise, timeoutPromise]);
    } catch {
      return null;
    } finally {
      if (timerId !== undefined) {
        clearTimeout(timerId);
      }
    }
  }

  public clearCache(): void {
    this.cache.clear();
  }
}

export const defaultWeatherService = new WeatherService();
