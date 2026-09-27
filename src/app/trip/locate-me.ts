import type { Place } from '../../core/types/places.ts';
import { defaultPlacesRepository } from '../../adapters/places-repository.ts';

/** How a GPS fix is named in each language: "موقعي", and "قريب من الدقي" for context. */
export interface GpsNaming {
  nameAr: string;
  nameEn: string;
  nearAr: (place: string) => string;
  nearEn: (place: string) => string;
}

/**
 * One GPS fix turned into a place named by what is nearby. The precise coordinates stay
 * in memory for this calculation only; share links round them (see share-link.ts).
 */
export function locateMe(naming: GpsNaming): Promise<Place> {
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
            nameAr: naming.nameAr,
            nameEn: naming.nameEn,
            contextAr: near ? naming.nearAr(near.place.nameAr) : undefined,
            contextEn: near ? naming.nearEn(near.place.nameEn) : undefined,
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
