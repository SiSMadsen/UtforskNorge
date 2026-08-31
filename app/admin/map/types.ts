import type { LineString, Point } from "@/db/postgis";
import type { PoiFeature, RoadSegmentFeature } from "@/lib/geojson";

/** What the editor panel is currently working on. */
export type Draft =
  | { kind: "poi"; mode: "create"; geometry: Point }
  | { kind: "road"; mode: "create"; geometry: LineString }
  | { kind: "poi"; mode: "edit"; id: string; feature: PoiFeature }
  | { kind: "road"; mode: "edit"; id: string; feature: RoadSegmentFeature };

export type FeatureFormValues = {
  title: string;
  description: string;
  category: string;
};
