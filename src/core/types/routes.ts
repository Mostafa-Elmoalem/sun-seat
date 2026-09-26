export interface RouteSegment {
  startLat: number;
  startLng: number;
  endLat: number;
  endLng: number;
  distanceKm: number;
  bearingDeg: number;             // 0-360 degrees clockwise from North
  durationMin: number;
}

export interface RouteData {
  routeId: string;
  originId: string;
  destinationId: string;
  distanceKm: number;
  carDurationMin: number;
  encodedPolyline: string;
  isApproximate?: boolean;
}

export interface DecodedRoute {
  routeId: string;
  originId: string;
  destinationId: string;
  totalDistanceKm: number;
  totalDurationMin: number;
  isApproximate: boolean;
  coordinates: [number, number][]; // [lat, lng] array
  segments: RouteSegment[];
}

export type ProcessedRoute = Pick<
  DecodedRoute,
  'totalDistanceKm' | 'totalDurationMin' | 'isApproximate' | 'segments'
>;


