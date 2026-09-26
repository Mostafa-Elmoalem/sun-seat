import type { Place } from '../core/types/places.ts';
import { defaultPlacesRepository } from '../adapters/places-repository.ts';
import { COPY } from './i18n/copy.ts';

/**
 * One GPS fix turned into a place named by what is nearby ("قريب من الدقي").
 * The precise coordinates stay in memory for this calculation only; share links
 * round them (see trip-store).
 */
export function locateMe(): Promise<Place> {
  return new Promise((resolve, reject) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      reject(new Error('unsupported'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        void defaultPlacesRepository.loadGazetteer().finally(() => {
          const near = defaultPlacesRepository.findNearest(lat, lng, 8);
          resolve({
            id: 'gps',
            nameAr: COPY.ar.myLocationName,
            nameEn: COPY.en.myLocationName,
            contextAr: near ? COPY.ar.gpsNear(near.place.nameAr) : undefined,
            contextEn: near ? COPY.en.gpsNear(near.place.nameEn) : undefined,
            location: { lat, lng },
            kind: 'gps'
          });
        });
      },
      (err) => reject(err),
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 120_000 }
    );
  });
}
