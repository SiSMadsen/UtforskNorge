import { sql } from "drizzle-orm";

import { db } from "@/db";
import { roadSegments } from "@/db/schema";
import type { LineString } from "@/db/postgis";
import type { RoadSegmentCollection } from "@/lib/geojson";

// Reads live geometry out of PostGIS, so this route is evaluated per request.
export const dynamic = "force-dynamic";

export async function GET() {
  const rows = await db
    .select({
      id: roadSegments.id,
      title: roadSegments.title,
      description: roadSegments.description,
      // Let PostGIS do the geometry -> GeoJSON conversion.
      geojson: sql<string>`ST_AsGeoJSON(${roadSegments.path})`,
    })
    .from(roadSegments);

  const body: RoadSegmentCollection = {
    type: "FeatureCollection",
    features: rows.map((row) => ({
      type: "Feature",
      geometry: JSON.parse(row.geojson) as LineString,
      properties: {
        id: row.id,
        title: row.title,
        description: row.description,
      },
    })),
  };

  return Response.json(body);
}
