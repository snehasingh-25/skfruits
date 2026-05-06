/**
 * Decode a Google Encoded Polyline into an array of [lat, lng] pairs.
 * Leaflet expects [[lat, lng], ...] for its <Polyline> component.
 *
 * Reference: https://developers.google.com/maps/documentation/utilities/polylinealgorithm
 *
 * @param {string} encoded - Google encoded polyline string
 * @returns {Array<[number, number]>} Array of [lat, lng] coordinate pairs
 */
export function decodePolyline(encoded) {
  if (!encoded || typeof encoded !== "string") return [];

  const points = [];
  let i = 0;
  let lat = 0;
  let lng = 0;

  while (i < encoded.length) {
    // Decode latitude
    let shift = 0;
    let result = 0;
    let byte;
    do {
      byte = encoded.charCodeAt(i++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);
    lat += (result & 1) ? ~(result >> 1) : (result >> 1);

    // Decode longitude
    shift = 0;
    result = 0;
    do {
      byte = encoded.charCodeAt(i++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);
    lng += (result & 1) ? ~(result >> 1) : (result >> 1);

    points.push([lat / 1e5, lng / 1e5]);
  }

  return points;
}
