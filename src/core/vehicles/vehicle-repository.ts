import type { VehicleProfile } from '../types/vehicle.ts';
import microbusData from '../../../public/data/vehicles/microbus-14.json';
import busData from '../../../public/data/vehicles/bus-49.json';

/**
 * Validates that an arbitrary object satisfies the strict VehicleProfile schema.
 */
export function validateVehicleProfile(profile: any): profile is VehicleProfile {
  if (!profile || typeof profile !== 'object') return false;
  if (typeof profile.id !== 'string' || !profile.id) return false;
  if (typeof profile.nameAr !== 'string' || typeof profile.nameEn !== 'string') return false;
  if (!['microbus', 'bus', 'custom'].includes(profile.type)) return false;
  if (typeof profile.totalSeats !== 'number' || profile.totalSeats <= 0) return false;
  if (typeof profile.speedFactor !== 'number' || typeof profile.stopOverheadMin !== 'number') return false;
  if (typeof profile.hasCurtains !== 'boolean') return false;

  // Dimensions
  if (
    !profile.dimensions ||
    typeof profile.dimensions.lengthM !== 'number' ||
    typeof profile.dimensions.widthM !== 'number' ||
    typeof profile.dimensions.heightM !== 'number'
  ) {
    return false;
  }

  // Windows
  if (!Array.isArray(profile.windows) || profile.windows.length === 0) return false;
  for (const win of profile.windows) {
    if (!['left', 'right', 'front', 'rear'].includes(win.side)) return false;
    if (typeof win.yStart !== 'number' || typeof win.yEnd !== 'number') return false;
    if (typeof win.zBottom !== 'number' || typeof win.zTop !== 'number') return false;
  }

  // Seats
  if (!Array.isArray(profile.seats) || profile.seats.length !== profile.totalSeats) return false;
  for (const seat of profile.seats) {
    if (typeof seat.id !== 'number' || typeof seat.row !== 'number' || typeof seat.col !== 'number') return false;
    if (!['left', 'right', 'middle'].includes(seat.side)) return false;
    if (typeof seat.isWindow !== 'boolean') return false;
    if (
      !seat.position ||
      typeof seat.position.x !== 'number' ||
      typeof seat.position.y !== 'number' ||
      typeof seat.position.z !== 'number'
    ) {
      return false;
    }
  }

  return true;
}

export class VehicleRepository {
  private profiles = new Map<string, VehicleProfile>();

  constructor() {
    this.registerProfile(microbusData as VehicleProfile);
    this.registerProfile(busData as VehicleProfile);
  }

  public registerProfile(profile: VehicleProfile): void {
    if (!validateVehicleProfile(profile)) {
      throw new Error(`Invalid vehicle profile: ${(profile as any)?.id || 'unknown'}`);
    }
    this.profiles.set(profile.id, profile);
  }

  public getProfile(id: string): VehicleProfile {
    const profile = this.profiles.get(id);
    if (!profile) {
      // Default fallback to microbus
      const fallback = this.profiles.get('microbus-14');
      if (fallback) return fallback;
      throw new Error(`Vehicle profile not found: ${id}`);
    }
    return profile;
  }

  public getAllProfiles(): VehicleProfile[] {
    return Array.from(this.profiles.values());
  }
}

export const defaultVehicleRepository = new VehicleRepository();
