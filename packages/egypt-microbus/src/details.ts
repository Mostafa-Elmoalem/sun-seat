import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import type { EndWindowSpec, MicrobusSpec, SideWindowSpec } from './spec.ts';
import type { MicrobusMaterials } from './materials.ts';
import { frontFaceY, rearFaceY, roofZAt } from './body.ts';

/**
 * Exterior details, all placed in the vehicle frame (x across, y from the front bumper,
 * z up) and converted to three.js axes. Sizes follow the H100 body: rectangular
 * headlights and grille, bumper-mounted indicators, vertical tail lamps, black
 * window surrounds, a sliding door on the right.
 */

type Track = <T extends THREE.BufferGeometry>(g: T) => T;

export interface ExteriorParts {
  details: THREE.Group;
  glass: THREE.Mesh[];
  /** Details that sit on the roof and hide with it in a cutaway view. */
  roofDetails: THREE.Group;
}

export function buildExterior(spec: MicrobusSpec, m: MicrobusMaterials, track: Track): ExteriorParts {
  const { lengthM: L, widthM: W } = spec.dimensions;
  const hw = W / 2;
  const details = new THREE.Group();
  details.name = 'Details';
  const roofDetails = new THREE.Group();
  roofDetails.name = 'RoofDetails';
  const glass: THREE.Mesh[] = [];

  /** Adds a mesh at a vehicle-frame position. */
  const put = (geo: THREE.BufferGeometry, mat: THREE.Material, x: number, y: number, z: number, parent: THREE.Object3D = details, shadow = true) => {
    const mesh = new THREE.Mesh(track(geo), mat);
    mesh.position.set(x, z, y - L / 2);
    mesh.castShadow = shadow;
    mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  };
  const rbox = (w: number, h: number, d: number, r: number) => new RoundedBoxGeometry(w, h, d, 2, Math.min(r, w / 2, h / 2, d / 2) * 0.999);
  const box = (w: number, h: number, d: number) => new THREE.BoxGeometry(w, h, d);

  /* ---------- front ---------- */
  const faceAt = (z: number) => frontFaceY(spec, z);

  // Bumper in the livery color, wrapping the full width, with a rubber rub strip.
  const bumperZ = 0.46;
  put(rbox(W + 0.02, 0.2, 0.16, 0.05), m.skirt, 0, faceAt(bumperZ) + 0.02, bumperZ);
  put(box(W - 0.1, 0.03, 0.012), m.rubber, 0, faceAt(bumperZ) - 0.06, bumperZ + 0.01);
  // Egyptian commercial plate.
  const plate = put(box(0.34, 0.11, 0.012), m.plate, 0, faceAt(bumperZ) - 0.066, bumperZ);
  plate.rotation.y = Math.PI;
  // Amber indicators at the bumper ends.
  for (const s of [-1, 1]) put(rbox(0.13, 0.055, 0.02, 0.012), m.amber, s * 0.7, faceAt(0.52) - 0.058, 0.52);

  // Headlights: a chrome bezel ring standing 4 cm proud of the face; inside it a dark housing,
  // a curved chrome reflector with its bulb, and a fluted lens recessed just behind the bezel.
  const lampZ = 0.815;
  const bezel = new THREE.Shape();
  roundedRect(bezel, -0.154, -0.084, 0.154, 0.084, 0.026);
  const bezelHole = new THREE.Path();
  roundedRect(bezelHole, -0.137, -0.067, 0.137, 0.067, 0.016, true);
  bezel.holes.push(bezelHole);
  const bezelGeo = new THREE.ExtrudeGeometry(bezel, { depth: 0.022, bevelEnabled: true, bevelThickness: 0.006, bevelSize: 0.006, bevelSegments: 2, curveSegments: 6 });
  for (const s of [-1, 1]) {
    const x = s * 0.545;
    const y = faceAt(lampZ);
    // The extrusion runs from local -0.006 (front) to 0.028 (back): front at y - 0.038.
    put(s < 0 ? bezelGeo : bezelGeo.clone(), m.chrome, x, y - 0.032, lampZ);
    put(rbox(0.28, 0.14, 0.01, 0.012), m.trim, x, y - 0.012, lampZ, details, false);
    const reflector = put(new THREE.SphereGeometry(1, 28, 10, 0, Math.PI * 2, 0, Math.PI / 2), m.chrome, x, y - 0.017, lampZ, details, false);
    reflector.rotation.x = -Math.PI / 2;
    reflector.scale.set(0.125, 0.012, 0.058);
    put(new THREE.SphereGeometry(0.011, 12, 8), m.lens, x, y - 0.03, lampZ, details, false);
    put(rbox(0.27, 0.13, 0.006, 0.012), m.lens, x, y - 0.034, lampZ, details, false);
  }
  // Grille with three chrome slats and a plain oval badge.
  put(rbox(0.6, 0.15, 0.025, 0.02), m.trim, 0, faceAt(lampZ) - 0.006, lampZ);
  for (const dz of [-0.04, 0, 0.04]) put(box(0.56, 0.012, 0.01), m.chrome, 0, faceAt(lampZ) - 0.022, lampZ + dz);
  const badge = put(new THREE.CylinderGeometry(0.045, 0.045, 0.012, 24), m.chrome, 0, faceAt(lampZ) - 0.03, lampZ);
  badge.rotation.x = Math.PI / 2;
  badge.scale.set(1, 1, 0.62);

  // Wipers resting at the bottom of the windshield.
  const shield = spec.windows.find((w): w is EndWindowSpec => w.side === 'front');
  if (shield?.rake) {
    const k = (shield.rake.yAtTop - shield.rake.yAtBottom) / (shield.zTop - shield.zBottom);
    const tilt = Math.atan2(shield.rake.yAtTop - shield.rake.yAtBottom, shield.zTop - shield.zBottom);
    for (const [x, len] of [[-0.28, 0.56], [0.2, 0.5]] as const) {
      const z = shield.zBottom + 0.03;
      const wiper = put(box(len, 0.014, 0.014), m.rubber, x, shield.rake.yAtBottom + (z - shield.zBottom) * k - 0.03, z);
      wiper.rotation.x = tilt;
      wiper.rotation.z = 0.06;
    }
  }

  // Mirrors on arms at the front corners of the front doors.
  for (const s of [-1, 1]) {
    const arm = put(new THREE.CylinderGeometry(0.012, 0.012, 0.19, 8), m.trim, s * (hw + 0.07), 0.56, 1.25);
    arm.rotation.z = (s * Math.PI) / 2.3;
    put(rbox(0.075, 0.2, 0.13, 0.03), m.trim, s * (hw + 0.17), 0.55, 1.33);
    put(box(0.06, 0.17, 0.004), m.chrome, s * (hw + 0.17), 0.618, 1.33);
  }

  /* ---------- sides ---------- */
  const sideWins = spec.windows.filter((w): w is SideWindowSpec => w.side === 'left' || w.side === 'right');
  for (const w of sideWins) {
    const s = w.side === 'left' ? -1 : 1;
    // Black rubber surround: a rounded ring around the opening.
    const ring = new THREE.Shape();
    roundedRect(ring, w.yStart - 0.025 - L / 2, w.zBottom - 0.025, w.yEnd + 0.025 - L / 2, w.zTop + 0.025, 0.055);
    const hole = new THREE.Path();
    roundedRect(hole, w.yStart - L / 2, w.zBottom, w.yEnd - L / 2, w.zTop, 0.035, true);
    ring.holes.push(hole);
    const seal = new THREE.ExtrudeGeometry(ring, { depth: 0.006, bevelEnabled: false, curveSegments: 6 });
    seal.rotateY(-Math.PI / 2);
    const mesh = new THREE.Mesh(track(seal), m.rubber);
    mesh.position.x = s > 0 ? hw + 0.004 : -hw + 0.002;
    mesh.castShadow = false;
    details.add(mesh);

    // Glass pane set just inside the opening; it never casts a shadow.
    const pane = new THREE.PlaneGeometry(w.yEnd - w.yStart + 0.01, w.zTop - w.zBottom + 0.01);
    pane.rotateY(Math.PI / 2);
    const g = put(pane, m.glass, s * (hw - 0.018), (w.yStart + w.yEnd) / 2, (w.zBottom + w.zTop) / 2, details, false);
    g.name = `Glass_${w.id}`;
    glass.push(g);
  }

  // Black-out between neighboring windows, so the glass reads as one dark band.
  for (const s of ['left', 'right'] as const) {
    const wins = sideWins.filter((w) => w.side === s).sort((a, b) => a.yStart - b.yStart);
    for (let i = 0; i < wins.length - 1; i++) {
      const a = wins[i]!;
      const b = wins[i + 1]!;
      if (b.yStart - a.yEnd > 0.3) continue;
      const z0 = Math.max(a.zBottom, b.zBottom);
      const z1 = Math.min(a.zTop, b.zTop);
      put(box(0.004, z1 - z0 + 0.03, b.yStart - a.yEnd + 0.03), m.trim, (s === 'left' ? -1 : 1) * (hw + 0.003), (a.yEnd + b.yStart) / 2, (z0 + z1) / 2, details, false);
    }
  }

  const seam = (s: number, y0: number, y1: number, z0: number, z1: number) =>
    put(box(0.004, Math.max(0.005, z1 - z0), Math.max(0.005, y1 - y0)), m.rubber, s * (hw + 0.002), (y0 + y1) / 2, (z0 + z1) / 2, details, false);

  const { front, sliding } = spec.doors;
  const belt = spec.body.beltZ;
  const top = Math.max(...sideWins.map((w) => w.zTop)) + 0.06;
  for (const s of [-1, 1]) {
    // Front door outline and handle.
    seam(s, front.yStart, front.yStart + 0.005, 0.4, belt);
    seam(s, front.yEnd, front.yEnd + 0.005, 0.37, top);
    put(rbox(0.13, 0.035, 0.022, 0.01), m.trim, s * (hw + 0.008), front.yEnd - 0.16, 1.06, details, false);
    // Protective side molding and mudflaps.
    put(box(0.012, 0.03, L - 0.5), m.trim, s * (hw + 0.004), L / 2, 0.87, details, false);
    for (const axle of [spec.wheels.frontAxleY, spec.wheels.rearAxleY]) {
      put(box(0.2, 0.26, 0.012), m.rubber, s * spec.wheels.halfTrack, axle + spec.wheels.archRadius + 0.03, 0.22);
    }
  }
  const ss = sliding.side === 'left' ? -1 : 1;
  seam(ss, sliding.yStart, sliding.yStart + 0.005, 0.37, top);
  seam(ss, sliding.yEnd, sliding.yEnd + 0.005, 0.37, top);
  seam(ss, sliding.yStart, sliding.yEnd, top, top + 0.005);
  // The track the sliding door runs in, from the door back towards the tail.
  seam(ss, sliding.yEnd, L - 0.35, belt - 0.045, belt - 0.035);
  put(rbox(0.03, 0.13, 0.022, 0.01), m.trim, ss * (hw + 0.008), sliding.yStart + 0.07, 1.02, details, false);
  // Fuel door on the opposite flank, behind the rear wheel.
  const fs = -ss;
  const fy = spec.wheels.rearAxleY + 0.55;
  seam(fs, fy - 0.08, fy + 0.08, 0.9, 0.905);
  seam(fs, fy - 0.08, fy + 0.08, 1.06, 1.065);
  seam(fs, fy - 0.08, fy - 0.075, 0.9, 1.065);
  seam(fs, fy + 0.075, fy + 0.08, 0.9, 1.065);

  /* ---------- rear ---------- */
  const back = (z: number) => rearFaceY(spec, z);
  put(rbox(W + 0.01, 0.18, 0.14, 0.05), m.skirt, 0, back(0.44) - 0.04, 0.44);
  for (const s of [-1, 1]) {
    const x = s * 0.74;
    put(rbox(0.09, 0.3, 0.02, 0.012), m.red, x, back(0.87) + 0.006, 0.87);
    put(rbox(0.09, 0.08, 0.02, 0.01), m.amber, x, back(0.68) + 0.006, 0.68);
    put(rbox(0.09, 0.07, 0.02, 0.01), m.reverse, x, back(0.605) + 0.006, 0.605);
    // Rear door edge.
    put(box(0.005, 0.84, 0.004), m.rubber, s * 0.79, back(0.98) + 0.003, 0.98, details, false);
  }
  put(box(0.34, 0.11, 0.012), m.plate, 0, back(0.66) + 0.007, 0.66);
  put(rbox(0.14, 0.035, 0.022, 0.01), m.chrome, 0, back(1.02) + 0.009, 1.02, details, false);

  const rear = spec.windows.find((w): w is EndWindowSpec => w.side === 'rear');
  if (rear) {
    const y = back((rear.zBottom + rear.zTop) / 2);
    const ring = new THREE.Shape();
    roundedRect(ring, rear.xStart - 0.025, rear.zBottom - 0.025, rear.xEnd + 0.025, rear.zTop + 0.025, 0.055);
    const hole = new THREE.Path();
    roundedRect(hole, rear.xStart, rear.zBottom, rear.xEnd, rear.zTop, 0.04, true);
    ring.holes.push(hole);
    const seal = new THREE.ExtrudeGeometry(ring, { depth: 0.006, bevelEnabled: false, curveSegments: 6 });
    const mesh = new THREE.Mesh(track(seal), m.rubber);
    mesh.position.set(0, 0, y - L / 2);
    details.add(mesh);
    const pane = put(new THREE.PlaneGeometry(rear.xEnd - rear.xStart + 0.01, rear.zTop - rear.zBottom + 0.01), m.glass, (rear.xStart + rear.xEnd) / 2, y - 0.02, (rear.zBottom + rear.zTop) / 2, details, false);
    pane.name = `Glass_${rear.id}`;
    glass.push(pane);
    const wiper = put(box(0.44, 0.014, 0.014), m.rubber, 0.05, y + 0.012, rear.zBottom + 0.04, details, false);
    wiper.rotation.z = 0.12;
  }

  if (shield?.rake) {
    const dy = shield.rake.yAtTop - shield.rake.yAtBottom;
    const dz = shield.zTop - shield.zBottom;
    const len = Math.hypot(dy, dz);
    const tilt = Math.atan2(dy, dz);
    const cy = (shield.rake.yAtBottom + shield.rake.yAtTop) / 2;
    const cz = (shield.zBottom + shield.zTop) / 2;
    const cx = (shield.xStart + shield.xEnd) / 2;
    const width = shield.xEnd - shield.xStart;
    // Outward normal of the glass (forward and up), used to sit the seal on the outer skin.
    const ny = -dz / len;
    const nz = dy / len;
    const ring = new THREE.Shape();
    roundedRect(ring, -width / 2 - 0.03, -len / 2 - 0.03, width / 2 + 0.03, len / 2 + 0.03, 0.06);
    const hole = new THREE.Path();
    roundedRect(hole, -width / 2, -len / 2, width / 2, len / 2, 0.04, true);
    ring.holes.push(hole);
    const seal = new THREE.ExtrudeGeometry(ring, { depth: 0.006, bevelEnabled: false, curveSegments: 6 });
    seal.rotateX(tilt);
    const sealMesh = new THREE.Mesh(track(seal), m.rubber);
    sealMesh.position.set(cx, cz + nz * 0.018, cy + ny * 0.018 - L / 2);
    details.add(sealMesh);
    const pane = new THREE.PlaneGeometry(width + 0.01, len + 0.01);
    pane.rotateX(tilt);
    const g = put(pane, m.glass, cx, cy, cz, details, false);
    g.name = `Glass_${shield.id}`;
    glass.push(g);
  }

  /* ---------- wheel wells ---------- */
  // Dark liners close each arch from the tire inwards, so the arch shows a black well
  // (not the painted cut faces or the cabin) behind the wheel.
  const { radius, archRadius, halfTrack, width: tireWidth } = spec.wheels;
  const wellInner = halfTrack - tireWidth / 2 - 0.06;
  const wellDepth = hw - 0.004 - wellInner;
  const wellR = archRadius - 0.004;
  const liner = new THREE.CylinderGeometry(wellR, wellR, wellDepth, 40, 1, true, 0, Math.PI);
  liner.rotateZ(Math.PI / 2);
  const cap = new THREE.CircleGeometry(wellR, 40, 0, Math.PI);
  cap.rotateY(Math.PI / 2);
  for (const axle of [spec.wheels.frontAxleY, spec.wheels.rearAxleY]) {
    for (const s of [-1, 1]) {
      put(liner.clone(), m.well, s * (wellInner + wellDepth / 2), axle, radius, details, false);
      put(cap.clone(), m.well, s * wellInner, axle, radius, details, false);
    }
  }
  liner.dispose();
  cap.dispose();

  /* ---------- roof ---------- */
  // Drip rails along both roof edges, following the roof line from the windshield header to the tail.
  if (shield?.rake) {
    const pts: THREE.Vector3[] = [];
    const y0 = shield.rake.yAtTop + 0.14;
    const y1 = L - 0.36;
    for (let i = 0; i <= 40; i++) {
      const y = y0 + ((y1 - y0) * i) / 40;
      pts.push(new THREE.Vector3(0, roofZAt(spec, y) + 0.006, y - L / 2));
    }
    const curve = new THREE.CatmullRomCurve3(pts);
    for (const s of [-1, 1]) {
      const rail = put(new THREE.TubeGeometry(curve, 60, 0.009, 6, false), m.trim, s * (hw - 0.1), L / 2, 0, roofDetails, true);
      rail.name = s < 0 ? 'RoofRail_left' : 'RoofRail_right';
    }
  }

  return { details, glass, roofDetails };
}

/** Rounded rectangle path, counter-clockwise, or clockwise when used as a hole. */
function roundedRect(path: THREE.Path, x0: number, y0: number, x1: number, y1: number, r: number, clockwise = false): void {
  const rr = Math.min(r, (x1 - x0) / 2, (y1 - y0) / 2);
  if (!clockwise) {
    path.moveTo(x0 + rr, y0);
    path.lineTo(x1 - rr, y0);
    path.quadraticCurveTo(x1, y0, x1, y0 + rr);
    path.lineTo(x1, y1 - rr);
    path.quadraticCurveTo(x1, y1, x1 - rr, y1);
    path.lineTo(x0 + rr, y1);
    path.quadraticCurveTo(x0, y1, x0, y1 - rr);
    path.lineTo(x0, y0 + rr);
    path.quadraticCurveTo(x0, y0, x0 + rr, y0);
  } else {
    path.moveTo(x0 + rr, y0);
    path.quadraticCurveTo(x0, y0, x0, y0 + rr);
    path.lineTo(x0, y1 - rr);
    path.quadraticCurveTo(x0, y1, x0 + rr, y1);
    path.lineTo(x1 - rr, y1);
    path.quadraticCurveTo(x1, y1, x1, y1 - rr);
    path.lineTo(x1, y0 + rr);
    path.quadraticCurveTo(x1, y0, x1 - rr, y0);
    path.lineTo(x0 + rr, y0);
  }
}
