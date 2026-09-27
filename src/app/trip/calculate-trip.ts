import type { Place } from '../../core/types/places.ts';
import type { DecodedRoute } from '../../core/types/routes.ts';
import type { TripExposureVerdict, VehicleProfile } from '../../core/types/vehicle.ts';
import { calculateTripExposure } from '../../core/exposure/exposure-calculator.ts';
import { defaultRoutesRepository } from '../../adapters/routes-repository.ts';
import { defaultVehicleRepository } from '../../core/vehicles/vehicle-repository.ts';

/**
 * The one use case: a trip in, the road and the sun on every seat out.
 * Dependencies are injectable so the use case can run in tests without a network.
 */

export interface TripRequest {
  origin: Place;
  destination: Place;
  vehicleId: string;
  departure: Date;
}

export interface TripResult {
  route: DecodedRoute;
  vehicle: VehicleProfile;
  verdict: TripExposureVerdict;
}

export type TripProblem = 'MISSING' | 'SAME';

export interface TripDeps {
  getRoute: (origin: Place, destination: Place) => Promise<DecodedRoute>;
  getVehicle: (id: string) => VehicleProfile;
}

const defaultDeps: TripDeps = {
  getRoute: (o, d) => defaultRoutesRepository.getRoute(o, d),
  getVehicle: (id) => defaultVehicleRepository.getProfile(id)
};

/** Why a trip cannot be calculated yet, or null when it can. */
export function validateTrip(origin: Place | null, destination: Place | null): TripProblem | null {
  if (!origin || !destination) return 'MISSING';
  const sameSpot =
    origin.id === destination.id ||
    (Math.abs(origin.location.lat - destination.location.lat) < 0.002 && Math.abs(origin.location.lng - destination.location.lng) < 0.002);
  return sameSpot ? 'SAME' : null;
}

export async function calculateTrip(request: TripRequest, deps: TripDeps = defaultDeps): Promise<TripResult> {
  const route = await deps.getRoute(request.origin, request.destination);
  const vehicle = deps.getVehicle(request.vehicleId);
  const verdict = calculateTripExposure(route, request.departure, vehicle);
  return { route, vehicle, verdict };
}
