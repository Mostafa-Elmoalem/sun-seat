import type { Place } from '../core/types/places.ts';
import { normalizeArabic, fuzzyMatchArabic } from '../core/geometry/normalize-arabic.ts';
import { calculateDistanceKm } from '../core/geometry/bearing.ts';
import placesData from '../../public/data/places.json';

interface IndexedPlace {
  place: Place;
  normNameAr: string;
  normNameEn: string;
  normAliases: string[];
}

export class PlacesRepository {
  private places: Place[];
  private indexed: IndexedPlace[];

  constructor(customPlaces?: Place[]) {
    this.places = customPlaces ?? (placesData as Place[]);
    this.indexed = this.places.map((place) => ({
      place,
      normNameAr: normalizeArabic(place.nameAr),
      normNameEn: place.nameEn.toLowerCase(),
      normAliases: place.aliases.map((a) => normalizeArabic(a))
    }));
  }

  /**
   * Searches places using Arabic-aware fuzzy matching.
   * Runs in < 0.2ms locally.
   */
  search(query: string, limit: number = 6): Place[] {
    const trimmed = query.trim();
    if (!trimmed) {
      return this.getPopular(limit);
    }

    const normQuery = normalizeArabic(trimmed);

    const matches: { place: Place; score: number }[] = [];

    for (const item of this.indexed) {
      const { place, normNameAr, normNameEn, normAliases } = item;
      let matched = false;
      let score = 0;

      // 1. Exact start match on primary name
      if (normNameAr.startsWith(normQuery) || normNameEn.startsWith(normQuery)) {
        matched = true;
        score += 100;
      }
      // 2. Partial match on primary name
      else if (normNameAr.includes(normQuery) || normNameEn.includes(normQuery)) {
        matched = true;
        score += 60;
      }
      // 3. Match on aliases (colloquial names like "عبود" or "روكسي")
      else {
        for (const normAlias of normAliases) {
          if (normAlias.startsWith(normQuery)) {
            matched = true;
            score += 80;
            break;
          } else if (fuzzyMatchArabic(normQuery, normAlias)) {
            matched = true;
            score += 50;
            break;
          }
        }
      }

      if (matched) {
        if (place.isPopular) score += 10;
        matches.push({ place, score });
      }
    }

    matches.sort((a, b) => b.score - a.score);
    return matches.slice(0, limit).map((m) => m.place);
  }

  /**
   * Returns the top popular stations and districts for quick 1-tap picking.
   */
  getPopular(limit: number = 6): Place[] {
    return this.places.filter((p) => p.isPopular).slice(0, limit);
  }

  /**
   * Finds the nearest registered place / district to given GPS coordinates.
   */
  findNearest(lat: number, lng: number, maxDistanceKm: number = 50): Place | null {
    let nearest: Place | null = null;
    let minDist = Infinity;

    for (const place of this.places) {
      const dist = calculateDistanceKm(lat, lng, place.location.lat, place.location.lng);
      if (dist < minDist && dist <= maxDistanceKm) {
        minDist = dist;
        nearest = place;
      }
    }

    return nearest;
  }

  /**
   * Finds a place by its unique ID.
   */
  getById(id: string): Place | undefined {
    return this.places.find((p) => p.id === id);
  }
}

export const defaultPlacesRepository = new PlacesRepository();
