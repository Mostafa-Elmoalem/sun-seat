import type { VehicleProfile, VehicleSeat, VehicleWindow } from '../core/types/vehicle.ts';
import { EGYPT_MICROBUS_14 } from '../../packages/egypt-microbus/src/spec.ts';

/**
 * Egyptian 14-seat microbus: the Chinese HiAce H100 family that fills Egyptian terminals
 * (King Long / Golden Dragon, Jinbei Haise, Foton View), standard roof.
 * Every number (body, glass, seats, driver) comes from the egypt-microbus package spec,
 * the same data the 3D model is built from, so the engine and the picture cannot disagree.
 * This file only adds what the app needs on top: names, labels and trip timing.
 * Layout confirmed by the owner:
 *   row 0: driver (left) + seat 1 (middle) + seat 2 (right window)
 *   rows 1 to 3: left window + middle + folding jump seat on the right (door side)
 *   row 4: back bench of 3 against the rear door
 */
const MB_BENCH_AR = ['', 'الكنبة الأولى', 'الكنبة التانية', 'الكنبة التالتة', 'الكنبة الورانية'];
const MB_BENCH_EN = ['', 'First bench', 'Second bench', 'Third bench', 'Back bench'];

function microbusLabel(row: number, col: number, isJump: boolean): { ar: string; en: string } {
  if (row === 0) {
    return col === 1 ? { ar: 'قدام جنب السواق', en: 'Front, next to the driver' } : { ar: 'قدام، شباك ناحية الباب', en: 'Front, door side window' };
  }
  const place =
    col === 0
      ? { ar: 'شباك ناحية السواق', en: 'driver side window' }
      : col === 1
        ? { ar: 'النص', en: 'middle' }
        : isJump
          ? { ar: 'القلاب ناحية الباب', en: 'door side jump seat' }
          : { ar: 'شباك ناحية الباب', en: 'door side window' };
  return { ar: `${MB_BENCH_AR[row]}، ${place.ar}`, en: `${MB_BENCH_EN[row]}, ${place.en}` };
}

const spec = EGYPT_MICROBUS_14;

export const MICROBUS_14: VehicleProfile = {
  id: 'microbus-14',
  nameAr: 'ميكروباص 14 راكب',
  nameEn: '14-seat microbus',
  type: 'microbus',
  totalSeats: spec.seats.length,
  speedFactor: 1.15,
  stopOverheadMin: 10,
  hasCurtains: false,
  doorSide: spec.doors.sliding.side,
  dimensions: { ...spec.dimensions, wallThicknessM: spec.body.wallThickness },
  driver: { ...spec.driver },
  dashboard: { ...spec.dashboard },
  windows: spec.windows.map((w) => ({ ...w })),
  seats: spec.seats.map((s): VehicleSeat => {
    const label = microbusLabel(s.row, s.col, s.isJump);
    return {
      id: s.id,
      row: s.row,
      col: s.col,
      side: s.side,
      isWindow: s.isWindow,
      isJump: s.isJump,
      backHeight: s.backHeight,
      hasHeadrest: s.hasHeadrest,
      labelAr: label.ar,
      labelEn: label.en,
      position: { ...s.position }
    };
  })
};

/**
 * Intercity coach, 49 seats (Go Bus / Super Jet class): 11 rows of 2+2 plus a
 * back row of 5. High deck, long continuous side glass, curtains fitted.
 */
const BUS_CUSHION = 1.72;
const BUS_FIRST_ROW_Y = 2.1;
const BUS_ROW_PITCH = 0.84;

function busSeats(): VehicleSeat[] {
  const seats: VehicleSeat[] = [];
  const cols: { x: number; side: 'left' | 'right'; isWindow: boolean; ar: string; en: string }[] = [
    { x: -1.0, side: 'left', isWindow: true, ar: 'شباك ناحية السواق', en: 'driver side window' },
    { x: -0.55, side: 'left', isWindow: false, ar: 'ممر ناحية السواق', en: 'driver side aisle' },
    { x: 0.55, side: 'right', isWindow: false, ar: 'ممر ناحية الباب', en: 'door side aisle' },
    { x: 1.0, side: 'right', isWindow: true, ar: 'شباك ناحية الباب', en: 'door side window' }
  ];
  let id = 1;
  for (let row = 1; row <= 11; row++) {
    const y = BUS_FIRST_ROW_Y + (row - 1) * BUS_ROW_PITCH;
    cols.forEach((c, col) => {
      seats.push(seat(id++, row, col, c.side, c.isWindow, c.x, y, BUS_CUSHION, `صف ${row}، ${c.ar}`, `Row ${row}, ${c.en}`));
    });
  }
  const backY = BUS_FIRST_ROW_Y + 11 * BUS_ROW_PITCH;
  const back: [number, 'left' | 'middle' | 'right', boolean, string, string][] = [
    [-1.0, 'left', true, 'الكنبة الورانية، شباك ناحية السواق', 'Back row, driver side window'],
    [-0.5, 'left', false, 'الكنبة الورانية، ناحية السواق', 'Back row, driver side'],
    [0, 'middle', false, 'الكنبة الورانية، النص', 'Back row, middle'],
    [0.5, 'right', false, 'الكنبة الورانية، ناحية الباب', 'Back row, door side'],
    [1.0, 'right', true, 'الكنبة الورانية، شباك ناحية الباب', 'Back row, door side window']
  ];
  back.forEach(([x, side, isWindow, ar, en], col) => {
    seats.push(seat(id++, 12, col, side, isWindow, x, backY, BUS_CUSHION, ar, en));
  });
  return seats;
}

function busSideWindows(side: 'left' | 'right'): VehicleWindow[] {
  const wins: VehicleWindow[] = [];
  // Continuous glass behind the front axle, split by thin pillars every ~1.7 m.
  let y = 1.55;
  let i = 0;
  while (y < 11.4) {
    const end = Math.min(11.6, y + 1.62);
    wins.push({ id: `${side}-${i++}`, side, yStart: Number(y.toFixed(2)), yEnd: Number(end.toFixed(2)), zBottom: 1.95, zTop: 2.95 });
    y = end + 0.1;
  }
  // Driver window (left) and front door glass (right) sit lower.
  wins.push({ id: `${side}-front`, side, yStart: 0.25, yEnd: 1.35, zBottom: side === 'left' ? 1.55 : 0.7, zTop: 2.9 });
  return wins;
}

export const BUS_49: VehicleProfile = {
  id: 'bus-49',
  nameAr: 'أتوبيس 49 راكب',
  nameEn: '49-seat coach',
  type: 'bus',
  totalSeats: 49,
  speedFactor: 1.2,
  stopOverheadMin: 15,
  hasCurtains: true,
  doorSide: 'right',
  dimensions: {
    lengthM: 12.2,
    widthM: 2.55,
    heightM: 3.6,
    floorZ: 1.3,
    roofInnerZ: 3.2,
    frontWallY: 0.12,
    rearWallY: 12.1
  },
  driver: { x: -0.75, y: 0.95, z: 1.35 },
  windows: [
    { id: 'windshield', side: 'front', xStart: -1.18, xEnd: 1.18, zBottom: 1.0, zTop: 3.05 },
    { id: 'rear-glass', side: 'rear', xStart: -0.9, xEnd: 0.9, zBottom: 2.2, zTop: 2.9 },
    ...busSideWindows('left'),
    ...busSideWindows('right')
  ],
  seats: busSeats()
};

export const VEHICLES: VehicleProfile[] = [MICROBUS_14, BUS_49];

function seat(
  id: number,
  row: number,
  col: number,
  side: 'left' | 'right' | 'middle',
  isWindow: boolean,
  x: number,
  y: number,
  z: number,
  labelAr: string,
  labelEn: string
): VehicleSeat {
  return { id, row, col, side, isWindow, labelAr, labelEn, position: { x, y, z } };
}
