import type { SideWindow, VehicleProfile, VehicleSeat, VehicleWindow } from '../core/types/vehicle.ts';

/**
 * Egyptian 14-seat microbus: Toyota HiAce long body, high roof (5.38 x 1.88 x 2.28 m).
 * Left-hand drive, sliding door on the right.
 * Layout confirmed by the owner:
 *   row 0: driver (left) + seat 1 (middle) + seat 2 (right window)
 *   rows 1 to 3: left window + middle + folding jump seat on the right (door side)
 *   row 4: rear bench of 3
 */
const MB_CUSHION = 1.04;
const MB_ROWS_Y = [1.05, 1.95, 2.8, 3.65, 4.55];

function microbusSeats(): VehicleSeat[] {
  const seats: VehicleSeat[] = [
    seat(1, 0, 1, 'middle', false, 0.02, MB_ROWS_Y[0]!, MB_CUSHION + 0.04, 'قدام جنب السواق', 'Front, next to the driver'),
    seat(2, 0, 2, 'right', true, 0.52, MB_ROWS_Y[0]!, MB_CUSHION + 0.04, 'قدام، شباك ناحية الباب', 'Front, door side window')
  ];
  const benchAr = ['', 'الكنبة الأولى', 'الكنبة التانية', 'الكنبة التالتة'];
  const benchEn = ['', 'First bench', 'Second bench', 'Third bench'];
  let id = 3;
  for (let row = 1; row <= 3; row++) {
    const y = MB_ROWS_Y[row]!;
    seats.push(seat(id++, row, 0, 'left', true, -0.6, y, MB_CUSHION, `${benchAr[row]}، شباك ناحية السواق`, `${benchEn[row]}, driver side window`));
    seats.push(seat(id++, row, 1, 'middle', false, -0.12, y, MB_CUSHION, `${benchAr[row]}، النص`, `${benchEn[row]}, middle`));
    seats.push({
      ...seat(id++, row, 2, 'right', true, 0.55, y, MB_CUSHION, `${benchAr[row]}، القلاب ناحية الباب`, `${benchEn[row]}, door side jump seat`),
      isJump: true
    });
  }
  const back = MB_ROWS_Y[4]!;
  seats.push(seat(id++, 4, 0, 'left', true, -0.58, back, MB_CUSHION, 'الكنبة الورانية، شباك ناحية السواق', 'Back bench, driver side window'));
  seats.push(seat(id++, 4, 1, 'middle', false, 0, back, MB_CUSHION, 'الكنبة الورانية، النص', 'Back bench, middle'));
  seats.push(seat(id++, 4, 2, 'right', true, 0.58, back, MB_CUSHION, 'الكنبة الورانية، شباك ناحية الباب', 'Back bench, door side window'));
  return seats;
}

function sideWindows(
  side: 'left' | 'right',
  spans: [number, number][],
  zBottom: number,
  zTop: number
): SideWindow[] {
  return spans.map(([yStart, yEnd], i) => ({ id: `${side}-${i}`, side, yStart, yEnd, zBottom, zTop }));
}

export const MICROBUS_14: VehicleProfile = {
  id: 'microbus-14',
  nameAr: 'ميكروباص 14 راكب',
  nameEn: '14-seat microbus',
  type: 'microbus',
  totalSeats: 14,
  speedFactor: 1.15,
  stopOverheadMin: 10,
  hasCurtains: false,
  doorSide: 'right',
  dimensions: {
    lengthM: 5.38,
    widthM: 1.88,
    heightM: 2.28,
    floorZ: 0.62,
    roofInnerZ: 2.14,
    frontWallY: 0.42,
    rearWallY: 5.3
  },
  driver: { x: -0.5, y: MB_ROWS_Y[0]!, z: MB_CUSHION + 0.04 },
  windows: [
    { id: 'windshield', side: 'front', xStart: -0.82, xEnd: 0.82, zBottom: 1.08, zTop: 1.9 },
    { id: 'rear-glass', side: 'rear', xStart: -0.72, xEnd: 0.72, zBottom: 1.28, zTop: 1.9 },
    // Front doors reach lower at the front edge; modeled as their average opening.
    ...sideWindows('left', [[0.5, 1.4]], 1.18, 1.9),
    ...sideWindows('left', [[1.5, 2.45], [2.55, 3.5], [3.6, 4.75]], 1.24, 1.9).map((w, i) => ({ ...w, id: `left-${i + 1}` })),
    ...sideWindows('right', [[0.5, 1.4]], 1.18, 1.9),
    ...sideWindows('right', [[1.5, 2.45], [2.55, 3.5], [3.6, 4.75]], 1.24, 1.9).map((w, i) => ({ ...w, id: `right-${i + 1}` }))
  ],
  seats: microbusSeats()
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
