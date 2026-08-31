import { sql } from "drizzle-orm";

import { db } from "@/db";
import { roadSegments } from "@/db/schema";
import {
  roadSegmentFeatureFromRow,
  type RoadSegmentCollection,
} from "@/lib/geojson";

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

  const body: RoadSegmentCollection = {
    type: "FeatureCollection",
    features: rows.map(roadSegmentFeatureFromRow),
  };

  return Response.json(body);
}
