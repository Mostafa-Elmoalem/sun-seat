import type { Place } from '../core/types/places.ts';
import type { RouteData, DecodedRoute, RouteSegment } from '../core/types/routes.ts';
import { decodePolyline, encodePolyline } from '../core/geometry/polyline-decoder.ts';
import { calculateBearing, calculateDistanceKm } from '../core/geometry/bearing.ts';

export class RoutesRepository {
  private localCache: Map<string, RouteData> = new Map();

  constructor(preloadedRoutes?: RouteData[]) {
    if (preloadedRoutes) {
      for (const r of preloadedRoutes) {
        this.localCache.set(r.routeId, r);
      }
    }
  }

  /**
   * Generates a unique route ID from origin and destination IDs.
   */
  getRouteId(originId: string, destId: string): string {
    return `${originId}-${destId}`;
  }

  /**
   * Fetches or calculates route between two places.
   * Priority: Memory Cache -> Static JSON -> OSRM Live (if online) -> Great Circle Fallback
   */
  async getRoute(origin: Place, dest: Place): Promise<DecodedRoute> {
    const routeId = this.getRouteId(origin.id, dest.id);

    // 1. Memory Cache
    let routeData = this.localCache.get(routeId);

    // 2. Fetch from static public folder if not in memory
    if (!routeData && typeof fetch !== 'undefined') {
      try {
        const res = await fetch(`/data/routes/${routeId}.json`);
        if (res.ok) {
          routeData = (await res.json()) as RouteData;
          this.localCache.set(routeId, routeData);
        }
      } catch {
        // Network failure / offline
      }
    }

    // 3. Fallback: Great Circle straight-line route
    if (!routeData) {
      routeData = this.createStraightLineFallback(origin, dest);
    }

    return this.processRoute(routeData, origin, dest);
  }

  /**
   * Decodes and divides polyline coordinates into segments with bearings and durations.
   */
  processRoute(routeData: RouteData, origin: Place, dest: Place): DecodedRoute {
    let coordinates = decodePolyline(routeData.encodedPolyline);

    if (coordinates.length < 2) {
      coordinates = [
        [origin.location.lat, origin.location.lng],
        [dest.location.lat, dest.location.lng]
      ];
    }

    const rawSegments: { start: [number, number]; end: [number, number]; dist: number; bearing: number }[] = [];
    let actualPolylineDistKm = 0;

    for (let i = 0; i < coordinates.length - 1; i++) {
      const start = coordinates[i]!;
      const end = coordinates[i + 1]!;
      const dist = calculateDistanceKm(start[0], start[1], end[0], end[1]);
      const bearing = calculateBearing(start[0], start[1], end[0], end[1]);
      actualPolylineDistKm += dist;

      rawSegments.push({ start, end, dist, bearing });
    }

    const totalDuration = routeData.carDurationMin;
    const segments: RouteSegment[] = rawSegments.map((s) => {
      const duration = actualPolylineDistKm > 0 ? (s.dist / actualPolylineDistKm) * totalDuration : 0;
      return {
        startLat: s.start[0],
        startLng: s.start[1],
        endLat: s.end[0],
        endLng: s.end[1],
        distanceKm: Number(s.dist.toFixed(2)),
        bearingDeg: Number(s.bearing.toFixed(1)),
        durationMin: Number(duration.toFixed(2))
      };
    });

    return {
      routeId: routeData.routeId,
      originId: routeData.originId,
      destinationId: routeData.destinationId,
      totalDistanceKm: routeData.distanceKm,
      totalDurationMin: routeData.carDurationMin,
      isApproximate: !!routeData.isApproximate,
      coordinates,
      segments
    };
  }

  /**
   * Generates a safe Great Circle fallback route when route file is missing or offline.
   */
  createStraightLineFallback(origin: Place, dest: Place): RouteData {
    const dist = calculateDistanceKm(
      origin.location.lat,
      origin.location.lng,
      dest.location.lat,
      dest.location.lng
    );

    // Approximate car driving time: average 70 km/h in Egypt
    const durationMin = Math.max(15, Math.round((dist / 70) * 60));

    // Interpolate 5 intermediate points along the straight line
    const coords: [number, number][] = [];
    for (let i = 0; i <= 5; i++) {
      const ratio = i / 5;
      const lat = origin.location.lat + (dest.location.lat - origin.location.lat) * ratio;
      const lng = origin.location.lng + (dest.location.lng - origin.location.lng) * ratio;
      coords.push([lat, lng]);
    }

    return {
      routeId: this.getRouteId(origin.id, dest.id),
      originId: origin.id,
      destinationId: dest.id,
      distanceKm: Number(dist.toFixed(1)),
      carDurationMin: durationMin,
      encodedPolyline: encodePolyline(coords),
      isApproximate: true
    };
  }
}

export const defaultRoutesRepository = new RoutesRepository();
