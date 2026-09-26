import { describe, it, expect } from 'vitest';
import {
  VehicleRepository,
  defaultVehicleRepository,
  validateVehicleProfile
} from '../../src/core/vehicles/vehicle-repository.ts';
import type { VehicleProfile } from '../../src/core/types/vehicle.ts';

describe('Vehicle Profiles & Schema Validation', () => {
  it('validates standard 14-seater microbus profile', () => {
    const microbus = defaultVehicleRepository.getProfile('microbus-14');
    expect(microbus).toBeDefined();
    expect(microbus.totalSeats).toBe(14);
    expect(microbus.seats.length).toBe(14);
    expect(validateVehicleProfile(microbus)).toBe(true);
  });

  it('validates 49-seater intercity bus profile with curtains flag', () => {
    const bus = defaultVehicleRepository.getProfile('bus-49');
    expect(bus).toBeDefined();
    expect(bus.totalSeats).toBe(49);
    expect(bus.seats.length).toBe(49);
    expect(bus.hasCurtains).toBe(true);
    expect(validateVehicleProfile(bus)).toBe(true);
  });

  it('enforces physical integrity: driver/left seats have x < 0 and right seats have x > 0', () => {
    const microbus = defaultVehicleRepository.getProfile('microbus-14');
    const leftSeats = microbus.seats.filter((s) => s.side === 'left');
    const rightSeats = microbus.seats.filter((s) => s.side === 'right');

    expect(leftSeats.length).toBeGreaterThan(0);
    expect(rightSeats.length).toBeGreaterThan(0);

    for (const seat of leftSeats) {
      expect(seat.position.x).toBeLessThan(0);
    }
    for (const seat of rightSeats) {
      expect(seat.position.x).toBeGreaterThan(0);
    }
  });

  // Q6: Adding a dummy "private car" profile JSON works with no engine code changes
  it('registers and retrieves a custom private car profile without engine modifications', () => {
    const privateCar: VehicleProfile = {
      id: 'private-sedan-4',
      nameAr: 'سيارة ملاكي (4 ركاب)',
      nameEn: 'Private Sedan (4-seater)',
      type: 'custom',
      totalSeats: 3, // excluding driver
      speedFactor: 1.0,
      stopOverheadMin: 0,
      hasCurtains: false,
      dimensions: {
        lengthM: 4.6,
        widthM: 1.8,
        heightM: 1.45,
        roofOverhangM: 0.1
      },
      windows: [
        { id: 'w-front', side: 'front', yStart: 0.5, yEnd: 1.2, zBottom: 0.8, zTop: 1.35 },
        { id: 'w-rear', side: 'rear', yStart: 4.0, yEnd: 4.4, zBottom: 0.8, zTop: 1.35 },
        { id: 'w-left', side: 'left', yStart: 1.3, yEnd: 3.8, zBottom: 0.8, zTop: 1.35 },
        { id: 'w-right', side: 'right', yStart: 1.3, yEnd: 3.8, zBottom: 0.8, zTop: 1.35 }
      ],
      seats: [
        {
          id: 1,
          labelAr: "كرسي أمام الراكب",
          labelEn: "Front Passenger",
          row: 0,
          col: 1,
          side: "right",
          isWindow: true,
          position: { x: 0.45, y: 1.5, z: 0.95 }
        },
        {
          id: 2,
          labelAr: "كنبة خلفية شمال",
          labelEn: "Rear Left",
          row: 1,
          col: 0,
          side: "left",
          isWindow: true,
          position: { x: -0.45, y: 2.8, z: 0.95 }
        },
        {
          id: 3,
          labelAr: "كنبة خلفية يمين",
          labelEn: "Rear Right",
          row: 1,
          col: 1,
          side: "right",
          isWindow: true,
          position: { x: 0.45, y: 2.8, z: 0.95 }
        }
      ]
    };

    const repo = new VehicleRepository();
    repo.registerProfile(privateCar);
    const retrieved = repo.getProfile('private-sedan-4');
    expect(retrieved).toBeDefined();
    expect(retrieved.id).toBe('private-sedan-4');
    expect(retrieved.totalSeats).toBe(3);
  });
});
