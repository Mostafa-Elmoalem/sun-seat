import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { SEAT_SHAPE } from '../../../core/exposure/seat-rays.ts';
import { buildMicrobus, EGYPT_MICROBUS_14, type MicrobusModel, type ShellParts } from '../../../../packages/egypt-microbus/src/index.ts';
import type { SideWindow, EndWindow, VehicleProfile, VehicleSeat } from '../../../core/types/vehicle.ts';

/**
 * A real-time 3D model of the vehicle, built from the SAME profile the exposure
 * engine ray-traces: every window opening sits exactly where the engine's glass
 * is, and the sun is a directional light with shadow maps, so the sun patches you
 * see on the seats and passengers are computed by the GPU from the geometry.
 *
 * Frames: vehicle profile (x right, y towards rear, z up) maps to three.js as
 * X = x, Y = z, Z = y - length/2 (the nose points at -Z).
 *
 * The microbus is the egypt-microbus package model (the same spec the engine reads);
 * the coach is still drawn here from its profile.
 */

export type ViewMode = 'outside' | 'top' | 'seat';

export interface SunState {
  /** Sun direction relative to the vehicle: ux right, uy ahead, uz up. */
  ux: number;
  uy: number;
  uz: number;
  elevationDeg: number;
  /** Sun path for the day relative to the vehicle, as unit vectors (ux, uy, uz). */
  path: [number, number, number][];
}

/** From the seat the drawn sun sits this far from the rider's head, so it shows through the right window. */
const SKY_DISTANCE = 12;
const SKY_SUN_RADIUS = 0.7;
/** Ground sun marker: the gap from the body to the disc centre (room for its rays), and its full reach past the body. */
const GROUND_SUN_GAP = 1.05;
const GROUND_SUN_BAND = GROUND_SUN_GAP + 0.4;
/** Pixels at the top and bottom of the 3D pane covered by its label and its view switch. */
const PANE_OVERLAY_PX = 52;

const COLORS = {
  body: 0xf2f3ef,
  stripe: 0x1b2f7c,
  trim: 0x2a2e33,
  glass: 0x9fc3dd,
  seat: 0xc9d3e8,
  seatBus: 0xc9d3e8,
  passenger: 0x9aa6bd,
  you: 0x1b2f7c,
  floor: 0xe3e8ef,
  asphalt: 0x8d939a,
  road: 0xf4f4f0,
  tyre: 0x1c1d20,
  hub: 0xb8bcc2,
  sun: 0xffe03a
};

interface BodySpec {
  /** Side silhouette as [u (from nose), v (height)] points, counter-clockwise. */
  outline: (L: number) => THREE.Shape;
  wheelU: number[];
  wheelR: number;
  sill: number;
  windshield: { uBottom: number; vBottom: number; uTop: number; vTop: number };
  roofV: number;
  /** Where the flat roof starts, measured from the nose. */
  roofStartU: number;
  /** Height of the livery stripe along the flanks. */
  stripeV: number;
}

/** Chinese HiAce H100 family, standard roof: short sloped nose, raked windshield, long rear overhang. */
function microbusSpec(p: VehicleProfile): BodySpec {
  const L = p.dimensions.lengthM;
  const H = p.dimensions.heightM;
  const wheelU = [0.92, 3.51]; // 2.59 m wheelbase
  const r = 0.38;
  const sill = 0.34;
  return {
    wheelU,
    wheelR: 0.31,
    sill,
    roofV: H,
    roofStartU: 0.8,
    stripeV: 0.98,
    windshield: { uBottom: 0.3, vBottom: 1.02, uTop: 0.66, vTop: 1.8 },
    outline: () => {
      const s = new THREE.Shape();
      s.moveTo(0.04, sill);
      s.lineTo(wheelU[0]! - r, sill);
      s.absarc(wheelU[0]!, sill, r, Math.PI, 0, true);
      s.lineTo(wheelU[1]! - r, sill);
      s.absarc(wheelU[1]!, sill, r, Math.PI, 0, true);
      s.lineTo(L - 0.03, sill);
      s.lineTo(L - 0.03, H - 0.12);
      s.quadraticCurveTo(L - 0.03, H, L - 0.16, H);
      s.lineTo(0.8, H);
      s.quadraticCurveTo(0.7, H, 0.66, 1.8);
      s.lineTo(0.3, 1.02);
      s.quadraticCurveTo(0.03, 0.95, 0.02, 0.7);
      s.lineTo(0.04, sill);
      return s;
    }
  };
}

function busSpec(p: VehicleProfile): BodySpec {
  const L = p.dimensions.lengthM;
  const H = p.dimensions.heightM;
  const wheelU = [2.65, 8.95];
  const r = 0.62;
  return {
    wheelU,
    wheelR: 0.5,
    sill: 0.42,
    roofV: H,
    roofStartU: 0.5,
    stripeV: 1.72,
    windshield: { uBottom: 0.06, vBottom: 1.0, uTop: 0.28, vTop: 3.08 },
    outline: () => {
      const s = new THREE.Shape();
      s.moveTo(0.02, 0.42);
      s.lineTo(wheelU[0]! - r, 0.42);
      s.absarc(wheelU[0]!, 0.42, r, Math.PI, 0, true);
      s.lineTo(wheelU[1]! - r, 0.42);
      s.absarc(wheelU[1]!, 0.42, r, Math.PI, 0, true);
      s.lineTo(L - 0.02, 0.42);
      s.lineTo(L - 0.02, H - 0.2);
      s.quadraticCurveTo(L - 0.02, H, L - 0.25, H);
      s.lineTo(0.5, H);
      s.quadraticCurveTo(0.28, H, 0.28, 3.08);
      s.lineTo(0.06, 1.0);
      s.lineTo(0.02, 0.42);
      return s;
    }
  };
}

function roundedRectPath(path: THREE.Path, u0: number, v0: number, u1: number, v1: number, r: number): void {
  const rr = Math.min(r, (u1 - u0) / 2, (v1 - v0) / 2);
  path.moveTo(u0 + rr, v0);
  path.lineTo(u1 - rr, v0);
  path.quadraticCurveTo(u1, v0, u1, v0 + rr);
  path.lineTo(u1, v1 - rr);
  path.quadraticCurveTo(u1, v1, u1 - rr, v1);
  path.lineTo(u0 + rr, v1);
  path.quadraticCurveTo(u0, v1, u0, v1 - rr);
  path.lineTo(u0, v0 + rr);
  path.quadraticCurveTo(u0, v0, u0 + rr, v0);
}

function textSprite(text: string, opts: { size?: number; color?: string; bg?: string; overlay?: boolean } = {}): THREE.Sprite {
  const size = opts.size ?? 64;
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d')!;
  ctx.font = `700 ${size}px "Readex Pro", sans-serif`;
  const w = Math.ceil(ctx.measureText(text).width + size * 0.8);
  canvas.width = w;
  canvas.height = Math.ceil(size * 1.5);
  const c2 = canvas.getContext('2d')!;
  if (opts.bg) {
    c2.fillStyle = opts.bg;
    const r = canvas.height / 2;
    c2.beginPath();
    if (typeof c2.roundRect === 'function') c2.roundRect(0, 0, canvas.width, canvas.height, r);
    else c2.rect(0, 0, canvas.width, canvas.height);
    c2.fill();
  }
  c2.font = `700 ${size}px "Readex Pro", sans-serif`;
  c2.fillStyle = opts.color ?? '#1b2f7c';
  c2.textAlign = 'center';
  c2.textBaseline = 'middle';
  c2.direction = 'rtl';
  c2.fillText(text, canvas.width / 2, canvas.height / 2 + size * 0.05);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  const overlay = opts.overlay ?? true;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: !overlay, transparent: true }));
  const aspect = canvas.width / canvas.height;
  sprite.scale.set(0.34 * aspect, 0.34, 1);
  sprite.renderOrder = 10;
  return sprite;
}

export interface SceneOptions {
  lowEnd: boolean;
  /** Precomputed microbus shell (see loadShell); without it the shell is cut on the device. */
  shell?: ShellParts | null;
  /** Written on the card behind the windshield. */
  destination?: string | null;
}

/** The profile id whose geometry comes from the egypt-microbus package. */
const PACKAGE_MICROBUS_ID = 'microbus-14';

export class VehicleScene {
  readonly renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera: THREE.PerspectiveCamera;
  private controls: OrbitControls;
  private sunLight: THREE.DirectionalLight;
  /** Soft sky light from the opposite side so the shaded flank of the body is not black. No shadows. */
  private fillLight: THREE.DirectionalLight;
  private hemi: THREE.HemisphereLight;
  private lastSun: SunState | null = null;
  /** Flat sun disc and rays on the ground, the 2D plan's sun marker, shown from above. */
  private groundSun = new THREE.Group();
  private bestRings = new THREE.Group();
  private sunMesh: THREE.Mesh;
  private sunPath: THREE.Line;
  private roofParts: THREE.Mesh[] = [];
  /** The package microbus, when this vehicle is the 14-seat microbus. */
  private microbus: MicrobusModel | null = null;
  private envMap: THREE.Texture | null = null;
  private occupiedHidden: number | null = null;
  private seatLabels: THREE.Sprite[] = [];
  private passengers!: THREE.InstancedMesh[];
  private youGroup = new THREE.Group();
  /** Instance matrices of the passenger hidden at the selected seat, restored on the next selection. */
  private hiddenBackup: { torsos: Map<number, THREE.Matrix4>; heads: Map<number, THREE.Matrix4>; thighs: Map<number, THREE.Matrix4> } | undefined;
  private disposables: { dispose: () => void }[] = [];
  private raf = 0;
  private dirtyUntil = 0;
  private view: ViewMode = 'top';
  private selectedSeatId: number | null = null;
  private readonly halfL: number;
  /** From outside, the sun and its day arc make a small sun-path dome around the vehicle, clear of the body. */
  private readonly domeCenter: THREE.Vector3;
  private readonly domeRadius: number;
  private resizeObserver: ResizeObserver | null = null;
  private prepared = false;
  private active = true;
  private fittedAspect = 0;
  private hasSunPath = false;

  constructor(
    private container: HTMLElement,
    private vehicle: VehicleProfile,
    opts: SceneOptions
  ) {
    this.halfL = vehicle.dimensions.lengthM / 2;
    const { widthM, heightM } = vehicle.dimensions;
    this.domeCenter = new THREE.Vector3(0, heightM / 2, 0);
    this.domeRadius = Math.hypot(this.halfL, widthM / 2, heightM / 2) + 0.45;
    this.renderer = new THREE.WebGLRenderer({ antialias: !opts.lowEnd, powerPreference: 'default' });
    // Phones have 2.5x to 3x screens; 1.5x looks the same on a small canvas and costs half the pixels.
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, opts.lowEnd ? 1.25 : 1.5));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = opts.lowEnd ? THREE.PCFShadowMap : THREE.PCFSoftShadowMap;
    // The sun does not move while the rider orbits: redraw the shadow map only when something changes.
    this.renderer.shadowMap.autoUpdate = false;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    container.appendChild(this.renderer.domElement);

    this.camera = new THREE.PerspectiveCamera(42, 1, 0.05, 200);
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.12;
    this.controls.addEventListener('change', () => this.invalidate());
    this.controls.addEventListener('start', () => this.invalidate(4000));

    this.scene.background = new THREE.Color(0xcfdff0);
    this.scene.fog = new THREE.Fog(0xcfdff0, 28, 70);

    this.hemi = new THREE.HemisphereLight(0xdfeaf7, 0x6f6a60, 0.9);
    this.scene.add(this.hemi);

    this.sunLight = new THREE.DirectionalLight(0xfff3dc, 3.2);
    this.sunLight.castShadow = true;
    const shadowSize = opts.lowEnd ? 1024 : 2048;
    this.sunLight.shadow.mapSize.set(shadowSize, shadowSize);
    const ext = Math.max(vehicle.dimensions.lengthM, 6) / 2 + 3;
    const cam = this.sunLight.shadow.camera;
    cam.left = -ext;
    cam.right = ext;
    cam.top = ext;
    cam.bottom = -ext;
    cam.near = 1;
    cam.far = 80;
    this.sunLight.shadow.bias = -0.0004;
    this.sunLight.shadow.normalBias = 0.02;
    this.scene.add(this.sunLight, this.sunLight.target);

    this.fillLight = new THREE.DirectionalLight(0xdfe8f5, 0.5);
    this.scene.add(this.fillLight);

    this.sunMesh = new THREE.Mesh(
      new THREE.SphereGeometry(SKY_SUN_RADIUS, 24, 16),
      new THREE.MeshBasicMaterial({ color: COLORS.sun, fog: false })
    );
    // The plan's sun: a pale disc with a deeper yellow rim (a back-face shell drawn just behind it).
    const rim = new THREE.Mesh(
      this.track(new THREE.SphereGeometry(SKY_SUN_RADIUS * 1.14, 24, 16)),
      this.track(new THREE.MeshBasicMaterial({ color: 0xf5b800, side: THREE.BackSide, fog: false }))
    );
    this.sunMesh.add(rim);
    this.scene.add(this.sunMesh);

    this.sunPath = new THREE.Line(
      new THREE.BufferGeometry(),
      new THREE.LineDashedMaterial({ color: 0xf5b800, dashSize: 0.05, gapSize: 0.0375, transparent: true, opacity: 0.9, fog: false })
    );
    this.scene.add(this.sunPath);

    this.buildGroundSun();
    this.scene.add(this.bestRings);

    this.buildGround();
    if (vehicle.id === PACKAGE_MICROBUS_ID) {
      // Reflections on paint, chrome and glass only; the cabin materials never take them.
      if (!opts.lowEnd) {
        const pmrem = new THREE.PMREMGenerator(this.renderer);
        this.envMap = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
        pmrem.dispose();
      }
      if (!opts.shell) throw new Error('VehicleScene: the microbus needs its shell (see loadShell)');
      this.microbus = buildMicrobus(EGYPT_MICROBUS_14, {
        shell: opts.shell,
        envMap: this.envMap,
        destination: opts.destination ?? null,
        quality: opts.lowEnd ? 'low' : 'high'
      });
      this.scene.add(this.microbus.group);
      this.microbus.setOccupied(0, true);
    } else {
      this.buildBody();
      this.buildCabin();
    }
    this.buildYouMarker();
    this.buildSeatLabels();

    this.resize();
    if (typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver(() => this.resize());
      this.resizeObserver.observe(container);
    }
    this.setView('top');
  }

  /**
   * Compiles every shader off the main thread where the browser allows it, before the
   * first frame; until then nothing renders, so the page never stalls on compilation.
   */
  async prepare(): Promise<void> {
    try {
      await this.renderer.compileAsync(this.scene, this.camera);
    } finally {
      this.prepared = true;
      this.shadowsChanged();
    }
  }

  /** Something that casts or receives shadow changed: redraw the shadow map once. */
  private shadowsChanged(): void {
    this.renderer.shadowMap.needsUpdate = true;
    this.invalidate();
  }

  /* ---------- building ---------- */

  private track<T extends { dispose: () => void }>(o: T): T {
    this.disposables.push(o);
    return o;
  }

  private mat(color: number, extra: THREE.MeshStandardMaterialParameters = {}): THREE.MeshStandardMaterial {
    return this.track(new THREE.MeshStandardMaterial({ color, roughness: 0.6, metalness: 0.05, ...extra }));
  }

  private toThree(x: number, y: number, z: number): THREE.Vector3 {
    return new THREE.Vector3(x, z, y - this.halfL);
  }

  private buildGround(): void {
    const ground = new THREE.Mesh(
      this.track(new THREE.CircleGeometry(60, 48)),
      this.mat(COLORS.asphalt, { roughness: 0.95 })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    this.scene.add(ground);

    // Lane markings along the road the vehicle drives on.
    const dashGeo = this.track(new THREE.PlaneGeometry(0.14, 2.2));
    const dashMat = this.mat(COLORS.road, { roughness: 0.9 });
    for (let z = -40; z <= 40; z += 5) {
      for (const x of [-2.1, 2.1]) {
        const d = new THREE.Mesh(dashGeo, dashMat);
        d.rotation.x = -Math.PI / 2;
        d.position.set(x, 0.005, z);
        d.receiveShadow = true;
        this.scene.add(d);
      }
    }
    const edgeGeo = this.track(new THREE.PlaneGeometry(0.16, 80));
    for (const x of [-5.4, 5.4]) {
      const e = new THREE.Mesh(edgeGeo, dashMat);
      e.rotation.x = -Math.PI / 2;
      e.position.set(x, 0.005, 0);
      e.receiveShadow = true;
      this.scene.add(e);
    }
  }

  private buildBody(): void {
    const v = this.vehicle;
    const { widthM: W, lengthM: L, floorZ, roofInnerZ } = v.dimensions;
    const spec = v.type === 'bus' ? busSpec(v) : microbusSpec(v);
    const bodyMat = this.mat(COLORS.body, { roughness: 0.35, metalness: 0.1, side: THREE.DoubleSide });
    const trimMat = this.mat(COLORS.trim, { roughness: 0.7 });
    const glassMat = this.track(
      new THREE.MeshPhysicalMaterial({
        color: COLORS.glass,
        roughness: 0.05,
        metalness: 0,
        transparent: true,
        opacity: 0.22,
        side: THREE.DoubleSide,
        depthWrite: false
      })
    );
    const halfW = W / 2;

    // Side panels: silhouette with the engine's window openings cut out.
    for (const side of ['left', 'right'] as const) {
      const shape = spec.outline(L);
      const wins = v.windows.filter((w): w is SideWindow => w.side === side);
      for (const w of wins) {
        const hole = new THREE.Path();
        roundedRectPath(hole, w.yStart, w.zBottom, w.yEnd, w.zTop, 0.07);
        shape.holes.push(hole);
      }
      const geo = this.track(new THREE.ExtrudeGeometry(shape, { depth: 0.04, bevelEnabled: false, curveSegments: 10 }));
      // Shape space (u, v) = (meters from the nose, height). Rotating -90deg about Y sends
      // local X (u) to world +Z (towards the rear) and the extrusion depth to world -X.
      const mesh = new THREE.Mesh(geo, bodyMat);
      mesh.rotation.y = -Math.PI / 2;
      mesh.position.set(side === 'left' ? -halfW + 0.04 : halfW, 0, -this.halfL);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      this.scene.add(mesh);

      // Glass panes in each opening (do not cast shadows: light passes).
      for (const w of wins) {
        const pane = new THREE.Mesh(this.track(new THREE.PlaneGeometry(w.yEnd - w.yStart, w.zTop - w.zBottom)), glassMat);
        pane.rotation.y = side === 'left' ? Math.PI / 2 : -Math.PI / 2;
        pane.position.copy(this.toThree(side === 'left' ? -halfW + 0.02 : halfW - 0.02, (w.yStart + w.yEnd) / 2, (w.zBottom + w.zTop) / 2));
        this.scene.add(pane);
      }

      // Livery stripe below the windows.
      const stripe = new THREE.Mesh(this.track(new THREE.BoxGeometry(0.012, 0.09, L * 0.86)), this.mat(COLORS.stripe, { roughness: 0.4 }));
      stripe.position.copy(this.toThree(side === 'left' ? -halfW - 0.004 : halfW + 0.004, L * 0.5, spec.stripeV));
      this.scene.add(stripe);
    }

    // Sliding door seam on the right (microbus) or front door (bus).
    const doorWin = v.windows.find((w): w is SideWindow => w.side === 'right' && w.id === (v.type === 'bus' ? 'right-front' : 'right-1'));
    if (doorWin) {
      const seamMat = this.mat(COLORS.trim);
      for (const y of [doorWin.yStart - 0.05, doorWin.yEnd + 0.05]) {
        const seam = new THREE.Mesh(this.track(new THREE.BoxGeometry(0.01, doorWin.zTop - spec.sill, 0.012)), seamMat);
        seam.position.copy(this.toThree(halfW + 0.006, y, (doorWin.zTop + spec.sill) / 2));
        this.scene.add(seam);
      }
      const handle = new THREE.Mesh(this.track(new THREE.BoxGeometry(0.03, 0.04, 0.18)), trimMat);
      handle.position.copy(this.toThree(halfW + 0.02, doorWin.yStart + 0.12, 1.1));
      this.scene.add(handle);
    }

    // Roof slab and front cap: opaque, cast shadows. Hidden (but still shadowing) in the top view.
    const roofLen = L - spec.roofStartU;
    const roof = new THREE.Mesh(this.track(new THREE.BoxGeometry(W, 0.06, roofLen)), bodyMat);
    roof.position.copy(this.toThree(0, spec.roofStartU + roofLen / 2 - 0.02, spec.roofV - 0.03));
    roof.castShadow = true;
    roof.receiveShadow = true;
    this.scene.add(roof);
    this.roofParts.push(roof);

    const ws = spec.windshield;
    const capGeo = this.track(new THREE.BoxGeometry(W, 0.06, Math.hypot(spec.roofStartU - ws.uTop, spec.roofV - ws.vTop) + 0.08));
    const cap = new THREE.Mesh(capGeo, bodyMat);
    // Box length runs along local Z; tilt it up from the windshield top to the roof.
    cap.rotation.x = -Math.atan2(spec.roofV - ws.vTop, spec.roofStartU - ws.uTop);
    cap.position.copy(this.toThree(0, (spec.roofStartU + ws.uTop) / 2, (spec.roofV + ws.vTop) / 2 - 0.02));
    cap.castShadow = true;
    this.scene.add(cap);
    this.roofParts.push(cap);

    // Inner headliner so the cabin roof reads from inside.
    const liner = new THREE.Mesh(this.track(new THREE.PlaneGeometry(W - 0.1, roofLen)), this.mat(0xd9d6cc, { side: THREE.DoubleSide }));
    liner.rotation.x = Math.PI / 2;
    liner.position.copy(this.toThree(0, spec.roofStartU + roofLen / 2, roofInnerZ));
    liner.castShadow = true;
    this.scene.add(liner);
    this.roofParts.push(liner);

    // Windshield: slanted glass, frame pillars.
    const wsLen = Math.hypot(ws.uTop - ws.uBottom, ws.vTop - ws.vBottom);
    const windshield = new THREE.Mesh(this.track(new THREE.PlaneGeometry(W - 0.12, wsLen)), glassMat);
    windshield.position.copy(this.toThree(0, (ws.uBottom + ws.uTop) / 2, (ws.vBottom + ws.vTop) / 2));
    // Lean the glass back: its local up axis runs from the bottom edge towards the roof and the rear.
    windshield.rotation.x = Math.atan2(ws.uTop - ws.uBottom, ws.vTop - ws.vBottom);
    this.scene.add(windshield);
    for (const x of [-halfW + 0.04, halfW - 0.04]) {
      const pillar = new THREE.Mesh(this.track(new THREE.BoxGeometry(0.08, wsLen, 0.06)), bodyMat);
      pillar.position.copy(this.toThree(x, (ws.uBottom + ws.uTop) / 2, (ws.vBottom + ws.vTop) / 2));
      pillar.rotation.x = windshield.rotation.x;
      pillar.castShadow = true;
      this.scene.add(pillar);
    }

    // Front face below the windshield, bumper, grille and lamps.
    const noseH = ws.vBottom - spec.sill;
    const nose = new THREE.Mesh(this.track(new THREE.BoxGeometry(W, noseH, 0.3)), bodyMat);
    nose.position.copy(this.toThree(0, 0.17, spec.sill + noseH / 2));
    nose.castShadow = true;
    this.scene.add(nose);
    const bumper = new THREE.Mesh(this.track(new THREE.BoxGeometry(W + 0.04, 0.22, 0.14)), trimMat);
    bumper.position.copy(this.toThree(0, 0.0, spec.sill + 0.12));
    this.scene.add(bumper);
    const grille = new THREE.Mesh(this.track(new THREE.BoxGeometry(W * 0.5, 0.2, 0.02)), trimMat);
    grille.position.copy(this.toThree(0, 0.01, spec.sill + noseH * 0.62));
    this.scene.add(grille);
    const lampMat = this.mat(0xfff7d6, { emissive: 0xfff2c0, emissiveIntensity: 0.35, roughness: 0.2 });
    for (const x of [-halfW + 0.22, halfW - 0.22]) {
      const lamp = new THREE.Mesh(this.track(new THREE.BoxGeometry(0.3, 0.14, 0.03)), lampMat);
      lamp.position.copy(this.toThree(x, 0.01, spec.sill + noseH * 0.62));
      this.scene.add(lamp);
      const mirror = new THREE.Mesh(this.track(new THREE.BoxGeometry(0.05, 0.22, 0.12)), trimMat);
      mirror.position.copy(this.toThree(x + Math.sign(x) * 0.36, ws.uBottom + 0.1, ws.vBottom + 0.25));
      this.scene.add(mirror);
    }

    // Rear wall with its glass opening.
    const rearShape = new THREE.Shape();
    roundedRectPath(rearShape, -halfW, spec.sill, halfW, spec.roofV - 0.05, 0.12);
    const rw = v.windows.find((w): w is EndWindow => w.side === 'rear');
    if (rw) {
      const hole = new THREE.Path();
      roundedRectPath(hole, rw.xStart, rw.zBottom, rw.xEnd, rw.zTop, 0.06);
      rearShape.holes.push(hole);
      const pane = new THREE.Mesh(this.track(new THREE.PlaneGeometry(rw.xEnd - rw.xStart, rw.zTop - rw.zBottom)), glassMat);
      pane.position.copy(this.toThree((rw.xStart + rw.xEnd) / 2, L - 0.03, (rw.zBottom + rw.zTop) / 2));
      this.scene.add(pane);
    }
    const rear = new THREE.Mesh(this.track(new THREE.ShapeGeometry(rearShape, 8)), bodyMat);
    rear.position.set(0, 0, L - 0.02 - this.halfL);
    rear.castShadow = true;
    this.scene.add(rear);
    const rearBumper = new THREE.Mesh(this.track(new THREE.BoxGeometry(W + 0.02, 0.2, 0.12)), trimMat);
    rearBumper.position.copy(this.toThree(0, L, spec.sill + 0.1));
    this.scene.add(rearBumper);

    // Floor of the cabin (receives the sun patches).
    const floor = new THREE.Mesh(this.track(new THREE.BoxGeometry(W - 0.06, 0.05, L - 0.4)), this.mat(COLORS.floor, { roughness: 0.9 }));
    floor.position.copy(this.toThree(0, L / 2 + 0.15, floorZ - 0.025));
    floor.receiveShadow = true;
    floor.castShadow = true;
    this.scene.add(floor);

    // Wheels.
    const tyreGeo = this.track(new THREE.CylinderGeometry(spec.wheelR, spec.wheelR, 0.24, 28));
    const hubGeo = this.track(new THREE.CylinderGeometry(spec.wheelR * 0.55, spec.wheelR * 0.55, 0.25, 20));
    const tyreMat = this.mat(COLORS.tyre, { roughness: 0.9 });
    const hubMat = this.mat(COLORS.hub, { roughness: 0.3, metalness: 0.6 });
    for (const u of spec.wheelU) {
      for (const x of [-halfW + 0.14, halfW - 0.14]) {
        const tyre = new THREE.Mesh(tyreGeo, tyreMat);
        tyre.rotation.z = Math.PI / 2;
        tyre.position.copy(this.toThree(x, u, spec.wheelR));
        tyre.castShadow = true;
        this.scene.add(tyre);
        const hub = new THREE.Mesh(hubGeo, hubMat);
        hub.rotation.z = Math.PI / 2;
        hub.position.copy(tyre.position);
        this.scene.add(hub);
      }
    }
  }

  private buildCabin(): void {
    const v = this.vehicle;
    const seatColor = v.type === 'bus' ? COLORS.seatBus : COLORS.seat;
    const seatMat = this.mat(seatColor, { roughness: 0.95 });
    const headMat = this.mat(0xaebbd6, { roughness: 0.9 });
    const railMat = this.mat(COLORS.hub, { roughness: 0.25, metalness: 0.8 });
    const count = v.seats.length + 1; // + driver
    // Commuter seats: rounded cushion, high back with a headrest and a grab rail for the row behind;
    // the folding jump seat has a short back and no headrest. Same dimensions as the engine's SEAT_SHAPE.
    const S = SEAT_SHAPE;
    const cushionGeo = this.track(new RoundedBoxGeometry(S.cushion.width, S.cushion.height, S.cushion.depth, 3, 0.035));
    const backGeo = this.track(new RoundedBoxGeometry(S.back.width, S.back.height, S.back.y1 - S.back.y0, 3, 0.035));
    const jumpBackGeo = this.track(new RoundedBoxGeometry(S.jumpBack.width, S.jumpBack.height, 0.06, 2, 0.025));
    const headGeoSeat = this.track(new RoundedBoxGeometry(S.headrest.width, S.headrest.z1 - S.headrest.z0, S.headrest.y1 - S.headrest.y0, 3, 0.04));
    const railGeo = this.track(new THREE.CylinderGeometry(0.013, 0.013, 0.34, 8));
    const places0: { x: number; y: number; z: number; jump: boolean; rail: boolean }[] = [
      { ...v.driver, jump: false, rail: false },
      ...v.seats.map((s) => ({ ...s.position, jump: s.isJump === true, rail: s.row < Math.max(...v.seats.map((x) => x.row)) && !s.isJump }))
    ];
    const cushions = new THREE.InstancedMesh(cushionGeo, seatMat, count);
    const backs = new THREE.InstancedMesh(backGeo, seatMat, places0.filter((p) => !p.jump).length);
    const jumpBacks = new THREE.InstancedMesh(jumpBackGeo, seatMat, Math.max(1, places0.filter((p) => p.jump).length));
    const headrests = new THREE.InstancedMesh(headGeoSeat, headMat, places0.filter((p) => !p.jump).length);
    const rails = new THREE.InstancedMesh(railGeo, railMat, Math.max(1, places0.filter((p) => p.rail).length));
    jumpBacks.count = places0.filter((p) => p.jump).length;
    rails.count = places0.filter((p) => p.rail).length;
    [jumpBacks, headrests, rails].forEach((m) => {
      m.castShadow = true;
      m.receiveShadow = true;
      this.scene.add(m);
    });
    const torsoGeo = this.track(new THREE.CapsuleGeometry(0.16, 0.3, 4, 10));
    const headGeo = this.track(new THREE.SphereGeometry(0.105, 16, 12));
    const thighGeo = this.track(new THREE.CapsuleGeometry(0.075, 0.3, 4, 8));
    const pMat = this.mat(COLORS.passenger, { roughness: 0.85 });
    const torsos = new THREE.InstancedMesh(torsoGeo, pMat, count);
    const heads = new THREE.InstancedMesh(headGeo, pMat, count);
    const thighs = new THREE.InstancedMesh(thighGeo, pMat, count * 2);
    [cushions, backs, torsos, heads, thighs].forEach((m) => {
      m.castShadow = true;
      m.receiveShadow = true;
      this.scene.add(m);
    });
    this.passengers = [torsos, heads, thighs];

    const m4 = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const e = new THREE.Euler();
    const one = new THREE.Vector3(1, 1, 1);
    const places: { x: number; y: number; z: number; id: number }[] = [
      { ...v.driver, id: 0 },
      ...v.seats.map((s) => ({ ...s.position, id: s.id }))
    ];
    let bi = 0;
    let ji = 0;
    let ri = 0;
    const backY = (S.back.y0 + S.back.y1) / 2;
    places.forEach((p, i) => {
      const shape = places0[i]!;
      m4.compose(this.toThree(p.x, p.y, p.z - S.cushion.height / 2), q.identity(), one);
      cushions.setMatrixAt(i, m4);
      if (shape.jump) {
        m4.compose(this.toThree(p.x, p.y + backY, p.z + S.jumpBack.height / 2), q.identity(), one);
        jumpBacks.setMatrixAt(ji++, m4);
      } else {
        m4.compose(this.toThree(p.x, p.y + backY, p.z + S.back.height / 2), q.identity(), one);
        backs.setMatrixAt(bi, m4);
        m4.compose(this.toThree(p.x, p.y + (S.headrest.y0 + S.headrest.y1) / 2, p.z + (S.headrest.z0 + S.headrest.z1) / 2), q.identity(), one);
        headrests.setMatrixAt(bi++, m4);
      }
      if (shape.rail) {
        e.set(0, 0, Math.PI / 2);
        m4.compose(this.toThree(p.x, p.y + S.back.y1 + 0.03, p.z + S.back.height - 0.04), q.setFromEuler(e), one);
        rails.setMatrixAt(ri++, m4);
      }
      e.set(-0.1, 0, 0);
      m4.compose(this.toThree(p.x, p.y + 0.02, p.z + 0.42), q.setFromEuler(e), one);
      torsos.setMatrixAt(i, m4);
      m4.compose(this.toThree(p.x, p.y + 0.02, p.z + 0.76), q.identity(), one);
      heads.setMatrixAt(i, m4);
      e.set(Math.PI / 2, 0, 0);
      q.setFromEuler(e);
      m4.compose(this.toThree(p.x - 0.09, p.y - 0.2, p.z + 0.09), q, one);
      thighs.setMatrixAt(i * 2, m4);
      m4.compose(this.toThree(p.x + 0.09, p.y - 0.2, p.z + 0.09), q, one);
      thighs.setMatrixAt(i * 2 + 1, m4);
    });

    // Steering wheel and dashboard.
    const d = v.driver;
    const wheel = new THREE.Mesh(this.track(new THREE.TorusGeometry(0.19, 0.022, 8, 28)), this.mat(COLORS.trim));
    wheel.position.copy(this.toThree(d.x, d.y - 0.42, d.z + 0.45));
    wheel.rotation.x = -0.9;
    wheel.castShadow = true;
    this.scene.add(wheel);
    const dash = new THREE.Mesh(this.track(new THREE.BoxGeometry(v.dimensions.widthM - 0.12, 0.14, 0.34)), this.mat(0x3a3f45, { roughness: 0.8 }));
    dash.position.copy(this.toThree(0, v.dimensions.frontWallY + 0.14, d.z + 0.2));
    dash.castShadow = true;
    dash.receiveShadow = true;
    this.scene.add(dash);

  }

  /** "You": an accent-colored passenger at the selected seat, shown instead of the gray one. */
  private buildYouMarker(): void {
    const torsoGeo = this.track(new THREE.CapsuleGeometry(0.16, 0.3, 4, 10));
    const headGeo = this.track(new THREE.SphereGeometry(0.105, 16, 12));
    const thighGeo = this.track(new THREE.CapsuleGeometry(0.075, 0.3, 4, 8));
    const youMat = this.mat(COLORS.you, { roughness: 0.7 });
    const yTorso = new THREE.Mesh(torsoGeo, youMat);
    const yHead = new THREE.Mesh(headGeo, youMat);
    const yThighA = new THREE.Mesh(thighGeo, youMat);
    const yThighB = new THREE.Mesh(thighGeo, youMat);
    [yTorso, yHead, yThighA, yThighB].forEach((m) => {
      m.castShadow = true;
      m.receiveShadow = true;
      this.youGroup.add(m);
    });
    yTorso.position.set(0, 0.42, 0.02);
    yTorso.rotation.x = -0.1;
    yHead.position.set(0, 0.76, 0.02);
    yThighA.position.set(-0.09, 0.09, -0.2);
    yThighB.position.set(0.09, 0.09, -0.2);
    yThighA.rotation.x = Math.PI / 2;
    yThighB.rotation.x = Math.PI / 2;
    this.youGroup.visible = false;
    this.scene.add(this.youGroup);
  }

  /** Seat numbers on the floor in front of each seat, visible from above. */
  private buildSeatLabels(): void {
    const v = this.vehicle;
    for (const s of v.seats) {
      const label = textSprite(String(s.id), { size: 56, color: '#1b2f7c', bg: 'rgba(251,252,254,0.92)' });
      // On the floor just in front of the seat, so the passenger and the sun patch stay visible from above.
      label.position.copy(this.toThree(s.position.x, s.position.y - (v.type === 'bus' ? 0.4 : 0.5), v.dimensions.floorZ + 0.08));
      label.scale.multiplyScalar(v.type === 'bus' ? 0.55 : 0.62);
      this.seatLabels.push(label);
      this.scene.add(label);
      this.track(label.material.map!);
      this.track(label.material);
    }
  }

  private buildGroundSun(): void {
    const disc = new THREE.Mesh(this.track(new THREE.CircleGeometry(0.3, 32)), this.track(new THREE.MeshBasicMaterial({ color: COLORS.sun })));
    disc.rotation.x = -Math.PI / 2;
    disc.position.y = 0.03;
    const rim = new THREE.Mesh(this.track(new THREE.RingGeometry(0.3, 0.37, 32)), this.track(new THREE.MeshBasicMaterial({ color: 0xf5b800 })));
    rim.rotation.x = -Math.PI / 2;
    rim.position.y = 0.031;
    this.groundSun.add(disc, rim);
    const rayMat = this.track(new THREE.MeshBasicMaterial({ color: 0xf5b800 }));
    const shaft = this.track(new THREE.BoxGeometry(0.06, 0.01, 0.42));
    const head = this.track(new THREE.ConeGeometry(0.1, 0.2, 3));
    for (const off of [-0.42, 0, 0.42]) {
      const ray = new THREE.Group();
      const body = new THREE.Mesh(shaft, rayMat);
      body.position.set(off, 0.03, -0.62);
      const tip = new THREE.Mesh(head, rayMat);
      tip.rotation.x = -Math.PI / 2;
      tip.position.set(off, 0.03, -0.92);
      ray.add(body, tip);
      this.groundSun.add(ray);
    }
    this.scene.add(this.groundSun);
  }

  /** Red rings around the recommended seats, the same mark as the 2D plan. */
  setBestSeats(ids: number[]): void {
    this.bestRings.clear();
    const geo = this.track(new THREE.TorusGeometry(0.33, 0.028, 8, 40));
    const mat = this.track(new THREE.MeshBasicMaterial({ color: 0xcc1f37 }));
    for (const id of ids) {
      const seat = this.vehicle.seats.find((x) => x.id === id);
      if (!seat) continue;
      const ring = new THREE.Mesh(geo, mat);
      ring.rotation.x = -Math.PI / 2;
      ring.position.copy(this.toThree(seat.position.x, seat.position.y - 0.08, seat.position.z + 0.02));
      this.bestRings.add(ring);
    }
    this.invalidate();
  }

  /* ---------- state ---------- */

  setSun(sun: SunState): void {
    this.lastSun = sun;
    const dir = new THREE.Vector3(sun.ux, sun.uz, -sun.uy).normalize();
    this.fillLight.position.set(-dir.x * 20, 18, -dir.z * 20);
    const up = sun.elevationDeg > 0;
    this.sunLight.position.copy(dir.clone().multiplyScalar(40));
    this.sunLight.target.position.set(0, 0, 0);
    this.sunLight.visible = up;

    // Warmer, weaker light near the horizon.
    const el = Math.max(0, sun.elevationDeg);
    const warm = Math.min(1, el / 25);
    // Warm sunlight against a cool sky fill, so lit patches read yellow and shade reads blue-gray.
    this.sunLight.color.setRGB(1, 0.82 + 0.08 * warm, 0.42 + 0.18 * warm);
    this.sunLight.intensity = up ? 1.8 + 2.6 * Math.min(1, el / 35) : 0;

    // Ground sun marker: outside the vehicle on the sun's side, rays pointing at the cabin.
    const flat = new THREE.Vector3(sun.ux, 0, -sun.uy);
    this.groundSun.visible = up && flat.lengthSq() > 1e-4 && this.view === 'top';
    if (flat.lengthSq() > 1e-4) {
      flat.normalize();
      // Where the line from the centre towards the sun leaves the body, plus room for the rays:
      // never more than GROUND_SUN_BAND past the body on either axis, which the top view fits.
      const halfW = this.vehicle.dimensions.widthM / 2;
      const exit = Math.min(Math.abs(flat.x) > 1e-6 ? halfW / Math.abs(flat.x) : Infinity, Math.abs(flat.z) > 1e-6 ? this.halfL / Math.abs(flat.z) : Infinity);
      const reach = exit + GROUND_SUN_GAP;
      this.groundSun.position.copy(flat.clone().multiplyScalar(reach));
      this.groundSun.rotation.y = Math.atan2(flat.x, flat.z);
    }
    const sky = up
      ? new THREE.Color().setRGB(0.62 + 0.18 * (1 - warm), 0.74 + 0.05 * warm, 0.82 + 0.1 * warm)
      : new THREE.Color(0x1d2742);
    (this.scene.background as THREE.Color).copy(sky);
    this.scene.fog!.color.copy(sky);
    this.hemi.intensity = up ? 0.6 : 0.35;
    this.hemi.color.set(up ? 0xcfdcf2 : 0x3a4a7a);

    // Sun path arc for the day on a unit sphere; placeSky() scales it with the sun.
    const pts = sun.path.filter((p) => p[2] > -0.05).map((p) => new THREE.Vector3(p[0], p[2], -p[1]).normalize());
    this.sunPath.geometry.dispose();
    this.sunPath.geometry = new THREE.BufferGeometry().setFromPoints(pts.length > 1 ? pts : [new THREE.Vector3(), new THREE.Vector3()]);
    this.sunPath.computeLineDistances();
    this.hasSunPath = pts.length > 1;
    this.placeSky();
    this.shadowsChanged();
  }

  /**
   * The drawn sun. From outside it sits on a small dome around the vehicle, so the disc is in frame
   * beside the side it lights (its day arc would cross the body, so it stays hidden there). From the
   * seat the sun and its arc sit far off around the rider's head, so the disc shows through the
   * right window. From above the ground marker says it.
   */
  private placeSky(): void {
    const sun = this.lastSun;
    const seat = this.view === 'seat';
    const radius = seat ? SKY_DISTANCE : this.domeRadius;
    const anchor = seat ? this.controls.target.clone() : this.domeCenter;
    this.sunPath.position.copy(anchor);
    this.sunPath.scale.setScalar(radius);
    this.sunPath.visible = seat && this.hasSunPath;
    this.sunMesh.visible = this.view !== 'top' && !!sun && sun.elevationDeg > 0;
    this.sunMesh.scale.setScalar(seat ? 1 : (this.domeRadius * 0.075) / SKY_SUN_RADIUS);
    if (sun) this.sunMesh.position.set(sun.ux, sun.uz, -sun.uy).normalize().multiplyScalar(radius).add(anchor);
  }

  setSelectedSeat(id: number | null): void {
    this.selectedSeatId = id;
    const seat = this.vehicle.seats.find((s) => s.id === id) ?? null;
    this.youGroup.visible = !!seat && this.view !== 'seat';
    if (seat) this.youGroup.position.copy(this.toThree(seat.position.x, seat.position.y, seat.position.z));
    this.applyPassengerVisibility(seat);
    if (this.view === 'seat') this.setView('seat');
    this.shadowsChanged();
  }

  private applyPassengerVisibility(selected: VehicleSeat | null): void {
    if (this.microbus) {
      if (this.occupiedHidden !== null) this.microbus.setOccupied(this.occupiedHidden, true);
      this.occupiedHidden = selected ? selected.id : null;
      if (selected) this.microbus.setOccupied(selected.id, false);
      return;
    }
    const idx = selected ? this.vehicle.seats.findIndex((s) => s.id === selected.id) + 1 : -1;
    const [torsos, heads, thighs] = this.passengers as [THREE.InstancedMesh, THREE.InstancedMesh, THREE.InstancedMesh];
    const hidden = new THREE.Matrix4().makeScale(0, 0, 0);
    const restore = (mesh: THREE.InstancedMesh, i: number, backup: Map<number, THREE.Matrix4>) => {
      const saved = backup.get(i);
      if (saved) mesh.setMatrixAt(i, saved);
    };
    this.hiddenBackup ??= { torsos: new Map(), heads: new Map(), thighs: new Map() };
    const bk = this.hiddenBackup;
    for (const [i] of bk.torsos) restore(torsos, i, bk.torsos);
    for (const [i] of bk.heads) restore(heads, i, bk.heads);
    for (const [i] of bk.thighs) restore(thighs, i, bk.thighs);
    bk.torsos.clear();
    bk.heads.clear();
    bk.thighs.clear();
    if (idx > 0) {
      const save = (mesh: THREE.InstancedMesh, i: number, map: Map<number, THREE.Matrix4>) => {
        const m = new THREE.Matrix4();
        mesh.getMatrixAt(i, m);
        map.set(i, m);
        mesh.setMatrixAt(i, hidden);
      };
      save(torsos, idx, bk.torsos);
      save(heads, idx, bk.heads);
      save(thighs, idx * 2, bk.thighs);
      save(thighs, idx * 2 + 1, bk.thighs);
    }
    torsos.instanceMatrix.needsUpdate = true;
    heads.instanceMatrix.needsUpdate = true;
    thighs.instanceMatrix.needsUpdate = true;
  }

  setView(view: ViewMode): void {
    this.view = view;
    const isBus = this.vehicle.type === 'bus';
    const seat = this.vehicle.seats.find((s) => s.id === this.selectedSeatId) ?? this.vehicle.seats[0]!;

    // Roof: visible from outside and from the seat; invisible (still casting shadow) from above.
    this.microbus?.setCutaway(view === 'top');
    for (const r of this.roofParts) {
      const m = r.material as THREE.MeshStandardMaterial;
      m.colorWrite = view !== 'top';
      m.depthWrite = view !== 'top';
    }
    this.seatLabels.forEach((l) => (l.visible = view === 'top'));
    this.groundSun.visible = view === 'top' && !!this.lastSun && this.lastSun.elevationDeg > 0;
    this.bestRings.visible = view !== 'seat';
    this.youGroup.visible = view !== 'seat' && this.selectedSeatId !== null;

    const c = this.controls;
    c.enableZoom = view !== 'seat';
    c.enablePan = false;
    c.rotateSpeed = view === 'seat' ? -0.35 : 0.8;
    c.minPolarAngle = 0;
    c.maxPolarAngle = view === 'seat' ? Math.PI * 0.85 : Math.PI * 0.47;

    if (view === 'outside') {
      this.camera.fov = 40;
      c.minDistance = isBus ? 9 : 5;
      c.maxDistance = isBus ? 34 : 18;
      c.target.set(0, isBus ? 1.5 : 1.0, isBus ? 0 : 0.2);
      // Front three-quarter view from the sunny flank: the nose, the side glass and the light coming in.
      // The distance fits the whole vehicle into the frame, whatever the pane's shape.
      const side = this.lastSun && this.lastSun.elevationDeg > 0 && Math.abs(this.lastSun.ux) > 0.05 ? Math.sign(this.lastSun.ux) : 1;
      const { lengthM, widthM, heightM } = this.vehicle.dimensions;
      // The vehicle and the sun-path dome around it.
      const radius = Math.max(Math.hypot(lengthM / 2, widthM / 2, heightM / 2), this.domeRadius + c.target.distanceTo(this.domeCenter));
      const vfov = THREE.MathUtils.degToRad(this.camera.fov);
      const hfov = 2 * Math.atan(Math.tan(vfov / 2) * this.camera.aspect);
      const distance = (radius / Math.sin(Math.min(vfov, hfov) / 2)) * 1.02;
      const dir = new THREE.Vector3(side * (isBus ? 11 : 6.2), isBus ? 5.2 : 3.0, isBus ? -10 : -5.4).normalize();
      this.camera.position.copy(c.target).addScaledVector(dir, distance);
      c.maxDistance = Math.max(c.maxDistance, distance * 1.3);
    } else if (view === 'top') {
      this.camera.fov = 38;
      c.target.set(0, 0.8, 0);
      // Fit the body plus the band the ground sun can take around it, clear of the pane's label
      // above and view switch below, whatever the pane's shape.
      const halfX = this.vehicle.dimensions.widthM / 2 + GROUND_SUN_BAND;
      const halfZ = this.halfL + GROUND_SUN_BAND;
      const h = this.container.clientHeight || 400;
      const tan = Math.tan(THREE.MathUtils.degToRad(this.camera.fov) / 2);
      const tanV = tan * Math.max(0.5, (h - 2 * PANE_OVERLAY_PX) / h);
      const tanH = tan * this.camera.aspect;
      const dir = new THREE.Vector3(0.001, isBus ? 22 : 10.6, isBus ? 3.5 : 2.1).normalize();
      // From the camera to the ground plane, less the target's height above it.
      const distance = Math.max(halfZ / tanV, halfX / tanH) * 1.04 - c.target.y / dir.y;
      this.camera.position.copy(c.target).addScaledVector(dir, distance);
      c.minDistance = Math.min(isBus ? 10 : 5, distance * 0.5);
      c.maxDistance = Math.max(isBus ? 34 : 16, distance * 1.3);
    } else {
      this.camera.fov = 80;
      const head = this.toThree(seat.position.x, seat.position.y, seat.position.z + 0.8);
      // Turn the head towards the sun (slightly ahead), so the rider sees which window it comes through.
      const look = new THREE.Vector3(0, -0.18, -0.55);
      if (this.lastSun && this.lastSun.elevationDeg > 0) {
        const flat = new THREE.Vector3(this.lastSun.ux, 0, -this.lastSun.uy);
        if (flat.lengthSq() > 1e-4) look.add(flat.normalize().multiplyScalar(1.4));
      }
      look.normalize().multiplyScalar(0.01);
      c.target.copy(head).add(look);
      this.camera.position.copy(head);
      c.minDistance = 0.001;
      c.maxDistance = 0.02;
    }
    this.camera.updateProjectionMatrix();
    c.update();
    this.fittedAspect = this.camera.aspect;
    this.placeSky();
    this.shadowsChanged();
  }

  /* ---------- loop ---------- */

  invalidate(ms = 600): void {
    this.dirtyUntil = Math.max(this.dirtyUntil, performance.now() + ms);
    if (!this.raf && this.active) this.raf = requestAnimationFrame(this.frame);
  }

  /** Hidden behind another picture: keep everything built, draw nothing; draw again when shown. */
  setActive(active: boolean): void {
    if (active === this.active) return;
    this.active = active;
    if (!active) {
      cancelAnimationFrame(this.raf);
      this.raf = 0;
      return;
    }
    this.resize();
    this.shadowsChanged();
  }

  private frame = (): void => {
    this.raf = 0;
    if (document.hidden || !this.prepared) return;
    // controls.update() fires 'change', which calls invalidate() and may already have
    // queued the next frame: keep exactly one frame queued, never two chains.
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
    if (!this.raf && performance.now() < this.dirtyUntil) this.raf = requestAnimationFrame(this.frame);
  };


  resize(): void {
    const w = this.container.clientWidth || 320;
    const h = this.container.clientHeight || 400;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    // A new pane shape (first real layout, a turned tablet): fit the framing again.
    if (this.fittedAspect && Math.abs(this.camera.aspect / this.fittedAspect - 1) > 0.15 && this.view !== 'seat') this.setView(this.view);
    this.invalidate();
  }

  dispose(): void {
    cancelAnimationFrame(this.raf);
    this.resizeObserver?.disconnect();
    this.controls.dispose();
    this.scene.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (mesh.geometry) mesh.geometry.dispose();
    });
    this.disposables.forEach((d) => d.dispose());
    this.microbus?.dispose();
    this.envMap?.dispose();
    this.sunLight.shadow.map?.dispose();
    this.renderer.dispose();
    this.renderer.forceContextLoss();
    this.renderer.domElement.remove();
  }
}
