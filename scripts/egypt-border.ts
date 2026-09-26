/**
 * Simplified Egypt border polygon, used to drop OpenStreetMap features that fall
 * inside the rectangular Overpass bbox but belong to Libya, Sudan, Gaza, Israel,
 * Jordan or Saudi Arabia. Vertices are [lat, lng], clockwise from the north west.
 *
 * Precision is a few km, which is enough for a place gazetteer. The eastern edge
 * runs down the middle of the Gulf of Aqaba and the Red Sea.
 */
export const EGYPT_BORDER: [number, number][] = [
  [31.8, 25.1],
  [31.8, 34.15],
  [31.33, 34.2],
  [31.22, 34.27],
  [29.49, 34.9],
  [29.0, 34.72],
  [28.5, 34.6],
  [28.0, 34.5],
  [27.7, 34.55],
  [26.0, 35.3],
  [24.0, 36.3],
  [22.0, 37.2],
  [22.0, 24.98],
  [29.5, 24.98],
  [30.2, 24.7],
  [31.0, 24.87],
  [31.6, 25.1]
];

export function isInsideEgypt(lat: number, lng: number): boolean {
  let inside = false;
  const poly = EGYPT_BORDER;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [yi, xi] = poly[i]!;
    const [yj, xj] = poly[j]!;
    const crosses = yi > lat !== yj > lat && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi;
    if (crosses) inside = !inside;
  }
  return inside;
}
