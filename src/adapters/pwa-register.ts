export const PRECACHE_ASSETS: readonly string[] = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/favicon.svg',
  '/data/places.json',
  '/data/vehicles/microbus-14.json',
  '/data/vehicles/bus-49.json'
];

/**
 * Pure helper to determine which oldest cache keys must be evicted
 * to keep dynamic route cache within the storage budget (Story 5.1 AC-2).
 */
export function evictOldCacheEntries(keys: string[], maxEntries: number): string[] {
  if (keys.length <= maxEntries || maxEntries < 0) {
    return [];
  }
  const deleteCount = keys.length - maxEntries;
  return keys.slice(0, deleteCount);
}

/**
 * Registers the PWA Service Worker and notifies the UI when a new version is waiting,
 * without forcing an intrusive reload during an active trip check (Story 5.1 AC-3).
 */
export function registerServiceWorker(
  onUpdateAvailable?: (activateUpdate: () => void) => void
): void {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return;
  if (!('serviceWorker' in navigator)) return;

  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then((registration) => {
        if (registration.waiting && onUpdateAvailable) {
          onUpdateAvailable(() => {
            registration.waiting?.postMessage({ type: 'SKIP_WAITING' });
          });
        }

        registration.addEventListener('updatefound', () => {
          const installingWorker = registration.installing;
          if (!installingWorker) return;

          installingWorker.addEventListener('statechange', () => {
            if (
              installingWorker.state === 'installed' &&
              navigator.serviceWorker.controller &&
              onUpdateAvailable
            ) {
              onUpdateAvailable(() => {
                installingWorker.postMessage({ type: 'SKIP_WAITING' });
              });
            }
          });
        });
      })
      .catch(() => {
        // Ignore service worker registration errors in dev/unsupported environments
      });

    let refreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (refreshing) return;
      refreshing = true;
      window.location.reload();
    });
  });
}
