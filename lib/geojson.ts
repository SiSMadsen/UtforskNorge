import type { LineString, Point } from "@/db/postgis";

/**
 * GeoJSON response shapes shared between the API routes and the map client.
 * Geometry types are reused from the DB layer so there is one definition of
 * "what a stored point/line looks like".
 */

export type ImageRef = {
  id: string;
  /** Path to fetch the image through our own route, e.g. `/api/images/poi/<id>/<file>`. */
  url: string;
  caption: string | null;
  sortOrder: number;
};

export type PoiProperties = {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  images: ImageRef[];
};

export type RoadSegmentProperties = {
  id: string;
  title: string;
  description: string | null;
  images: ImageRef[];
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

export function imageUrl(storagePath: string): string {
  return `/api/images/${storagePath}`;
}

export type ImageRow = {
  id: string;
  storagePath: string;
  caption: string | null;
  sortOrder: number;
};

export function toImageRef(row: ImageRow): ImageRef {
  return {
    id: row.id,
    url: imageUrl(row.storagePath),
    caption: row.caption,
    sortOrder: row.sortOrder,
  };
}

/**
 * Row shapes returned by the API queries: the table columns plus PostGIS's
 * `ST_AsGeoJSON(geometry)` as a JSON string.
 */
export type PoiRow = Omit<PoiProperties, "images"> & { geojson: string };
export type RoadSegmentRow = Omit<RoadSegmentProperties, "images"> & {
  geojson: string;
};

export function poiFeatureFromRow(
  row: PoiRow,
  images: ImageRef[] = [],
): PoiFeature {
  return {
    type: "Feature",
    geometry: JSON.parse(row.geojson) as Point,
    properties: {
      id: row.id,
      title: row.title,
      description: row.description,
      category: row.category,
      images,
    },
  };
}

export function roadSegmentFeatureFromRow(
  row: RoadSegmentRow,
  images: ImageRef[] = [],
): RoadSegmentFeature {
  return {
    type: "Feature",
    geometry: JSON.parse(row.geojson) as LineString,
    properties: {
      id: row.id,
      title: row.title,
      description: row.description,
      images,
    },
  };
}
