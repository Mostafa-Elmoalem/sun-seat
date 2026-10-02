export interface RouteSegment {
  startLat: number;
  startLng: number;
  endLat: number;
  endLng: number;
  distanceKm: number;
  /** 0 to 360 degrees clockwise from true north. */
  bearingDeg: number;
  durationMin: number;
}

/**
 * Where a route came from, shown to the user so they know how much to trust it:
 * precomputed: real road route shipped with the app (works offline)
 * live:        real road route fetched just now from the routing server
 * cached:      real road route fetched earlier and stored on this phone
 * straight:    no road data reachable; a straight line between the two points
 */
export type RouteSource = 'precomputed' | 'live' | 'cached' | 'straight';

export interface RouteData {
  routeId: string;
  originId: string;
  destinationId: string;
  distanceKm: number;
  carDurationMin: number;
  encodedPolyline: string;
}

export interface DecodedRoute {
  routeId: string;
  totalDistanceKm: number;
  totalDurationMin: number;
  source: RouteSource;
  isApproximate: boolean;
  approximateReason?: 'offline' | 'route_failed';
  coordinates: [number, number][];
  segments: RouteSegment[];
}

export type ProcessedRoute = Pick<DecodedRoute, 'totalDistanceKm' | 'totalDurationMin' | 'segments'>;
