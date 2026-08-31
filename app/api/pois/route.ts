import { sql } from "drizzle-orm";

import { db } from "@/db";
import { pois } from "@/db/schema";
import { poiFeatureFromRow, type PoiCollection } from "@/lib/geojson";
import { poiImagesByOwner } from "@/lib/images";

// Reads live geometry out of PostGIS, so this route is evaluated per request.
export const dynamic = "force-dynamic";

export async function GET() {
  const rows = await db
    .select({
      id: pois.id,
      title: pois.title,
      description: pois.description,
      category: pois.category,
      // Let PostGIS do the geometry -> GeoJSON conversion.
      geojson: sql<string>`ST_AsGeoJSON(${pois.location})`,
    })
    .from(pois);

  const imagesByPoi = await poiImagesByOwner(rows.map((r) => r.id));

  const body: PoiCollection = {
    type: "FeatureCollection",
    features: rows.map((row) =>
      poiFeatureFromRow(row, imagesByPoi.get(row.id) ?? []),
    ),
  };

  return Response.json(body);
}
