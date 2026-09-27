import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { mergeGeometries, toCreasedNormals } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { Brush, Evaluator, INTERSECTION, SUBTRACTION } from 'three-bvh-csg';
import type { EndWindowSpec, MicrobusSpec, SideWindowSpec, WindowSpec } from './spec.ts';
import { frontFaceY, offsetOutline, rearFaceY, roofZAt, smoothOutline, type P } from './outline.ts';
import type { ShellPart, ShellParts, ShellSlot } from './shell-types.ts';

export { frontFaceY, offsetOutline, rearFaceY, roofZAt, smoothOutline };
export type { ShellPart, ShellParts, ShellSlot };

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

function shapeFrom(pts: P[]): THREE.Shape {
  const s = new THREE.Shape();
  s.moveTo(pts[0]![0], pts[0]![1]);
  for (let i = 1; i < pts.length; i++) s.lineTo(pts[i]![0], pts[i]![1]);
  s.closePath();
  return s;
}

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
