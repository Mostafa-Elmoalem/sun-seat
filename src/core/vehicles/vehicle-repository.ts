import type { VehicleProfile } from '../types/vehicle.ts';
import { VEHICLES } from '../../data/vehicles.ts';

const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

/**
 * Runtime check for vehicle profiles, so a new vehicle (private car, train car)
 * can be added as data without touching the engine.
 */
export function validateVehicleProfile(profile: unknown): profile is VehicleProfile {
  if (!profile || typeof profile !== 'object') return false;
  const p = profile as Partial<VehicleProfile>;
  if (typeof p.id !== 'string' || !p.id) return false;
  if (typeof p.nameAr !== 'string' || typeof p.nameEn !== 'string') return false;
  if (!p.type || !['microbus', 'bus', 'custom'].includes(p.type)) return false;
  if (!isNum(p.speedFactor) || !isNum(p.stopOverheadMin) || typeof p.hasCurtains !== 'boolean') return false;

  const d = p.dimensions;
  if (
    !d ||
    ![d.lengthM, d.widthM, d.heightM, d.floorZ, d.roofInnerZ, d.frontWallY, d.rearWallY].every(isNum) ||
    d.roofInnerZ <= d.floorZ ||
    d.rearWallY <= d.frontWallY
  ) {
    return false;
  }
  if (!p.driver || ![p.driver.x, p.driver.y, p.driver.z].every(isNum)) return false;

  if (!Array.isArray(p.windows) || p.windows.length === 0) return false;
  for (const w of p.windows) {
    if (!isNum(w.zBottom) || !isNum(w.zTop) || w.zTop <= w.zBottom) return false;
    if (w.side === 'left' || w.side === 'right') {
      if (!('yStart' in w) || !isNum(w.yStart) || !isNum(w.yEnd) || w.yEnd <= w.yStart) return false;
    } else if (w.side === 'front' || w.side === 'rear') {
      if (!('xStart' in w) || !isNum(w.xStart) || !isNum(w.xEnd) || w.xEnd <= w.xStart) return false;
    } else {
      return false;
    }
  }

  if (!Array.isArray(p.seats) || p.seats.length === 0 || p.seats.length !== p.totalSeats) return false;
  const ids = new Set<number>();
  for (const s of p.seats) {
    if (!isNum(s.id) || ids.has(s.id)) return false;
    ids.add(s.id);
    if (!['left', 'right', 'middle'].includes(s.side) || typeof s.isWindow !== 'boolean') return false;
    if (!s.position || ![s.position.x, s.position.y, s.position.z].every(isNum)) return false;
    if (Math.abs(s.position.x) >= d.widthM / 2) return false;
  }
  return true;
}

export class VehicleRepository {
  private profiles = new Map<string, VehicleProfile>();

  constructor(profiles: VehicleProfile[] = VEHICLES) {
    profiles.forEach((p) => this.registerProfile(p));
  }

  registerProfile(profile: VehicleProfile): void {
    if (!validateVehicleProfile(profile)) {
      throw new Error(`Invalid vehicle profile: ${(profile as { id?: string })?.id ?? 'unknown'}`);
    }
    this.profiles.set(profile.id, profile);
  }

  getProfile(id: string): VehicleProfile {
    const profile = this.profiles.get(id) ?? this.profiles.get('microbus-14');
    if (!profile) throw new Error(`Vehicle profile not found: ${id}`);
    return profile;
  }

  getAllProfiles(): VehicleProfile[] {
    return Array.from(this.profiles.values());
  }
}

export const defaultVehicleRepository = new VehicleRepository();
