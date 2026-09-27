import type { MicrobusSpec } from './spec.ts';

/**
 * The side silhouette as plain math (no three.js, no CSG): smoothing, insetting and
 * reading heights off it. The shell cutter and the details both build on these.
 */

export type P = [number, number];

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
