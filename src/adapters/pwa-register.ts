/**
 * Registers the service worker and tells the UI when a new version is waiting.
 * The page reloads only after the rider taps "update": never on the first install,
 * never in the middle of typing a trip.
 */
export function registerServiceWorker(onUpdateAvailable?: (activateUpdate: () => void) => void): void {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return;
  if (!('serviceWorker' in navigator)) return;

  let userAcceptedUpdate = false;
  const offer = (worker: ServiceWorker | null) => {
    if (!worker || !onUpdateAvailable) return;
    onUpdateAvailable(() => {
      userAcceptedUpdate = true;
      worker.postMessage({ type: 'SKIP_WAITING' });
    });
  };

  const register = () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then((registration) => {
        if (registration.waiting && navigator.serviceWorker.controller) offer(registration.waiting);
        registration.addEventListener('updatefound', () => {
          const installing = registration.installing;
          installing?.addEventListener('statechange', () => {
            // A controller already exists, so this is an update rather than the first install.
            if (installing.state === 'installed' && navigator.serviceWorker.controller) offer(installing);
          });
        });
      })
      .catch(() => {
        // Unsupported or blocked: the app works without offline support.
      });
  };

  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (userAcceptedUpdate) window.location.reload();
  });

  // The load event may already have fired by the time React mounts.
  if (document.readyState === 'complete') register();
  else window.addEventListener('load', register, { once: true });
}
