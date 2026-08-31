import type { LineString, Point } from "@/db/postgis";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(value: string): boolean {
  return UUID_RE.test(value);
}

function isLngLat(value: unknown): value is [number, number] {
  return (
    Array.isArray(value) &&
    value.length === 2 &&
    typeof value[0] === "number" &&
    Number.isFinite(value[0]) &&
    value[0] >= -180 &&
    value[0] <= 180 &&
    typeof value[1] === "number" &&
    Number.isFinite(value[1]) &&
    value[1] >= -90 &&
    value[1] <= 90
  );
}

/** Validates a GeoJSON-shaped Point ([lng, lat], WGS84). Returns null if invalid. */
export function parsePoint(value: unknown): Point | null {
  if (
    typeof value === "object" &&
    value !== null &&
    (value as { type?: unknown }).type === "Point" &&
    isLngLat((value as { coordinates?: unknown }).coordinates)
  ) {
    return {
      type: "Point",
      coordinates: (value as { coordinates: [number, number] }).coordinates,
    };
  }
  return null;
}

/** Validates a GeoJSON-shaped LineString with at least two vertices. */
export function parseLineString(value: unknown): LineString | null {
  if (
    typeof value === "object" &&
    value !== null &&
    (value as { type?: unknown }).type === "LineString" &&
    Array.isArray((value as { coordinates?: unknown }).coordinates)
  ) {
    const coordinates = (value as { coordinates: unknown[] }).coordinates;
    if (coordinates.length >= 2 && coordinates.every(isLngLat)) {
      return {
        type: "LineString",
        coordinates: coordinates as [number, number][],
      };
    }
  }
  return null;
}
