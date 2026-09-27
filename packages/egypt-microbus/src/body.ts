import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { mergeGeometries, toCreasedNormals } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { Brush, Evaluator, INTERSECTION, SUBTRACTION } from 'three-bvh-csg';
import type { EndWindowSpec, MicrobusSpec, SideWindowSpec, WindowSpec } from './spec.ts';

/**
 * The body shell, built by constructive solid geometry:
 *   rounded solid from the side silhouette
 *   minus the cabin cavity
 *   minus one cutter per window in spec.windows (and nothing else)
 *   minus the wheel arches
 * then split into roof, painted body and livery skirt.
 * Every face remembers which solid it came from (a material slot), so the outer skin,
 * the inner walls, the window reveals and the wheel wells can each take their own material.
 * Everything is in three.js axes: X = vehicle x, Y = height, Z = y - length / 2 (nose at -Z).
 */

type P = [number, number];

/** Signed area of a polygon; positive for counter-clockwise in a y-right, z-up plane. */
function signedArea(pts: P[]): number {
  let a = 0;
  for (let i = 0; i < pts.length; i++) {
    const [x1, y1] = pts[i]!;
    const [x2, y2] = pts[(i + 1) % pts.length]!;
    a += x1 * y2 - x2 * y1;
  }
  return a / 2;
}

/**
 * Chaikin corner cutting: each smooth vertex is replaced by two points a quarter
 * of the way along its edges; crease vertices are kept as they are.
 */
export function smoothOutline(pts: P[], creases: number[], iterations = 2): P[] {
  let points = pts.map((p) => [p[0], p[1]] as P);
  let sharp = new Set(creases);
  const lerp = (a: P, b: P, t: number): P => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
  for (let it = 0; it < iterations; it++) {
    const next: P[] = [];
    const nextSharp = new Set<number>();
    const n = points.length;
    for (let i = 0; i < n; i++) {
      const p = points[i]!;
      if (sharp.has(i)) {
        nextSharp.add(next.length);
        next.push(p);
        continue;
      }
      next.push(lerp(p, points[(i - 1 + n) % n]!, 0.25));
      next.push(lerp(p, points[(i + 1) % n]!, 0.25));
    }
    points = next;
    sharp = nextSharp;
  }
  return points;
}

/** Moves every vertex inwards by d along the mitered normal of its two edges. */
export function offsetOutline(pts: P[], d: number): P[] {
  const ccw = signedArea(pts) > 0;
  const n = pts.length;
  return pts.map((p, i) => {
    const prev = pts[(i - 1 + n) % n]!;
    const next = pts[(i + 1) % n]!;
    const e1 = [p[0] - prev[0], p[1] - prev[1]];
    const e2 = [next[0] - p[0], next[1] - p[1]];
    const inward = (e: number[]) => {
      const len = Math.hypot(e[0]!, e[1]!) || 1;
      // For a counter-clockwise outline the interior lies to the left of each edge.
      return ccw ? [-e[1]! / len, e[0]! / len] : [e[1]! / len, -e[0]! / len];
    };
    const n1 = inward(e1);
    const n2 = inward(e2);
    let mx = n1[0]! + n2[0]!;
    let my = n1[1]! + n2[1]!;
    const ml = Math.hypot(mx, my) || 1;
    mx /= ml;
    my /= ml;
    const cos = mx * n1[0]! + my * n1[1]!;
    const len = Math.min(d / Math.max(cos, 0.35), d * 2.5);
    return [p[0] + mx * len, p[1] + my * len] as P;
  });
}

function shapeFrom(pts: P[]): THREE.Shape {
  const s = new THREE.Shape();
  s.moveTo(pts[0]![0], pts[0]![1]);
  for (let i = 1; i < pts.length; i++) s.lineTo(pts[i]![0], pts[i]![1]);
  s.closePath();
  return s;
}

/** Where a face of the shell came from. */
export type ShellSlot = 'outer' | 'inner' | 'reveal' | 'well';

const SLOT_TAGS: Record<ShellSlot, THREE.Material> = {
  outer: new THREE.MeshBasicMaterial({ name: 'outer' }),
  inner: new THREE.MeshBasicMaterial({ name: 'inner' }),
  reveal: new THREE.MeshBasicMaterial({ name: 'reveal' }),
  well: new THREE.MeshBasicMaterial({ name: 'well' })
};

function brushOf(geometry: THREE.BufferGeometry, material: THREE.Material | THREE.Material[]): Brush {
  geometry.deleteAttribute('uv');
  if (!Array.isArray(material)) geometry.clearGroups();
  const brush = new Brush(geometry, material);
  brush.updateMatrixWorld();
  return brush;
}

function partOf(brush: Brush): ShellPart {
  const materials = Array.isArray(brush.material) ? brush.material : [brush.material];
  return { geometry: brush.geometry, slots: materials.map((m) => m.name as ShellSlot) };
}

/** Extrudes a side outline across the vehicle width. Local X = y, local Y = z, local Z = across. */
function extrudeAcross(outline: P[], width: number, length: number, bevel: number, smoothNormals: boolean): THREE.BufferGeometry {
  const depth = width - 2 * bevel;
  let geo: THREE.BufferGeometry = new THREE.ExtrudeGeometry(shapeFrom(outline), {
    depth,
    bevelEnabled: bevel > 0,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelSegments: bevel > 0 ? 6 : 0,
    curveSegments: 1,
    steps: 1
  });
  // Local X (y) -> world +Z, local Z (across) -> world -X. The shell is symmetric, so the mirror is harmless.
  geo.rotateY(-Math.PI / 2);
  geo.translate(depth / 2, 0, -length / 2);
  if (smoothNormals) geo = toCreasedNormals(geo, THREE.MathUtils.degToRad(32));
  return geo;
}

export function frontFaceY(spec: MicrobusSpec, z: number): number {
  // Linear interpolation along the front face points of the silhouette (indices 1 to 4).
  const face = spec.body.sideProfile.slice(1, 5);
  if (z <= face[0]![1]) return face[0]![0];
  for (let i = 0; i < face.length - 1; i++) {
    const [y0, z0] = face[i]!;
    const [y1, z1] = face[i + 1]!;
    if (z >= z0 && z <= z1) return y0 + ((z - z0) / (z1 - z0)) * (y1 - y0);
  }
  return face[face.length - 1]![0];
}

export function rearFaceY(spec: MicrobusSpec, z: number): number {
  const prof = spec.body.sideProfile;
  const face = [prof[prof.length - 2]!, prof[prof.length - 3]!, prof[prof.length - 4]!]; // bottom to top
  if (z <= face[0]![1]) return face[0]![0];
  for (let i = 0; i < face.length - 1; i++) {
    const [y0, z0] = face[i]!;
    const [y1, z1] = face[i + 1]!;
    if (z >= z0 && z <= z1) return y0 + ((z - z0) / (z1 - z0)) * (y1 - y0);
  }
  return face[face.length - 1]![0];
}

/**
 * Height of the outer roof at a distance y from the front bumper, measured on the
 * smoothed silhouette (the middle of the width, away from the rounded side edges).
 */
export function roofZAt(spec: MicrobusSpec, y: number): number {
  const pts = smoothOutline(spec.body.sideProfile, spec.body.creases, 2);
  let top = -Infinity;
  for (let i = 0; i < pts.length; i++) {
    const [y0, z0] = pts[i]!;
    const [y1, z1] = pts[(i + 1) % pts.length]!;
    if ((y < Math.min(y0, y1)) || (y > Math.max(y0, y1)) || y0 === y1) continue;
    top = Math.max(top, z0 + ((y - y0) / (y1 - y0)) * (z1 - z0));
  }
  return top;
}

/** Geometry of the cutter for one window, in world axes. */
export function windowCutter(spec: MicrobusSpec, w: WindowSpec): THREE.BufferGeometry {
  const L = spec.dimensions.lengthM;
  const W = spec.dimensions.widthM;
  if (w.side === 'left' || w.side === 'right') {
    const s = w as SideWindowSpec;
    const g = new RoundedBoxGeometry(0.34, s.zTop - s.zBottom, s.yEnd - s.yStart, 2, 0.035);
    g.translate(s.side === 'left' ? -W / 2 : W / 2, (s.zBottom + s.zTop) / 2, (s.yStart + s.yEnd) / 2 - L / 2);
    return g;
  }
  const e = w as EndWindowSpec;
  const width = e.xEnd - e.xStart;
  const cx = (e.xStart + e.xEnd) / 2;
  if (e.side === 'front' && e.rake) {
    const dy = e.rake.yAtTop - e.rake.yAtBottom;
    const dz = e.zTop - e.zBottom;
    const len = Math.hypot(dy, dz);
    const g = new RoundedBoxGeometry(width, len, 0.34, 2, 0.04);
    g.rotateX(Math.atan2(dy, dz));
    g.translate(cx, (e.zBottom + e.zTop) / 2, (e.rake.yAtBottom + e.rake.yAtTop) / 2 - L / 2);
    return g;
  }
  const y = e.side === 'front' ? spec.dimensions.frontWallY : rearFaceY(spec, (e.zBottom + e.zTop) / 2);
  const g = new RoundedBoxGeometry(width, e.zTop - e.zBottom, 0.34, 2, 0.04);
  g.translate(cx, (e.zBottom + e.zTop) / 2, y - L / 2);
  return g;
}

/** One piece of the shell: its geometry groups index into slots. */
export interface ShellPart {
  geometry: THREE.BufferGeometry;
  slots: ShellSlot[];
}

export interface ShellParts {
  body: ShellPart;
  skirt: ShellPart;
  roof: ShellPart;
  /** The windows actually cut, in the order they were cut (for verification). */
  openings: WindowSpec[];
}

const shellCache = new Map<string, ShellParts>();

/**
 * three-bvh-csg 0.0.18 still passes the renamed "maxLeafSize" option to three-mesh-bvh,
 * which warns on every brush. Silence exactly that message while the shell is built.
 */
function withoutBvhWarning<T>(fn: () => T): T {
  const warn = console.warn;
  console.warn = (...args: unknown[]) => {
    if (typeof args[0] === 'string' && args[0].includes('"maxLeafSize" option has been deprecated')) return;
    warn(...args);
  };
  try {
    return fn();
  } finally {
    console.warn = warn;
  }
}

/** Builds (once per spec id) the shell geometry. Around 0.3 s on a laptop, cached afterwards. */
export function buildShell(spec: MicrobusSpec): ShellParts {
  const cached = shellCache.get(spec.id);
  if (cached) return cached;
  const parts = withoutBvhWarning(() => buildShellUncached(spec));
  shellCache.set(spec.id, parts);
  return parts;
}

function buildShellUncached(spec: MicrobusSpec): ShellParts {

  const { lengthM: L, widthM: W, floorZ } = spec.dimensions;
  const { sideProfile, creases, edgeRadius, wallThickness, skirtTopZ } = spec.body;
  const evaluator = new Evaluator();
  evaluator.attributes = ['position', 'normal'];
  evaluator.useGroups = true;

  // Outer solid: inset the silhouette by the bevel so the rounded result keeps the real size.
  const outerOutline = smoothOutline(offsetOutline(sideProfile, edgeRadius), creases, 2);
  const outer = brushOf(extrudeAcross(outerOutline, W, L, edgeRadius, true), SLOT_TAGS.outer);

  // Cabin cavity: the silhouette offset by the wall thickness, floored at the cabin floor.
  const innerOutline = smoothOutline(
    offsetOutline(sideProfile, wallThickness).map(([y, z]) => [y, Math.max(z, floorZ)] as P),
    creases,
    2
  );
  const cavity = brushOf(extrudeAcross(innerOutline, W - 2 * wallThickness, L, 0, false), SLOT_TAGS.inner);

  let shell = evaluator.evaluate(outer, cavity, SUBTRACTION);

  // One brush for every opening: each window in spec.windows (and nothing else) plus the two wheel arches.
  const openings: WindowSpec[] = [];
  const cutters: THREE.BufferGeometry[] = [];
  const cutterSlots: THREE.Material[] = [];
  for (const w of spec.windows) {
    cutters.push(windowCutter(spec, w));
    cutterSlots.push(SLOT_TAGS.reveal);
    openings.push(w);
  }
  const { frontAxleY, rearAxleY, radius, archRadius } = spec.wheels;
  for (const axle of [frontAxleY, rearAxleY]) {
    const arch = new THREE.CylinderGeometry(archRadius, archRadius, W + 0.4, 48);
    arch.rotateZ(Math.PI / 2);
    arch.translate(0, radius, axle - L / 2);
    cutters.push(arch);
    cutterSlots.push(SLOT_TAGS.well);
  }
  for (const c of cutters) {
    c.deleteAttribute('uv');
    c.clearGroups();
  }
  // One group per cutter, so each opening's faces keep the cutter's slot.
  const merged = mergeGeometries(cutters.map((c) => (c.index ? c.toNonIndexed() : c)), true);
  if (!merged) throw new Error('egypt-microbus: could not merge the opening cutters');
  shell = evaluator.evaluate(shell, brushOf(merged, cutterSlots), SUBTRACTION);

  // Roof: everything above the tallest window, hidden in the cutaway view but still shading.
  const roofSplitZ = Math.max(...spec.windows.map((w) => w.zTop)) + 0.03;
  const above = new THREE.BoxGeometry(W + 1, 2, L + 1);
  above.translate(0, roofSplitZ + 1, 0);
  const roof = evaluator.evaluate(shell, brushOf(above.clone(), SLOT_TAGS.outer), INTERSECTION);
  const lower = evaluator.evaluate(shell, brushOf(above, SLOT_TAGS.outer), SUBTRACTION);

  const below = new THREE.BoxGeometry(W + 1, 2, L + 1);
  below.translate(0, skirtTopZ - 1, 0);
  const skirt = evaluator.evaluate(lower, brushOf(below.clone(), SLOT_TAGS.outer), INTERSECTION);
  const body = evaluator.evaluate(lower, brushOf(below, SLOT_TAGS.outer), SUBTRACTION);

  return { body: partOf(body), skirt: partOf(skirt), roof: partOf(roof), openings };
}
