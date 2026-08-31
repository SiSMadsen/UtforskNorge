/** Shared map constants used by both the public and admin maps. */

export const KARTVERKET_TILE_URL =
  "https://cache.kartverket.no/v1/wmts/1.0.0/topo/default/webmercator/{z}/{y}/{x}.png";

export const KARTVERKET_ATTRIBUTION =
  '&copy; <a href="https://www.kartverket.no/">Kartverket</a>';

export const NORWAY_CENTER: [number, number] = [64.5, 11];
export const NORWAY_ZOOM = 5;

/** GeoJSON stores coordinates as [lng, lat]; Leaflet wants [lat, lng]. */
export const toLatLng = ([lng, lat]: [number, number]): [number, number] => [
  lat,
  lng,
];
