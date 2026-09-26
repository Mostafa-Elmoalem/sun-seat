/**
 * Douglas-Peucker simplification for [lat, lng] polylines.
 *
 * Points are projected to a local equirectangular plane in meters, which is
 * accurate to well under 1% over the extent of any Egyptian route. The tolerance
 * is the maximum perpendicular deviation, in meters, that a removed point may
 * have from the simplified line. 25 m keeps every real turn and roundabout that
 * changes the heading while shrinking OSRM's full geometry by roughly 5 to 10x.
 */
export function simplifyPolyline(points: [number, number][], toleranceM = 25): [number, number][] {
  if (points.length <= 2) return points.slice();

  const lat0 = (points[0]![0] * Math.PI) / 180;
  const mPerDegLat = 111_320;
  const mPerDegLng = 111_320 * Math.cos(lat0);
  const xy = points.map(([lat, lng]) => [lng * mPerDegLng, lat * mPerDegLat] as const);

  const keep = new Uint8Array(points.length);
  keep[0] = 1;
  keep[points.length - 1] = 1;

  const stack: [number, number][] = [[0, points.length - 1]];
  const tolSq = toleranceM * toleranceM;

  while (stack.length > 0) {
    const [start, end] = stack.pop()!;
    const [ax, ay] = xy[start]!;
    const [bx, by] = xy[end]!;
    const dx = bx - ax;
    const dy = by - ay;
    const lenSq = dx * dx + dy * dy;

    let maxDistSq = -1;
    let maxIndex = -1;
    for (let i = start + 1; i < end; i++) {
      const [px, py] = xy[i]!;
      let distSq: number;
      if (lenSq === 0) {
        distSq = (px - ax) ** 2 + (py - ay) ** 2;
      } else {
        const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / lenSq));
        distSq = (px - (ax + t * dx)) ** 2 + (py - (ay + t * dy)) ** 2;
      }
      if (distSq > maxDistSq) {
        maxDistSq = distSq;
        maxIndex = i;
      }
    }

    if (maxIndex !== -1 && maxDistSq > tolSq) {
      keep[maxIndex] = 1;
      stack.push([start, maxIndex], [maxIndex, end]);
    }
  }

  return points.filter((_, i) => keep[i] === 1);
}
