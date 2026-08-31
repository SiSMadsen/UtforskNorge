import type { LineString, Point } from "@/db/postgis";

/**
 * GeoJSON response shapes shared between the API routes and the map client.
 * Geometry types are reused from the DB layer so there is one definition of
 * "what a stored point/line looks like".
 */

export type PoiProperties = {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
};

export type RoadSegmentProperties = {
  id: string;
  title: string;
  description: string | null;
};

export type Feature<G, P> = {
  type: "Feature";
  geometry: G;
  properties: P;
};

export type FeatureCollection<F> = {
  type: "FeatureCollection";
  features: F[];
};

export type PoiFeature = Feature<Point, PoiProperties>;
export type RoadSegmentFeature = Feature<LineString, RoadSegmentProperties>;

export type PoiCollection = FeatureCollection<PoiFeature>;
export type RoadSegmentCollection = FeatureCollection<RoadSegmentFeature>;

/**
 * Row shapes returned by the API queries: the table columns plus PostGIS's
 * `ST_AsGeoJSON(geometry)` as a JSON string.
 */
export type PoiRow = PoiProperties & { geojson: string };
export type RoadSegmentRow = RoadSegmentProperties & { geojson: string };

export function poiFeatureFromRow(row: PoiRow): PoiFeature {
  return {
    type: "Feature",
    geometry: JSON.parse(row.geojson) as Point,
    properties: {
      id: row.id,
      title: row.title,
      description: row.description,
      category: row.category,
    },
  };
}

export function roadSegmentFeatureFromRow(row: RoadSegmentRow): RoadSegmentFeature {
  return {
    type: "Feature",
    geometry: JSON.parse(row.geojson) as LineString,
    properties: {
      id: row.id,
      title: row.title,
      description: row.description,
    },
  };
}
