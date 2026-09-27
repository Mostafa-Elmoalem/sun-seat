import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { SEAT_SHAPE, type MicrobusSpec, type SeatSpec, type Vec3 } from './spec.ts';
import type { MicrobusMaterials } from './materials.ts';
import { destinationCardTexture } from './textures.ts';
import { roofZAt } from './outline.ts';

type Track = <T extends THREE.BufferGeometry>(g: T) => T;

export interface CabinParts {
  cabin: THREE.Group;
  /** One group per seat, keyed by seat id; 0 is the driver. Named Seat_01 ... Seat_14, Seat_Driver. */
  seats: Map<number, THREE.Group>;
  /** Headliner and anything hanging from the roof; hides with the roof in a cutaway view. */
  ceiling: THREE.Group;
  occupants: Occupants | null;
  destinationCard: THREE.Mesh | null;
}

/**
 * Seated passengers as instanced meshes (one draw call per body part).
 * Index 0 is the driver, then seats in spec order.
 */
export class Occupants {
  readonly meshes: THREE.InstancedMesh[];
  private readonly ids: number[];
  private readonly matrices = new Map<string, THREE.Matrix4>();

  constructor(meshes: THREE.InstancedMesh[], ids: number[]) {
    this.meshes = meshes;
    this.ids = ids;
    for (const mesh of meshes) {
      for (let i = 0; i < mesh.count; i++) {
        const m = new THREE.Matrix4();
        mesh.getMatrixAt(i, m);
        this.matrices.set(`${mesh.name}:${i}`, m);
      }
    }
  }

  /** Shows or hides the passenger on a seat (0 = driver). */
  setOccupied(seatId: number, occupied: boolean): void {
    const index = this.ids.indexOf(seatId);
    if (index < 0) return;
    const hidden = new THREE.Matrix4().makeScale(0, 0, 0);
    for (const mesh of this.meshes) {
      const per = mesh.count / this.ids.length;
      for (let k = 0; k < per; k++) {
        const i = index * per + k;
        mesh.setMatrixAt(i, occupied ? this.matrices.get(`${mesh.name}:${i}`)! : hidden);
      }
      mesh.instanceMatrix.needsUpdate = true;
    }
  }
}

export function buildCabin(
  spec: MicrobusSpec,
  m: MicrobusMaterials,
  track: Track,
  options: { occupants: boolean; destination: string | null }
): CabinParts {
  const { lengthM: L, widthM: W, floorZ, roofInnerZ, rearWallY } = spec.dimensions;
  const wall = spec.body.wallThickness;
  const inner = W / 2 - wall;
  const cabin = new THREE.Group();
  cabin.name = 'Cabin';
  const ceiling = new THREE.Group();
  ceiling.name = 'Ceiling';

  const at = (o: THREE.Object3D, p: Vec3) => o.position.set(p.x, p.z, p.y - L / 2);
  const add = (geo: THREE.BufferGeometry, mat: THREE.Material, p: Vec3, parent: THREE.Object3D = cabin) => {
    const mesh = new THREE.Mesh(track(geo), mat);
    at(mesh, p);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  };
  const rbox = (w: number, h: number, d: number, r: number, seg = 2) =>
    new RoundedBoxGeometry(w, h, d, seg, Math.min(r, w / 2, h / 2, d / 2) * 0.999);

  // Floor mat, from the driver's footwell to the rear door.
  const floorStart = 0.47;
  add(new THREE.BoxGeometry(2 * inner - 0.02, 0.012, rearWallY - 0.06 - floorStart), m.floor, { x: 0, y: (floorStart + rearWallY - 0.06) / 2, z: floorZ + 0.006 });

  // The engine sits under the front seats: a raised platform from the footwell to behind the front row.
  const front = spec.seats.filter((s) => s.row === 0);
  const frontCushion = Math.max(spec.driver.z, ...front.map((s) => s.position.z));
  const platformTop = frontCushion - SEAT_SHAPE.cushion.height - 0.005;
  add(rbox(2 * inner - 0.04, platformTop - floorZ, 0.62, 0.04), m.dash, { x: 0, y: spec.driver.y + 0.03, z: (platformTop + floorZ) / 2 });

  // Wheel humps inside the cabin, over the wheel wells (the front pair mostly under the engine platform).
  const hump = new THREE.CylinderGeometry(spec.wheels.archRadius + 0.03, spec.wheels.archRadius + 0.03, 0.25, 28, 1, false, 0, Math.PI);
  hump.rotateZ(Math.PI / 2);
  for (const axle of [spec.wheels.frontAxleY, spec.wheels.rearAxleY]) {
    for (const s of [-1, 1]) add(hump.clone(), m.floor, { x: s * (inner - 0.125), y: axle, z: spec.wheels.radius });
  }
  hump.dispose();

  // Vinyl trim panels on the inner walls below the windows.
  const trimTop = spec.body.beltZ - 0.02;
  // Each panel is notched over the wheel wells, so it never crosses into a well.
  const humpR = spec.wheels.archRadius + 0.03;
  const panelShape = new THREE.Shape();
  panelShape.moveTo(0.5, floorZ);
  for (const axle of [spec.wheels.frontAxleY, spec.wheels.rearAxleY]) {
    const dz = floorZ - spec.wheels.radius;
    const half = Math.sqrt(Math.max(humpR * humpR - dz * dz, 0));
    const a = Math.atan2(dz, half);
    panelShape.lineTo(axle - half, floorZ);
    panelShape.absarc(axle, spec.wheels.radius, humpR, Math.PI - a, a, true);
  }
  panelShape.lineTo(rearWallY - 0.05, floorZ);
  panelShape.lineTo(rearWallY - 0.05, trimTop);
  panelShape.lineTo(0.5, trimTop);
  panelShape.closePath();
  const panelGeo = new THREE.ExtrudeGeometry(panelShape, { depth: 0.016, bevelEnabled: false, curveSegments: 12 });
  // Shape X = y along the vehicle, shape Y = height; the extrusion runs across, towards -X after the turn.
  panelGeo.rotateY(-Math.PI / 2);
  for (const s of [-1, 1]) {
    const mesh = new THREE.Mesh(track(s < 0 ? panelGeo : panelGeo.clone()), m.panel);
    mesh.position.set(s < 0 ? -inner + 0.016 : inner, 0, -L / 2);
    mesh.receiveShadow = true;
    cabin.add(mesh);
  }

  // Headliner under the roof.
  // It spans only where the roof is high enough above it, so it never pokes through the curved ends.
  const linerZ = roofInnerZ - 0.006;
  const clear = (y: number) => roofZAt(spec, y) - wall - 0.012 >= linerZ;
  let y0 = 0.3;
  while (y0 < rearWallY && !clear(y0)) y0 += 0.01;
  let y1 = rearWallY;
  while (y1 > y0 && !clear(y1)) y1 -= 0.01;
  add(new THREE.BoxGeometry(2 * inner - 0.02, 0.01, y1 - y0), m.headliner, { x: 0, y: (y0 + y1) / 2, z: linerZ }, ceiling);

  // Dashboard, instrument hood, steering wheel and gear lever.
  const d = spec.driver;
  const { yStart: dashY0, yEnd: dashY1, zTop: dashTop } = spec.dashboard;
  add(rbox(2 * inner - 0.02, 0.22, dashY1 - dashY0, 0.05, 3), m.dash, { x: 0, y: (dashY0 + dashY1) / 2, z: dashTop - 0.11 });
  add(rbox(0.4, 0.08, 0.16, 0.03), m.dash, { x: d.x, y: dashY1 - 0.08, z: dashTop + 0.03 });
  const wheel = new THREE.Group();
  at(wheel, { x: d.x, y: d.y - 0.3, z: d.z + 0.38 });
  wheel.rotation.x = THREE.MathUtils.degToRad(-55);
  const rim = new THREE.Mesh(track(new THREE.TorusGeometry(0.19, 0.02, 10, 40)), m.rubber);
  const hub = new THREE.Mesh(track(new THREE.CylinderGeometry(0.05, 0.05, 0.04, 16)), m.dash);
  hub.rotation.x = Math.PI / 2;
  wheel.add(rim, hub);
  for (const a of [Math.PI / 2, Math.PI * 1.17, Math.PI * 1.83]) {
    const spoke = new THREE.Mesh(track(new THREE.BoxGeometry(0.17, 0.028, 0.012)), m.dash);
    spoke.position.set(Math.cos(a) * 0.09, Math.sin(a) * 0.09, 0);
    spoke.rotation.z = a;
    wheel.add(spoke);
  }
  const column = new THREE.Mesh(track(new THREE.CylinderGeometry(0.028, 0.034, 0.34, 12)), m.dash);
  column.position.set(0, 0, -0.17);
  column.rotation.x = Math.PI / 2;
  wheel.add(column);
  wheel.traverse((o) => {
    o.castShadow = true;
    o.receiveShadow = true;
  });
  cabin.add(wheel);
  add(new THREE.CylinderGeometry(0.01, 0.012, 0.3, 8), m.dash, { x: d.x + 0.3, y: d.y - 0.24, z: platformTop + 0.15 });
  add(new THREE.SphereGeometry(0.028, 12, 8), m.trim, { x: d.x + 0.3, y: d.y - 0.24, z: platformTop + 0.3 });

  // Seats.
  const seats = new Map<number, THREE.Group>();
  const all: { id: number; spec: SeatSpec | null; p: Vec3 }[] = [
    { id: 0, spec: null, p: d },
    ...spec.seats.map((s) => ({ id: s.id, spec: s, p: s.position }))
  ];
  const S = SEAT_SHAPE;
  const cushionGeo = track(rbox(S.cushion.width, S.cushion.height, S.cushion.depth, 0.035, 3));
  // Backrests differ by seat (commuter, jump seat, the short back bench): one geometry per size.
  const backGeos = new Map<string, THREE.BufferGeometry>();
  const backGeo = (width: number, height: number) => {
    const key = `${width}:${height}`;
    let geo = backGeos.get(key);
    if (!geo) {
      geo = track(rbox(width, height, S.back.y1 - S.back.y0, 0.035, 3));
      backGeos.set(key, geo);
    }
    return geo;
  };
  const headGeo = track(rbox(S.headrest.width, S.headrest.z1 - S.headrest.z0, S.headrest.y1 - S.headrest.y0, 0.04, 3));
  const railGeo = track(new THREE.CylinderGeometry(S.rail.radius, S.rail.radius, S.rail.length, 10));
  railGeo.rotateZ(Math.PI / 2);
  const hingeGeo = track(new THREE.CylinderGeometry(0.012, 0.012, S.jumpBack.width, 8));
  hingeGeo.rotateZ(Math.PI / 2);
  for (const { id, spec: seatSpec, p } of all) {
    const g = new THREE.Group();
    g.name = id === 0 ? 'Seat_Driver' : `Seat_${String(id).padStart(2, '0')}`;
    g.userData.seatId = id;
    at(g, p);
    const jump = seatSpec?.isJump === true;
    const part = (geo: THREE.BufferGeometry, mat: THREE.Material, x: number, y: number, z: number) => {
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(x, z, y);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      g.add(mesh);
      return mesh;
    };
    part(cushionGeo, m.seat, 0, 0, -S.cushion.height / 2);
    const backY = (S.back.y0 + S.back.y1) / 2;
    const backHeight = seatSpec?.backHeight ?? S.back.height;
    part(backGeo(jump ? S.jumpBack.width : S.back.width, backHeight), m.seat, 0, backY, backHeight / 2);
    if (jump) part(hingeGeo, m.chrome, 0, -0.12, -S.cushion.height - 0.02);
    if (seatSpec?.hasHeadrest ?? true) {
      part(headGeo, m.headrest, 0, (S.headrest.y0 + S.headrest.y1) / 2, (S.headrest.z0 + S.headrest.z1) / 2);
    }
    if (seatSpec?.hasRail) part(railGeo, m.chrome, 0, S.rail.y, S.rail.z);
    // Pedestal down to the floor (the front row sits on the engine platform instead).
    const pedestalH = p.z - S.cushion.height - floorZ;
    if (seatSpec && seatSpec.row > 0 && pedestalH > 0.05) {
      part(track(new THREE.BoxGeometry(S.cushion.width - 0.08, pedestalH, S.cushion.depth - 0.12)), m.dash, 0, 0, -S.cushion.height - pedestalH / 2);
    }
    seats.set(id, g);
    cabin.add(g);
  }

  // Seated passengers: torso, head, thighs and forearms resting on the lap.
  let occupants: Occupants | null = null;
  if (options.occupants) {
    const n = all.length;
    const torso = new THREE.InstancedMesh(track(new THREE.CapsuleGeometry(0.16, 0.3, 4, 12)), m.occupant, n);
    torso.name = 'torso';
    const head = new THREE.InstancedMesh(track(new THREE.SphereGeometry(0.105, 18, 12)), m.occupant, n);
    head.name = 'head';
    const thighs = new THREE.InstancedMesh(track(new THREE.CapsuleGeometry(0.075, 0.3, 4, 8)), m.occupant, n * 2);
    thighs.name = 'thighs';
    const arms = new THREE.InstancedMesh(track(new THREE.CapsuleGeometry(0.045, 0.26, 4, 8)), m.occupant, n * 2);
    arms.name = 'arms';
    const mat4 = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const e = new THREE.Euler();
    const one = new THREE.Vector3(1, 1, 1);
    const v = (p: Vec3, dx: number, dy: number, dz: number) => new THREE.Vector3(p.x + dx, p.z + dz, p.y + dy - L / 2);
    all.forEach(({ p }, i) => {
      e.set(0.1, 0, 0);
      mat4.compose(v(p, 0, 0.02, 0.42), q.setFromEuler(e), one);
      torso.setMatrixAt(i, mat4);
      mat4.compose(v(p, 0, 0.0, 0.76), q.identity(), one);
      head.setMatrixAt(i, mat4);
      e.set(Math.PI / 2, 0, 0);
      q.setFromEuler(e);
      mat4.compose(v(p, -0.09, -0.2, 0.09), q, one);
      thighs.setMatrixAt(i * 2, mat4);
      mat4.compose(v(p, 0.09, -0.2, 0.09), q, one);
      thighs.setMatrixAt(i * 2 + 1, mat4);
      e.set(Math.PI / 2.4, 0, 0);
      q.setFromEuler(e);
      mat4.compose(v(p, -0.19, -0.14, 0.24), q, one);
      arms.setMatrixAt(i * 2, mat4);
      mat4.compose(v(p, 0.19, -0.14, 0.24), q, one);
      arms.setMatrixAt(i * 2 + 1, mat4);
    });
    for (const mesh of [torso, head, thighs, arms]) {
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.instanceMatrix.needsUpdate = true;
      cabin.add(mesh);
    }
    occupants = new Occupants([torso, head, thighs, arms], all.map((a) => a.id));
  }

  // Hand-written destination card behind the windshield, facing out.
  let destinationCard: THREE.Mesh | null = null;
  const shield = spec.windows.find((w) => w.side === 'front');
  if (options.destination && shield && 'rake' in shield && shield.rake) {
    const map = destinationCardTexture(options.destination);
    const card = new THREE.Mesh(
      track(new THREE.PlaneGeometry(0.36, 0.135)),
      new THREE.MeshStandardMaterial({ map, color: map ? '#ffffff' : '#f4efe1', roughness: 0.9, side: THREE.DoubleSide })
    );
    const tilt = Math.atan2(shield.rake.yAtTop - shield.rake.yAtBottom, shield.zTop - shield.zBottom);
    const z = shield.zBottom + 0.1;
    const y = shield.rake.yAtBottom + (z - shield.zBottom) * Math.tan(tilt) + 0.035;
    at(card, { x: 0.34, y, z });
    card.rotation.set(-tilt, Math.PI, 0, 'YXZ');
    card.castShadow = true;
    card.name = 'DestinationCard';
    cabin.add(card);
    destinationCard = card;
  }

  return { cabin, seats, ceiling, occupants, destinationCard };
}
