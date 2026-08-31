import { sql } from "drizzle-orm";

import { db } from "@/db";
import { roadSegments } from "@/db/schema";
import {
  roadSegmentFeatureFromRow,
  type RoadSegmentCollection,
} from "@/lib/geojson";
import { roadSegmentImagesByOwner } from "@/lib/images";
import { roadSegmentJournalByOwner } from "@/lib/journal";

export const dynamic = "force-dynamic";

export async function GET() {
  const rows = await db
    .select({
      id: roadSegments.id,
      title: roadSegments.title,
      description: roadSegments.description,
      geojson: sql<string>`ST_AsGeoJSON(${roadSegments.path})`,
    })
    .from(roadSegments);

  const ids = rows.map((r) => r.id);
  const [imagesByOwner, journalByOwner] = await Promise.all([
    roadSegmentImagesByOwner(ids),
    roadSegmentJournalByOwner(ids),
  ]);

  const body: RoadSegmentCollection = {
    type: "FeatureCollection",
    features: rows.map((row) =>
      roadSegmentFeatureFromRow(row, {
        images: imagesByOwner.get(row.id) ?? [],
        journalEntries: journalByOwner.get(row.id) ?? [],
      }),
    ),
  };

  return Response.json(body);
}
