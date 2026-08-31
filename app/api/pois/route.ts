import { sql } from "drizzle-orm";

import { db } from "@/db";
import { pois } from "@/db/schema";
import { poiFeatureFromRow, type PoiCollection } from "@/lib/geojson";
import { poiImagesByOwner } from "@/lib/images";
import { poiJournalByOwner } from "@/lib/journal";

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

  const ids = rows.map((r) => r.id);
  const [imagesByPoi, journalByPoi] = await Promise.all([
    poiImagesByOwner(ids),
    poiJournalByOwner(ids),
  ]);

  const body: PoiCollection = {
    type: "FeatureCollection",
    features: rows.map((row) =>
      poiFeatureFromRow(row, {
        images: imagesByPoi.get(row.id) ?? [],
        journalEntries: journalByPoi.get(row.id) ?? [],
      }),
    ),
  };

  return Response.json(body);
}
