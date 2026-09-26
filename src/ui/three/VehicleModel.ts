import type { VehicleProfile } from '../../core/types/vehicle.ts';

export interface Seat3DBox {
  seatId: number;
  labelAr: string;
  labelEn: string;
  side: 'left' | 'right' | 'middle';
  isWindow: boolean;
  /** Centered 3D coordinates: x (+right / -left), y (+up), z (-front / +rear) */
  center: [number, number, number];
  size: [number, number, number];
}

export interface Vehicle3DMeshData {
  vehicleId: string;
  lengthM: number;
  widthM: number;
  heightM: number;
  roofOverhangM: number;
  driverCenter: [number, number, number];
  seatBoxes: Seat3DBox[];
  wheels: [number, number, number][];
  orientationLabels: {
    frontAr: string;
    frontEn: string;
    leftAr: string;
    leftEn: string;
    rightAr: string;
    rightEn: string;
    frontPos: [number, number, number];
    leftPos: [number, number, number];
    rightPos: [number, number, number];
  };
}

/**
 * Generates stylized low-poly 3D mesh descriptors from any VehicleProfile.
 * Centers the vehicle around (0, 0, 0) with front pointing towards -Z (top of viewport),
 * physical left on -X, physical right on +X, and vertical height on +Y.
 */
export function buildVehicle3DMeshData(vehicle: VehicleProfile): Vehicle3DMeshData {
  const { lengthM, widthM, heightM, roofOverhangM } = vehicle.dimensions;
  const halfLen = lengthM / 2;
  const halfWid = widthM / 2;

  const seatWidth = vehicle.type === 'bus' ? 0.42 : 0.44;
  const seatDepth = vehicle.type === 'bus' ? 0.46 : 0.48;
  const seatHeight = 0.55;

  const seatBoxes: Seat3DBox[] = vehicle.seats.map((s) => {
    // Convert vehicle longitudinal y (0 at front bumper -> lengthM at rear) to centered Z (-halfLen at front -> +halfLen at rear)
    const centeredZ = Number((s.position.y - halfLen).toFixed(2));
    const centeredX = Number(s.position.x.toFixed(2));
    const centeredY = Number((s.position.z * 0.65).toFixed(2));

    return {
      seatId: s.id,
      labelAr: s.labelAr,
      labelEn: s.labelEn,
      side: s.side,
      isWindow: s.isWindow,
      center: [centeredX, centeredY, centeredZ],
      size: [seatWidth, seatHeight, seatDepth]
    };
  });

  const driverZ = Number((1.15 - halfLen).toFixed(2));
  const driverX = Number((-halfWid * 0.58).toFixed(2));

  const wheelOffsetZ = Number((halfLen * 0.64).toFixed(2));
  const wheelOffsetX = Number((halfWid * 0.96).toFixed(2));
  const wheels: [number, number, number][] = [
    [-wheelOffsetX, 0.32, -wheelOffsetZ],
    [wheelOffsetX, 0.32, -wheelOffsetZ],
    [-wheelOffsetX, 0.32, wheelOffsetZ],
    [wheelOffsetX, 0.32, wheelOffsetZ]
  ];

  return {
    vehicleId: vehicle.id,
    lengthM,
    widthM,
    heightM,
    roofOverhangM,
    driverCenter: [driverX, 0.85, driverZ],
    seatBoxes,
    wheels,
    orientationLabels: {
      frontAr: '▲ قدام (السائق)',
      frontEn: '▲ FRONT (Driver)',
      leftAr: '◀ شمال',
      leftEn: '◀ LEFT',
      rightAr: 'يمين ▶',
      rightEn: 'RIGHT ▶',
      frontPos: [0, 0.2, -(halfLen + 0.65)],
      leftPos: [-(halfWid + 0.55), 0.5, 0],
      rightPos: [halfWid + 0.55, 0.5, 0]
    }
  };
}
