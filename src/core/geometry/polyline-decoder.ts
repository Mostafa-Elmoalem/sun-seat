/**
 * Google Encoded Polyline Algorithm Format decoder and encoder.
 * Used for compact route storage (OSRM / OpenRouteService compatible).
 */

export function decodePolyline(encoded: string, precision: number = 5): [number, number][] {
  const factor = Math.pow(10, precision);
  const coordinates: [number, number][] = [];
  let index = 0;
  let lat = 0;
  let lng = 0;

  while (index < encoded.length) {
    let b: number;
    let shift = 0;
    let result = 0;

    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);

    const dlat = (result & 1) !== 0 ? ~(result >> 1) : result >> 1;
    lat += dlat;

    shift = 0;
    result = 0;

    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);

    const dlng = (result & 1) !== 0 ? ~(result >> 1) : result >> 1;
    lng += dlng;

    coordinates.push([lat / factor, lng / factor]);
  }

  return coordinates;
}

export function encodePolyline(points: [number, number][], precision: number = 5): string {
  const factor = Math.pow(10, precision);
  let output = '';
  let prevLat = 0;
  let prevLng = 0;

  function encodeValue(value: number): string {
    let v = value < 0 ? ~(value << 1) : value << 1;
    let chunk = '';
    while (v >= 0x20) {
      chunk += String.fromCharCode((0x20 | (v & 0x1f)) + 63);
      v >>= 5;
    }
    chunk += String.fromCharCode(v + 63);
    return chunk;
  }

  for (const [lat, lng] of points) {
    const latScaled = Math.round(lat * factor);
    const lngScaled = Math.round(lng * factor);

    output += encodeValue(latScaled - prevLat);
    output += encodeValue(lngScaled - prevLng);

    prevLat = latScaled;
    prevLng = lngScaled;
  }

  return output;
}
